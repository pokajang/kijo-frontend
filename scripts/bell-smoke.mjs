import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const now = new Date()
const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outDir = path.join(projectRoot, 'test-results', `bell-smoke-${stamp}`)
const shotsDir = path.join(outDir, 'screenshots')
const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const password = process.env.SMOKE_PASSWORD || 'dok ghok'

const findings = []
const record = (name, ok, detail = '') => {
  findings.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`)
}

const run = async () => {
  await fs.mkdir(shotsDir, { recursive: true })
  const browser = await chromium.launch()
  const consoleErrors = []
  const netFails = []

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
  })
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText || ''
    // ERR_ABORTED is benign: Playwright tears down / Escape cancels in-flight
    // fetches (e.g. the dropdown's own /notifications/list when it closes).
    if (err.includes('ERR_ABORTED')) return
    netFails.push(`${r.method()} ${r.url()} ${err}`.slice(0, 300))
  })

  // --- login ---
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#loginEmail', email)
  await page.fill('#loginPassword', password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ])
  record('login', true, page.url())

  // --- bell present ---
  const bell = page.getByRole('button', { name: /notification/i }).first()
  await bell.waitFor({ state: 'visible', timeout: 10000 })
  record('bell-visible', true)

  // --- vertical centering vs the account dropdown sibling ---
  const bellBox = await bell.boundingBox()
  // The account toggle is the last bottom-nav dropdown toggle in the header.
  const account = page.locator('.app-main-header .app-bottom-nav-dropdown-toggle').last()
  const acctBox = await account.boundingBox().catch(() => null)
  if (bellBox && acctBox) {
    const bellMid = bellBox.y + bellBox.height / 2
    const acctMid = acctBox.y + acctBox.height / 2
    const delta = Math.abs(bellMid - acctMid)
    record('bell-centered-vs-account', delta <= 3, `midline delta ${delta.toFixed(1)}px`)
  } else {
    record('bell-centered-vs-account', false, 'could not measure both boxes')
  }

  await page.screenshot({ path: path.join(shotsDir, '01-header.png') })

  // --- open dropdown ---
  await bell.click()
  // The menu header text "Notifications"
  const menuHeader = page.getByText('Notifications', { exact: true }).first()
  await menuHeader.waitFor({ state: 'visible', timeout: 8000 })
  record('dropdown-opens', true)
  await page.screenshot({ path: path.join(shotsDir, '02-dropdown-open.png') })

  // --- list content OR empty state (both are valid render paths) ---
  const hasEmpty = await page.getByText(/you're all caught up/i).count()
  const rowButtons = await page.locator('.app-header-dropdown-menu .dropdown-item').count()
  record(
    'list-renders',
    hasEmpty > 0 || rowButtons > 0,
    hasEmpty ? 'empty-state' : `${rowButtons} row(s)`,
  )

  // --- /notifications/list network call fired and succeeded ---
  let listStatus = null
  page.on('response', () => {})
  const listResp = await page
    .waitForResponse((r) => r.url().includes('notifications/list'), { timeout: 4000 })
    .catch(() => null)
  if (listResp) listStatus = listResp.status()
  record(
    'list-endpoint-called',
    !!listResp,
    listResp ? `HTTP ${listStatus}` : 'no call captured (may have fired before listener)',
  )

  // close
  await page.keyboard.press('Escape')

  // --- dark mode ---
  const themeBtn = page.getByRole('button', { name: /dark mode|light mode/i }).first()
  if (await themeBtn.count()) {
    await themeBtn.click()
    await page.waitForTimeout(300)
    await bell.click()
    await menuHeader.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
    await page.screenshot({ path: path.join(shotsDir, '03-dark-dropdown.png') })
    record('dark-mode-dropdown', true, 'captured')
    await page.keyboard.press('Escape')
    await themeBtn.click() // back to light
  } else {
    record('dark-mode-dropdown', false, 'theme toggle not found')
  }

  // --- mobile viewport: bell still reachable, dropdown not clipped off-screen ---
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  const bellM = page.getByRole('button', { name: /notification/i }).first()
  const mobileBellVisible = await bellM.isVisible().catch(() => false)
  if (mobileBellVisible) {
    await bellM.click()
    const menuM = page.locator('.app-header-dropdown-menu').first()
    const mBox = await menuM.boundingBox().catch(() => null)
    const vw = 390
    const clipped = mBox ? mBox.x < -2 || mBox.x + mBox.width > vw + 2 : true
    record(
      'mobile-dropdown-not-clipped',
      mBox ? !clipped : false,
      mBox ? `x=${mBox.x.toFixed(0)} w=${mBox.width.toFixed(0)} vw=${vw}` : 'no menu box',
    )
    await page.screenshot({ path: path.join(shotsDir, '04-mobile-dropdown.png') })
  } else {
    record(
      'mobile-dropdown-not-clipped',
      false,
      'bell not visible at 390px (may be hidden on mobile by design)',
    )
  }

  record('no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '))
  record('no-network-failures', netFails.length === 0, netFails.slice(0, 5).join(' | '))

  await browser.close()

  const summary = {
    baseUrl,
    when: now.toISOString(),
    findings,
    consoleErrors,
    netFails,
  }
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify(summary, null, 2))
  const failed = findings.filter((f) => !f.ok)
  console.log(
    `\n=== ${findings.length - failed.length}/${findings.length} checks passed; screenshots: ${shotsDir}`,
  )
  process.exit(failed.length ? 1 : 0)
}

run().catch((e) => {
  console.error('SMOKE-CRASH', e)
  process.exit(2)
})
