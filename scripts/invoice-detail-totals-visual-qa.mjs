import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const execFileAsync = promisify(execFile)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const evidenceDir = path.join(frontendRoot, 'test-results', `invoice-totals-visual-${stamp}`)
const screenshotDir = path.join(evidenceDir, 'screenshots')
const pdfDir = path.join(evidenceDir, 'pdfs')
const baseUrl = validateSmokeTarget(process.env.FRONTEND_URL || 'http://127.0.0.1:3000')
const apiBase = `${baseUrl}/proxy`
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const money = (value) =>
  `RM ${Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const slug = (value) =>
  String(value || 'invoice')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const run = async () => {
  if (!email || !password) throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required.')

  await fs.mkdir(screenshotDir, { recursive: true })
  await fs.mkdir(pdfDir, { recursive: true })

  const checks = []
  const runtimeIssues = []
  const browser = await chromium.launch({ headless: process.env.SMOKE_HEADLESS !== '0' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(60_000)
  page.setDefaultNavigationTimeout(120_000)

  page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeIssues.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'unknown'
    if (!reason.includes('ERR_ABORTED')) {
      runtimeIssues.push(`request: ${request.method()} ${request.url()} ${reason}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/proxy/')) {
      runtimeIssues.push(
        `api: ${response.status()} ${response.request().method()} ${response.url()}`,
      )
    }
  })

  const check = async (name, action) => {
    const startedAt = Date.now()
    try {
      const detail = await action()
      checks.push({ name, status: 'passed', duration_ms: Date.now() - startedAt, detail })
      console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`)
    } catch (error) {
      checks.push({
        name,
        status: 'failed',
        duration_ms: Date.now() - startedAt,
        detail: error.message,
      })
      console.error(`FAIL  ${name} :: ${error.message}`)
      await page
        .screenshot({ path: path.join(screenshotDir, `failure-${slug(name)}.png`), fullPage: true })
        .catch(() => {})
      await fs
        .writeFile(
          path.join(evidenceDir, 'failure-page.txt'),
          await page.locator('body').innerText(),
        )
        .catch(() => {})
      throw error
    }
  }

  try {
    await check('authenticate through real UI', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.locator('#loginEmail').fill(email)
      await page.locator('#loginPassword').fill(password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login')),
        page.getByRole('button', { name: /sign in|login/i }).click(),
      ])
      return redactEmail(email)
    })

    const response = await page.request.get(`${apiBase}/invoices`)
    assert(response.status() === 200, `Invoice API returned HTTP ${response.status()}.`)
    const payload = await response.json()
    const invoices = payload.invoices || payload.data || []
    const representatives = [
      ...new Map(invoices.map((invoice) => [invoice.service_type, invoice])).values(),
    ]
    const expectedTypes = [
      'Industrial Hygiene',
      'Training',
      'Equipment Supply',
      'Manpower Supply',
      'Special Service',
    ]
    for (const serviceType of expectedTypes) {
      assert(
        representatives.some((invoice) => invoice.service_type === serviceType),
        `No representative ${serviceType} invoice exists in the QA database.`,
      )
    }

    for (const invoice of representatives.filter((item) =>
      expectedTypes.includes(item.service_type),
    )) {
      await check(`${invoice.service_type} detail totals and PDF reconcile`, async () => {
        const subtotal = Number(invoice.grand_total || 0) - Number(invoice.sst_amount || 0)
        const expectedSubtotal = money(subtotal)
        const expectedSst = money(invoice.sst_amount)
        const expectedGrand = money(invoice.grand_total)

        await page.setViewportSize({ width: 1440, height: 1000 })
        await page.goto(`${baseUrl}/commercial/invoice/${invoice.id}`, {
          waitUntil: 'domcontentloaded',
        })
        await page.getByText('Invoice Details', { exact: true }).waitFor()
        const section = page.getByRole('heading', { name: 'Item Breakdown' }).locator('xpath=..')
        const table = section.getByRole('table')
        await table.waitFor()

        const subtotalRow = table.getByText('Subtotal (Before SST)', { exact: true }).locator('..')
        const grandRow = table.getByText('Grand Total', { exact: true }).locator('..')
        assert(
          (await subtotalRow.innerText()).includes(expectedSubtotal),
          'Stored subtotal is not shown.',
        )
        assert(
          (await grandRow.innerText()).includes(expectedGrand),
          'Stored grand total is not shown.',
        )
        if (Number(invoice.sst_amount || 0) > 0) {
          const sstRow = table.getByText(/% SST$/, { exact: false }).locator('..')
          assert((await sstRow.innerText()).includes(expectedSst), 'Stored SST is not shown.')
        } else {
          assert(
            (await table.getByText(/% SST$/, { exact: false }).count()) === 0,
            'Zero SST row is shown.',
          )
        }

        const alignment = await grandRow.evaluate((row) => {
          const cells = [...row.querySelectorAll('td')]
          return {
            cellCount: cells.length,
            labelAlign: getComputedStyle(cells[0]).textAlign,
            valueAlign: getComputedStyle(cells[cells.length - 1]).textAlign,
            weight: Number(getComputedStyle(row).fontWeight),
          }
        })
        assert(alignment.cellCount === 2, `Grand-total row has ${alignment.cellCount} cells.`)
        assert(
          ['right', 'end'].includes(alignment.labelAlign),
          `Grand-total label alignment is ${alignment.labelAlign}.`,
        )
        assert(
          ['right', 'end'].includes(alignment.valueAlign),
          `Grand-total amount alignment is ${alignment.valueAlign}.`,
        )
        assert(alignment.weight >= 600, 'Grand-total row lacks visual emphasis.')

        await section.screenshot({
          path: path.join(screenshotDir, `${slug(invoice.service_type)}-desktop.png`),
        })

        const pdfResponse = await page.request.get(`${apiBase}/invoices/${invoice.id}/pdf`)
        assert(pdfResponse.status() === 200, `Invoice PDF returned HTTP ${pdfResponse.status()}.`)
        assert(
          String(pdfResponse.headers()['content-type'] || '').includes('application/pdf'),
          'Invoice PDF response has the wrong content type.',
        )
        const pdfPath = path.join(pdfDir, `${slug(invoice.service_type)}.pdf`)
        const textPath = path.join(pdfDir, `${slug(invoice.service_type)}.txt`)
        await fs.writeFile(pdfPath, await pdfResponse.body())
        await execFileAsync('pdftotext', ['-layout', pdfPath, textPath], {
          windowsHide: true,
          timeout: 30_000,
        })
        const pdfText = await fs.readFile(textPath, 'utf8')
        const numericGrand = Number(invoice.grand_total || 0).toLocaleString('en-MY', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        assert(pdfText.includes(numericGrand), `PDF omits stored grand total ${numericGrand}.`)
        return `${invoice.invoice_ref_no}: ${expectedSubtotal} + ${expectedSst} = ${expectedGrand}`
      })
    }

    const responsiveInvoice = representatives.find(
      (invoice) => invoice.service_type === 'Industrial Hygiene',
    )
    for (const viewport of [
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      await check(`${viewport.name} invoice footer remains reachable`, async () => {
        await page.setViewportSize(viewport)
        await page.goto(`${baseUrl}/commercial/invoice/${responsiveInvoice.id}`, {
          waitUntil: 'domcontentloaded',
        })
        const section = page.getByRole('heading', { name: 'Item Breakdown' }).locator('xpath=..')
        const scroller = section.locator('.table-responsive')
        await scroller.waitFor()
        const pageOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        assert(pageOverflow <= 1, `Page has ${pageOverflow}px horizontal overflow.`)
        const metrics = await scroller.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }))
        assert(metrics.scrollWidth > metrics.clientWidth, 'Wide table lacks internal scrolling.')
        await scroller.evaluate((element) => {
          element.scrollLeft = element.scrollWidth
        })
        const grandRow = section.getByText('Grand Total', { exact: true }).locator('..')
        await grandRow.scrollIntoViewIfNeeded()
        assert(await grandRow.isVisible(), 'Grand-total footer is not reachable.')
        await section.screenshot({
          path: path.join(screenshotDir, `industrial-hygiene-${viewport.name}-right-edge.png`),
        })
        return `${viewport.width}x${viewport.height}, internal scroll ${metrics.scrollWidth}px`
      })
    }

    await check('browser runtime is clean', async () => {
      assert(runtimeIssues.length === 0, runtimeIssues.slice(0, 8).join(' | '))
      return 'no console, page, request, or API errors'
    })
  } finally {
    await fs.writeFile(
      path.join(evidenceDir, 'result.json'),
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          frontend_url: baseUrl,
          status: checks.every((item) => item.status === 'passed') ? 'passed' : 'failed',
          checks,
          runtime_issues: runtimeIssues,
        },
        null,
        2,
      ),
    )
    await browser.close()
  }

  console.log(`\n${checks.length}/${checks.length} checks passed.`)
  console.log(`Evidence: ${evidenceDir}`)
}

run().catch((error) => {
  console.error('INVOICE-TOTALS-VISUAL-QA-FAILED', error)
  process.exitCode = 1
})
