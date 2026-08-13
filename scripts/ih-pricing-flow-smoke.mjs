import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const backendRoot = path.resolve(projectRoot, '..', 'backend-laravel')
const execFileAsync = promisify(execFile)
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `ih-pricing-flow-smoke-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const pdfsDir = path.join(outputDir, 'pdfs')
const requestedBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000'
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
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

const runFixtureCommand = async (args) => {
  const { stdout } = await execFileAsync(
    process.env.PHP_BINARY || 'php',
    ['artisan', 'quotes:ih-smoke-fixture', ...args],
    {
      cwd: backendRoot,
      windowsHide: true,
      timeout: 60_000,
    },
  )
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines.reverse()) {
    try {
      return JSON.parse(line)
    } catch {
      // Artisan may print non-JSON status lines before the fixture result.
    }
  }

  throw new Error(`IH smoke fixture command returned no JSON result: ${stdout.trim()}`)
}

const gitRevision = async (cwd) => {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd,
      windowsHide: true,
      timeout: 10_000,
    })
    return stdout.trim()
  } catch {
    return null
  }
}

const run = async () => {
  baseUrl = validateSmokeTarget(requestedBaseUrl)
  if (!password) throw new Error('SMOKE_PASSWORD environment variable is required.')

  await fs.mkdir(screenshotsDir, { recursive: true })
  await fs.mkdir(pdfsDir, { recursive: true })
  const sourceRevisions = {
    frontend: await gitRevision(projectRoot),
    backend: await gitRevision(backendRoot),
  }
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
  let legacyQuoteId = null
  let intermediateQuoteId = null

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

    await page.goto(`${baseUrl}/crm/quotes?service=ih`, { waitUntil: 'commit' })
    await page.getByText('Client / Company', { exact: true }).waitFor()
    await page.getByText('Search client', { exact: true }).waitFor()
    check('new-ih-route-loads', true)

    await page
      .locator('.react-select-container')
      .filter({ hasText: 'Search client' })
      .locator('input')
      .click()
    const clientOption = page.locator('.react-select__option').first()
    await clientOption.waitFor()
    const clientLabel = (await clientOption.textContent())?.trim() || 'first available client'
    const branchesResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/client-companies/') && response.url().includes('/branches'),
    )
    await clientOption.click()
    await branchesResponsePromise
    await page.getByLabel('Service Type').waitFor()
    check('client-selection-through-ui', true, clientLabel)

    const rehydratedBranchesResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/client-companies/') && response.url().includes('/branches'),
    )
    await page.goto(`${baseUrl}/crm/quotes?service=ih`, { waitUntil: 'commit' })
    await rehydratedBranchesResponsePromise
    await page.locator('#serviceType').selectOption('ih')
    await page.waitForTimeout(1000)
    requireCheck(
      'ih-service-selector-state',
      (await page.locator('#serviceType').inputValue()) === 'ih',
      `${page.url()} value=${await page.locator('#serviceType').inputValue()}`,
    )
    await page
      .locator('.react-select-container')
      .filter({ hasText: 'Select Source...' })
      .getByRole('combobox')
      .click()
    await page.locator('.react-select__option').first().click()
    await page.getByText('Industrial Hygiene Details', { exact: true }).waitFor()
    await page
      .locator('.react-select-container')
      .filter({ hasText: 'Select IH service type...' })
      .locator('input')
      .click()
    const serviceOption = page.locator('.react-select__option').first()
    await serviceOption.waitFor()
    const serviceLabel = (await serviceOption.textContent())?.trim() || 'first available service'
    await serviceOption.click()
    check('ih-service-selection-through-ui', true, serviceLabel)

    await page.locator('input[name="sampleCounts"]').fill('2')
    await page.getByText('Traffic Light', { exact: true }).waitFor()
    check(
      'new-flow-pricing-gated-before-estimate',
      (await page.getByText('Pricing Details', { exact: true }).count()) === 0,
    )

    await page.getByLabel('Estimated Cost (RM)').fill('500')
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    check('new-flow-pricing-opens-after-estimate', true)
    check(
      'new-flow-does-not-show-complexity',
      (await page.getByText('Legacy Complexity Rating', { exact: true }).count()) === 0,
    )
    check(
      'new-flow-supports-additional-fees',
      await page.getByRole('button', { name: 'Add Miscellaneous Fee' }).isVisible(),
    )

    await page.locator('input[name="discount"]').fill('0')
    await page.getByRole('button', { name: 'Add Miscellaneous Fee' }).click()
    const itemInput = page.getByPlaceholder('Blank sample')
    await itemInput.fill('Smoke laboratory fee')
    const itemRow = itemInput.locator('xpath=ancestor::tr')
    const numberInputs = itemRow.locator('input[type="number"]')
    await numberInputs.nth(0).fill('2')
    await numberInputs.nth(1).fill('100')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByText('Smoke laboratory fee', { exact: true }).first().waitFor()
    check('new-flow-additional-fee-calculates', await page.getByText('1200.00').first().isVisible())

    await page.screenshot({
      path: path.join(screenshotsDir, '01-new-v2-ready-to-save.png'),
      fullPage: true,
    })

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/proxy/quotes/ih') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Save Quote', exact: true }).click()
    const createResponse = await createResponsePromise
    const createPayload = await readJsonResponse(createResponse)
    createdQuoteId = Number(createPayload.quote_id || createPayload.data?.quote_id || 0)
    requireCheck(
      'new-flow-create-api',
      createResponse.status() === 200 && createdQuoteId > 0,
      `HTTP ${createResponse.status()}, quote #${createdQuoteId || 'unknown'}`,
    )

    const createdQuote = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/quotes/ih/${quoteId}`, { credentials: 'include' })
      return { status: response.status, payload: await response.json() }
    }, createdQuoteId)
    requireCheck(
      'new-flow-server-selects-v2',
      createdQuote.status === 200 &&
        createdQuote.payload?.data?.pricing_rule_version === 'ih_standard_v2',
      createdQuote.payload?.data?.pricing_rule_version || `HTTP ${createdQuote.status}`,
    )
    check(
      'new-flow-server-persists-additional-fee',
      createdQuote.payload?.data?.hygiene_items?.[0]?.item_description === 'Smoke laboratory fee',
    )
    check(
      'new-flow-server-total',
      Number(createdQuote.payload?.data?.grand_total) === 1200,
      String(createdQuote.payload?.data?.grand_total),
    )

    await page.goto(`${baseUrl}/crm/quotes?service=ih&edit=true&quoteId=${createdQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    await page.locator('input[name="unitPrice"]').fill('550')
    const updateV2ResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quotes/ih/${createdQuoteId}`) &&
        response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Update Quote', exact: true }).click()
    const updateV2Response = await updateV2ResponsePromise
    check(
      'new-flow-edit-api',
      updateV2Response.status() === 200,
      `HTTP ${updateV2Response.status()}`,
    )

    const updatedV2 = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/quotes/ih/${quoteId}`, { credentials: 'include' })
      return { status: response.status, payload: await response.json() }
    }, createdQuoteId)
    check(
      'new-flow-edit-persists-and-recalculates',
      Number(updatedV2.payload?.data?.unit_price) === 550 &&
        Number(updatedV2.payload?.data?.grand_total) === 1300,
      `unit=${updatedV2.payload?.data?.unit_price}, total=${updatedV2.payload?.data?.grand_total}`,
    )

    await page.goto(
      `${baseUrl}/crm/quotes?service=ih&edit=true&quoteId=${createdQuoteId}&isRevision=true`,
      { waitUntil: 'commit' },
    )
    await page.locator('textarea[name="inquiryRemarks"]').waitFor()
    await page.locator('textarea[name="inquiryRemarks"]').fill('V2 lifecycle smoke revision')
    const reviseV2ResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quotes/ih/${createdQuoteId}`) &&
        response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Update Quote', exact: true }).click()
    const reviseV2Response = await reviseV2ResponsePromise
    const reviseV2Payload = await readJsonResponse(reviseV2Response)
    check(
      'new-flow-revision-increments',
      reviseV2Response.status() === 200 && Number(reviseV2Payload?.data?.revision_no) === 1,
      `HTTP ${reviseV2Response.status()}, revision ${reviseV2Payload?.data?.revision_no}`,
    )

    const v2PdfResponse = await context.request.get(
      `${baseUrl}/proxy/quote-records/ih/${createdQuoteId}/pdf?quote_id=${createdQuoteId}`,
    )
    const v2PdfBody = await v2PdfResponse.body()
    await fs.writeFile(path.join(pdfsDir, `ih-v2-quote-${createdQuoteId}.pdf`), v2PdfBody)
    check(
      'new-flow-pdf-generation',
      v2PdfResponse.status() === 200 &&
        (v2PdfResponse.headers()['content-type'] || '').includes('application/pdf') &&
        v2PdfBody.byteLength > 1000,
      `HTTP ${v2PdfResponse.status()}, ${v2PdfBody.byteLength} bytes`,
    )

    const v2InvoiceLookup = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/invoices/quote/ih/${quoteId}`, {
        credentials: 'include',
      })
      return { status: response.status, payload: await response.json() }
    }, createdQuoteId)
    check(
      'new-flow-invoice-conversion-contract',
      v2InvoiceLookup.status === 200 &&
        v2InvoiceLookup.payload?.data?.pricing_rule_version === 'ih_standard_v2' &&
        v2InvoiceLookup.payload?.data?.hygiene_items?.length === 1,
      `HTTP ${v2InvoiceLookup.status}`,
    )

    const legacyFixture = await runFixtureCommand([
      'prepare',
      `--source-id=${createdQuoteId}`,
      '--complexity=4',
    ])
    legacyQuoteId = Number(legacyFixture.quote_id || 0)
    requireCheck(
      'legacy-fixture-prepared',
      legacyQuoteId > 0 && legacyFixture.pricing_rule_version === 'ih_complexity_v1',
      `quote #${legacyQuoteId || 'unknown'}`,
    )

    await page.goto(`${baseUrl}/crm/quotes?service=ih&edit=true&quoteId=${legacyQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Edit Quotation', { exact: true }).waitFor()
    await page.getByText('Legacy Complexity Rating', { exact: true }).waitFor()
    const complexityInput = page.locator('input[name="complexityRating"]')
    const legacyRating = await complexityInput.inputValue()
    check('legacy-flow-complexity-visible', true, `rating ${legacyRating}`)
    check('legacy-flow-complexity-read-only', await complexityInput.isDisabled())
    check(
      'legacy-flow-pricing-visible-without-new-estimate',
      await page.getByText('Pricing Details', { exact: true }).isVisible(),
    )
    check(
      'legacy-flow-hides-v2-additional-fees',
      (await page.getByRole('button', { name: 'Add Miscellaneous Fee' }).count()) === 0,
    )
    check(
      'legacy-flow-review-preserves-formatting',
      await page.getByText(/x Complexity: \d+ \(\d\.\d+x\)/).isVisible(),
    )
    check(
      'legacy-flow-can-reach-update-action',
      await page.getByRole('button', { name: 'Update Quote', exact: true }).isVisible(),
    )

    const legacyApi = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/quotes/ih/${quoteId}`, { credentials: 'include' })
      return { status: response.status, payload: await response.json() }
    }, legacyQuoteId)
    requireCheck(
      'legacy-flow-api-contract',
      legacyApi.status === 200 &&
        legacyApi.payload?.data?.pricing_rule_version === 'ih_complexity_v1' &&
        Number(legacyApi.payload?.data?.complexity_rating) === Number(legacyRating),
      `HTTP ${legacyApi.status}`,
    )

    const storedLegacyTotal = Number(legacyApi.payload?.data?.grand_total)
    const legacyUpdateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quotes/ih/${legacyQuoteId}`) &&
        response.request().method() === 'PUT',
    )
    await page.locator('textarea[name="inquiryRemarks"]').fill('Legacy non-pricing smoke edit')
    await page.getByRole('button', { name: 'Update Quote', exact: true }).click()
    const legacyUpdateResponse = await legacyUpdateResponsePromise
    const preservedLegacy = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/quotes/ih/${quoteId}`, { credentials: 'include' })
      return { status: response.status, payload: await response.json() }
    }, legacyQuoteId)
    check(
      'legacy-flow-non-pricing-edit-preserves-total',
      legacyUpdateResponse.status() === 200 &&
        Number(preservedLegacy.payload?.data?.grand_total) === storedLegacyTotal,
      `before=${storedLegacyTotal}, after=${preservedLegacy.payload?.data?.grand_total}`,
    )

    await page.goto(
      `${baseUrl}/crm/quotes?service=ih&edit=true&quoteId=${legacyQuoteId}&isRevision=true`,
      { waitUntil: 'commit' },
    )
    await page.locator('input[name="unitPrice"]').waitFor()
    await page.locator('input[name="unitPrice"]').fill('600')
    await page.getByRole('button', { name: 'Continue and Recalculate' }).click()
    await page.getByText('Historical pricing inputs changed').waitFor({ state: 'hidden' })
    const legacyRevisionResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quotes/ih/${legacyQuoteId}`) &&
        response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Update Quote', exact: true }).click()
    const legacyRevisionResponse = await legacyRevisionResponsePromise
    const legacyRevisionPayload = await readJsonResponse(legacyRevisionResponse)
    const revisedLegacy = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/quotes/ih/${quoteId}`, { credentials: 'include' })
      return { status: response.status, payload: await response.json() }
    }, legacyQuoteId)
    check(
      'legacy-flow-revision-recalculates-with-complexity',
      legacyRevisionResponse.status() === 200 &&
        Number(legacyRevisionPayload?.data?.revision_no) === 1 &&
        revisedLegacy.payload?.data?.pricing_rule_version === 'ih_complexity_v1' &&
        Number(revisedLegacy.payload?.data?.grand_total) === 1560,
      `revision=${legacyRevisionPayload?.data?.revision_no}, total=${revisedLegacy.payload?.data?.grand_total}`,
    )

    const legacyPdfResponse = await context.request.get(
      `${baseUrl}/proxy/quote-records/ih/${legacyQuoteId}/pdf?quote_id=${legacyQuoteId}`,
    )
    const legacyPdfBody = await legacyPdfResponse.body()
    await fs.writeFile(
      path.join(pdfsDir, `ih-complexity-v1-quote-${legacyQuoteId}.pdf`),
      legacyPdfBody,
    )
    check(
      'legacy-flow-pdf-generation',
      legacyPdfResponse.status() === 200 &&
        (legacyPdfResponse.headers()['content-type'] || '').includes('application/pdf') &&
        legacyPdfBody.byteLength > 1000,
      `HTTP ${legacyPdfResponse.status()}, ${legacyPdfBody.byteLength} bytes`,
    )

    const legacyInvoiceLookup = await page.evaluate(async (quoteId) => {
      const response = await fetch(`/proxy/invoices/quote/ih/${quoteId}`, {
        credentials: 'include',
      })
      return { status: response.status, payload: await response.json() }
    }, legacyQuoteId)
    check(
      'legacy-flow-invoice-conversion-contract',
      legacyInvoiceLookup.status === 200 &&
        legacyInvoiceLookup.payload?.data?.pricing_rule_version === 'ih_complexity_v1' &&
        Number(legacyInvoiceLookup.payload?.data?.complexity_rating) === 4,
      `HTTP ${legacyInvoiceLookup.status}`,
    )

    await page.screenshot({
      path: path.join(screenshotsDir, '02-legacy-v1-edit.png'),
      fullPage: true,
    })

    const intermediateFixture = await runFixtureCommand([
      'prepare',
      `--source-id=${createdQuoteId}`,
      '--rule=intermediate',
    ])
    intermediateQuoteId = Number(intermediateFixture.quote_id || 0)
    requireCheck(
      'intermediate-fixture-prepared',
      intermediateQuoteId > 0 &&
        intermediateFixture.pricing_rule_version === 'ih_standard_v1' &&
        Number(intermediateFixture.grand_total) === 9300,
      `quote #${intermediateQuoteId || 'unknown'}`,
    )

    await page.goto(`${baseUrl}/crm/quotes?service=ih&edit=true&quoteId=${intermediateQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Edit Quotation', { exact: true }).waitFor()
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    check(
      'intermediate-flow-hides-complexity',
      (await page.getByText('Legacy Complexity Rating', { exact: true }).count()) === 0,
    )
    check(
      'intermediate-flow-preserves-contractual-total',
      await page.getByText('9300.00', { exact: true }).first().isVisible(),
    )

    await page.getByRole('button', { name: 'Upgrade to Current V2 Pricing' }).click()
    const upgradeDialog = page.getByRole('dialog')
    await upgradeDialog.getByRole('button', { name: 'Upgrade pricing' }).click()
    await page.getByText('V2 pricing upgrade preview', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Cancel Upgrade' }).click()
    check(
      'intermediate-upgrade-can-be-cancelled-before-save',
      await page.getByRole('button', { name: 'Upgrade to Current V2 Pricing' }).isVisible(),
    )

    const concurrentEditRemarks = 'Browser edit saved after external row update'
    await page.locator('textarea[name="inquiryRemarks"]').fill(concurrentEditRemarks)
    await runFixtureCommand(['touch', `--quote-id=${intermediateQuoteId}`])
    const concurrentEditResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quotes/ih/${intermediateQuoteId}`) &&
        response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Update Quote', exact: true }).click()
    const concurrentEditResponse = await concurrentEditResponsePromise
    check(
      'intermediate-save-after-external-update-is-allowed',
      concurrentEditResponse.status() === 200,
      `HTTP ${concurrentEditResponse.status()}`,
    )
    const savedConcurrentEdit = await context.request.get(
      `${baseUrl}/proxy/quotes/ih/${intermediateQuoteId}`,
    )
    const savedConcurrentEditPayload = await readJsonResponse(savedConcurrentEdit)
    check(
      'intermediate-save-after-external-update-persists-form-data',
      savedConcurrentEdit.status() === 200 &&
        savedConcurrentEditPayload?.data?.inquiry_remarks === concurrentEditRemarks,
      `HTTP ${savedConcurrentEdit.status()}`,
    )

    const intermediatePdfResponse = await context.request.get(
      `${baseUrl}/proxy/quote-records/ih/${intermediateQuoteId}/pdf?quote_id=${intermediateQuoteId}`,
    )
    const intermediatePdfBody = await intermediatePdfResponse.body()
    await fs.writeFile(
      path.join(pdfsDir, `ih-standard-v1-quote-${intermediateQuoteId}.pdf`),
      intermediatePdfBody,
    )
    check(
      'intermediate-flow-pdf-generation',
      intermediatePdfResponse.status() === 200 &&
        (intermediatePdfResponse.headers()['content-type'] || '').includes('application/pdf') &&
        intermediatePdfBody.byteLength > 1000,
      `HTTP ${intermediatePdfResponse.status()}, ${intermediatePdfBody.byteLength} bytes`,
    )

    await page.screenshot({
      path: path.join(screenshotsDir, '03-intermediate-stale-remediation.png'),
      fullPage: true,
    })

    await page.goto(`${baseUrl}/crm/records/industrial-hygiene/${createdQuoteId}`, {
      waitUntil: 'commit',
    })
    await page.getByText('Quotation Details', { exact: true }).waitFor()
    const deleteV2ResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quote-records/ih/${createdQuoteId}`) &&
        response.request().method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    const confirmDelete = page.getByRole('dialog').getByRole('button', {
      name: 'Delete',
      exact: true,
    })
    await confirmDelete.waitFor()
    await confirmDelete.click()
    const deleteV2Response = await deleteV2ResponsePromise
    createdQuoteDeleted = deleteV2Response.status() === 200
    check('new-flow-ui-delete', createdQuoteDeleted, `HTTP ${deleteV2Response.status()}`)
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
    if (intermediateQuoteId) {
      try {
        const cleanup = await runFixtureCommand(['cleanup', `--quote-id=${intermediateQuoteId}`])
        check(
          'temporary-intermediate-quote-cleaned-up',
          cleanup.status === 'success' && cleanup.deleted !== false,
          `quote #${intermediateQuoteId}`,
        )
      } catch (error) {
        check('temporary-intermediate-quote-cleaned-up', false, error.message)
      }
    }
    if (legacyQuoteId) {
      try {
        const cleanup = await runFixtureCommand(['cleanup', `--quote-id=${legacyQuoteId}`])
        check(
          'temporary-legacy-quote-cleaned-up',
          cleanup.status === 'success' && cleanup.deleted !== false,
          `quote #${legacyQuoteId}`,
        )
      } catch (error) {
        check('temporary-legacy-quote-cleaned-up', false, error.message)
      }
    }
    if (createdQuoteId && !createdQuoteDeleted) {
      try {
        const cleanup = await page.evaluate(async (quoteId) => {
          const response = await fetch(`/proxy/quote-records/ih/${quoteId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
          return { status: response.status, payload: await response.json() }
        }, createdQuoteId)
        check(
          'temporary-v2-quote-cleaned-up',
          cleanup.status === 200 && cleanup.payload?.status === 'success',
          `HTTP ${cleanup.status}`,
        )
      } catch (error) {
        check('temporary-v2-quote-cleaned-up', false, error.message)
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
    sourceRevisions,
    artifacts: {
      screenshots: 'screenshots',
      pdfs: 'pdfs',
    },
    legacyQuoteId,
    intermediateQuoteId,
    createdQuoteId,
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
  console.error('IH-PRICING-FLOW-SMOKE-CRASH', error)
  findings.push({ name: 'smoke-script-completed', ok: false, detail: error.message })
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(
    path.join(outputDir, 'result.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        baseUrl,
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
