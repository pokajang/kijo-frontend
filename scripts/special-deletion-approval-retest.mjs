import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const email = process.env.SPECIAL_E2E_EMAIL
const password = process.env.SPECIAL_E2E_PASSWORD
if (!email || !password || process.env.SPECIAL_E2E_ALLOW_MUTATION !== '1')
  throw new Error('Missing retest configuration.')

const baseUrl = 'http://localhost:3000'
const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.SPECIAL_E2E_BROWSER,
})
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
let csrf = ''
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
    throw new Error(`${method} ${route} returned ${response.status()}`)
  return payload
}

let result
try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#loginEmail').fill(email)
  await page.locator('#loginPassword').fill(password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: /sign in|login/i }).click(),
  ])
  await api('auth/session')

  const source = (await api('quotes/special/48')).data
  const created = await api('quotes/special', 'POST', {
    client_id: source.clientId,
    client_name: source.clientName,
    client_ssm: source.clientSsm,
    client_address: source.clientAddress,
    client_city: source.clientCity,
    client_state: source.clientState,
    client_zip: source.clientZip,
    pic_name: source.picName,
    pic_email: source.picEmail,
    pic_phone: source.picPhone,
    pic_position: source.picPosition,
    sp_id: source.spId,
    category_id: source.categoryId,
    service_title: `${source.serviceTitle} DELETE RETEST`,
    service_code: source.serviceCode,
    general_remarks: 'BETA approval retirement deletion retest',
    discount: 0,
    sst_percent: 0,
    estimated_total_cost: 100,
    attach_proposal: false,
    proposal_language: source.proposalLanguage || 'en',
    line_items: [
      {
        item_name: 'BETA delete retest',
        description: 'Disposable.',
        unit: 'Lot',
        unit_price: 150,
        quantity: 1,
        total_price: 150,
      },
    ],
  })
  const quoteId = Number(created.quote_id)
  const approvalsBefore = (await api('quote-approvals')).data || []
  const approval = approvalsBefore.find((row) => Number(row.quote_id) === quoteId)
  if (!approval || approval.status !== 'approved')
    throw new Error('Green approval was not created.')

  await api(`quote-records/special/${quoteId}`, 'DELETE')
  const approvalsAfter = (await api('quote-approvals')).data || []
  if (approvalsAfter.some((row) => Number(row.id) === Number(approval.id))) {
    throw new Error('Deleted quote approval remains current.')
  }
  await api(`quotes/special/${quoteId}`, 'GET', undefined, [404])
  result = {
    status: 'passed',
    quoteId,
    approvalId: approval.id,
    assertion: 'history retained but no current approval remains',
  }
  console.log(JSON.stringify(result))
} finally {
  await fs.writeFile(
    path.resolve(
      '..',
      'beta-test-reports',
      '2026-09-07_1907-special-traffic-light-evidence',
      'E2E-special-deletion-approval-retest.json',
    ),
    JSON.stringify(
      { at: new Date().toISOString(), browser: 'standalone headed Chrome via Playwright', result },
      null,
      2,
    ),
  )
  await browser.close()
}
