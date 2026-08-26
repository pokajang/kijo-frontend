import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(
  root,
  'test-results',
  'commercial-word-uat',
  new Date().toISOString().replace(/[:.]/g, '-'),
)
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '')
const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const user = {
  staff_id: 51,
  full_name: 'Test Staff',
  email: 'test@example.test',
  roles: ['Manager'],
}
const po = {
  po_id: 501,
  po_ref_no: 'POES26-0501AZA',
  supplier_name: 'Safe Vendor',
  created_at: '2026-08-13',
  status: 'Open',
  grand_total: 216,
  items: [],
}
const delivery = {
  id: 601,
  do_id: 601,
  do_number: 'DO26-601AZA',
  client_name: 'Client Sdn Bhd',
  client_address: 'Kajang',
  project_name: 'Equipment Project',
  project_code: 'EQ-1',
  project_award_date: '2026-08-13',
  company_contact_name: 'Test Staff',
  created_at: '2026-08-13',
  items: [],
}
const invoice = {
  id: 701,
  invoice_ref_no: 'INV26-0701AZA',
  project_id: 1,
  service_type: 'Equipment',
  invoice_purpose: 'Supply',
  invoice_date: '2026-08-13',
  amount: 200,
  grand_total: 216,
  status: 'Paid',
  payment_method: 'Bank Transfer',
  paid_date: '2026-08-13',
  paid_amount: 216,
  invoice_client_name: 'Client Sdn Bhd',
  breakdown: [],
}
const vendorLoa = {
  id: 801,
  project_id: 7,
  vendor_id: 41,
  loa_ref_no: 'LOA26-0801TST',
  vendor_name: 'Safe Vendor',
  project_name: 'Safety Project',
  award_value: 2000,
  status: 'Open',
}

const cases = [
  {
    name: 'supplier-po',
    page: '/commercial/supplier-po/501',
    action: 'Export Word',
    endpoint: '/catalog/purchase-orders/501/word',
    filename: 'supplier-po-POES26-0501AZA.docx',
  },
  {
    name: 'delivery-order',
    page: '/commercial/delivery-order/601',
    action: 'Generate Word',
    endpoint: '/delivery-orders/601/word',
    filename: 'delivery-order-DO26-601AZA.docx',
  },
  {
    name: 'invoice',
    page: '/commercial/invoice/701',
    action: 'Word Invoice',
    endpoint: '/invoices/701/word',
    filename: 'INV26-0701AZA.docx',
  },
  {
    name: 'receipt',
    page: '/commercial/invoice/701',
    action: 'Word Receipt',
    endpoint: '/invoices/701/receipt-word',
    filename: 'RCPT2026-0001.docx',
  },
  {
    name: 'vendor-loa',
    page: '/commercial/vendor-loa/801',
    action: 'Generate Word',
    endpoint: '/projects/7/loa/word',
    filename: 'LOA26-0801TST_Safe_Vendor.docx',
  },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const report = {
  verificationLevel: 'mocked browser UAT; API responses are intercepted',
  checks: [],
  consoleErrors: [],
  requests: [],
}
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push(message.text())
})
await page.route('**/*', async (route) => {
  const request = route.request()
  if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
  const pathname = new URL(request.url()).pathname
  report.requests.push(`${request.method()} ${pathname}`)
  const json = (body) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  if (pathname.endsWith('/auth/session'))
    return json({ status: 'success', user, csrf_token: 'uat-token' })
  if (pathname.endsWith('/catalog/purchase-orders'))
    return json({ status: 'success', data: [po], pagination: { current_page: 1, last_page: 1 } })
  if (pathname.endsWith('/delivery-orders'))
    return json({
      status: 'success',
      orders: [delivery],
      pagination: { current_page: 1, last_page: 1 },
    })
  if (pathname.endsWith('/invoices')) return json({ status: 'success', invoices: [invoice] })
  if (pathname.endsWith('/vendor-loas')) return json({ status: 'success', data: [vendorLoa] })
  const match = cases.find((item) => pathname.endsWith(item.endpoint))
  if (match)
    return route.fulfill({
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${match.filename}"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
      body: Buffer.from('PK\u0003\u0004mock-docx'),
    })
  return json({ status: 'success', data: [] })
})

try {
  await fs.mkdir(output, { recursive: true })
  for (const item of cases) {
    await page.goto(`${baseUrl}${item.page}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1_500)
    report.lastBody = await page.locator('body').innerText()
    const directAction = page.getByRole('button', { name: item.action, exact: true })
    if ((await directAction.count()) === 0) {
      await page.getByRole('button', { name: 'Actions' }).click()
    }
    const action =
      (await directAction.count()) > 0 ? directAction : page.getByText(item.action, { exact: true })
    await action.waitFor()
    const downloadPromise = page.waitForEvent('download')
    await action.click()
    const download = await downloadPromise
    const saved = path.join(output, `${item.name}-${download.suggestedFilename()}`)
    await download.saveAs(saved)
    const bytes = await fs.readFile(saved)
    report.checks.push({
      name: item.name,
      passed:
        download.suggestedFilename() === item.filename && bytes.subarray(0, 2).toString() === 'PK',
    })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/commercial/invoice/701`, { waitUntil: 'domcontentloaded' })
  report.checks.push({
    name: 'mobile-no-horizontal-overflow',
    passed: await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  })
  await page.screenshot({ path: path.join(output, 'invoice-word-mobile.png'), fullPage: true })
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  await browser.close()
}

if (report.consoleErrors.length || report.checks.some((check) => !check.passed))
  process.exitCode = 1
