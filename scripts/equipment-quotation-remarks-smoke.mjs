import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(
  projectRoot,
  'test-results',
  `equipment-quotation-remarks-smoke-${stamp}`,
)
const screenshotsDir = path.join(outputDir, 'screenshots')
const pdfDir = path.join(outputDir, 'pdfs')
const requestedBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000'
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD

const initialQuotationRemarks = 'SMOKE: Client requires coordinated navy-blue finish.'
const initialItemRemarks = 'SMOKE: Size XL; colour navy blue.'
const editedQuotationRemarks = 'SMOKE: Navy-blue finish and coordinated delivery labels.'
const editedItemRemarks = 'SMOKE: Size XXL; colour navy blue.'
const revisedQuotationRemarks = 'SMOKE: Final navy-blue finish; label each carton.'
const revisedItemRemarks = 'SMOKE: Final size XXL; matte navy-blue finish.'

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

const readQuote = async (page, quoteId) =>
  page.evaluate(async (id) => {
    const response = await fetch(`/proxy/quotes/equipment/${id}`, { credentials: 'include' })
    return { status: response.status, payload: await response.json() }
  }, quoteId)

const selectFirstOption = async (page, placeholder) => {
  const select = page.locator('.react-select-container').filter({ hasText: placeholder })
  await select.getByRole('combobox').click()
  const option = page.locator('.react-select__option').first()
  await option.waitFor()
  const label = (await option.textContent())?.trim() || 'first available option'
  await option.click()
  return label
}

const saveEquipmentQuote = async (page, quoteId = null) => {
  const method = quoteId ? 'PUT' : 'POST'
  const endpoint = quoteId ? `/proxy/quotes/equipment/${quoteId}` : '/proxy/quotes/equipment'
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(endpoint) && response.request().method() === method,
  )
  await page.getByRole('button', { name: /^(Save|Update)/ }).click()
  const response = await responsePromise
  return { response, payload: await readJsonResponse(response) }
}

const run = async () => {
  const baseUrl = validateSmokeTarget(requestedBaseUrl)
  if (!email || !password) {
    throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD environment variables are required.')
  }

  await fs.mkdir(screenshotsDir, { recursive: true })
  await fs.mkdir(pdfDir, { recursive: true })

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
  let fixtureDeleted = false
  let quoteRefNo = ''

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
    await page.locator('#loginEmail').fill(email)
    await page.locator('#loginPassword').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { waitUntil: 'commit' }),
      page.locator('button[type="submit"]').click(),
    ])
    check('real-ui-login', true)

    await page.goto(`${baseUrl}/crm/quotes?service=equipment`, { waitUntil: 'commit' })
    await page.getByText('Client / Company', { exact: true }).waitFor()
    const clientLabel = await selectFirstOption(page, 'Search client')
    await page.locator('#serviceType').waitFor()
    await page.locator('#serviceType').selectOption('equipment')
    const sourceLabel = await selectFirstOption(page, 'Select Source...')
    await page.getByText('Equipment Supply List', { exact: true }).waitFor()
    const equipmentLabel = await selectFirstOption(page, 'Select equipment...')
    check('create-form-selections', true, `${clientLabel}; ${sourceLabel}; ${equipmentLabel}`)

    await page.locator('#equipmentQuotationRemarks').fill(initialQuotationRemarks)
    await page.getByLabel('Estimated Cost (RM)').fill('1')
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    const itemRemarksInput = page.locator('textarea[id^="equipmentItemRemarks-"]').first()
    await itemRemarksInput.fill(initialItemRemarks)
    const initialGrandTotal = Number(
      await page
        .getByText('Grand Total (RM)', { exact: true })
        .locator('..')
        .locator('input')
        .inputValue(),
    )
    requireCheck('create-pricing-is-valid', initialGrandTotal > 0, `RM ${initialGrandTotal}`)
    await page.screenshot({
      path: path.join(screenshotsDir, '01-create-with-remarks.png'),
      fullPage: true,
    })

    const create = await saveEquipmentQuote(page)
    createdQuoteId = Number(create.payload.quote_id || create.payload.data?.quote_id || 0)
    quoteRefNo = create.payload.quote_ref_no || create.payload.data?.quote_ref_no || ''
    requireCheck(
      'create-api-success',
      create.response.status() === 200 && createdQuoteId > 0,
      `HTTP ${create.response.status()}, quote #${createdQuoteId || 'unknown'}`,
    )

    const createdQuote = await readQuote(page, createdQuoteId)
    requireCheck(
      'create-persists-both-remark-scopes',
      createdQuote.status === 200 &&
        createdQuote.payload?.data?.quotation_remarks === initialQuotationRemarks &&
        createdQuote.payload?.data?.items?.[0]?.item_remarks === initialItemRemarks,
      `HTTP ${createdQuote.status}`,
    )
    check(
      'create-remarks-do-not-change-price',
      Number(createdQuote.payload?.data?.grand_total) === initialGrandTotal,
      `UI=${initialGrandTotal}, API=${createdQuote.payload?.data?.grand_total}`,
    )

    await page.goto(`${baseUrl}/crm/quotes?service=equipment&edit=true&quoteId=${createdQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Edit Quotation', { exact: true }).waitFor()
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    requireCheck(
      'edit-hydrates-both-remark-scopes',
      (await page.locator('#equipmentQuotationRemarks').inputValue()) === initialQuotationRemarks &&
        (await page.locator('textarea[id^="equipmentItemRemarks-"]').first().inputValue()) ===
          initialItemRemarks,
    )
    await page.locator('#equipmentQuotationRemarks').fill(editedQuotationRemarks)
    await page.locator('textarea[id^="equipmentItemRemarks-"]').first().fill(editedItemRemarks)
    const edit = await saveEquipmentQuote(page, createdQuoteId)
    requireCheck(
      'edit-api-success',
      edit.response.status() === 200,
      `HTTP ${edit.response.status()}`,
    )

    const editedQuote = await readQuote(page, createdQuoteId)
    check(
      'edit-persists-without-repricing',
      editedQuote.payload?.data?.quotation_remarks === editedQuotationRemarks &&
        editedQuote.payload?.data?.items?.[0]?.item_remarks === editedItemRemarks &&
        Number(editedQuote.payload?.data?.grand_total) === initialGrandTotal &&
        Number(editedQuote.payload?.data?.revision_no) === 0,
      `revision=${editedQuote.payload?.data?.revision_no}, total=${editedQuote.payload?.data?.grand_total}`,
    )

    await page.goto(
      `${baseUrl}/crm/quotes?service=equipment&edit=true&quoteId=${createdQuoteId}&isRevision=true`,
      { waitUntil: 'commit' },
    )
    await page.getByText(/revising the existing quotation/i).waitFor()
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    await page.locator('#equipmentQuotationRemarks').fill(revisedQuotationRemarks)
    await page.locator('textarea[id^="equipmentItemRemarks-"]').first().fill(revisedItemRemarks)
    const revision = await saveEquipmentQuote(page, createdQuoteId)
    requireCheck(
      'revision-api-success',
      revision.response.status() === 200,
      `HTTP ${revision.response.status()}`,
    )

    const revisedQuote = await readQuote(page, createdQuoteId)
    check(
      'revision-persists-both-scopes-and-increments',
      revisedQuote.payload?.data?.quotation_remarks === revisedQuotationRemarks &&
        revisedQuote.payload?.data?.items?.[0]?.item_remarks === revisedItemRemarks &&
        Number(revisedQuote.payload?.data?.grand_total) === initialGrandTotal &&
        Number(revisedQuote.payload?.data?.revision_no) === 1,
      `revision=${revisedQuote.payload?.data?.revision_no}, total=${revisedQuote.payload?.data?.grand_total}`,
    )

    const invoiceLookup = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/invoices/quote/equipment/${quoteId}`, {
        credentials: 'include',
      })
      return { status: response.status, payload: await response.json() }
    }, createdQuoteId)
    const invoiceQuote = invoiceLookup.payload?.data || invoiceLookup.payload
    check(
      'invoice-contract-includes-both-scopes',
      invoiceLookup.status === 200 &&
        invoiceQuote?.quotation_remarks === revisedQuotationRemarks &&
        invoiceQuote?.equipment_items?.[0]?.item_remarks === revisedItemRemarks,
      `HTTP ${invoiceLookup.status}`,
    )

    const pdfResponse = await context.request.get(
      `${baseUrl}/proxy/quote-records/equipment/${createdQuoteId}/pdf?quote_id=${createdQuoteId}`,
    )
    const pdfBody = await pdfResponse.body()
    await fs.writeFile(path.join(pdfDir, `equipment-quote-${createdQuoteId}.pdf`), pdfBody)
    check(
      'pdf-generation',
      pdfResponse.status() === 200 &&
        (pdfResponse.headers()['content-type'] || '').includes('application/pdf') &&
        pdfBody.byteLength > 1000,
      `HTTP ${pdfResponse.status()}, ${pdfBody.byteLength} bytes`,
    )

    await page.goto(`${baseUrl}/crm/records/equipment-supply/${createdQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Quotation Details', { exact: true }).waitFor()
    await page.getByText('Equipment Items', { exact: true }).waitFor()
    await page.getByText(revisedQuotationRemarks, { exact: true }).waitFor()
    check(
      'record-detail-renders-both-scopes',
      (await page.getByText(revisedQuotationRemarks, { exact: true }).count()) > 0 &&
        (await page
          .locator('span')
          .filter({ hasText: 'Client specifications:' })
          .filter({ hasText: revisedItemRemarks })
          .count()) > 0,
    )
    await page.screenshot({
      path: path.join(screenshotsDir, '02-record-detail-desktop.png'),
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: path.join(screenshotsDir, '03-record-detail-mobile.png'),
      fullPage: true,
    })
  } catch (error) {
    await page
      .screenshot({ path: path.join(screenshotsDir, 'smoke-failure.png'), fullPage: true })
      .catch(() => {})
    await fs
      .writeFile(path.join(outputDir, 'failure-page.txt'), await page.locator('body').innerText())
      .catch(() => {})
    throw error
  } finally {
    if (createdQuoteId) {
      try {
        const cleanup = await page.evaluate(async (quoteId) => {
          const response = await fetch(`/proxy/quote-records/equipment/${quoteId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
          return { status: response.status, payload: await response.json() }
        }, createdQuoteId)
        fixtureDeleted = cleanup.status === 200 && cleanup.payload?.status === 'success'
        check('temporary-quote-cleaned-up', fixtureDeleted, `HTTP ${cleanup.status}`)
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
    createdQuoteId,
    quoteRefNo,
    fixtureDeleted,
    findings,
    consoleErrors,
    pageErrors,
    requestFailures,
    unexpectedApiResponses,
    artifacts: { screenshots: 'screenshots', pdfs: 'pdfs' },
  }
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2))

  const failures = findings.filter((finding) => !finding.ok)
  console.log(
    `\n${findings.length - failures.length}/${findings.length} checks passed; evidence: ${outputDir}`,
  )
  if (failures.length) process.exitCode = 1
}

run().catch(async (error) => {
  console.error('EQUIPMENT-QUOTATION-REMARKS-SMOKE-CRASH', error)
  findings.push({ name: 'smoke-script-completed', ok: false, detail: error.message })
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(
    path.join(outputDir, 'result.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        smokeAccount: redactEmail(email),
        findings,
        crash: error.stack,
      },
      null,
      2,
    ),
  )
  process.exitCode = 2
})
