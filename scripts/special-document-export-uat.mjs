import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `special-document-export-${stamp}`)
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const proposalId = Number(process.env.SPECIAL_PROPOSAL_ID)
const quoteId = Number(process.env.SPECIAL_QUOTE_ID)
const qpdf = process.env.QPDF_BINARY || 'qpdf'
const headless = process.env.SMOKE_HEADLESS !== '0'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const pdfResponseBody = async (response, label) => {
  assert(response.ok(), `${label} returned HTTP ${response.status()}`)
  const contentType = String(response.headers()['content-type'] || '').toLowerCase()
  const disposition = String(response.headers()['content-disposition'] || '').toLowerCase()
  assert(contentType.startsWith('application/pdf'), `${label} did not return application/pdf`)
  assert(!contentType.includes('zip'), `${label} returned a ZIP content type`)
  assert(!disposition.includes('.zip'), `${label} returned a ZIP filename`)
  const bytes = await response.body()
  assert(bytes.subarray(0, 1024).includes(Buffer.from('%PDF-')), `${label} body is not a PDF`)
  return bytes
}

const pageCount = (file) => {
  const value = execFileSync(qpdf, ['--show-npages', file], { encoding: 'utf8' }).trim()
  const count = Number(value)
  assert(Number.isInteger(count) && count > 0, `Unable to read PDF page count for ${file}`)
  return count
}

const run = async () => {
  if (!email || !password) throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required.')
  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    throw new Error('SPECIAL_PROPOSAL_ID must identify an upload-mode Special proposal.')
  }
  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new Error('SPECIAL_QUOTE_ID must identify the disposable combined-export quotation.')
  }

  await fs.mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  const results = []
  const issues = []

  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return
    issues.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    )
  })
  page.on('response', (response) => {
    if (response.status() >= 500) {
      issues.push(`server: ${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  const step = async (name, action) => {
    const startedAt = Date.now()
    const detail = await action()
    results.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail })
    console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`)
  }

  let proposalPages = 0
  let quotePages = 0

  try {
    await step('login through the real UI', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.fill('#loginEmail', email)
      await page.fill('#loginPassword', password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login')),
        page.click('button[type="submit"]'),
      ])
      return 'authenticated session established'
    })

    await step('show unambiguous Special proposal modes', async () => {
      await page.goto(`${baseUrl}/templates/create?type=special`, { waitUntil: 'domcontentloaded' })
      const writeMode = page.getByRole('radio', { name: /write full proposal/i })
      const uploadMode = page.getByRole('radio', { name: /upload a completed proposal pdf/i })
      await writeMode.waitFor({ state: 'visible' })
      assert(await writeMode.isChecked(), 'Write full proposal is not selected by default')
      assert(!(await uploadMode.isChecked()), 'Upload mode is unexpectedly selected by default')
      assert(
        await page.getByText('Recommended', { exact: true }).isVisible(),
        'Recommended cue is missing',
      )

      await uploadMode.check()
      const note = page.getByLabel(/internal reference note/i)
      await note.waitFor({ state: 'visible' })
      assert((await note.getAttribute('maxlength')) === '300', 'Internal note limit is not 300')
      assert(
        (await note.getAttribute('rows')) === '3',
        'Internal note field is not visually compact',
      )
      assert(
        await page
          .getByText(
            'Visible to staff only. This note is not included in the proposal or quotation PDF.',
          )
          .isVisible(),
        'Internal-only guidance is missing',
      )
      await page.screenshot({ path: path.join(outputDir, 'proposal-mode-desktop.png') })
      return 'write default; upload note limited to 300 characters'
    })

    await step('preview authenticated proposal attachment', async () => {
      await page.goto(`${baseUrl}/templates/proposals/special/${proposalId}`, {
        waitUntil: 'domcontentloaded',
      })
      const attachmentsButton = page.getByRole('button', { name: /view attachments/i })
      await attachmentsButton.waitFor({ state: 'visible' })
      await attachmentsButton.click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor({ state: 'visible' })
      const frame = dialog.locator('iframe')
      await frame.waitFor({ state: 'visible' })
      assert(
        (await frame.getAttribute('src'))?.startsWith('blob:'),
        'Attachment preview is not a blob URL',
      )
      assert(
        await dialog.getByRole('link', { name: 'Download' }).isVisible(),
        'Download link is missing',
      )
      await page.screenshot({ path: path.join(outputDir, 'attachment-preview-desktop.png') })
      await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
      await dialog.waitFor({ state: 'hidden' })
      return 'authenticated PDF preview loaded'
    })

    await step('export one merged Special proposal PDF', async () => {
      const responsePromise = context.waitForEvent('response', {
        predicate: (response) => {
          const url = new URL(response.url())
          return url.pathname.endsWith(`/proposal-templates/special/${proposalId}/pdf`)
        },
      })
      const popupPromise = page.waitForEvent('popup')
      await page.getByRole('button', { name: 'Export Proposal', exact: true }).click()
      const [response, popup] = await Promise.all([responsePromise, popupPromise])
      assert(response.ok(), `Special proposal browser request returned HTTP ${response.status()}`)
      const downloadResponse = await context.request.get(response.url(), {
        headers: { Accept: 'application/pdf' },
      })
      const bytes = await pdfResponseBody(downloadResponse, 'Special proposal export')
      const output = path.join(outputDir, 'special-proposal.pdf')
      await fs.writeFile(output, bytes)
      proposalPages = pageCount(output)
      await popup.close().catch(() => {})
      assert(
        proposalPages >= 2,
        'Upload-mode proposal did not include its rendered cover and attachment',
      )
      return `${proposalPages} pages; application/pdf`
    })

    await step('export quotation, rendered proposal, and attachment as one PDF', async () => {
      await page.goto(`${baseUrl}/crm/records/special/${quoteId}`, {
        waitUntil: 'domcontentloaded',
      })
      const responsePromise = context.waitForEvent('response', {
        predicate: (response) => {
          const url = new URL(response.url())
          return url.pathname.endsWith(`/quote-records/special/${quoteId}/pdf`)
        },
      })
      await page.getByRole('button', { name: 'Generate PDF', exact: true }).click()
      const response = await responsePromise
      assert(response.ok(), `Special quotation browser request returned HTTP ${response.status()}`)
      const downloadResponse = await context.request.get(response.url(), {
        headers: { Accept: 'application/pdf' },
      })
      const bytes = await pdfResponseBody(downloadResponse, 'Special quotation export')
      const output = path.join(outputDir, 'special-quotation-with-proposal.pdf')
      await fs.writeFile(output, bytes)
      quotePages = pageCount(output)
      const dialog = page.getByRole('dialog', { name: /quotation pdf/i })
      await dialog.waitFor({ state: 'visible' })
      await dialog.locator('iframe[title="Quotation PDF preview"]').waitFor({ state: 'visible' })
      assert(
        await dialog.getByRole('link', { name: 'Download PDF' }).isVisible(),
        'PDF download is missing',
      )
      await page.screenshot({ path: path.join(outputDir, 'quotation-pdf-preview-desktop.png') })
      assert(
        quotePages > proposalPages,
        'Combined quotation PDF does not contain more pages than the proposal-only export',
      )
      await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
      return `${quotePages} pages; one application/pdf response; no ZIP`
    })

    await step('keep the Special proposal choice usable on mobile', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${baseUrl}/templates/create?type=special`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('radio', { name: /write full proposal/i }).waitFor({ state: 'visible' })
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      assert(
        overflow.scrollWidth <= overflow.clientWidth + 1,
        `Special proposal form overflows horizontally (${overflow.scrollWidth}/${overflow.clientWidth})`,
      )
      await page.screenshot({
        path: path.join(outputDir, 'proposal-mode-mobile.png'),
        fullPage: true,
      })
      return '390 x 844 without document overflow'
    })

    assert(issues.length === 0, `Browser/runtime issues found: ${issues.join(' | ')}`)
    const report = {
      status: 'passed',
      baseUrl,
      proposalId,
      quoteId,
      proposalPages,
      quotePages,
      mutationsPerformed: false,
      results,
      issues,
      outputDir,
    }
    await fs.writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    await page
      .screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true })
      .catch(() => {})
    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      `${JSON.stringify(
        {
          status: 'failed',
          baseUrl,
          proposalId,
          quoteId,
          proposalPages,
          quotePages,
          mutationsPerformed: false,
          results,
          issues,
          error: error.message,
          outputDir,
        },
        null,
        2,
      )}\n`,
    )
    throw error
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
