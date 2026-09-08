import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const email = process.env.SPECIAL_E2E_EMAIL
const password = process.env.SPECIAL_E2E_PASSWORD
if (!email || !password) throw new Error('Missing visual retest credentials.')

const baseUrl = 'http://localhost:3000'
const evidenceDir = path.resolve(
  '..',
  'beta-test-reports',
  '2026-09-07_1907-special-traffic-light-evidence',
)
const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.SPECIAL_E2E_BROWSER,
})
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.setDefaultTimeout(20_000)
const results = []

const searchFor = async (reference) => {
  const search = page.getByPlaceholder('Type to search...').first()
  await search.fill('')
  await page.waitForTimeout(500)
  await search.fill(reference)
  await page.waitForTimeout(1500)
  await page.getByText(reference, { exact: false }).first().waitFor()
}

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#loginEmail').fill(email)
  await page.locator('#loginPassword').fill(password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: /sign in|login/i }).click(),
  ])
  const recordResponse = await page.request.get(`${baseUrl}/proxy/quote-records/special`, {
    headers: { Accept: 'application/json' },
  })
  const recordPayload = await recordResponse.json()
  const testRecords = (recordPayload.data || [])
    .filter((record) => [44, 48].includes(Number(record.id)))
    .map((record) => ({
      id: record.id,
      keys: Object.keys(record),
      formDataKeys: Object.keys(record.formData || {}),
      quotationId: record.formData?.quotationId,
      quoteRefNo: record.formData?.quoteRefNo,
      status: record.status,
    }))
  console.log(JSON.stringify({ testRecords }))

  await page.goto(`${baseUrl}/crm/records/special?categoryId=35`, { waitUntil: 'networkidle' })
  await searchFor('QSS26-0008AZA')
  await page.screenshot({
    path: path.join(evidenceDir, 'E2E-LEG-Q02-records-retest.png'),
    fullPage: true,
  })
  results.push({ name: 'legacy Records search and row', status: 'passed' })

  await page.goto(`${baseUrl}/crm/records/special?categoryId=35`, { waitUntil: 'networkidle' })
  await searchFor('QSS26-0013AZA')
  await page.screenshot({
    path: path.join(evidenceDir, 'E2E-CUR-Q02-records-retest.png'),
    fullPage: true,
  })
  results.push({ name: 'current Records search and awarded row', status: 'passed' })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  await searchFor('QSS26-0013AZA')
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  if (dimensions.scroll > dimensions.viewport)
    throw new Error('Mobile page has horizontal overflow.')
  await page.screenshot({
    path: path.join(evidenceDir, 'E2E-MOB-Q02-current-record-retest.png'),
    fullPage: true,
  })
  results.push({ name: 'mobile current Records row and overflow', status: 'passed' })
} finally {
  await fs.writeFile(
    path.join(evidenceDir, 'E2E-special-records-visual-retest.json'),
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  )
  await browser.close()
}
