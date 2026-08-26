import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const backendRoot = path.resolve(frontendRoot, '..', 'backend-laravel')
const execFileAsync = promisify(execFile)
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(frontendRoot, 'test-results', `ih-commercial-${stamp}`)
const screenshotDir = path.join(outputDir, 'screenshots')
const pdfDir = path.join(outputDir, 'pdfs')
const baseUrl = validateSmokeTarget(process.env.FRONTEND_URL || 'http://127.0.0.1:3000')
const apiBase = `${baseUrl}/proxy`
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const today = new Date().toISOString().slice(0, 10)

const checks = []
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const money = (value) => Number(value || 0).toFixed(2)

const run = async () => {
  if (!email || !password) throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required.')

  await fs.mkdir(screenshotDir, { recursive: true })
  await fs.mkdir(pdfDir, { recursive: true })

  const browser = await chromium.launch({ headless: process.env.SMOKE_HEADLESS !== '0' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(90_000)
  page.setDefaultNavigationTimeout(120_000)

  const runtimeIssues = []
  let expectedValidationResponses = 0
  let validationConsoleEntries = 0
  let csrfToken = ''
  let quoteId = null
  let projectId = null
  let invoiceId = null
  let invoiceRef = ''
  let invoicePaid = false
  let legacyQuoteId = null
  let legacyProjectId = null
  let legacyInvoiceId = null
  let legacyInvoiceRef = ''

  page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (message.text().includes('Failed to load resource') && message.text().includes('422')) {
      validationConsoleEntries += 1
      return
    }
    runtimeIssues.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'unknown'
    if (!reason.includes('ERR_ABORTED')) {
      runtimeIssues.push(`request: ${request.method()} ${request.url()} ${reason}`)
    }
  })
  page.on('response', (response) => {
    if (
      response.status() === 422 &&
      response.url().endsWith('/proxy/invoices') &&
      ['POST', 'PUT'].includes(response.request().method())
    ) {
      expectedValidationResponses += 1
    }
    if (response.status() >= 500 && response.url().includes('/proxy/')) {
      runtimeIssues.push(
        `api: ${response.status()} ${response.request().method()} ${response.url()}`,
      )
    }
  })

  const step = async (name, action) => {
    const startedAt = Date.now()
    try {
      const detail = await action()
      checks.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail })
      console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`)
    } catch (error) {
      checks.push({
        name,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        detail: error.message,
      })
      console.error(`FAIL  ${name} :: ${error.message}`)
      throw error
    }
  }

  const assertInvoiceDetailTotals = async ({ subtotal, sstRate, sstAmount, grandTotal }) => {
    const section = page.getByRole('heading', { name: 'Item Breakdown' }).locator('xpath=..')
    const table = section.getByRole('table')
    await table.waitFor()

    const subtotalRow = table.getByText('Subtotal (Before SST)', { exact: true }).locator('..')
    const grandTotalRow = table.getByText('Grand Total', { exact: true }).locator('..')
    assert((await subtotalRow.innerText()).includes(subtotal), 'Stored subtotal is not shown.')
    assert(
      (await grandTotalRow.innerText()).includes(grandTotal),
      'Stored grand total is not shown.',
    )

    if (sstAmount) {
      const sstRow = table.getByText(`${sstRate} SST`, { exact: true }).locator('..')
      assert((await sstRow.innerText()).includes(sstAmount), 'Stored SST is not shown.')
    } else {
      assert(
        (await table.getByText(/% SST$/, { exact: false }).count()) === 0,
        'A zero-value SST row is shown.',
      )
    }

    return section
  }

  const apiRequest = async ({ route, method = 'GET', body, expected = [200] }) => {
    const response = await page.request.fetch(`${apiBase}/${String(route).replace(/^\/+/, '')}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      data: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let payload = {}
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { text }
    }
    if (typeof payload?.csrf_token === 'string') csrfToken = payload.csrf_token
    if (!expected.includes(response.status())) {
      throw new Error(`${method} ${route} returned ${response.status()}: ${text.slice(0, 600)}`)
    }
    return payload
  }

  const downloadPdf = async (name, route) => {
    const response = await page.request.get(`${apiBase}/${route.replace(/^\/+/, '')}`, {
      headers: csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {},
    })
    const contentType = response.headers()['content-type'] || ''
    const body = await response.body()
    assert(response.status() === 200, `${name} PDF returned HTTP ${response.status()}.`)
    assert(contentType.includes('application/pdf'), `${name} returned ${contentType}.`)
    assert(body.byteLength > 1000, `${name} PDF is unexpectedly small.`)
    await fs.writeFile(path.join(pdfDir, `${name}.pdf`), body)
    return `${body.byteLength} bytes`
  }

  const runFixtureCommand = async (args) => {
    const { stdout } = await execFileAsync(
      process.env.PHP_BINARY || 'php',
      ['artisan', 'quotes:ih-smoke-fixture', ...args],
      { cwd: backendRoot, windowsHide: true, timeout: 60_000 },
    )
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    for (const line of lines.reverse()) {
      try {
        return JSON.parse(line)
      } catch {
        // Artisan can emit non-JSON status lines before the result.
      }
    }
    throw new Error(`IH fixture returned no JSON result: ${stdout.trim()}`)
  }

  const selectFirstOption = async (placeholder) => {
    const select = page.locator('.react-select-container').filter({ hasText: placeholder })
    await select.getByRole('combobox').click()
    const option = page.locator('.react-select__option').first()
    await option.waitFor()
    const label = (await option.textContent())?.trim() || 'first option'
    await option.click()
    return label
  }

  const confirmDialog = async (buttonName = 'Confirm') => {
    const actionButton = page.getByRole('button', { name: buttonName, exact: true })
    const dialog = page.getByRole('dialog').filter({ has: actionButton })
    await dialog.waitFor()
    await dialog.getByRole('button', { name: buttonName, exact: true }).click()
  }

  const cleanup = async (name, action) => {
    try {
      await action()
      checks.push({ name, status: 'passed' })
      console.log(`PASS  ${name}`)
    } catch (error) {
      checks.push({ name, status: 'failed', detail: error.message })
      console.error(`FAIL  ${name} :: ${error.message}`)
    }
  }

  try {
    await step('authenticate through real UI', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.locator('#loginEmail').fill(email)
      await page.locator('#loginPassword').fill(password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login')),
        page.locator('button[type="submit"]').click(),
      ])
      const session = await apiRequest({ route: 'auth/session' })
      assert(session.user || session.data?.user, 'Authenticated session returned no user.')
      return redactEmail(email)
    })

    await step('create current IH quote with discount and SST through UI', async () => {
      await page.goto(`${baseUrl}/crm/quotes?service=ih`, { waitUntil: 'domcontentloaded' })
      await page.getByText('Client / Company', { exact: true }).waitFor()
      await selectFirstOption('Search client')
      await page.locator('#serviceType').selectOption('ih')
      await selectFirstOption('Select Source...')
      await page.getByText('Industrial Hygiene Details', { exact: true }).waitFor()
      await selectFirstOption('Select IH service type...')
      await page.locator('input[name="sampleCounts"]').fill('2')
      await page.getByLabel('Estimated Cost (RM)').fill('500')
      await page.getByText('Pricing Details', { exact: true }).waitFor()
      await page.locator('input[name="discount"]').fill('50')
      await page.locator('input[name="sstPercent"]').fill('8')
      await page.getByRole('button', { name: 'Add Miscellaneous Fee' }).click()
      const description = page.getByPlaceholder('Blank sample')
      await description.fill(`IH UAT laboratory fee ${stamp}`)
      const row = description.locator('xpath=ancestor::tr')
      const inputs = row.locator('input[type="number"]')
      await inputs.nth(0).fill('2')
      await inputs.nth(1).fill('100')
      await page.getByRole('button', { name: 'Add', exact: true }).click()

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/proxy/quotes/ih') && response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Save Quote', exact: true }).click()
      const response = await responsePromise
      const payload = await response.json()
      quoteId = Number(payload.quote_id || payload.data?.quote_id || 0)
      assert(response.status() === 200 && quoteId > 0, 'IH quote creation failed.')

      const stored = (await apiRequest({ route: `quotes/ih/${quoteId}` })).data
      assert(stored.pricing_rule_version === 'ih_standard_v2', 'Quote did not use V2 pricing.')
      assert(
        money(stored.sub_total) === '1200.00',
        `Unexpected gross subtotal ${stored.sub_total}.`,
      )
      assert(money(stored.sst_amount) === '92.00', `Unexpected SST ${stored.sst_amount}.`)
      assert(money(stored.grand_total) === '1242.00', `Unexpected total ${stored.grand_total}.`)
      return `quote=${quoteId}, gross=1200.00, discount=50.00, total=1242.00`
    })

    await step('quote detail and PDF show one discount deduction', async () => {
      await page.goto(`${baseUrl}/crm/records/industrial-hygiene/${quoteId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Quotation Details', { exact: true }).waitFor()
      await page.getByText('Quotation Calculation', { exact: true }).waitFor()
      const calculation = await page
        .getByText('Quotation Calculation', { exact: true })
        .locator('xpath=following::table[1]')
        .innerText()
      assert(calculation.includes('Gross Subtotal'), 'Quote detail omitted gross subtotal.')
      assert(calculation.includes('1,200.00'), 'Quote detail gross subtotal is incorrect.')
      assert(calculation.includes('1,150.00'), 'Quote detail net subtotal is incorrect.')
      assert(calculation.includes('1,242.00'), 'Quote detail grand total is incorrect.')
      await page.screenshot({
        path: path.join(screenshotDir, '01-quote-detail-calculation.png'),
        fullPage: true,
      })
      return downloadPdf('ih-quote', `quote-records/ih/${quoteId}/pdf?quote_id=${quoteId}`)
    })

    await step('award quote and verify project value', async () => {
      const award = await apiRequest({
        route: `quote-records/ih/${quoteId}/award`,
        method: 'POST',
        body: {
          quote_id: quoteId,
          remarks: `Disposable IH commercial UAT ${stamp}`,
          award_date: today,
          description: 'Industrial Hygiene end-to-end commercial UAT.',
          client_award_ref_no: `IH-UAT-${stamp}`,
        },
      })
      projectId = Number(award.project_id || 0)
      assert(projectId > 0, 'Award response omitted project ID.')
      const project = (await apiRequest({ route: `projects/${projectId}` })).data
      const projectValue = Number(project.current_project_value ?? project.quote_value ?? 0)
      assert(money(projectValue) === '1242.00', `Unexpected project value ${projectValue}.`)
      return `project=${projectId}, value=${money(projectValue)}`
    })

    await step('invoice form uses editable quote values and reset recovery', async () => {
      await page.goto(`${baseUrl}/project/manage/${projectId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('button', { name: 'Create Invoice', exact: true }).click()
      await page.waitForURL((url) => url.pathname === `/commercial/invoice/create/${projectId}`)
      await page.getByText('Invoice Breakdown (Industrial Hygiene)', { exact: true }).waitFor()
      await page.getByText(/Loaded from Quote/).waitFor()
      const unitPrice = page.locator('[data-field-path="pricing.unit_price"]').first()
      const discount = page.locator('[data-field-path="pricing.discount_unit_price"]').first()
      assert((await unitPrice.inputValue()) === '500', 'Quote unit price did not seed the invoice.')
      assert((await discount.inputValue()) === '50', 'Quote discount did not seed the invoice.')

      await unitPrice.fill('600')
      assert((await unitPrice.inputValue()) === '600', 'Edited unit price did not remain in input.')
      await page.getByRole('button', { name: 'Reset from Quote' }).click()
      const resetAction = page.getByRole('dialog').getByRole('button', {
        name: 'Reset',
        exact: true,
      })
      const resetDialogVisible = await resetAction
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false)
      if (resetDialogVisible) {
        await resetAction.click()
      }
      await page.waitForTimeout(250)
      assert(
        (await unitPrice.inputValue()) === '500',
        `Reset from Quote did not restore unit price (reset actions: ${await resetAction.count()}).`,
      )
      assert((await discount.inputValue()) === '50', 'Reset from Quote did not restore discount.')
      return 'quote values are advisory, editable, and recoverable'
    })

    await step('invalid discount is inline, focused, and retains the form', async () => {
      const discount = page.locator('[data-field-path="pricing.discount_unit_price"]').first()
      await discount.fill('2000')
      await page.getByRole('button', { name: 'Review Invoice' }).click()
      await page.getByText(/Discount cannot exceed the gross subtotal/).waitFor()
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute('data-field-path') === 'pricing.discount_unit_price',
      )
      assert(
        (await discount.inputValue()) === '2000',
        'Invalid value was discarded after validation.',
      )
      await page.screenshot({
        path: path.join(screenshotDir, '02-inline-validation-focus.png'),
        fullPage: true,
      })
      return 'error is attached to and focuses the discount input'
    })

    await step('create over-project invoice with guided acknowledgement', async () => {
      await page.locator('[data-field-path="pricing.discount_unit_price"]').first().fill('50')
      await page.locator('[data-field-path="pricing.unit_price"]').first().fill('600')
      await page.getByRole('button', { name: 'Review Invoice' }).click()
      await page.getByText('Review Invoice', { exact: true }).first().waitFor()
      await page.getByText(/above the remaining project value/).waitFor()

      await page.getByRole('button', { name: 'Create Invoice' }).click()
      const reason = page.getByLabel('Reason for exceeding project value')
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('data-field-path') === 'deviation_reason',
      )
      await reason.fill('Approved additional industrial hygiene site attendance.')
      await page.getByLabel('I confirm this project-value difference.').check()

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith('/proxy/invoices') && response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Create Invoice' }).click()
      const response = await responsePromise
      const payload = await response.json()
      invoiceId = Number(payload.invoice_id || 0)
      invoiceRef = payload.invoice_ref_no || ''
      assert(response.status() === 200 && invoiceId > 0, 'Invoice creation failed.')
      await page.getByText('Invoice Created', { exact: true }).waitFor()
      assert(
        new URL(page.url()).pathname === `/commercial/invoice/create/${projectId}`,
        'Successful creation skipped the confirmation checkpoint.',
      )
      await page.reload({ waitUntil: 'domcontentloaded' })
      const successDialog = page.getByRole('dialog')
      await successDialog.getByText('Invoice Created', { exact: true }).waitFor()
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('data-dialog-choice-key') === 'view',
      )
      await successDialog.getByRole('button', { name: 'Back to Project' }).waitFor()
      await successDialog.getByRole('button', { name: 'View Invoice List' }).waitFor()
      await page.setViewportSize({ width: 390, height: 844 })
      const dialogBox = await successDialog.boundingBox()
      assert(dialogBox && dialogBox.width <= 390, 'Success modal overflows the mobile viewport.')
      await page.screenshot({
        path: path.join(screenshotDir, '03-invoice-success-actions-mobile.png'),
        fullPage: true,
      })
      await page.setViewportSize({ width: 1440, height: 1000 })
      await successDialog.getByRole('button', { name: 'View Invoice', exact: true }).click()
      await page.waitForURL(
        (url) =>
          url.pathname === `/commercial/invoice/${invoiceId}` &&
          url.searchParams.get('from') === 'project' &&
          Number(url.searchParams.get('projectId')) === projectId,
      )
      await page.getByText('Invoice Details', { exact: true }).waitFor()
      return `${invoiceRef}, total=1458.00`
    })

    await step('stored invoice uses typed lines and authoritative totals', async () => {
      const payload = await apiRequest({ route: `invoices?project_id=${projectId}&per_page=100` })
      const records = payload.data || payload.invoices || []
      const invoice = records.find((record) => Number(record.id) === invoiceId)
      assert(invoice, 'Created invoice was not returned after reload.')
      assert(money(invoice.amount) === '1400.00', `Unexpected gross amount ${invoice.amount}.`)
      assert(money(invoice.sst_amount) === '108.00', `Unexpected SST ${invoice.sst_amount}.`)
      assert(money(invoice.grand_total) === '1458.00', `Unexpected total ${invoice.grand_total}.`)
      assert(
        invoice.calculation_version === 'typed_lines_v1',
        'Calculation version was not stored.',
      )
      const lineTypes = (invoice.breakdown || []).map((line) => line.line_type)
      assert(lineTypes.includes('service'), 'Typed service line was not stored.')
      assert(lineTypes.includes('discount'), 'Typed discount line was not stored.')
      return `types=${lineTypes.join(',')}`
    })

    await step('current invoice detail footer reconciles stored SST totals', async () => {
      const section = await assertInvoiceDetailTotals({
        subtotal: 'RM 1,350.00',
        sstRate: '8.00%',
        sstAmount: 'RM 108.00',
        grandTotal: 'RM 1,458.00',
      })
      await section.screenshot({
        path: path.join(screenshotDir, '02a-current-invoice-detail-totals.png'),
      })
      return 'RM 1,350.00 + RM 108.00 SST = RM 1,458.00'
    })

    await step('unpaid invoice edit uses guided overage recovery and persists', async () => {
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      const modal = page.getByRole('dialog').filter({ hasText: 'Edit Invoice' })
      await modal.getByText('Invoice Breakdown (Industrial Hygiene)', { exact: true }).waitFor()
      const discount = modal.locator('[data-field-path="pricing.discount_unit_price"]').first()
      await discount.fill('60')
      await modal.getByRole('button', { name: 'Save', exact: true }).click()
      await confirmDialog('Confirm')
      await modal.getByText(/above the remaining project value/).waitFor()
      const reason = modal.getByLabel('Reason for exceeding project value')
      await reason.fill('Approved updated commercial discount.')
      await modal.getByLabel('I confirm this project-value difference.').check()
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith('/proxy/invoices') && response.request().method() === 'PUT',
      )
      await modal.getByRole('button', { name: 'Save', exact: true }).click()
      await confirmDialog('Confirm')
      const response = await responsePromise
      assert(response.status() === 200, `Invoice update returned HTTP ${response.status()}.`)
      await modal.waitFor({ state: 'hidden' })
      const payload = await apiRequest({ route: `invoices?project_id=${projectId}&per_page=100` })
      const records = payload.data || payload.invoices || []
      const invoice = records.find((record) => Number(record.id) === invoiceId)
      assert(money(invoice.grand_total) === '1447.20', `Edit total is ${invoice.grand_total}.`)
      return 'discount=60.00, total=1447.20'
    })

    await step('paid invoice clearly locks financial fields', async () => {
      await apiRequest({
        route: `invoices/${invoiceId}/mark-paid`,
        method: 'PATCH',
        body: {
          id: invoiceId,
          paid_date: today,
          payment_method: 'Bank Transfer',
          paid_remarks: `IH UAT payment ${stamp}`,
        },
      })
      invoicePaid = true
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByText('Invoice Details', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      const modal = page.getByRole('dialog').filter({ hasText: 'Edit Invoice' })
      await modal.getByText(/Financial values are locked because payment/).waitFor()
      assert(
        await modal.locator('[data-field-path="pricing.unit_price"]').first().isDisabled(),
        'Paid invoice unit price remained editable.',
      )
      await page.screenshot({
        path: path.join(screenshotDir, '03-paid-invoice-lock.png'),
        fullPage: true,
      })
      await modal.getByRole('button', { name: 'Cancel', exact: true }).click()
      await modal.waitFor({ state: 'hidden' })
      return 'financial inputs disabled with recovery explanation'
    })

    await step('invoice and receipt PDFs generate', async () => {
      const invoicePdf = await downloadPdf('ih-invoice', `invoices/${invoiceId}/pdf`)
      const receiptPdf = await downloadPdf('ih-receipt', `invoices/${invoiceId}/receipt-pdf`)
      return `invoice ${invoicePdf}; receipt ${receiptPdf}`
    })

    await step('mobile invoice detail and modal remain usable', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByText('Invoice Details', { exact: true }).waitFor()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      assert(overflow <= 1, `Page has ${overflow}px horizontal overflow.`)
      const tableScroller = page.locator('.embedded-data-table-wrap .table-responsive').first()
      const tableMetrics = await tableScroller.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }))
      assert(
        tableMetrics.scrollWidth > tableMetrics.clientWidth,
        'Item table still compresses columns instead of providing internal horizontal scrolling.',
      )
      await page.screenshot({
        path: path.join(screenshotDir, '04-mobile-invoice-detail.png'),
        fullPage: true,
      })
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      const modal = page.getByRole('dialog').filter({ hasText: 'Edit Invoice' })
      await modal.getByRole('button', { name: 'Cancel', exact: true }).waitFor()
      await page.screenshot({
        path: path.join(screenshotDir, '05-mobile-paid-invoice-modal.png'),
        fullPage: true,
      })
      await modal.getByRole('button', { name: 'Cancel', exact: true }).click()
      await page.setViewportSize({ width: 1440, height: 1000 })
      return '390x844 with internal table scrolling and reachable modal footer'
    })

    await step('prepare and render the discounted legacy storage convention', async () => {
      const fixture = await runFixtureCommand([
        'prepare',
        `--source-id=${quoteId}`,
        '--complexity=1',
        '--unit-price=1500',
        '--discount=50',
        '--sst-percent=0',
        '--legacy-gross-subtotal',
      ])
      legacyQuoteId = Number(fixture.quote_id || 0)
      assert(legacyQuoteId > 0, 'Legacy fixture response omitted quote ID.')
      assert(
        fixture.subtotal_convention === 'gross-before-discount',
        'Legacy fixture did not use the gross subtotal convention.',
      )
      await page.goto(`${baseUrl}/crm/records/industrial-hygiene/${legacyQuoteId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Quotation Calculation', { exact: true }).waitFor()
      const calculation = await page
        .getByText('Quotation Calculation', { exact: true })
        .locator('xpath=following::table[1]')
        .innerText()
      assert(calculation.includes('3,000.00'), 'Legacy gross subtotal is not RM 3,000.00.')
      assert(calculation.includes('2,950.00'), 'Legacy net/grand total is not RM 2,950.00.')
      await page.screenshot({
        path: path.join(screenshotDir, '06-legacy-discount-quote-detail.png'),
        fullPage: true,
      })
      return `quote=${legacyQuoteId}, RM 3,000.00 - RM 50.00 = RM 2,950.00`
    })

    await step('legacy quote converts through project to typed invoice and PDF', async () => {
      const award = await apiRequest({
        route: `quote-records/ih/${legacyQuoteId}/award`,
        method: 'POST',
        body: {
          quote_id: legacyQuoteId,
          remarks: `Disposable legacy IH commercial UAT ${stamp}`,
          award_date: today,
          description: 'Legacy Industrial Hygiene commercial conversion UAT.',
          client_award_ref_no: `IH-LEGACY-UAT-${stamp}`,
        },
      })
      legacyProjectId = Number(award.project_id || 0)
      assert(legacyProjectId > 0, 'Legacy award response omitted project ID.')
      await page.goto(`${baseUrl}/commercial/invoice/create/${legacyProjectId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Invoice Breakdown (Industrial Hygiene)', { exact: true }).waitFor()
      await page.getByText(/Loaded from Quote/).waitFor()
      assert(
        (await page.locator('[data-field-path="pricing.unit_price"]').first().inputValue()) ===
          '1500',
        'Legacy invoice seed changed the unit price.',
      )
      assert(
        (await page
          .locator('[data-field-path="pricing.discount_unit_price"]')
          .first()
          .inputValue()) === '50',
        'Legacy invoice seed changed the discount.',
      )
      await page.getByRole('button', { name: 'Review Invoice' }).click()
      await page.getByText('Review Invoice', { exact: true }).first().waitFor()
      const reviewText = await page.locator('body').innerText()
      assert(reviewText.includes('RM 2,950.00'), 'Legacy invoice review total is not RM 2,950.00.')
      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith('/proxy/invoices') && response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Create Invoice' }).click()
      const response = await createResponsePromise
      const payload = await response.json()
      legacyInvoiceId = Number(payload.invoice_id || 0)
      legacyInvoiceRef = payload.invoice_ref_no || ''
      assert(response.status() === 200 && legacyInvoiceId > 0, 'Legacy invoice creation failed.')
      await page.getByText('Invoice Created', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'View Invoice', exact: true }).click()
      await page.waitForURL(
        (url) =>
          url.pathname === `/commercial/invoice/${legacyInvoiceId}` &&
          url.searchParams.get('from') === 'project' &&
          Number(url.searchParams.get('projectId')) === legacyProjectId,
      )
      const invoices = await apiRequest({
        route: `invoices?project_id=${legacyProjectId}&per_page=100`,
      })
      const records = invoices.data || invoices.invoices || []
      const invoice = records.find((record) => Number(record.id) === legacyInvoiceId)
      assert(money(invoice.amount) === '3000.00', `Legacy invoice gross is ${invoice.amount}.`)
      assert(
        money(invoice.grand_total) === '2950.00',
        `Legacy invoice total is ${invoice.grand_total}.`,
      )
      const pdf = await downloadPdf('ih-legacy-invoice', `invoices/${legacyInvoiceId}/pdf`)
      return `${legacyInvoiceRef}, gross=3000.00, total=2950.00, PDF ${pdf}`
    })

    await step('legacy invoice detail footer deducts discount once', async () => {
      await page.goto(`${baseUrl}/commercial/invoice/${legacyInvoiceId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Invoice Details', { exact: true }).waitFor()
      const section = await assertInvoiceDetailTotals({
        subtotal: 'RM 2,950.00',
        grandTotal: 'RM 2,950.00',
      })
      await section.screenshot({
        path: path.join(screenshotDir, '07-legacy-invoice-detail-totals.png'),
      })
      return 'RM 3,000.00 gross - RM 50.00 discount = RM 2,950.00'
    })

    await step('related documents and browser runtime are healthy', async () => {
      const related = (await apiRequest({ route: `quote-records/ih/${quoteId}/related-docs` })).data
      assert(
        related.projects?.some((record) => Number(record.id) === projectId),
        'Related documents omitted project.',
      )
      assert(
        related.invoices?.some((record) => Number(record.id) === invoiceId),
        'Related documents omitted invoice.',
      )
      assert(
        expectedValidationResponses === 1,
        `Expected one guided backend 422 response, observed ${expectedValidationResponses}.`,
      )
      assert(
        validationConsoleEntries <= expectedValidationResponses,
        'Browser reported an unclassified validation resource error.',
      )
      assert(runtimeIssues.length === 0, runtimeIssues.slice(0, 5).join(' | '))
      return 'quote > project > invoice chain; expected validation separated from runtime errors'
    })
  } catch (error) {
    await page
      .screenshot({ path: path.join(screenshotDir, 'failure.png'), fullPage: true })
      .catch(() => {})
    await fs.writeFile(
      path.join(outputDir, 'failure-page.txt'),
      await page.locator('body').innerText(),
    )
    throw error
  } finally {
    if (invoicePaid && invoiceId) {
      await cleanup('cleanup: reverse invoice payment', async () => {
        await apiRequest({
          route: `invoices/${invoiceId}/mark-unpaid`,
          method: 'PATCH',
          body: { id: invoiceId, reason: `IH commercial UAT cleanup ${stamp}` },
        })
        invoicePaid = false
      })
    }
    if (invoiceRef) {
      await cleanup('cleanup: invoice', () =>
        apiRequest({
          route: 'invoices',
          method: 'DELETE',
          body: { invoice_ref_no: invoiceRef, reason: `IH commercial UAT cleanup ${stamp}` },
        }),
      )
    }
    if (legacyInvoiceRef) {
      await cleanup('cleanup: legacy invoice', () =>
        apiRequest({
          route: 'invoices',
          method: 'DELETE',
          body: {
            invoice_ref_no: legacyInvoiceRef,
            reason: `Legacy IH commercial UAT cleanup ${stamp}`,
          },
        }),
      )
    }
    if (legacyQuoteId && legacyProjectId) {
      await cleanup('cleanup: legacy project', () =>
        apiRequest({
          route: `quote-records/ih/${legacyQuoteId}/un-award`,
          method: 'POST',
          body: { quote_id: legacyQuoteId },
        }),
      )
    }
    if (legacyQuoteId) {
      await cleanup('cleanup: legacy fixture', async () => {
        const result = await runFixtureCommand(['cleanup', `--quote-id=${legacyQuoteId}`])
        assert(result.status === 'success', 'Legacy fixture cleanup failed.')
      })
    }
    if (quoteId && projectId) {
      await cleanup('cleanup: un-award project', () =>
        apiRequest({
          route: `quote-records/ih/${quoteId}/un-award`,
          method: 'POST',
          body: { quote_id: quoteId },
        }),
      )
    }
    if (quoteId) {
      await cleanup('cleanup: quotation', () =>
        apiRequest({
          route: `quote-records/ih/${quoteId}`,
          method: 'DELETE',
          expected: [200, 404],
        }),
      )
    }

    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          baseUrl,
          smokeAccount: redactEmail(email),
          ids: {
            quoteId,
            projectId,
            invoiceId,
            legacyQuoteId,
            legacyProjectId,
            legacyInvoiceId,
          },
          checks,
          runtimeIssues,
          expectedValidationResponses,
          validationConsoleEntries,
        },
        null,
        2,
      ),
    )
    await browser.close()
  }

  const failures = checks.filter((check) => check.status === 'failed')
  console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`)
  console.log(`Evidence: ${outputDir}`)
  if (failures.length) process.exitCode = 1
}

run().catch((error) => {
  console.error('IH-COMMERCIAL-LIFECYCLE-SMOKE-FAILED', error)
  process.exitCode = 1
})
