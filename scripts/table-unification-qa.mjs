import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(scriptDir, '..')
const repoRoot = resolve(frontendDir, '..')
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000'
const reportPath = process.env.QA_REPORT_PATH
  ? resolve(process.env.QA_REPORT_PATH)
  : resolve(repoRoot, 'TABLE_UNIFICATION_BROWSER_QA_REPORT.md')
const shouldStartServer = process.env.QA_START_SERVER !== '0'
const requireTableCoverage =
  process.env.QA_REQUIRE_TABLES === '1' || Boolean(process.env.QA_ROUTE_FILTER)
const navigationTimeoutMs = Number(process.env.QA_NAVIGATION_TIMEOUT_MS || 45_000)
const renderTimeoutMs = Number(process.env.QA_RENDER_TIMEOUT_MS || 8_000)
const metricSettleMs = Number(process.env.QA_METRIC_SETTLE_MS || 500)
const tableReadySelector = [
  '.data-table-shell',
  '.records-table-shell',
  '.data-table-mobile-list',
  '.records-mobile-list',
  '.records-mobile-wrap',
  '.table-scroll-viewport',
  'table',
].join(', ')

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: npm run qa:tables

Environment:
  QA_BASE_URL=http://localhost:3000
  QA_START_SERVER=0
  QA_ROUTE_FILTER=meetings,crm/records
  QA_VIEWPORT=desktop|mobile
  QA_REQUIRE_TABLES=1
  QA_NAVIGATION_TIMEOUT_MS=45000
  QA_RENDER_TIMEOUT_MS=8000
  QA_METRIC_SETTLE_MS=500
`)
  process.exit(0)
}

const routes = [
  ['/crm/records', 'CRM Records'],
  ['/commercial/invoice', 'Commercial Invoice'],
  ['/commercial/delivery-order', 'Commercial Delivery Order'],
  ['/commercial/jd14', 'Commercial JD14'],
  ['/commercial/vendor-loa', 'Commercial Vendor LOA'],
  ['/commercial/supplier-po', 'Commercial Supplier PO'],
  ['/project/manage', 'Project Manage'],
  ['/staff/manage', 'Staff Manage'],
  ['/users', 'Users'],
  ['/system-admin/dashboard', 'System Admin Dashboard'],
  ['/vendor/manage', 'Vendor Manage'],
  ['/vendor/pay', 'Vendor Pay'],
  ['/vendor/payment-records', 'Vendor Payment Records'],
  ['/catalog/manage', 'Catalog Manage'],
  ['/catalog/supplier-po', 'Catalog Supplier PO'],
  ['/client/manage', 'Client Manage'],
  ['/request-tool', 'Request Tool'],
  ['/procedure', 'Procedure List'],
  ['/meetings', 'Meetings'],
  ['/staff/tasks', 'Staff Tasks'],
  ['/task-manager', 'Task Manager'],
  ['/staff/leaves', 'Staff Leaves'],
  ['/staff/activities', 'Staff Activities'],
  ['/staff/appraise', 'Staff Appraise'],
  ['/pipeline/call-records', 'Marketing Call Records'],
  ['/pipeline/find', 'Marketing Factory Find'],
  ['/pipeline/entries', 'Marketing Pipeline Entries'],
  ['/feedback', 'Feedback'],
  ['/templates/list-training', 'Training Templates'],
  ['/templates/list-ih', 'IH Templates'],
  ['/templates/list-manpower', 'Manpower Templates'],
  ['/templates/list-special', 'Special Templates'],
  ['/handbook', 'Handbook'],
  ['/handbook/signatures', 'Handbook Signatures'],
  ['/handbook/change-log', 'Handbook Change Log'],
  ['/dashboard/monitoring', 'Dashboard Monitoring'],
]

const routeFilter = process.env.QA_ROUTE_FILTER
const activeRoutes = routeFilter
  ? routes.filter(([path, label]) => {
      const text = `${path} ${label}`.toLowerCase()
      return routeFilter
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
        .some((part) => text.includes(part))
    })
  : routes

const viewports = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]

const viewportFilter = process.env.QA_VIEWPORT
const activeViewports = viewportFilter
  ? viewports.filter(([name]) => name === viewportFilter)
  : viewports

const okJson = (payload) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(payload),
})

const sessionPayload = {
  status: 'success',
  user: {
    staff_id: 1,
    id: 1,
    staff_code: 'QA',
    full_name: 'QA User',
    name: 'QA User',
    email: 'qa@example.test',
    role: 'System Admin',
    roles: ['System Admin', 'HR', 'Manager'],
  },
  staff: {
    staff_id: 1,
    full_name: 'QA User',
    roles: ['System Admin', 'HR', 'Manager'],
  },
  roles: ['System Admin', 'HR', 'Manager'],
}

const mockPayloadFor = (url, method) => {
  const path = url.pathname.replace(/^\/proxy\/?/, '')

  if (path === 'auth/session') return sessionPayload
  if (path === 'auth/logout') return { status: 'success' }
  if (path.startsWith('staff/preferences/')) return { status: 'success', data: { value: null } }
  if (method !== 'GET' && method !== 'HEAD') return { status: 'success', data: [] }

  if (path === 'staff/manage') return { status: 'success', staff: [] }
  if (path === 'staff/system-users') return { status: 'success', data: [] }
  if (path === 'staff/activities') return { status: 'success', data: [] }
  if (path === 'staff/list') return { status: 'success', data: [] }
  if (path === 'client-companies') return { status: 'success', data: [] }
  if (path === 'client-pics') return { status: 'success', data: [] }
  if (path === 'catalog/items') return { status: 'success', data: [] }
  if (path === 'catalog/purchase-orders') return { status: 'success', data: [] }
  if (path === 'vendors') return { status: 'success', data: [] }
  if (path === 'vendor-projects') return { status: 'success', data: [] }
  if (path === 'vendor-payments')
    return { status: 'success', data: [], roles: sessionPayload.roles }
  if (path.startsWith('vendor-payments/by-vendor')) return { status: 'success', data: [] }
  if (path === 'feedback') return { status: 'success', data: [] }
  if (path === 'signature') return { status: 'success', data: null, has_signature: false }
  if (path === 'meetings')
    return {
      success: true,
      items: [
        {
          id: 1,
          meeting_title: 'QA desktop and mobile meeting',
          meeting_type: 'Ad Hoc',
          meeting_datetime: '2026-05-05 10:57:34',
          venue: 'QA Room',
          minutes_text: 'Reviewed QA table hardening.',
          action_items: JSON.stringify([
            {
              item_id: 'qa-action-1',
              action_text: 'Verify row action menu remains clickable without opening the row',
              pic_staff_id: 1,
              pic_name: 'QA User',
              pic_code: 'QA',
              status: 'Pending',
              created_by: 1,
            },
          ]),
          attendees: [{ staff_id: 1, staff_name: 'QA User', staff_code: 'QA' }],
        },
      ],
    }

  if (path === 'projects') return []
  if (path === 'jd14-forms') return { status: 'success', forms: [] }
  if (path === 'tasks') return { status: 'success', tasks: [] }
  if (path === 'tasks/personal') return { status: 'success', tasks: [] }
  if (path === 'tool-requests') return { status: 'success', data: [], requests: [] }
  if (path.startsWith('proposal-templates/')) return { status: 'success', data: [] }
  if (path.startsWith('google/places/unregistered')) return { status: 'success', places: [] }
  if (path.startsWith('google/call-statistics')) return { status: 'success', data: [] }
  if (path.startsWith('google/contacts/') && path.endsWith('/calls')) {
    return { status: 'success', calls: [] }
  }
  if (path.startsWith('hr/'))
    return { status: 'success', data: [], records: [], acknowledgements: [] }
  if (path.startsWith('stats/')) return { status: 'success', data: [], rows: [], entries: [] }
  if (path.startsWith('quote-records')) {
    const record = {
      id: 1,
      quotation_id: 'QA-CRUD-SEED-0001',
      quotationId: 'QA-CRUD-SEED-0001',
      subject: 'QA seeded quotation row',
      status: 'Pending',
      client: 'QA Client Sdn Bhd',
      client_name: 'QA Client Sdn Bhd',
      company_name: 'QA Client Sdn Bhd',
      email: 'qa.client@example.test',
      amount: 120,
      created_at: '2026-05-05 10:00:00',
      created_by_code: 'QA',
      service: 'Training',
    }
    return { status: 'success', data: [record], records: [record] }
  }

  return {
    status: 'success',
    data: [],
    rows: [],
    records: [],
    items: [],
    forms: [],
    projects: [],
    staff: [],
    roles: sessionPayload.roles,
  }
}

const waitForServer = async () => {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl)
      if (res.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 750))
    }
  }
  throw new Error(`Timed out waiting for ${baseUrl}`)
}

const startServer = async () => {
  if (!shouldStartServer) return null
  try {
    const res = await fetch(baseUrl)
    if (res.ok) return null
  } catch {
    // no active dev server; start one below
  }

  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', 'localhost'], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', () => {})
  await waitForServer()
  return child
}

const stopProcessTree = async (child) => {
  if (!child?.pid) return

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
      killer.on('close', resolve)
      killer.on('error', () => {
        child.kill()
        resolve()
      })
    })
    return
  }

  child.kill('SIGTERM')
}

const isBenignConsoleError = (text) =>
  /Failed to load catalog items|Error fetching|Fetch error|API returned error/i.test(text)

const run = async () => {
  const server = await startServer()
  const browser = await chromium.launch({ headless: true })
  const results = []

  try {
    for (const [viewportName, viewport] of activeViewports) {
      const context = await browser.newContext({ viewport })
      await context.route('**/proxy/**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        const method = request.method()
        if (method === 'HEAD') {
          await route.fulfill({ status: 200 })
          return
        }
        await route.fulfill(okJson(mockPayloadFor(url, method)))
      })

      for (const [routePath, label] of activeRoutes) {
        const page = await context.newPage()
        page.setDefaultTimeout(renderTimeoutMs)
        page.setDefaultNavigationTimeout(navigationTimeoutMs)
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('console', (message) => {
          if (message.type() !== 'error') return
          const text = message.text()
          if (!isBenignConsoleError(text)) errors.push(text)
        })

        const url = `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`
        let metrics
        try {
          process.stdout.write(`checking ${viewportName} ${routePath}\n`)
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs })
          await page
            .waitForLoadState('load', { timeout: Math.min(renderTimeoutMs, 5_000) })
            .catch(() => {})
          await page
            .waitForSelector(tableReadySelector, {
              state: 'visible',
              timeout: renderTimeoutMs,
            })
            .catch(() => {})
          await page.waitForTimeout(metricSettleMs)

          metrics = await page.evaluate(() => {
            const visible = (selector) =>
              Array.from(document.querySelectorAll(selector)).filter((el) => {
                const rect = el.getBoundingClientRect()
                const style = window.getComputedStyle(el)
                return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
              }).length

            const overflowEls = Array.from(document.querySelectorAll('body *'))
              .filter((el) => {
                const rect = el.getBoundingClientRect()
                if (rect.width <= 0 || rect.height <= 0) return false
                if (rect.left < -2 || rect.right > window.innerWidth + 2) {
                  const style = window.getComputedStyle(el)
                  if (style.position === 'fixed') return false

                  let ancestor = el.parentElement
                  while (ancestor && ancestor !== document.body) {
                    const ancestorStyle = window.getComputedStyle(ancestor)
                    if (ancestorStyle.position === 'fixed') return false
                    if (['auto', 'scroll', 'hidden', 'clip'].includes(ancestorStyle.overflowX)) {
                      return false
                    }
                    ancestor = ancestor.parentElement
                  }

                  return true
                }
                return false
              })
              .slice(0, 8)
              .map((el) => ({
                tag: el.tagName.toLowerCase(),
                className: String(el.className || '').slice(0, 120),
                text: String(el.textContent || '')
                  .trim()
                  .replace(/\s+/g, ' ')
                  .slice(0, 80),
              }))

            return {
              title: document.title,
              path: window.location.pathname,
              bodyText: document.body.innerText.slice(0, 300),
              docOverflow:
                document.documentElement.scrollWidth - document.documentElement.clientWidth,
              visibleShells: visible('.data-table-shell, .records-table-shell'),
              visibleMobileLists: visible(
                '.data-table-mobile-list, .records-mobile-list, .records-mobile-wrap',
              ),
              visibleDesktopViewports: visible('.table-scroll-viewport'),
              visibleTables: visible('table'),
              overflowEls,
            }
          })
        } catch (error) {
          errors.push(error.message)
        } finally {
          await page.close()
        }

        results.push({ viewportName, label, routePath, errors, metrics })
      }

      await context.close()
    }
  } finally {
    await browser.close()
    await stopProcessTree(server)
  }

  const failures = results.filter((result) => result.errors.length > 0)
  const mobileNoList = results.filter(
    (result) =>
      result.viewportName === 'mobile' &&
      result.metrics &&
      result.metrics.visibleShells > 0 &&
      result.metrics.visibleMobileLists === 0,
  )
  const mobileOverflow = results.filter(
    (result) =>
      result.viewportName === 'mobile' &&
      result.metrics &&
      result.metrics.docOverflow > 8 &&
      result.metrics.overflowEls.length > 0,
  )
  const noTableCoverage = results.filter(
    (result) =>
      result.metrics &&
      result.metrics.visibleShells === 0 &&
      result.metrics.visibleDesktopViewports === 0 &&
      result.metrics.visibleTables === 0,
  )

  const lines = [
    '# Table Unification Browser QA Report',
    '',
    `Date: ${new Date().toISOString()}`,
    '',
    `Routes checked: ${activeRoutes.length}`,
    `Viewports checked: ${activeViewports.map(([name]) => name).join(', ')}`,
    '',
    '## Summary',
    '',
    `- Runtime/navigation failures: ${failures.length}`,
    `- Routes without detected table coverage: ${noTableCoverage.length}`,
    `- Mobile datatable shells without mobile list: ${mobileNoList.length}`,
    `- Mobile horizontal overflow findings: ${mobileOverflow.length}`,
    '',
    '## Runtime / Navigation Failures',
    '',
    ...(failures.length
      ? failures.map(
          (result) =>
            `- ${result.viewportName} ${result.routePath}: ${result.errors
              .map((error) => error.split('\n')[0])
              .join(' | ')}`,
        )
      : ['None.']),
    '',
    '## Routes Without Detected Table Coverage',
    '',
    ...(noTableCoverage.length
      ? noTableCoverage.map((result) => `- ${result.viewportName} ${result.routePath}`)
      : ['None.']),
    '',
    '## Mobile Shells Without Mobile List',
    '',
    ...(mobileNoList.length ? mobileNoList.map((result) => `- ${result.routePath}`) : ['None.']),
    '',
    '## Mobile Horizontal Overflow',
    '',
    ...(mobileOverflow.length
      ? mobileOverflow.map(
          (result) =>
            `- ${result.routePath}: ${result.metrics.docOverflow}px overflow; first element: ${
              result.metrics.overflowEls[0]?.tag || 'unknown'
            } .${result.metrics.overflowEls[0]?.className || ''}`,
        )
      : ['None.']),
    '',
    '## Route Metrics',
    '',
    ...results.map((result) => {
      const metrics = result.metrics || {}
      return `- ${result.viewportName} ${result.routePath}: shells=${metrics.visibleShells ?? 'n/a'}, mobileLists=${metrics.visibleMobileLists ?? 'n/a'}, desktopViewports=${metrics.visibleDesktopViewports ?? 'n/a'}, tables=${metrics.visibleTables ?? 'n/a'}, overflow=${metrics.docOverflow ?? 'n/a'}`
    }),
    '',
  ]

  writeFileSync(reportPath, `${lines.join('\n')}\n`)

  console.log(
    JSON.stringify(
      {
        reportPath,
        failures: failures.length,
        noTableCoverage: noTableCoverage.length,
        requireTableCoverage,
        mobileNoList: mobileNoList.length,
        mobileOverflow: mobileOverflow.length,
      },
      null,
      2,
    ),
  )

  if (
    failures.length ||
    mobileNoList.length ||
    mobileOverflow.length ||
    (requireTableCoverage && noTableCoverage.length)
  ) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
