import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const email = process.env.SPECIAL_E2E_EMAIL
const password = process.env.SPECIAL_E2E_PASSWORD
const executablePath = process.env.SPECIAL_E2E_BROWSER
if (!email || !password || !executablePath) {
  throw new Error('Missing Special mobile retest configuration.')
}

const baseUrl = 'http://localhost:3000'
const evidenceDir = path.resolve(
  '..',
  'beta-test-reports',
  '2026-09-07_1907-special-traffic-light-evidence',
)
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 767, height: 1024 },
]
const results = []
const runtimeIssues = []
const browser = await chromium.launch({ headless: false, executablePath })
const context = await browser.newContext({ viewport: viewports[0] })
const page = await context.newPage()
page.setDefaultTimeout(20_000)

page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`))
page.on('response', (response) => {
  if (response.status() >= 500) {
    runtimeIssues.push(`http ${response.status()}: ${response.url()}`)
  }
})

const inspectMobileShell = async () => {
  const review = page.getByRole('button', { name: 'Review & Acknowledge' })
  const dismiss = page.getByRole('button', {
    name: 'Dismiss handbook acknowledgement reminder',
  })
  const [reviewBox, dismissBox] = await Promise.all([review.boundingBox(), dismiss.boundingBox()])

  return page.evaluate(
    ({ reviewRect, dismissRect }) => {
      const root = document.documentElement
      const header = document.querySelector('.header.header-sticky')
      const prompt = document.querySelector('.app-global-prompt--handbook')
      const nav = document.querySelector('.app-bottom-nav-container')
      const body = document.querySelector('.body')
      const headerRect = header?.getBoundingClientRect()
      const promptRect = prompt?.getBoundingClientRect()
      const navRect = nav?.getBoundingClientRect()
      const measuredInset = Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--app-mobile-fixed-bottom-inset'),
      )
      const headerInset = Number.parseFloat(
        getComputedStyle(header).getPropertyValue('--app-mobile-fixed-bottom-inset'),
      )
      const bodyPaddingBottom = Number.parseFloat(getComputedStyle(body).paddingBottom)

      return {
        bodyPaddingBottom,
        dismissRect,
        documentWidth: root.scrollWidth,
        headerHeight: headerRect?.height ?? 0,
        headerInset,
        measuredInset,
        navTop: navRect?.top ?? 0,
        promptBottom: promptRect?.bottom ?? 0,
        promptHeight: promptRect?.height ?? 0,
        reviewRect,
        viewportWidth: root.clientWidth,
      }
    },
    { reviewRect: reviewBox, dismissRect: dismissBox },
  )
}

const assertShell = (measurement, viewport) => {
  const problems = []
  if (measurement.documentWidth > measurement.viewportWidth) problems.push('horizontal overflow')
  if (Math.abs(measurement.measuredInset - Math.ceil(measurement.headerHeight)) > 1) {
    problems.push('measured inset does not match the fixed shell height')
  }
  if (Math.abs(measurement.headerInset - Math.ceil(measurement.headerHeight)) > 1) {
    problems.push('header descendants do not inherit the measured shell height')
  }
  if (measurement.bodyPaddingBottom < measurement.headerHeight + 16) {
    problems.push('page bottom padding does not clear the fixed shell')
  }
  if (measurement.promptBottom > measurement.navTop + 1) problems.push('prompt overlaps bottom nav')
  if (viewport.width < 768 && measurement.promptHeight > 49) problems.push('prompt is not compact')
  for (const [name, rect] of [
    ['Review', measurement.reviewRect],
    ['Dismiss', measurement.dismissRect],
  ]) {
    if (!rect || rect.width < 44 || rect.height < 44)
      problems.push(`${name} touch target is below 44px`)
  }
  if (problems.length)
    throw new Error(`${viewport.width}x${viewport.height}: ${problems.join(', ')}`)
}

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#loginEmail').fill(email)
  await page.locator('#loginPassword').fill(password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: /sign in|login/i }).click(),
  ])
  results.push({ name: 'authenticated session', status: 'passed' })

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto(`${baseUrl}/crm/records/special?categoryId=35`, {
      waitUntil: 'networkidle',
    })
    await page.getByText('Handbook sign-off required.', { exact: true }).waitFor()

    const search = page.getByPlaceholder('Type to search...').first()
    await search.fill('QSS26-0013AZA')
    await page.getByText('QSS26-0013AZA', { exact: false }).first().waitFor()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(250)

    const measurement = await inspectMobileShell()
    assertShell(measurement, viewport)
    const id = `${viewport.width}x${viewport.height}`
    await page.screenshot({
      path: path.join(evidenceDir, `E2E-MOB-BANNER-${id}.png`),
      fullPage: true,
    })
    results.push({ name: `mobile shell ${id}`, status: 'passed', measurement })
  }

  const beforeDismiss = await inspectMobileShell()
  await page.getByRole('button', { name: 'Dismiss handbook acknowledgement reminder' }).click()
  await page.getByText('Handbook sign-off required.', { exact: true }).waitFor({ state: 'hidden' })
  await page.waitForTimeout(250)
  const afterDismiss = await page.evaluate(() => {
    const header = document.querySelector('.header.header-sticky')
    return {
      headerHeight: header?.getBoundingClientRect().height ?? 0,
      measuredInset: Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--app-mobile-fixed-bottom-inset',
        ),
      ),
    }
  })
  if (afterDismiss.headerHeight >= beforeDismiss.headerHeight - 20) {
    throw new Error('Fixed shell did not collapse after dismissing the reminder.')
  }
  if (Math.abs(afterDismiss.measuredInset - Math.ceil(afterDismiss.headerHeight)) > 1) {
    throw new Error('Measured inset did not update after dismissing the reminder.')
  }
  results.push({
    name: 'dismissal collapses measured shell inset',
    status: 'passed',
    beforeDismiss,
    afterDismiss,
  })

  if (runtimeIssues.length) throw new Error(runtimeIssues.join('\n'))
} catch (error) {
  results.push({ name: 'run failure', status: 'failed', message: error.message })
  throw error
} finally {
  await fs.writeFile(
    path.join(evidenceDir, 'E2E-special-mobile-banner-retest.json'),
    JSON.stringify({ at: new Date().toISOString(), results, runtimeIssues }, null, 2),
  )
  await browser.close()
}
