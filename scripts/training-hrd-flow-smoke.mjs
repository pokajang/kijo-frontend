import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const execFileAsync = promisify(execFile)
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `training-hrd-flow-smoke-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const pdfsDir = path.join(outputDir, 'pdfs')
const requestedBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000'
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
let baseUrl = requestedBaseUrl

const findings = []
const check = (name, ok, detail = '') => {
  findings.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`)
}

const requireCheck = (name, ok, detail = '') => {
  check(name, ok, detail)
  if (!ok) throw new Error(`${name}${detail ? `: ${detail}` : ''}`)
}

const readJsonResponse = async (response) => {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

const normalizeApiRow = (payload) => payload?.data || payload || {}

const extractPdfText = async (pdfPath) => {
  const { stdout } = await execFileAsync('pdftotext', [pdfPath, '-'], {
    windowsHide: true,
    timeout: 30_000,
  })
  return stdout.replace(/\s+/g, ' ').trim()
}

const fetchQuote = (page, quoteId) =>
  page.evaluate(async (id) => {
    const response = await fetch(`/proxy/quotes/training/${id}`, { credentials: 'include' })
    return { status: response.status, payload: await response.json() }
  }, quoteId)

const fetchInvoiceQuote = (page, quoteId) =>
  page.evaluate(async (id) => {
    const response = await fetch(`/proxy/invoices/quote/training/${id}`, {
      credentials: 'include',
    })
    return { status: response.status, payload: await response.json() }
  }, quoteId)

const downloadQuotePdf = async (context, quoteId, filename) => {
  const response = await context.request.get(
    `${baseUrl}/proxy/quote-records/training/${quoteId}/pdf?quote_id=${quoteId}`,
  )
  const body = await response.body()
  const pdfPath = path.join(pdfsDir, filename)
  await fs.writeFile(pdfPath, body)

  return {
    status: response.status(),
    contentType: response.headers()['content-type'] || '',
    body,
    pdfPath,
  }
}

const selectFirstOption = async (page, placeholderText) => {
  const select = page.locator('.react-select-container').filter({ hasText: placeholderText })
  await select.getByRole('combobox').click()
  const option = page.locator('.react-select__option').first()
  await option.waitFor()
  const label = (await option.textContent())?.trim() || 'first available option'
  await option.click()
  return label
}

const run = async () => {
  baseUrl = validateSmokeTarget(requestedBaseUrl)
  if (!email) throw new Error('SMOKE_EMAIL environment variable is required.')
  if (!password) throw new Error('SMOKE_PASSWORD environment variable is required.')

  await fs.mkdir(screenshotsDir, { recursive: true })
  await fs.mkdir(pdfsDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(90_000)
  page.setDefaultNavigationTimeout(120_000)

  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []
  const unexpectedApiResponses = []
  let createdQuoteId = null
  let createdQuoteDeleted = false

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || ''
    if (!reason.includes('ERR_ABORTED')) {
      requestFailures.push(`${request.method()} ${request.url()} ${reason}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/proxy/')) {
      unexpectedApiResponses.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      )
    }
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'commit' })
    await page.locator('#loginEmail').waitFor()
    await page.fill('#loginEmail', email)
    await page.fill('#loginPassword', password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { waitUntil: 'commit' }),
      page.click('button[type="submit"]'),
    ])
    check('real-ui-login', true, page.url())

    await page.goto(`${baseUrl}/crm/quotes?service=training`, { waitUntil: 'commit' })
    await page.getByText('Client / Company', { exact: true }).waitFor()
    const clientLabel = await selectFirstOption(page, 'Search client')
    check('client-selection-through-ui', true, clientLabel)

    requireCheck(
      'training-service-selected',
      (await page.getByLabel('Service Type').inputValue()) === 'training',
    )
    const sourceLabel = await selectFirstOption(page, 'Select Source...')
    check('inquiry-source-selection-through-ui', true, sourceLabel)

    await page.getByText('Training Details', { exact: true }).waitFor()
    const trainingLabel = await selectFirstOption(page, 'Search and select training topic...')
    check('training-topic-selection-through-ui', true, trainingLabel)
    await page.getByLabel('Training Venue').fill('SMOKE TEST - Temporary client site')

    await page.getByText('Traffic Light', { exact: true }).waitFor()
    await page.getByLabel('Estimated Cost (RM)').fill('1000')
    await page.getByText('Pricing Details', { exact: true }).waitFor()

    const hrdInput = page.getByLabel('HRD Charge')
    requireCheck('new-quote-hrd-input-enabled', await hrdInput.isEnabled())
    check('new-quote-hrd-rate-is-zero', (await hrdInput.inputValue()) === '0')
    check(
      'no-auto-rate-help-visible',
      await page
        .getByText('Enter the applicable HRD rate. No rate is applied automatically.')
        .isVisible(),
    )

    const zeroHrdReviewRow = page.locator('tr').filter({ hasText: 'HRD Charge' }).last()
    await zeroHrdReviewRow.waitFor()
    const zeroHrdReviewText = (await zeroHrdReviewRow.innerText()).replace(/\s+/g, ' ')
    check(
      'zero-rate-review',
      zeroHrdReviewText.includes('RM 0.00') && zeroHrdReviewText.includes('(0%'),
      zeroHrdReviewText,
    )

    await page.screenshot({
      path: path.join(screenshotsDir, '01-new-quote-zero-hrd.png'),
      fullPage: true,
    })

    let createRequestHrdRate = null
    const createResponsePromise = page.waitForResponse((response) => {
      const request = response.request()
      if (response.url().includes('/proxy/quotes/training') && request.method() === 'POST') {
        createRequestHrdRate = request.postDataJSON()?.hrd_charge
        return true
      }
      return false
    })
    await page.getByRole('button', { name: 'Save Quote', exact: true }).click()
    const createResponse = await createResponsePromise
    const createPayload = await readJsonResponse(createResponse)
    createdQuoteId = Number(createPayload.quote_id || createPayload.data?.quote_id || 0)
    requireCheck(
      'zero-rate-create-api',
      createResponse.status() === 200 && createdQuoteId > 0,
      `HTTP ${createResponse.status()}, quote #${createdQuoteId || 'unknown'}`,
    )
    check('zero-rate-create-request', Number(createRequestHrdRate) === 0)

    const zeroQuoteResponse = await fetchQuote(page, createdQuoteId)
    const zeroQuote = normalizeApiRow(zeroQuoteResponse.payload)
    requireCheck(
      'zero-rate-server-persistence',
      zeroQuoteResponse.status === 200 &&
        Number(zeroQuote.hrd_charge) === 0 &&
        Number(zeroQuote.hrd_amount) === 0,
      `rate=${zeroQuote.hrd_charge}, amount=${zeroQuote.hrd_amount}`,
    )

    const zeroPdf = await downloadQuotePdf(
      context,
      createdQuoteId,
      `training-zero-hrd-${createdQuoteId}.pdf`,
    )
    requireCheck(
      'zero-rate-pdf-generation',
      zeroPdf.status === 200 &&
        zeroPdf.contentType.includes('application/pdf') &&
        zeroPdf.body.byteLength > 1000,
      `HTTP ${zeroPdf.status}, ${zeroPdf.body.byteLength} bytes`,
    )
    const zeroPdfText = await extractPdfText(zeroPdf.pdfPath)
    check('zero-rate-pdf-omits-hrd-row', !zeroPdfText.includes('HRD Charge (RM)'))

    const zeroInvoiceResponse = await fetchInvoiceQuote(page, createdQuoteId)
    const zeroInvoiceQuote = normalizeApiRow(zeroInvoiceResponse.payload)
    check(
      'zero-rate-invoice-contract',
      zeroInvoiceResponse.status === 200 &&
        Number(zeroInvoiceQuote.hrd_charge) === 0 &&
        Number(zeroInvoiceQuote.hrd_amount) === 0,
      `HTTP ${zeroInvoiceResponse.status}`,
    )

    await page.goto(`${baseUrl}/crm/quotes?service=training&edit=true&quoteId=${createdQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    const editHrdInput = page.getByLabel('HRD Charge')
    check('edit-preserves-zero-rate', (await editHrdInput.inputValue()) === '0')
    await editHrdInput.fill('4')

    const explicitReviewRow = page.locator('tr').filter({ hasText: 'HRD Charge' }).last()
    await explicitReviewRow.waitFor()
    const explicitReviewText = (await explicitReviewRow.innerText()).replace(/\s+/g, ' ')
    check(
      'explicit-rate-review',
      explicitReviewText.includes('(4%') && !explicitReviewText.includes('RM 0.00'),
      explicitReviewText,
    )

    await page.screenshot({
      path: path.join(screenshotsDir, '02-edit-explicit-four-percent.png'),
      fullPage: true,
    })

    let updateRequestHrdRate = null
    const updateResponsePromise = page.waitForResponse((response) => {
      const request = response.request()
      if (
        response.url().includes(`/proxy/quotes/training/${createdQuoteId}`) &&
        request.method() === 'PUT'
      ) {
        updateRequestHrdRate = request.postDataJSON()?.hrd_charge
        return true
      }
      return false
    })
    await page.getByRole('button', { name: 'Update Quote', exact: true }).click()
    const updateResponse = await updateResponsePromise
    check('explicit-rate-update-api', updateResponse.status() === 200)
    check('explicit-rate-update-request', Number(updateRequestHrdRate) === 4)

    const explicitQuoteResponse = await fetchQuote(page, createdQuoteId)
    const explicitQuote = normalizeApiRow(explicitQuoteResponse.payload)
    const expectedHrdAmount =
      Math.max(Number(explicitQuote.training_total) - Number(explicitQuote.discount_amount), 0) *
      0.04
    requireCheck(
      'explicit-rate-server-persistence',
      explicitQuoteResponse.status === 200 &&
        Number(explicitQuote.hrd_charge) === 4 &&
        Math.abs(Number(explicitQuote.hrd_amount) - expectedHrdAmount) < 0.01,
      `rate=${explicitQuote.hrd_charge}, amount=${explicitQuote.hrd_amount}, expected=${expectedHrdAmount}`,
    )

    const explicitPdf = await downloadQuotePdf(
      context,
      createdQuoteId,
      `training-four-percent-hrd-${createdQuoteId}.pdf`,
    )
    requireCheck(
      'explicit-rate-pdf-generation',
      explicitPdf.status === 200 &&
        explicitPdf.contentType.includes('application/pdf') &&
        explicitPdf.body.byteLength > 1000,
      `HTTP ${explicitPdf.status}, ${explicitPdf.body.byteLength} bytes`,
    )
    const explicitPdfText = await extractPdfText(explicitPdf.pdfPath)
    check(
      'explicit-rate-pdf-displays-hrd-row',
      explicitPdfText.includes('4% HRD Charge (RM)') &&
        explicitPdfText.includes(Number(explicitQuote.hrd_amount).toFixed(2)),
    )

    const explicitInvoiceResponse = await fetchInvoiceQuote(page, createdQuoteId)
    const explicitInvoiceQuote = normalizeApiRow(explicitInvoiceResponse.payload)
    check(
      'explicit-rate-invoice-contract',
      explicitInvoiceResponse.status === 200 &&
        Number(explicitInvoiceQuote.hrd_charge) === 4 &&
        Number(explicitInvoiceQuote.hrd_amount) === Number(explicitQuote.hrd_amount),
      `HTTP ${explicitInvoiceResponse.status}`,
    )

    await page.goto(`${baseUrl}/crm/records/training/${createdQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Quotation Details', { exact: true }).waitFor()
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quote-records/training/${createdQuoteId}`) &&
        response.request().method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    const confirmDelete = page.getByRole('dialog').getByRole('button', {
      name: 'Delete',
      exact: true,
    })
    await confirmDelete.waitFor()
    await confirmDelete.click()
    const deleteResponse = await deleteResponsePromise
    createdQuoteDeleted = deleteResponse.status() === 200
    check('temporary-quote-ui-delete', createdQuoteDeleted, `HTTP ${deleteResponse.status()}`)
  } catch (error) {
    await page
      .screenshot({
        path: path.join(screenshotsDir, 'smoke-failure.png'),
        fullPage: true,
      })
      .catch(() => {})
    await fs
      .writeFile(path.join(outputDir, 'failure-page.txt'), await page.locator('body').innerText())
      .catch(() => {})
    throw error
  } finally {
    if (createdQuoteId && !createdQuoteDeleted) {
      try {
        const cleanup = await page.evaluate(async (quoteId) => {
          const response = await fetch(`/proxy/quote-records/training/${quoteId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
          return { status: response.status, payload: await response.json() }
        }, createdQuoteId)
        check(
          'temporary-quote-cleaned-up',
          cleanup.status === 200 && cleanup.payload?.status === 'success',
          `HTTP ${cleanup.status}`,
        )
      } catch (error) {
        check('temporary-quote-cleaned-up', false, error.message)
      }
    }
    await browser.close()
  }

  check('no-page-errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
  check('no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
  check(
    'no-request-failures',
    requestFailures.length === 0,
    requestFailures.slice(0, 3).join(' | '),
  )
  check(
    'no-unexpected-api-errors',
    unexpectedApiResponses.length === 0,
    unexpectedApiResponses.slice(0, 5).join(' | '),
  )

  const result = {
    at: new Date().toISOString(),
    baseUrl,
    smokeAccount: redactEmail(email),
    artifacts: {
      screenshots: 'screenshots',
      pdfs: 'pdfs',
    },
    createdQuoteId,
    createdQuoteDeleted,
    findings,
    consoleErrors,
    pageErrors,
    requestFailures,
    unexpectedApiResponses,
  }
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2))
  const failures = findings.filter((finding) => !finding.ok)
  console.log(
    `\n${findings.length - failures.length}/${findings.length} checks passed; evidence: ${outputDir}`,
  )
  if (failures.length) process.exitCode = 1
}

run().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})
