import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const evidenceDir = process.env.UAT_EVIDENCE_DIR
const expectedCategory = process.env.UAT_CATEGORY_LABEL
const headless = process.env.UAT_HEADLESS !== '0'

if (!email || !password || !evidenceDir || !expectedCategory) {
  throw new Error(
    'SMOKE_EMAIL, SMOKE_PASSWORD, UAT_EVIDENCE_DIR, and UAT_CATEGORY_LABEL are required.',
  )
}

await fs.mkdir(evidenceDir, { recursive: true })

const browser = await chromium.launch({ headless })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const consoleErrors = []
const failedDashboardRequests = []

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('response', (response) => {
  if (response.url().includes('/stats/') && response.status() >= 400) {
    failedDashboardRequests.push({ url: response.url(), status: response.status() })
  }
})

const waitForDashboard = async () => {
  await page.waitForTimeout(1500)
  await page.getByText('Loading dashboard...').waitFor({ state: 'hidden', timeout: 30000 })
  await page.waitForTimeout(500)
}

const waitForVisibleText = async (text) => {
  await page.waitForFunction(
    (expected) =>
      [...document.querySelectorAll('body *')].some(
        (element) =>
          element.textContent?.trim() === expected &&
          element.getBoundingClientRect().width > 0 &&
          element.getBoundingClientRect().height > 0,
      ),
    text,
    { timeout: 30000 },
  )
}

const visibleTextCount = (text) =>
  page
    .getByText(text, { exact: true })
    .evaluateAll(
      (elements) =>
        elements.filter(
          (element) =>
            element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
        ).length,
    )

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#loginEmail', email)
  await page.fill('#loginPassword', password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ])

  await page.goto(`${baseUrl}/dashboard/crm`, { waitUntil: 'domcontentloaded' })
  await waitForDashboard()
  await waitForVisibleText(expectedCategory)
  await page.waitForFunction(() => !document.body.innerText.includes('Loading data...'), null, {
    timeout: 30000,
  })
  const authenticated = await page.getByText('CRM Tracking', { exact: true }).count()
  const desktopCategoryCount = await visibleTextCount(expectedCategory)
  const desktopOverflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  await page.screenshot({
    path: path.join(evidenceDir, 'desktop-crm-custom-category.png'),
    fullPage: true,
  })

  await page.goto(`${baseUrl}/dashboard/sales`, { waitUntil: 'domcontentloaded' })
  await waitForDashboard()
  await page.waitForFunction(() => !document.body.innerText.includes('Loading data...'), null, {
    timeout: 30000,
  })
  const salesLoaded = await page.getByText('Realized Value', { exact: true }).count()

  await page.goto(`${baseUrl}/dashboard/monitoring`, { waitUntil: 'domcontentloaded' })
  await waitForDashboard()
  const monitoringError = await page
    .getByText('Unable to load monitoring status data.', { exact: true })
    .count()
  await page.screenshot({
    path: path.join(evidenceDir, 'desktop-monitoring-dynamic-services.png'),
    fullPage: true,
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/dashboard/crm`, { waitUntil: 'domcontentloaded' })
  await waitForDashboard()
  await waitForVisibleText(expectedCategory)
  await page.waitForFunction(() => !document.body.innerText.includes('Loading data...'), null, {
    timeout: 30000,
  })
  const mobileCategoryCount = await visibleTextCount(expectedCategory)
  const mobileOverflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  await page.screenshot({
    path: path.join(evidenceDir, 'mobile-crm-custom-category.png'),
    fullPage: true,
  })

  const result = {
    authenticated: authenticated > 0,
    desktopCategoryVisible: desktopCategoryCount > 0,
    mobileCategoryVisible: mobileCategoryCount > 0,
    salesLoaded: salesLoaded > 0,
    monitoringLoadedWithoutError: monitoringError === 0,
    desktopOverflow,
    mobileOverflow,
    failedDashboardRequests,
    consoleErrors,
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.exitCode = Object.values({
    authenticated: result.authenticated,
    desktopCategoryVisible: result.desktopCategoryVisible,
    mobileCategoryVisible: result.mobileCategoryVisible,
    salesLoaded: result.salesLoaded,
    monitoringLoadedWithoutError: result.monitoringLoadedWithoutError,
    dashboardRequestsSucceeded: failedDashboardRequests.length === 0,
  }).every(Boolean)
    ? 0
    : 1
} finally {
  await browser.close()
}
