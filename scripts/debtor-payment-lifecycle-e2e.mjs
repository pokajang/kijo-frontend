import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `debtor-payments-e2e-${stamp}`)
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const apiBase = `${baseUrl}/proxy`
const email = process.env.DEBTOR_E2E_EMAIL
const password = process.env.DEBTOR_E2E_PASSWORD
const allowMutation = process.env.DEBTOR_E2E_ALLOW_MUTATION === '1'
const headless = process.env.DEBTOR_E2E_HEADLESS !== '0'
const invoiceRef = `E2E-DEBTOR-${stamp}`
const partialReference = `E2E-PARTIAL-${stamp}`
const resettlementReference = `E2E-RESETTLE-${stamp}`
const reversalReason = `E2E correction ${stamp}`
const today = new Date().toLocaleDateString('en-CA')
const results = []

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const requireConfiguration = () => {
  const missing = []
  if (!email) missing.push('DEBTOR_E2E_EMAIL')
  if (!password) missing.push('DEBTOR_E2E_PASSWORD')
  if (!allowMutation) missing.push('DEBTOR_E2E_ALLOW_MUTATION=1')
  if (missing.length) {
    throw new Error(
      `Debtor payment E2E creates and deletes a manual debtor. Missing: ${missing.join(', ')}`,
    )
  }
}

const run = async () => {
  requireConfiguration()
  await fs.mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  const runtimeIssues = []
  const runtimeObservations = []
  let csrfToken = ''
  let debtorId = null

  page.on('pageerror', (error) => {
    runtimeIssues.push({ type: 'pageerror', detail: error.message })
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeIssues.push({ type: 'console-error', detail: message.text() })
    }
  })
  page.on('requestfailed', (request) => {
    const issue = {
      type: 'request-failed',
      detail: `${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`,
    }
    if (request.failure()?.errorText === 'net::ERR_ABORTED') {
      runtimeObservations.push({ ...issue, type: 'navigation-cancelled-request' })
      return
    }
    runtimeIssues.push(issue)
  })
  page.on('response', (response) => {
    if (response.status() >= 500) {
      runtimeIssues.push({
        type: 'server-error',
        detail: `${response.status()} ${response.request().method()} ${response.url()}`,
      })
    }
  })

  const step = async (name, action) => {
    const startedAt = Date.now()
    try {
      const detail = await action()
      results.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail })
      console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`)
    } catch (error) {
      results.push({
        name,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        detail: error.message,
      })
      console.error(`FAIL  ${name} :: ${error.message}`)
      throw error
    }
  }

  const apiRequest = async ({ route, method = 'GET', body, expectedStatuses = [200] }) => {
    const response = await page.request.fetch(`${apiBase}/${String(route).replace(/^\/+/, '')}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      data: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = await response.json().catch(async () => ({ text: await response.text() }))
    if (typeof payload?.csrf_token === 'string') csrfToken = payload.csrf_token
    if (!expectedStatuses.includes(response.status())) {
      throw new Error(
        `${method} ${route} returned ${response.status()}: ${JSON.stringify(payload).slice(0, 500)}`,
      )
    }
    return payload
  }

  const debtorRow = () => page.locator('table tbody tr').filter({ hasText: invoiceRef }).first()

  const selectLifecycleScope = async (name) => {
    await page.getByRole('tab', { name, exact: true }).click()
    await debtorRow().waitFor({ state: 'visible' })
  }

  const openPaymentModal = async (actionName = 'Update Payment') => {
    const row = debtorRow()
    await row.waitFor({ state: 'visible' })
    await row.getByRole('button', { name: 'Actions' }).click()
    await page.locator('.dropdown-menu.show').getByText(actionName, { exact: true }).click()
    const modal = page.locator('.modal.show')
    await modal.getByText('Payment history', { exact: true }).waitFor()
    return modal
  }

  try {
    await step('authenticate', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.locator('#loginEmail').fill(email)
      await page.locator('#loginPassword').fill(password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login')),
        page.getByRole('button', { name: /sign in|login/i }).click(),
      ])
      const session = await apiRequest({ route: 'auth/session' })
      assert(session.user || session.data?.user, 'Authenticated session returned no user.')
      return email
    })

    await step('create isolated manual debtor', async () => {
      const payload = await apiRequest({
        route: 'debtors/manual',
        method: 'POST',
        expectedStatuses: [201],
        body: {
          invoice_ref_no: invoiceRef,
          client_name: 'Debtor Payment E2E Client',
          invoice_date: today,
          grand_total: '1000.00',
        },
      })
      debtorId = payload.id
      assert(debtorId, 'Manual debtor creation returned no id.')
      return `id=${debtorId}`
    })

    await step('record partial payment through Debtors UI', async () => {
      await page.goto(`${baseUrl}/commercial/debtors`, { waitUntil: 'domcontentloaded' })
      await page.getByPlaceholder('Type to search...').fill(invoiceRef)
      const modal = await openPaymentModal()
      await modal.getByLabel('Partial payment').check()
      await modal.locator('#receivable-payment-amount').fill('300.00')
      await modal.locator('#receivable-payment-method').selectOption('Bank Transfer')
      await modal.locator('#receivable-payment-reference').fill(partialReference)
      await modal.getByRole('button', { name: 'Update Payment', exact: true }).click()
      await modal.waitFor({ state: 'detached' })

      const history = await apiRequest({ route: `receivables/manual/${debtorId}/payments` })
      assert(Number(history.summary?.paidTotal) === 300, 'Paid total is not RM 300.00.')
      assert(Number(history.summary?.outstandingAmount) === 700, 'Outstanding is not RM 700.00.')
      assert(history.summary?.paymentStatus === 'Partially Paid', 'Status is not Partially Paid.')
      return 'paid=300.00 outstanding=700.00'
    })

    await step('display payment history and settle outstanding balance', async () => {
      const modal = await openPaymentModal()
      await modal.getByText(new RegExp(partialReference)).waitFor()
      const fullAmount = modal.locator('#receivable-payment-amount')
      assert(
        (await fullAmount.inputValue()) === '700.00',
        'Full-payment amount is not the balance.',
      )
      assert(await fullAmount.isDisabled(), 'Full-payment amount should be read-only.')
      await modal.getByRole('button', { name: 'Update Payment', exact: true }).click()
      await modal.waitFor({ state: 'detached' })

      const history = await apiRequest({ route: `receivables/manual/${debtorId}/payments` })
      assert(history.payments?.length === 2, 'Expected two separate payment ledger records.')
      assert(Number(history.summary?.paidTotal) === 1000, 'Paid total is not RM 1,000.00.')
      assert(Number(history.summary?.outstandingAmount) === 0, 'Outstanding balance is not zero.')
      assert(history.summary?.paymentStatus === 'Paid', 'Status is not Paid.')
      return '2 ledger entries; status=Paid'
    })

    await step('find settled debtor under Paid and inspect its audit history', async () => {
      await selectLifecycleScope('Paid')
      assert(new URL(page.url()).searchParams.get('status') === 'paid', 'Paid scope is not in URL.')

      const row = debtorRow()
      await row.getByText('Paid', { exact: true }).waitFor()
      await row.getByText('RM 0.00', { exact: true }).waitFor()

      const modal = await openPaymentModal('Payment History')
      await modal.getByRole('heading', { name: 'Payment History', exact: true }).waitFor()
      await modal.getByText(new RegExp(partialReference)).waitFor()
      assert(
        (await modal.locator('tbody tr').count()) === 2,
        'Paid history should have two entries.',
      )
      return 'settled record remains visible with two payment entries'
    })

    await step('reverse settlement and return debtor to Outstanding', async () => {
      const paymentModal = page
        .locator('.modal.show')
        .filter({ hasText: 'Payment history' })
        .first()
      const settlementRow = paymentModal
        .locator('tbody tr')
        .filter({ hasText: 'RM 700.00' })
        .first()
      await settlementRow.getByRole('button', { name: 'Reverse', exact: true }).click()

      const reversalDialog = page
        .locator('.modal.show')
        .filter({ hasText: 'Reason for reversing this payment' })
        .last()
      await reversalDialog.locator('input').fill(reversalReason)
      await reversalDialog.getByRole('button', { name: 'Reverse Payment', exact: true }).click()
      await reversalDialog.waitFor({ state: 'detached' })
      await paymentModal.getByText(new RegExp(reversalReason)).waitFor()

      const history = await apiRequest({ route: `receivables/manual/${debtorId}/payments` })
      assert(
        Number(history.summary?.paidTotal) === 300,
        'Reversal should restore paid total to 300.',
      )
      assert(
        Number(history.summary?.outstandingAmount) === 700,
        'Reversal should restore RM 700.00 outstanding.',
      )
      assert(
        history.summary?.paymentStatus === 'Partially Paid',
        'Reversed debtor should be Partially Paid.',
      )

      await paymentModal.locator('.modal-footer').getByText('Close', { exact: true }).click()
      await paymentModal.waitFor({ state: 'detached' })
      await selectLifecycleScope('Outstanding')
      await debtorRow().getByText('Partially Paid', { exact: true }).waitFor()
      return 'status=Partially Paid outstanding=700.00'
    })

    await step('re-settle debtor and preserve the complete ledger', async () => {
      const modal = await openPaymentModal()
      await modal.locator('#receivable-payment-method').selectOption('Bank Transfer')
      await modal.locator('#receivable-payment-reference').fill(resettlementReference)
      await modal.getByRole('button', { name: 'Update Payment', exact: true }).click()
      await modal.waitFor({ state: 'detached' })

      await selectLifecycleScope('Paid')
      const historyModal = await openPaymentModal('Payment History')
      await historyModal.getByText(new RegExp(partialReference)).waitFor()
      await historyModal.getByText(new RegExp(resettlementReference)).waitFor()
      await historyModal.getByText(new RegExp(reversalReason)).waitFor()
      assert(
        (await historyModal.locator('tbody tr').count()) === 3,
        'Complete history should retain three ledger entries.',
      )

      const history = await apiRequest({ route: `receivables/manual/${debtorId}/payments` })
      assert(
        Number(history.summary?.paidTotal) === 1000,
        'Re-settled paid total is not RM 1,000.00.',
      )
      assert(Number(history.summary?.outstandingAmount) === 0, 'Re-settled balance is not zero.')
      assert(history.summary?.paymentStatus === 'Paid', 'Re-settled status is not Paid.')

      await page.screenshot({ path: path.join(outputDir, 'paid-lifecycle.png'), fullPage: true })
      return 'status=Paid; 3 ledger entries including reversed payment'
    })

    await step('browser runtime and API health', async () => {
      assert(
        runtimeIssues.length === 0,
        `Browser/API issues detected: ${JSON.stringify(runtimeIssues).slice(0, 1000)}`,
      )
      return `no blocking issues; ${runtimeObservations.length} navigation-cancelled requests observed`
    })
  } catch (error) {
    await page
      .screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true })
      .catch(() => {})
    throw error
  } finally {
    let cleanupError = null
    if (debtorId) {
      try {
        await apiRequest({
          route: `debtors/manual/${debtorId}`,
          method: 'DELETE',
          body: { reason: `Cleanup after debtor payment E2E ${stamp}` },
          expectedStatuses: [200, 404],
        })
        results.push({ name: 'cleanup test debtor', status: 'passed' })
      } catch (error) {
        results.push({ name: 'cleanup', status: 'failed', detail: error.message })
        cleanupError = error
      }
    }
    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          baseUrl,
          invoiceRef,
          debtorId,
          results,
          runtimeIssues,
          runtimeObservations,
        },
        null,
        2,
      ),
    )
    await browser.close()
    if (cleanupError) throw cleanupError
  }

  console.log(
    `\n${results.filter((result) => result.status === 'passed').length}/${results.length} steps passed.`,
  )
  console.log(`Evidence: ${outputDir}`)
}

run().catch((error) => {
  console.error('DEBTOR-PAYMENT-E2E-FAILED', error)
  process.exitCode = 1
})
