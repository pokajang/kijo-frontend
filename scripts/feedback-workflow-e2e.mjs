import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `feedback-workflow-e2e-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const apiBase = `${baseUrl}/proxy`
const adminEmail = process.env.FEEDBACK_E2E_ADMIN_EMAIL
const adminPassword = process.env.FEEDBACK_E2E_ADMIN_PASSWORD
const reporterEmail = process.env.FEEDBACK_E2E_REPORTER_EMAIL
const reporterPassword = process.env.FEEDBACK_E2E_REPORTER_PASSWORD
const allowMutation = process.env.FEEDBACK_E2E_ALLOW_MUTATION === '1'
const headless = process.env.FEEDBACK_E2E_HEADLESS !== '0'

const runLabel = `Feedback E2E ${stamp}`
const reportText = `${runLabel}: reporter cannot complete verification`
const adminComment = `${runLabel}: developer acknowledged the report`
const reporterComment = `${runLabel}: reporter supplied reproduction details`
const firstFixRemarks = `${runLabel}: first fix is ready for verification`
const rejectionReason = `${runLabel}: issue still reproduces after the first fix`
const secondFixRemarks = `${runLabel}: second fix addresses the reported reproduction path`
const today = new Date().toLocaleDateString('en-CA')
const results = []
const runtimeIssues = []
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const requireConfiguration = () => {
  const targetUrl = new URL(baseUrl)
  if (!loopbackHosts.has(targetUrl.hostname.toLowerCase())) {
    throw new Error(
      `Feedback workflow E2E refuses non-loopback target ${targetUrl.origin}. Run it only against an isolated local backend and database.`,
    )
  }

  const missing = []
  if (!adminEmail) missing.push('FEEDBACK_E2E_ADMIN_EMAIL')
  if (!adminPassword) missing.push('FEEDBACK_E2E_ADMIN_PASSWORD')
  if (!reporterEmail) missing.push('FEEDBACK_E2E_REPORTER_EMAIL')
  if (!reporterPassword) missing.push('FEEDBACK_E2E_REPORTER_PASSWORD')
  if (!allowMutation) missing.push('FEEDBACK_E2E_ALLOW_MUTATION=1')
  if (missing.length) {
    throw new Error(`Feedback workflow E2E is mutative. Missing: ${missing.join(', ')}`)
  }
  assert(
    adminEmail.toLowerCase() !== reporterEmail.toLowerCase(),
    'Admin and reporter accounts must be distinct.',
  )
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const poll = async (label, callback, { timeoutMs = 25_000, intervalMs = 350 } = {}) => {
  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const value = await callback()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await sleep(intervalMs)
  }
  throw new Error(
    `${label} did not reach the expected state within ${timeoutMs}ms${
      lastError ? `: ${lastError.message}` : ''
    }`,
  )
}

const recordStep = async (name, action) => {
  const startedAt = Date.now()
  try {
    const detail = await action()
    results.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail })
    console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`)
    return detail
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      detail: error.message,
    })
    console.error(`FAIL  ${name} :: ${error.message}`)
    throw error
  }
}

const run = async () => {
  requireConfiguration()
  await fs.mkdir(screenshotsDir, { recursive: true })

  const browser = await chromium.launch({ headless })
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const reporterContext = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const blockedExternalRequests = []

  const installNetworkGuard = (actor, context) =>
    context.route('**/*', async (route) => {
      const request = route.request()
      const resourceType = request.resourceType()
      const requestUrl = new URL(request.url())
      if (
        ['fetch', 'xhr'].includes(resourceType) &&
        !loopbackHosts.has(requestUrl.hostname.toLowerCase())
      ) {
        const detail = `${actor} blocked external ${resourceType.toUpperCase()} ${requestUrl.origin}`
        blockedExternalRequests.push(detail)
        runtimeIssues.push(detail)
        await route.abort('blockedbyclient')
        return
      }
      await route.continue()
    })

  await Promise.all([
    installNetworkGuard('admin', adminContext),
    installNetworkGuard('reporter', reporterContext),
  ])

  const adminPage = await adminContext.newPage()
  const reporterPage = await reporterContext.newPage()
  const csrfTokens = new WeakMap()
  let feedbackId = null

  for (const [actor, page] of [
    ['admin', adminPage],
    ['reporter', reporterPage],
  ]) {
    page.setDefaultTimeout(20_000)
    page.setDefaultNavigationTimeout(40_000)
    page.on('pageerror', (error) => runtimeIssues.push(`${actor} pageerror: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeIssues.push(`${actor} console: ${message.text()}`)
    })
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText || 'unknown'
      if (!reason.includes('ERR_ABORTED')) {
        runtimeIssues.push(`${actor} request: ${request.method()} ${request.url()} -> ${reason}`)
      }
    })
    page.on('response', (response) => {
      if (response.status() >= 500) {
        runtimeIssues.push(
          `${actor} server: ${response.status()} ${response.request().method()} ${response.url()}`,
        )
      }
    })
  }

  const apiRequest = async (page, route, { method = 'GET', body, statuses = [200] } = {}) => {
    const response = await page.request.fetch(`${apiBase}/${String(route).replace(/^\/+/, '')}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(csrfTokens.get(page) ? { 'X-CSRF-TOKEN': csrfTokens.get(page) } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      data: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = await response.json().catch(async () => ({ text: await response.text() }))
    if (typeof payload?.csrf_token === 'string') csrfTokens.set(page, payload.csrf_token)
    if (!statuses.includes(response.status())) {
      throw new Error(
        `${method} ${route} returned ${response.status()}: ${JSON.stringify(payload).slice(0, 700)}`,
      )
    }
    return { status: response.status(), payload }
  }

  const login = async (page, email, password, requiredRole = null) => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#loginEmail').fill(email)
    await page.locator('#loginPassword').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.getByRole('button', { name: /sign in|login/i }).click(),
    ]).catch((error) => {
      if (blockedExternalRequests.length > 0) {
        throw new Error(
          `Feedback workflow E2E blocked a non-loopback API request: ${blockedExternalRequests.join('; ')}`,
        )
      }
      throw error
    })
    const { payload } = await apiRequest(page, 'auth/session')
    const user = payload.user || payload.data?.user
    assert(user?.staff_id, `Authenticated session returned no staff user for ${email}.`)
    if (requiredRole) {
      assert(
        Array.isArray(user.roles) && user.roles.includes(requiredRole),
        `${email} does not have required role ${requiredRole}.`,
      )
    }
    return user
  }

  const detail = async (page) => {
    const { payload } = await apiRequest(page, `feedback/${feedbackId}`)
    return payload
  }

  const notifications = async (page) => {
    const { payload } = await apiRequest(page, 'notifications/list?limit=100')
    return payload.data?.items || []
  }

  const waitForNotification = (page, type) =>
    poll(`notification ${type}`, async () => {
      const items = await notifications(page)
      return items.find(
        (item) => Number(item.entity_id) === Number(feedbackId) && item.type === type,
      )
    })

  const openDetail = async (page) => {
    await page.goto(`${baseUrl}/support/feedback/${feedbackId}`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Feedback Details', { exact: true }).waitFor()
    await page.getByText(reportText, { exact: true }).first().waitFor()
    await page.getByTestId('feedback-activity-timeline').waitFor()
  }

  const addComment = async (page, message) => {
    const card = page.locator('.card').filter({ hasText: 'Add Comment' }).first()
    await card.locator('textarea').fill(message)
    await card.getByRole('button', { name: 'Post Comment', exact: true }).click()
    await page.getByText(message, { exact: true }).waitFor()
  }

  const updateFix = async (page, { status, remarks }) => {
    await page.getByRole('button', { name: 'Update Fix', exact: true }).click()
    const modal = page.locator('.modal.show').filter({ hasText: 'Admin Fix Issue' }).first()
    await modal.waitFor()
    await modal.locator('select').nth(0).selectOption(status)
    await modal.locator('select').nth(1).selectOption('30-Day Fix')
    await modal.locator('input[type="date"]').fill(today)
    await modal.locator('textarea').fill(remarks)
    await modal.getByRole('button', { name: 'Save', exact: true }).click()
    await modal.waitFor({ state: 'detached' })
    await poll(`status ${status}`, async () => {
      const payload = await detail(page)
      return payload.feedback?.status === status ? payload : null
    })
  }

  const assertSupportBadge = async (page) => {
    await page.goto(`${baseUrl}/support/feedback`, { waitUntil: 'domcontentloaded' })
    const badge = page.locator('[title="Feedback updates available"]').first()
    await badge.waitFor({ state: 'visible' })
    assert(Number((await badge.textContent())?.trim()) > 0, 'Feedback notification badge is empty.')
  }

  try {
    await recordStep('authenticate disposable reporter', async () => {
      const user = await login(reporterPage, reporterEmail, reporterPassword)
      assert(!user.roles?.includes('System Admin'), 'Reporter must not be a System Admin.')
      return `staff=${user.staff_id}`
    })

    await recordStep('reporter submits feedback through header UI', async () => {
      await reporterPage.getByRole('button', { name: 'Open support ticket', exact: true }).click()
      const modal = reporterPage.locator('.modal.show').filter({ hasText: 'Submit Support Ticket' })
      await modal.locator('textarea').fill(reportText)
      await modal.getByRole('button', { name: 'Submit', exact: true }).click()
      const alert = reporterPage
        .locator('.modal.show')
        .filter({ hasText: 'Ticket submitted successfully.' })
      await alert.waitFor()
      await alert.getByRole('button', { name: 'OK', exact: true }).click()

      feedbackId = await poll('submitted feedback lookup', async () => {
        const { payload } = await apiRequest(
          reporterPage,
          `feedback?year=${new Date().getFullYear()}&per_page=100`,
        )
        return payload.feedbacks?.find((item) => item.feedback === reportText)?.id || null
      })
      return `feedback=${feedbackId}`
    })

    await recordStep('admin receives stored notification and Support badge', async () => {
      const user = await login(adminPage, adminEmail, adminPassword, 'System Admin')
      await waitForNotification(adminPage, 'feedback.report.received')
      const { payload } = await apiRequest(adminPage, 'notifications/summary')
      assert(
        Number(payload.data?.by_route_group?.['/support/feedback'] || 0) > 0,
        'Support feedback route-group count was not incremented.',
      )
      assert(
        Number(payload.data?.by_tab?.['support.feedback'] || 0) > 0,
        'Feedback tab count was not incremented.',
      )
      await assertSupportBadge(adminPage)
      return `staff=${user.staff_id}`
    })

    await recordStep('admin opens ticket, consumes alert, comments, and triages', async () => {
      await openDetail(adminPage)
      await poll('admin notification consumption', async () => {
        const items = await notifications(adminPage)
        return !items.some((item) => Number(item.entity_id) === Number(feedbackId))
      })
      await addComment(adminPage, adminComment)
      await updateFix(adminPage, { status: 'In Progress', remarks: `${runLabel}: triaged` })
      await adminPage.screenshot({
        path: path.join(screenshotsDir, '01-admin-triaged.png'),
        fullPage: true,
      })
      return 'commented and moved to In Progress'
    })

    await recordStep('reporter receives developer updates and replies', async () => {
      await waitForNotification(reporterPage, 'feedback.developer.comment')
      await waitForNotification(reporterPage, 'feedback.developer.updated')
      await reporterPage.bringToFront()
      await assertSupportBadge(reporterPage)
      await openDetail(reporterPage)
      await addComment(reporterPage, reporterComment)
      return 'developer notifications visible and reply posted'
    })

    await recordStep('admin submits first completed fix', async () => {
      await waitForNotification(adminPage, 'feedback.reporter.comment')
      await openDetail(adminPage)
      await updateFix(adminPage, { status: 'Fixed Completed', remarks: firstFixRemarks })
      return 'first fix awaiting reporter verification'
    })

    await recordStep('reporter rejects first fix with a reason', async () => {
      await waitForNotification(reporterPage, 'feedback.fix.ready')
      await openDetail(reporterPage)
      const card = reporterPage.locator('.card').filter({ hasText: 'Add Comment' }).first()
      await card.locator('textarea').fill(rejectionReason)
      await card.getByRole('button', { name: 'Reject Fix', exact: true }).click()
      await poll('rejected fix status', async () => {
        const payload = await detail(reporterPage)
        return payload.feedback?.status === 'In Progress' ? payload : null
      })
      await reporterPage.getByText('Reporter rejected the fix', { exact: true }).waitFor()
      return 'returned to In Progress'
    })

    await recordStep('admin receives rejection and submits second fix', async () => {
      await waitForNotification(adminPage, 'feedback.fix.rejected')
      await openDetail(adminPage)
      await updateFix(adminPage, { status: 'Fixed Completed', remarks: secondFixRemarks })
      return 'second fix awaiting verification'
    })

    await recordStep('reporter confirms resolution', async () => {
      await waitForNotification(reporterPage, 'feedback.fix.ready')
      await openDetail(reporterPage)
      await reporterPage.getByRole('button', { name: 'Confirm Resolved', exact: true }).click()
      const confirm = reporterPage.locator('.modal.show').filter({
        hasText: 'Confirm that this issue has been rectified?',
      })
      await confirm.getByRole('button', { name: 'Confirm Resolved', exact: true }).click()
      await poll('resolved feedback status', async () => {
        const payload = await detail(reporterPage)
        return payload.feedback?.status === 'Resolved' ? payload : null
      })
      await reporterPage
        .getByText('Reporter confirmed the issue resolved', { exact: true })
        .waitFor()
      await reporterPage.screenshot({
        path: path.join(screenshotsDir, '02-reporter-resolved.png'),
        fullPage: true,
      })
      return 'status=Resolved'
    })

    await recordStep('immutable timeline and hard-delete guard', async () => {
      const payload = await detail(reporterPage)
      const eventTypes = payload.history?.map((event) => event.event_type) || []
      const expected = [
        'report_received',
        'comment_added',
        'developer_updated',
        'comment_added',
        'fix_ready',
        'fix_rejected',
        'fix_ready',
        'reporter_resolved',
      ]
      assert(
        JSON.stringify(eventTypes) === JSON.stringify(expected),
        `Unexpected immutable history: ${JSON.stringify(eventTypes)}`,
      )
      assert(payload.feedback?.fixed_at, 'Resolved feedback did not preserve fixed_at.')
      assert(payload.feedback?.resolved_at, 'Resolved feedback has no resolved_at timestamp.')

      const deletion = await apiRequest(reporterPage, `feedback/${feedbackId}`, {
        method: 'DELETE',
        statuses: [409],
      })
      assert(deletion.payload.status === 'error', 'DELETE guard did not return an error payload.')
      return `${eventTypes.length} ordered events; DELETE=409`
    })

    await recordStep('admin receives final confirmation notification', async () => {
      await waitForNotification(adminPage, 'feedback.reporter.resolved')
      return 'reporter confirmation delivered to developer'
    })

    await recordStep('browser and API runtime health', async () => {
      assert(
        runtimeIssues.length === 0,
        `Runtime issues: ${JSON.stringify(runtimeIssues).slice(0, 1500)}`,
      )
      return 'no console, request, or server errors'
    })
  } catch (error) {
    await Promise.all([
      adminPage
        .screenshot({ path: path.join(screenshotsDir, 'failure-admin.png'), fullPage: true })
        .catch(() => {}),
      reporterPage
        .screenshot({ path: path.join(screenshotsDir, 'failure-reporter.png'), fullPage: true })
        .catch(() => {}),
    ])
    throw error
  } finally {
    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          baseUrl,
          runLabel,
          feedbackId,
          results,
          runtimeIssues,
        },
        null,
        2,
      ),
    )
    await browser.close()
  }

  console.log(`\n${results.length}/${results.length} steps passed.`)
  console.log(`Feedback ID: ${feedbackId}`)
  console.log(`Evidence: ${outputDir}`)
}

run().catch((error) => {
  console.error('FEEDBACK-WORKFLOW-E2E-FAILED', error)
  process.exitCode = 1
})
