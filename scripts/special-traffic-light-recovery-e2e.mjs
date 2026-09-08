import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = 'http://localhost:3000'
const email = process.env.SPECIAL_E2E_EMAIL
const password = process.env.SPECIAL_E2E_PASSWORD
const executablePath = process.env.SPECIAL_E2E_BROWSER
if (!email || !password || process.env.SPECIAL_E2E_ALLOW_MUTATION !== '1')
  throw new Error('Missing E2E configuration.')

const browser = await chromium.launch({ headless: false, executablePath })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.setDefaultTimeout(20_000)
let csrf = ''
const results = []
const check = (value, message) => {
  if (!value) throw new Error(message)
}
const api = async (route, method = 'GET', body, expected = [200]) => {
  const response = await page.request.fetch(`${baseUrl}/proxy/${route}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    data: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(async () => ({ text: await response.text() }))
  if (payload?.csrf_token) csrf = payload.csrf_token
  if (!expected.includes(response.status()))
    throw new Error(
      `${method} ${route}: ${response.status()} ${JSON.stringify(payload).slice(0, 500)}`,
    )
  return { status: response.status(), payload }
}
const step = async (name, fn) => {
  try {
    const detail = await fn()
    results.push({ name, status: 'passed', detail })
    console.log(`PASS ${name}${detail ? ` :: ${detail}` : ''}`)
  } catch (error) {
    results.push({ name, status: 'failed', detail: error.message })
    console.error(`FAIL ${name} :: ${error.message}`)
    throw error
  }
}
const payloadFor = (q, amount, cost, suffix, isRevision = false) => ({
  client_id: q.clientId,
  client_name: q.clientName,
  client_ssm: q.clientSsm,
  client_address: q.clientAddress,
  client_city: q.clientCity,
  client_state: q.clientState,
  client_zip: q.clientZip,
  pic_name: q.picName,
  pic_email: q.picEmail,
  pic_phone: q.picPhone,
  pic_position: q.picPosition,
  sp_id: q.spId,
  category_id: q.categoryId,
  service_title: `${q.serviceTitle} ${suffix}`,
  service_code: q.serviceCode,
  general_remarks: `BETA recovery ${suffix}`,
  discount: 0,
  sst_percent: 0,
  estimated_total_cost: cost,
  attach_proposal: false,
  proposal_language: q.proposalLanguage || 'en',
  ...(isRevision ? { isRevision: true } : {}),
  line_items: [
    {
      item_name: `BETA ${suffix}`,
      description: 'Disposable recovery branch.',
      unit: 'Lot',
      unit_price: amount,
      quantity: 1,
      total_price: amount,
    },
  ],
})

try {
  await step('authenticate recovery session', async () => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#loginEmail').fill(email)
    await page.locator('#loginPassword').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.getByRole('button', { name: /sign in|login/i }).click(),
    ])
    await api('auth/session')
  })

  await step('reject pending quote and recover with a Green revision', async () => {
    const approvals = (await api('quote-approvals')).payload.data || []
    const pending = approvals.find(
      (row) => Number(row.quote_id) === 46 && row.service === 'special',
    )
    const q = (await api('quotes/special/46')).payload.data
    if (pending?.status === 'pending') {
      await api(`quote-approvals/${pending.id}/reject`, 'PATCH', {
        remarks: 'BETA rejection and recovery test',
      })
      const rejected = (await api(`quote-approvals/${pending.id}`)).payload.data
      check(rejected?.status === 'rejected', 'Rejection did not persist.')
      await api('quotes/special/46', 'PUT', payloadFor(q, 150, 100, 'RECOVERED-GREEN', true))
    }
    const revised = (await api('quotes/special/46')).payload.data
    check(
      revised.issuanceContext?.policy_zone === 'green',
      'Rejected quote did not recover to Green.',
    )
    return pending ? `approval=${pending.id}` : 'recovered state retained'
  })

  await step('reverse a settled payment and block receipt while reopened', async () => {
    const before = (await api('receivables/invoice/227/payments')).payload
    const reversible = [...(before.payments || [])]
      .reverse()
      .find((payment) => !payment.reversed_at && !payment.reversedAt)
    check(reversible?.id, 'No active payment is available to reverse.')
    await api(`receivable-payments/${reversible.id}/reverse`, 'POST', {
      reason: 'BETA full-payment reversal test',
    })
    const ledger = (await api('receivables/invoice/227/payments')).payload
    check(
      ledger.summary?.paymentStatus === 'Partially Paid',
      'Invoice did not reopen to Partially Paid.',
    )
    const receipt = await api('invoices/227/receipt-pdf', 'GET', undefined, [422])
    check(receipt.status === 422, 'Receipt remained downloadable after payment reversal.')
    return `outstanding=${ledger.summary?.outstandingAmount}`
  })

  await step('re-settle reversed invoice without losing ledger history', async () => {
    const before = (await api('receivables/invoice/227/payments')).payload
    await api('receivables/invoice/227/payments', 'POST', {
      payment_type: 'full',
      amount: before.summary.outstandingAmount,
      payment_date: new Date().toLocaleDateString('en-CA'),
      payment_method: 'Bank Transfer',
      payment_reference: 'BETA-RESETTLE-227',
      request_token: crypto.randomUUID(),
    })
    const after = (await api('receivables/invoice/227/payments')).payload
    check(
      after.summary?.paymentStatus === 'Paid' && Number(after.summary?.outstandingAmount) === 0,
      'Invoice did not re-settle.',
    )
    check(
      after.payments?.some((payment) => payment.reversed_at || payment.reversedAt),
      'Reversed history was not retained.',
    )
  })

  await step('block un-award when paid invoice dependencies exist', async () => {
    const blocked = await api(
      'quote-records/special/48/un-award',
      'POST',
      { quote_id: 48 },
      [409, 422],
    )
    check(
      blocked.payload?.status === 'error',
      'Dependency-protected un-award did not return an error.',
    )
  })

  await step('un-award re-awarded disposable quote without dependencies', async () => {
    const records = (await api('quote-records/special')).payload.data || []
    let record = records.find((row) => Number(row.id) === 49)
    if (record?.status === 'Awarded') {
      await api('quote-records/special/49/un-award', 'POST', { quote_id: 49 })
      record = ((await api('quote-records/special')).payload.data || []).find(
        (row) => Number(row.id) === 49,
      )
    }
    check(record, 'Un-awarded quote disappeared unexpectedly.')
  })

  await step('delete unawarded disposable current quotes', async () => {
    for (const id of [45, 46, 47, 50]) {
      await api(`quote-records/special/${id}`, 'DELETE', undefined, [200, 404])
    }
  })
} finally {
  const output = path.resolve(
    '..',
    'beta-test-reports',
    '2026-09-07_1907-special-traffic-light-evidence',
    'E2E-special-recovery-result.json',
  )
  await fs.writeFile(
    output,
    JSON.stringify(
      { at: new Date().toISOString(), browser: 'standalone headed Chrome via Playwright', results },
      null,
      2,
    ),
  )
  await browser.close()
}
