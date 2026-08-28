import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium, firefox, webkit } from 'playwright'

const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const applicantEmail = process.env.SMOKE_EMAIL
const applicantPassword = process.env.SMOKE_PASSWORD
const financeEmail = process.env.SALARY_UAT_EMAIL || 'salary.reviewer@amiosh.test'
const financePassword = process.env.SALARY_UAT_PASSWORD
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.resolve('test-results', `salary-claims-cross-browser-uat-${stamp}`)

if (!applicantEmail || !applicantPassword || !financePassword) {
  throw new Error('SMOKE_EMAIL, SMOKE_PASSWORD, and SALARY_UAT_PASSWORD are required.')
}

const engines = { chromium, firefox, webkit }
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
]
const actors = [
  {
    name: 'applicant',
    email: applicantEmail,
    password: applicantPassword,
    routes: ['/my/salary', '/my/salary/other-claims', '/my/salary/settings'],
  },
  {
    name: 'finance',
    email: financeEmail,
    password: financePassword,
    routes: [
      '/financial/salary-records',
      '/financial/other-claim-records',
      '/financial/payment-queue',
    ],
  },
]
const results = []

const gotoWithRetry = async (page, url) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return
    } catch (error) {
      const message = String(error?.message || '')
      const retryable =
        message.includes('NS_ERROR_FAILURE') || message.includes('NS_BINDING_ABORTED')
      if (!retryable || attempt === 3) throw error
      await page.waitForTimeout(300 * attempt)
    }
  }
}

await fs.mkdir(outputDir, { recursive: true })

for (const [engineName, browserType] of Object.entries(engines)) {
  const browser = await browserType.launch({ headless: process.env.HEADLESS !== '0' })
  try {
    for (const profile of profiles) {
      for (const actor of actors) {
        console.log(`RUN   ${engineName} ${profile.name} ${actor.name}`)
        const context = await browser.newContext({ viewport: profile.viewport })
        const page = await context.newPage()
        page.setDefaultTimeout(30_000)
        const diagnostics = {
          consoleErrors: [],
          pageErrors: [],
          requestFailures: [],
          httpErrors: [],
        }
        page.on('console', (message) => {
          if (message.type() === 'error') diagnostics.consoleErrors.push(message.text())
        })
        page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
        page.on('requestfailed', (request) => {
          const reason = request.failure()?.errorText || 'unknown'
          if (!reason.includes('ERR_ABORTED') && !reason.includes('NS_BINDING_ABORTED')) {
            diagnostics.requestFailures.push(`${request.method()} ${request.url()} -> ${reason}`)
          }
        })
        page.on('response', (response) => {
          if (response.status() >= 500)
            diagnostics.httpErrors.push(`${response.status()} ${response.url()}`)
        })

        await gotoWithRetry(page, `${baseUrl}/login`)
        await page.locator('#loginEmail').fill(actor.email)
        await page.locator('#loginPassword').fill(actor.password)
        await Promise.all([
          page.waitForURL((url) => !url.pathname.startsWith('/login')),
          page.getByRole('button', { name: /sign in|login/i }).click(),
        ])
        for (const values of Object.values(diagnostics)) values.length = 0
        await page.close()

        for (const route of actor.routes) {
          const routePage = await context.newPage()
          routePage.setDefaultTimeout(30_000)
          routePage.on('console', (message) => {
            if (message.type() === 'error') diagnostics.consoleErrors.push(message.text())
          })
          routePage.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
          routePage.on('requestfailed', (request) => {
            const reason = request.failure()?.errorText || 'unknown'
            if (!reason.includes('ERR_ABORTED') && !reason.includes('NS_BINDING_ABORTED')) {
              diagnostics.requestFailures.push(`${request.method()} ${request.url()} -> ${reason}`)
            }
          })
          routePage.on('response', (response) => {
            if (response.status() >= 500)
              diagnostics.httpErrors.push(`${response.status()} ${response.url()}`)
          })
          await gotoWithRetry(routePage, `${baseUrl}${route}`)
          await routePage.locator('main, [role="main"], body').first().waitFor()
          await routePage.waitForTimeout(1_500)
          const layout = await routePage.evaluate(() => ({
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            visibleText: document.body.innerText.trim().slice(0, 200),
          }))
          const rootOverflow = layout.documentWidth > layout.viewportWidth + 1
          if (rootOverflow) {
            throw new Error(
              `${engineName}/${profile.name}/${actor.name}${route} has root overflow ${layout.documentWidth}px > ${layout.viewportWidth}px.`,
            )
          }
          if (!layout.visibleText)
            throw new Error(
              `${engineName}/${profile.name}/${actor.name}${route} rendered no content.`,
            )
          results.push({
            engine: engineName,
            profile: profile.name,
            actor: actor.name,
            route,
            rootOverflow,
            diagnostics: structuredClone(diagnostics),
          })
          await routePage.screenshot({
            path: path.join(
              outputDir,
              `${engineName}-${profile.name}-${actor.name}-${route.split('/').filter(Boolean).join('-')}.png`,
            ),
            fullPage: true,
          })
          await routePage.close()
        }

        const failures = Object.entries(diagnostics).flatMap(([kind, values]) =>
          values.map((value) => `${kind}: ${value}`),
        )
        if (failures.length)
          throw new Error(`${engineName}/${profile.name}/${actor.name}: ${failures.join('\n')}`)
        await context.close()
      }
    }
    console.log(`PASS  ${engineName} desktop/mobile applicant and finance routes`)
  } finally {
    await browser.close()
  }
}

await fs.writeFile(path.join(outputDir, 'results.json'), JSON.stringify(results, null, 2))
console.log(`PASS  ${results.length} cross-browser route checks.`)
console.log(`Evidence: ${outputDir}`)
