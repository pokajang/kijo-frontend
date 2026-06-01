import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')
const now = new Date()
const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `mobile-view-audit-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const password = process.env.SMOKE_PASSWORD || 'dok ghok'

const PARAM_VALUES = {
  articleId: '1',
  companyId: '1',
  dashboardTab: 'sales',
  entitlementId: '1',
  feedbackId: '1',
  finalAppraisalId: '1',
  groupKey: 'general',
  id: '1',
  itemId: '1',
  leaveId: '1',
  name: 'sample-project',
  noticeId: '1',
  paymentId: '1',
  proposalSlug: 'training',
  recordId: '1',
  registrationId: '1',
  requestId: '1',
  salaryRecordId: '1',
  serviceSlug: 'training',
  serviceTab: 'training',
  slug: 'sample-article',
  staffId: '1',
  taskId: '1',
  templateId: '1',
  templateKey: 'salary-application',
  token: 'sample-token',
  type: 'training',
  vendorId: '1',
  versionId: '1',
}

const ROUTE_LABEL_OVERRIDES = {
  '/': 'Home',
}

const EXPECTED_NOT_FOUND_BY_ROUTE = [
  { route: '/pipeline/entries/:id', urlPattern: /\/stats\/monitoring-manual-pipeline-entry\// },
  {
    route: '/calls/pipeline-entries/:id',
    urlPattern: /\/stats\/monitoring-manual-pipeline-entry\//,
  },
  { route: '/administration/procedures/view/:id', urlPattern: /\/procedures\// },
  { route: '/administration/procedures/edit/:id', urlPattern: /\/procedures\// },
  { route: '/procedure/view/:id', urlPattern: /\/procedures\// },
  { route: '/procedure/edit/:id', urlPattern: /\/procedures\// },
  { route: '/catalog/manage/:itemId', urlPattern: /\/catalog\/items\// },
  { route: '/client/roi/:companyId', urlPattern: /\/client-companies\/[^/]+\/commercial-history/ },
  { route: '/staff/manage/:staffId', urlPattern: /\/hr\/staff\// },
  {
    route: '/staff/appraise/final-appraisal/:finalAppraisalId',
    urlPattern: /\/hr\/appraisals\/final\//,
  },
  {
    route: '/staff/appraise/final-appraisal/records/:finalAppraisalId',
    urlPattern: /\/hr\/appraisals\/final\//,
  },
  { route: '/staff/appraise/records/:appraisalId', urlPattern: /\/hr\/appraisals\// },
  { route: '/appraisal/records/:appraisalId', urlPattern: /\/hr\/appraisals\/personal/ },
  { route: '/templates/proposals/:type/:id', urlPattern: /\/proposal-templates\// },
  { route: '/templates/list-training/:id', urlPattern: /\/proposal-templates\// },
  { route: '/templates/list-ih/:id', urlPattern: /\/proposal-templates\// },
  { route: '/templates/list-manpower/:id', urlPattern: /\/proposal-templates\// },
  { route: '/templates/list-special/:id', urlPattern: /\/proposal-templates\// },
  { route: '/knowledge/:slug', urlPattern: /\/knowledge\/articles\// },
  { route: '/whats-new/:noticeId', urlPattern: /\/whats-new\// },
  { route: '/system-admin/whats-new/:noticeId/edit', urlPattern: /\/whats-new\// },
  { route: '/system-admin/whats-new/:noticeId', urlPattern: /\/whats-new\// },
  { route: '/my/salary/records/:salaryRecordId', urlPattern: /\/hr\/salary\/records\// },
  { route: '/share/workload/:token', urlPattern: /\/stats\/workload\/share\// },
]

const expectedNotFoundConfig = (rawPath) =>
  EXPECTED_NOT_FOUND_BY_ROUTE.filter((item) => item.route === rawPath)

const isExpectedNotFoundResponse = (route, response) =>
  response.status() === 404 &&
  expectedNotFoundConfig(route.rawPath).some((item) => item.urlPattern.test(response.url()))

const isExpectedNotFoundConsoleMessage = (route, msg) =>
  msg.type() === 'error' &&
  expectedNotFoundConfig(route.rawPath).length > 0 &&
  msg.text() === 'Failed to load resource: the server responded with a status of 404 (Not Found)'

const safeName = (input) =>
  input
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'home'

const readRoutes = async () => {
  const stripComments = (source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  const routesSource = stripComments(
    await fs.readFile(path.join(projectRoot, 'src', 'routes.js'), 'utf8'),
  )
  const appSource = stripComments(
    await fs.readFile(path.join(projectRoot, 'src', 'App.js'), 'utf8'),
  )
  const routeRegex = /path:\s*['"`]([^'"`*]+)['"`]/g
  const jsxRouteRegex = /<Route\b[^>]*\bpath=["']([^"'*]+)["']/g
  const routes = []
  const seen = new Set()

  const addRoute = (rawPath, source) => {
    const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
    if (normalized === '/*' || seen.has(normalized)) return
    seen.add(normalized)
    routes.push({
      rawPath: normalized,
      source,
      label: ROUTE_LABEL_OVERRIDES[normalized] || normalized,
      path: normalized.replace(/:([A-Za-z0-9_]+)/g, (_, key) => PARAM_VALUES[key] || '1'),
    })
  }

  for (const match of routesSource.matchAll(routeRegex)) addRoute(match[1], 'routes.js')
  for (const match of appSource.matchAll(routeRegex)) addRoute(match[1], 'App.js')
  for (const match of appSource.matchAll(jsxRouteRegex)) addRoute(match[1], 'App.js')

  return routes
}

const analyseLayout = async (page) =>
  page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const docScrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth || 0)
    const docScrollHeight = Math.max(doc.scrollHeight, body?.scrollHeight || 0)
    const interactive = [
      ...document.querySelectorAll(
        'button, [role="button"], a[href], input, select, textarea, .btn, .form-control',
      ),
    ]
      .filter((el) => {
        const style = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return (
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.top <= viewportHeight
        )
      })
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          text: (
            el.innerText ||
            el.value ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            ''
          )
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 80),
          tag: el.tagName.toLowerCase(),
          className: String(el.className || '').slice(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
        }
      })

    const narrowTargets = interactive.filter((item) => item.width < 44 || item.height < 44)
    const keyTargetSelectors = [
      '.app-bottom-nav-item',
      '.app-bottom-nav-link',
      '.app-bottom-nav-link--button',
      '.app-bottom-nav-dropdown-toggle',
      '.module-nav-strip__tab',
      '.records-service-strip__tab',
      '.records-filter-toggle-btn',
      '.records-filter-icon-btn',
      '.records-filter-action .btn',
      '.records-mobile-top-pager-btn',
      '.records-table-footer .btn',
      '.record-action-toggle',
      '.data-table-action-toggle',
      '.app-module-search-fab',
      '.app-knowledge-header-help',
      '.modal .btn-close',
      '.offcanvas .btn-close',
      '.app-header-dropdown-item',
      '.app-header-dropdown-footer .dropdown-item',
    ]
    const isVisibleTarget = (el) => {
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.top <= viewportHeight &&
        rect.right >= 0 &&
        rect.left <= viewportWidth
      )
    }
    const keyTargets = keyTargetSelectors.flatMap((selector) =>
      [...document.querySelectorAll(selector)].filter(isVisibleTarget).map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          selector,
          text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 80),
          tag: el.tagName.toLowerCase(),
          className: String(el.className || '').slice(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
        }
      }),
    )
    const keyTargetFailures = keyTargets.filter((item) => item.width < 44 || item.height < 44)
    const rectFor = (el) => {
      if (!el || !isVisibleTarget(el)) return null
      const rect = el.getBoundingClientRect()
      return {
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    }
    const overlaps = (a, b) =>
      Boolean(
        a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
      )
    const bottomNavRect = rectFor(document.querySelector('.header.header-sticky'))
    const floatingActionRects = [
      ...document.querySelectorAll('.app-module-search-fab, .app-knowledge-header-help'),
    ]
      .map((el) => ({
        selector: el.matches('.app-module-search-fab')
          ? '.app-module-search-fab'
          : '.app-knowledge-header-help',
        rect: rectFor(el),
      }))
      .filter((item) => item.rect)
    const stickyFooterRects = [...document.querySelectorAll('.records-table-footer')]
      .map((el) => ({ selector: '.records-table-footer', rect: rectFor(el) }))
      .filter((item) => item.rect)
    const fixedOverlapSamples = [
      ...floatingActionRects
        .filter((item) => overlaps(item.rect, bottomNavRect))
        .map((item) => ({ type: 'fab-bottom-nav', ...item })),
      ...stickyFooterRects
        .filter((item) => bottomNavRect && item.rect.bottom > bottomNavRect.top + 1)
        .map((item) => ({ type: 'footer-bottom-nav', ...item })),
    ]
    const offscreen = [...document.body.querySelectorAll('*')]
      .filter((el) => {
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') return false
        const rect = el.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) return false
        return rect.right > viewportWidth + 2 || rect.left < -2
      })
      .slice(0, 30)
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          tag: el.tagName.toLowerCase(),
          className: String(el.className || '').slice(0, 140),
          text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      })

    const fixedLike = [...document.querySelectorAll('*')]
      .filter((el) => {
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') return false
        const rect = el.getBoundingClientRect()
        return rect.width > viewportWidth && !el.closest('.table-responsive')
      })
      .slice(0, 20)
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          tag: el.tagName.toLowerCase(),
          className: String(el.className || '').slice(0, 140),
          width: Math.round(rect.width),
          text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        }
      })

    return {
      viewportWidth,
      viewportHeight,
      docScrollWidth,
      docScrollHeight,
      horizontalOverflow: docScrollWidth > viewportWidth + 2,
      overflowPx: Math.max(0, docScrollWidth - viewportWidth),
      narrowTargetCount: narrowTargets.length,
      narrowTargetSamples: narrowTargets.slice(0, 10),
      keyTargetFailureCount: keyTargetFailures.length,
      keyTargetFailureSamples: keyTargetFailures.slice(0, 10),
      bottomNavRect,
      floatingActionRects,
      stickyFooterRects,
      fixedOverlapCount: fixedOverlapSamples.length,
      fixedOverlapSamples,
      offscreenSamples: offscreen,
      fixedLikeSamples: fixedLike,
      h1: document.querySelector('h1,h2,h3')?.innerText?.trim()?.replace(/\s+/g, ' ') || '',
      mainText: document.body.innerText.trim().replace(/\s+/g, ' ').slice(0, 300),
    }
  })

const analyseLayoutWithRetry = async (page) => {
  try {
    return await analyseLayout(page)
  } catch (err) {
    const message = String(err?.message || '')
    if (!message.includes('Execution context was destroyed')) throw err
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => null)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null)
    return analyseLayout(page)
  }
}

const run = async () => {
  await fs.mkdir(screenshotsDir, { recursive: true })
  const routes = await readRoutes()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  const loginErrors = []
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) loginErrors.push(`${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => loginErrors.push(`pageerror: ${err.message}`))

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.fill('#loginEmail', email)
  await page.fill('#loginPassword', password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ])
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null)
  const loginUrl = page.url()
  await context.storageState({ path: path.join(outputDir, 'storage-state.json') })
  await page.close()

  const results = []

  for (const [index, route] of routes.entries()) {
    const routePage = await context.newPage()
    const consoleMessages = []
    const failedRequests = []
    let expectedNotFoundResponses = 0
    let genericExpectedNotFoundConsoleMessages = 0
    routePage.on('console', (msg) => {
      if (isExpectedNotFoundConsoleMessage(route, msg)) {
        genericExpectedNotFoundConsoleMessages += 1
        return
      }
      if (['error', 'warning'].includes(msg.type())) {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`.slice(0, 500))
      }
    })
    routePage.on('pageerror', (err) =>
      consoleMessages.push(`pageerror: ${err.message}`.slice(0, 500)),
    )
    routePage.on('requestfailed', (request) => {
      const errorText = request.failure()?.errorText || ''
      if (errorText === 'net::ERR_ABORTED') return
      failedRequests.push(`${request.method()} ${request.url()} :: ${errorText}`)
    })
    routePage.on('response', (response) => {
      const status = response.status()
      const url = response.url()
      if (isExpectedNotFoundResponse(route, response)) {
        expectedNotFoundResponses += 1
        return
      }
      if (status >= 400 && !url.includes('/auth/session')) {
        failedRequests.push(`${status} ${response.request().method()} ${url}`)
      }
    })

    const target = `${baseUrl}${route.path}`
    const result = {
      index: index + 1,
      ...route,
      target,
      finalUrl: '',
      status: 'unknown',
      screenshot: '',
      consoleMessages: [],
      failedRequests: [],
      failedChecks: [],
      layout: null,
      error: '',
    }

    try {
      const response = await routePage.goto(target, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      })
      await routePage.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null)
      result.finalUrl = routePage.url()
      result.status = response ? String(response.status()) : 'no-response'
      result.layout = await analyseLayoutWithRetry(routePage)
      if (result.layout.horizontalOverflow) {
        result.failedChecks.push(`horizontal-overflow:${result.layout.overflowPx}px`)
      }
      if (result.layout.fixedOverlapCount > 0) {
        result.failedChecks.push(`fixed-bottom-overlap:${result.layout.fixedOverlapCount}`)
      }
      if (result.layout.keyTargetFailureCount > 0) {
        result.failedChecks.push(`mobile-touch-target:${result.layout.keyTargetFailureCount}`)
      }
      const screenshotName = `${String(index + 1).padStart(3, '0')}-${safeName(route.rawPath)}.png`
      result.screenshot = path.relative(repoRoot, path.join(screenshotsDir, screenshotName))
      await routePage.screenshot({
        path: path.join(screenshotsDir, screenshotName),
        fullPage: true,
      })
    } catch (err) {
      result.error = err?.message || String(err)
      result.failedChecks.push('route-error')
      result.finalUrl = routePage.url()
    } finally {
      result.consoleMessages = [...new Set(consoleMessages)].slice(0, 20)
      const unsuppressedGeneric404s = Math.max(
        0,
        genericExpectedNotFoundConsoleMessages - expectedNotFoundResponses,
      )
      for (let count = 0; count < unsuppressedGeneric404s; count += 1) {
        result.consoleMessages.push(
          'error: Failed to load resource: the server responded with a status of 404 (Not Found)',
        )
      }
      result.failedRequests = [...new Set(failedRequests)].slice(0, 30)
      if (result.consoleMessages.some((message) => message.startsWith('pageerror:'))) {
        result.failedChecks.push('pageerror')
      }
      await routePage.close()
    }

    results.push(result)
    console.log(
      `${index + 1}/${routes.length} ${route.rawPath} -> ${result.finalUrl || 'ERROR'} overflow=${
        result.layout?.overflowPx ?? 'n/a'
      }`,
    )
  }

  const failedCheckRoutes = results.filter((result) => result.failedChecks.length > 0)
  const summary = {
    generatedAt: now.toISOString(),
    baseUrl,
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
    loginUrl,
    loginErrors,
    totalRoutes: routes.length,
    failedCheckRoutes: failedCheckRoutes.length,
    results,
  }

  await fs.writeFile(path.join(outputDir, 'results.json'), JSON.stringify(summary, null, 2))
  await browser.close()
  console.log(`\nWrote ${path.relative(repoRoot, path.join(outputDir, 'results.json'))}`)
  if (failedCheckRoutes.length > 0) {
    console.error(`Mobile audit checks failed on ${failedCheckRoutes.length} route(s).`)
    process.exitCode = 1
  }
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
