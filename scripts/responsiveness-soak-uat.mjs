import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `responsiveness-soak-${stamp}`)
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const headless = process.env.SMOKE_HEADLESS !== '0'

const endpointKey = (rawUrl) => {
  const url = new URL(rawUrl)
  if (url.pathname.endsWith('/maintenance-status.json')) return 'maintenance'
  if (url.pathname.endsWith('/meta.json')) return 'version'
  if (/\/(auth\/me|auth\/session)$/.test(url.pathname)) return 'auth'
  if (url.pathname.includes('/notifications/summary')) return 'notifications'
  if (url.pathname.includes('/whats-new')) return 'whats-new'
  if (url.pathname.includes('/workflow') && url.pathname.includes('setup')) return 'workflow'
  return null
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const wait = (page, milliseconds) => page.waitForTimeout(milliseconds)

const run = async () => {
  if (!email || !password) throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required.')

  await fs.mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)

  const issues = []
  const requests = {}
  const inFlight = {}
  const maxInFlight = {}
  const widthSamples = []
  let sampling = false

  const ensureEndpoint = (key) => {
    requests[key] ??= 0
    inFlight[key] ??= 0
    maxInFlight[key] ??= 0
  }

  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  page.on('request', (request) => {
    const key = endpointKey(request.url())
    if (!key) return
    ensureEndpoint(key)
    requests[key] += 1
    inFlight[key] += 1
    maxInFlight[key] = Math.max(maxInFlight[key], inFlight[key])
  })
  const finishRequest = (request) => {
    const key = endpointKey(request.url())
    if (!key) return
    ensureEndpoint(key)
    inFlight[key] = Math.max(0, inFlight[key] - 1)
  }
  page.on('requestfinished', finishRequest)
  page.on('requestfailed', (request) => {
    finishRequest(request)
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return
    issues.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    )
  })
  page.on('response', (response) => {
    if (response.status() >= 500) {
      issues.push(`server: ${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('#loginEmail', email)
    await page.fill('#loginPassword', password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.click('button[type="submit"]'),
    ])
    console.log('PASS  authenticated local soak session')

    await page.evaluate(() => {
      window.__uatLayoutShifts = []
      window.__uatRouteEnteredAt = Date.now()
      window.__uatDisabledMutations = []
      if (typeof PerformanceObserver === 'function') {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput && Date.now() - window.__uatRouteEnteredAt >= 5000) {
              window.__uatLayoutShifts.push({
                value: entry.value,
                path: window.location.pathname,
                at: Date.now(),
              })
            }
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
        window.__uatLayoutShiftObserver = observer
      }
      const disabledObserver = new MutationObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target
          window.__uatDisabledMutations.push({
            disabled: element.hasAttribute('disabled'),
            tag: element.tagName,
            id: element.id || '',
            name:
              element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 80) || '',
            at: Date.now(),
          })
        }
      })
      disabledObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['disabled'],
        subtree: true,
      })
      window.__uatDisabledObserver = disabledObserver
    })

    const sampler = setInterval(async () => {
      if (sampling || page.isClosed()) return
      sampling = true
      try {
        widthSamples.push(
          await page.evaluate(() => ({
            path: window.location.pathname,
            clientWidth: document.documentElement.clientWidth,
            bodyWidth: Math.round(document.body.getBoundingClientRect().width),
            scrollWidth: document.documentElement.scrollWidth,
          })),
        )
      } catch {
        // Navigation can replace the execution context between samples.
      } finally {
        sampling = false
      }
    }, 2000)

    await wait(page, 30_000)
    await wait(page, 30_000)
    console.log('PASS  first desktop stability minute')

    const beforeFocus = { ...requests }
    await page.evaluate(() => {
      for (let index = 0; index < 5; index += 1) window.dispatchEvent(new Event('focus'))
    })
    await wait(page, 1500)
    for (const key of [
      'maintenance',
      'version',
      'auth',
      'notifications',
      'whats-new',
      'workflow',
    ]) {
      const increment = (requests[key] || 0) - (beforeFocus[key] || 0)
      assert(increment <= 1, `${key} issued ${increment} requests for one focus burst`)
    }
    await wait(page, 28_500)
    await wait(page, 30_000)
    console.log('PASS  focus coalescing and second stability minute')

    await page.locator('a[href="/templates/proposals"]').first().click()
    await page.waitForURL((url) => url.pathname.startsWith('/templates/proposals'))
    await page.evaluate(() => {
      window.__uatRouteEnteredAt = Date.now()
    })
    await wait(page, 22_500)
    await wait(page, 22_500)
    console.log('PASS  proposals remained responsive for 45 seconds')

    await page.locator('a[href="/vendor/payment-records"]').first().click()
    await page.waitForURL((url) => url.pathname.startsWith('/vendor/payment-records'))
    await page.evaluate(() => {
      window.__uatRouteEnteredAt = Date.now()
    })
    await wait(page, 22_500)
    await wait(page, 22_500)
    console.log('PASS  payment queue remained responsive for 45 seconds')

    await page.waitForLoadState('networkidle').catch(() => {})
    const beforeHidden = { ...requests }
    const hiddenState = await page.evaluate(() => {
      window.__uatVisibilityState = 'hidden'
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => window.__uatVisibilityState,
      })
      document.dispatchEvent(new Event('visibilitychange'))
      return document.visibilityState
    })
    assert(hiddenState === 'hidden', 'Unable to simulate a hidden document state')
    await wait(page, 32_500)
    await wait(page, 32_500)
    await page.evaluate(() => {
      window.__uatVisibilityState = 'visible'
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await wait(page, 1500)
    const hiddenRequestCounts = Object.fromEntries(
      Object.keys(requests).map((key) => [key, (requests[key] || 0) - (beforeHidden[key] || 0)]),
    )
    for (const [key, count] of Object.entries(hiddenRequestCounts)) {
      assert(count <= 1, `${key} continued polling ${count} times while the tab was hidden`)
    }
    console.log('PASS  hidden-tab polling remained suspended')

    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL((url) => url.pathname === '/dashboard')
    await page.evaluate(() => {
      window.__uatRouteEnteredAt = Date.now()
    })
    await wait(page, 12_500)
    await wait(page, 12_500)
    clearInterval(sampler)

    const browserEvidence = await page.evaluate(() => ({
      layoutShifts: window.__uatLayoutShifts || [],
      disabledMutations: window.__uatDisabledMutations || [],
      helpDisabled: document.querySelector('button[aria-label*="Help" i]')?.disabled || false,
    }))
    const cumulativeLayoutShift = browserEvidence.layoutShifts.reduce(
      (sum, entry) => sum + Number(entry.value || 0),
      0,
    )
    const desktopWidths = new Set()
    const routeVisits = []
    for (const sample of widthSamples.filter((item) => item.clientWidth >= 1000)) {
      const widthKey = `${sample.clientWidth}/${sample.bodyWidth}`
      desktopWidths.add(widthKey)
      const currentVisit = routeVisits.at(-1)
      if (!currentVisit || currentVisit.path !== sample.path) {
        routeVisits.push({ path: sample.path, transitions: 0, lastWidth: widthKey })
        continue
      }
      if (currentVisit.lastWidth !== widthKey) {
        currentVisit.transitions += 1
        currentVisit.lastWidth = widthKey
      }
    }

    for (const [key, maximum] of Object.entries(maxInFlight)) {
      assert(maximum <= 1, `${key} had ${maximum} overlapping requests`)
    }
    assert(!browserEvidence.helpDisabled, 'The global Help control became disabled')
    const unstableVisit = routeVisits.find((visit) => visit.transitions > 1)
    assert(
      !unstableVisit,
      `Desktop width repeatedly changed on ${unstableVisit?.path} (${unstableVisit?.transitions} transitions)`,
    )
    assert(cumulativeLayoutShift < 0.1, `Cumulative layout shift was ${cumulativeLayoutShift}`)
    assert(issues.length === 0, `Browser/runtime issues found: ${issues.join(' | ')}`)

    await page.screenshot({ path: path.join(outputDir, 'desktop-final.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await wait(page, 1000)
    const mobileOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    assert(
      mobileOverflow.scrollWidth <= mobileOverflow.clientWidth + 1,
      `Mobile document overflowed (${mobileOverflow.scrollWidth}/${mobileOverflow.clientWidth})`,
    )
    await page.screenshot({ path: path.join(outputDir, 'mobile-final.png'), fullPage: true })

    const report = {
      status: 'passed',
      baseUrl,
      durationSeconds: 300,
      requests,
      maxInFlight,
      hiddenRequestCounts,
      cumulativeLayoutShift,
      disabledMutations: browserEvidence.disabledMutations,
      desktopWidths: [...desktopWidths],
      routeVisits,
      mobileOverflow,
      issues,
      outputDir,
    }
    await fs.writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log('PASS  five-minute responsiveness soak')
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    await page
      .screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true })
      .catch(() => {})
    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      `${JSON.stringify({ status: 'failed', error: error.message, issues, outputDir }, null, 2)}\n`,
    )
    throw error
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
