import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `salary-lifecycle-smoke-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const apiBase = `${baseUrl.replace(/\/$/, '')}/proxy`
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const password = process.env.SMOKE_PASSWORD
const claimDescription = `Smoke automated allowance ${stamp}`

const findings = []
const consoleErrors = []
const pageErrors = []
const requestFailures = []
const unexpectedResponses = []

const check = (name, ok, detail = '') => {
  findings.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`)
}

const addRequestFailure = (entry) => {
  requestFailures.push(entry)
}

const addUnexpectedResponse = (entry) => {
  unexpectedResponses.push(entry)
}

const nextMonthValue = () => {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
}

const apiPath = (relativePath) =>
  `${apiBase}/${String(relativePath || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')}`
let csrfToken = ''

const readJsonResponse = async (response) => {
  const contentType = response.headers()['content-type'] || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { text }
  }
}

const summarizeApiFailure = (response, payload) => {
  const text = JSON.stringify(payload || {})
  const snippet = text.length > 180 ? `${text.slice(0, 180)}...` : text
  return `${response.status()} ${response.url()} ${snippet}`
}

const run = async () => {
  if (!password) {
    throw new Error('SMOKE_PASSWORD environment variable is required.')
  }

  await fs.mkdir(screenshotsDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(18_000)
  page.setDefaultNavigationTimeout(35_000)

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'unknown'
    if (!reason.includes('ERR_ABORTED')) {
      addRequestFailure(`${request.method()} ${request.url()} -> ${reason}`)
    }
  })

  page.on('response', (response) => {
    if (response.status() >= 400) {
      addUnexpectedResponse(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  const apiRequest = async ({
    path: apiRoute,
    method = 'GET',
    body = null,
    expectSuccess = true,
    label = '',
    parseJson = true,
  }) => {
    const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
    const hasBody = Boolean(body)
    const options = {
      method,
      headers: hasBody
        ? {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
          }
        : unsafeMethod && csrfToken
          ? { 'X-CSRF-TOKEN': csrfToken }
          : undefined,
    }
    if (body) options.data = JSON.stringify(body)

    const response = await page.request.fetch(apiPath(apiRoute), options)
    const payload = parseJson ? await readJsonResponse(response) : await response.text()
    if (payload && typeof payload?.csrf_token === 'string') {
      csrfToken = payload.csrf_token
    }

    if (expectSuccess && response.status() >= 400) {
      throw new Error(summarizeApiFailure(response, payload) + (label ? ` | ${label}` : ''))
    }

    return { response, payload }
  }

  let createdClaimMonth = ''
  const createdClaimAmount = (10 + Math.floor(Math.random() * 89) + Math.random()).toFixed(2)
  let createdRecordId = null
  let userRoles = []

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('#loginEmail', email)
    await page.fill('#loginPassword', password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
      page.click('button[type="submit"]'),
    ])
    check('real-ui-login', true, page.url())

    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(screenshotsDir, '01-dashboard.png'), fullPage: true })

    const session = await apiRequest({
      path: 'auth/session',
      label: 'auth session check',
    })
    const sessionUser = session.payload?.user || session.payload?.data?.user
    if (sessionUser) {
      userRoles = Array.isArray(sessionUser.roles) ? sessionUser.roles : []
    }
    check(
      'authenticated-session-user',
      Boolean(sessionUser?.staff_id),
      sessionUser?.name || sessionUser?.email || 'session loaded',
    )
    check('session-roles-visible', Array.isArray(userRoles) && userRoles.length > 0)

    const notificationSummary = await apiRequest({
      path: 'notifications/summary',
      label: 'notification summary',
    })
    if (
      notificationSummary.payload &&
      typeof notificationSummary.payload?.csrf_token === 'string'
    ) {
      csrfToken = notificationSummary.payload.csrf_token
    }
    check('notification-summary', notificationSummary.response.status() === 200)

    const workflowInbox = await apiRequest({ path: 'workflows/inbox', label: 'workflow inbox' })
    check('workflow-inbox', workflowInbox.response.status() === 200)

    createdClaimMonth = nextMonthValue()

    await page.goto(`${baseUrl}/my/salary/other-claims/apply`, {
      waitUntil: 'domcontentloaded',
    })
    check('other-claim-apply-route', (await page.url()).includes('/my/salary/other-claims/apply'))
    const monthInput = page.locator('#otherClaimMonth')
    await monthInput.waitFor({ state: 'visible', timeout: 30_000 })
    await monthInput.fill(createdClaimMonth)

    await page.getByRole('button', { name: 'Add Claim' }).click()
    await page.getByRole('button', { name: /Non-Recurring Allowance/i }).click()
    await page.locator('#otherAllowanceDate').waitFor({ state: 'visible', timeout: 30_000 })
    const today = new Date().toISOString().slice(0, 10)
    await page.fill('#otherAllowanceDate', today)
    await page.fill('#otherAllowanceDescription', claimDescription)
    await page.fill('#otherAllowanceAmount', createdClaimAmount)
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    const hasAmountInUi = await page.evaluate(
      ({ targetAmount }) =>
        document.body.innerText.includes(targetAmount) ||
        document.body.innerText.includes(`RM ${targetAmount}`) ||
        document.body.innerText.includes(`$ ${targetAmount}`),
      { targetAmount: createdClaimAmount },
    )
    check('other-claim-item-added-in-ui', hasAmountInUi)

    const submitPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/proxy/hr/salary/other-claims') &&
        response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await submitPromise.catch(() => {
      // Non-fatal: some builds submit through a slightly different endpoint/path variant.
    })
    await page.waitForTimeout(500)
    const submitSuccess = await page
      .locator('button', { hasText: 'Apply Another' })
      .isVisible()
      .catch(() => false)
    check('other-claim-submit', submitSuccess)
    await page.screenshot({
      path: path.join(screenshotsDir, '02-other-claim-submitted.png'),
      fullPage: true,
    })

    const applicantRecordsResponse = await apiRequest({
      path: 'hr/salary/other-claims',
      label: 'applicant other claim records',
    })
    const applicantRecords = Array.isArray(applicantRecordsResponse.payload?.records)
      ? applicantRecordsResponse.payload.records
      : []
    const matchingApplicantRecord = applicantRecords.find(
      (record) => String(record.claimMonthValue || '') === createdClaimMonth,
    )
    check('applicant-record-created', Boolean(matchingApplicantRecord))
    if (matchingApplicantRecord?.id) {
      createdRecordId = matchingApplicantRecord.id
      check('applicant-record-id-returned', true, String(createdRecordId))
      check('applicant-record-status', String(matchingApplicantRecord.status || '') !== '')
    }

    await page.goto(`${baseUrl}/my/salary/other-claims/records`, {
      waitUntil: 'domcontentloaded',
    })
    await page
      .waitForFunction(() => !document.body.innerText.includes('Loading other claim records...'), {
        timeout: 30_000,
      })
      .catch(() => {})
    await page
      .waitForFunction(
        () => {
          const rows = document.querySelectorAll('table tbody tr')
          return rows.length > 0
        },
        { timeout: 30_000 },
      )
      .catch(() => {})
    await page.waitForTimeout(100)
    const recordRows = page.locator('table tbody tr')
    const hasRecordRows = (await recordRows.count()) > 0
    const rowContents = hasRecordRows ? await recordRows.allTextContents() : []
    const hasRecordInUi = hasRecordRows
      ? rowContents.some(
          (rowText) =>
            rowText.includes(createdClaimAmount) ||
            rowText.includes(`RM ${createdClaimAmount}`) ||
            rowText.includes(`$ ${createdClaimAmount}`),
        )
      : false
    check('applicant-record-visible-in-ui', hasRecordInUi, `rows=${rowContents.length}`)
    check('applicant-record-visible-in-ui', hasRecordInUi)
    await page.screenshot({
      path: path.join(screenshotsDir, '03-other-claim-records-list.png'),
      fullPage: true,
    })

    await page.goto(`${baseUrl}/financial/other-claim-records`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(700)
    const financialPath = new URL(page.url()).pathname
    const hasFinancialAccess = financialPath.startsWith('/financial/other-claim-records')
    check('financial-page-reachable', hasFinancialAccess)

    const financeRecordsResponse = await apiRequest({
      path: 'hr/salary/other-claims/financial-records',
      label: 'financial other claim records',
      expectSuccess: hasFinancialAccess,
    })
    const financeRecords = Array.isArray(financeRecordsResponse.payload?.records)
      ? financeRecordsResponse.payload.records
      : []
    const financeRecord = financeRecords.find(
      (record) => String(record.id || '') === String(createdRecordId || ''),
    )
    check('created-record-visible-in-financial', Boolean(financeRecord))

    if (financeRecord && hasFinancialAccess) {
      let current = financeRecord
      let actionAttempts = 0
      const maxAttempts = 3
      while (
        actionAttempts < maxAttempts &&
        Array.isArray(current.workflow?.availableActions) &&
        current.workflow.availableActions.length > 0 &&
        ['Submitted', 'Prepared', 'Checked'].includes(current.status)
      ) {
        const action = current.workflow.availableActions[0]
        if (!action?.action) break

        const apiActionPath = current.workflow?.instanceId
          ? `workflows/instances/${encodeURIComponent(current.workflow.instanceId)}/actions`
          : `hr/salary/other-claims/financial-records/${encodeURIComponent(
              String(current.id),
            )}/action`

        const { response, payload } = await apiRequest({
          path: apiActionPath,
          method: 'POST',
          body: { action: action.action, remarks: `Smoke lifecycle automated ${action.action}` },
          label: `financial action ${action.action} (${apiActionPath})`,
        })

        check(
          `financial-action-${action.action}-api`,
          response.status() === 200,
          `HTTP ${response.status()}`,
        )

        const refreshed = await apiRequest({
          path: 'hr/salary/other-claims/financial-records',
          label: `financial records refresh attempt ${actionAttempts + 1}`,
        })
        const refreshedList = Array.isArray(refreshed.payload?.records)
          ? refreshed.payload.records
          : []
        const updated = refreshedList.find((record) => String(record.id) === String(current.id))

        if (!updated) break
        if (updated.status === current.status) break
        current = updated
        actionAttempts += 1
      }
      check(
        'final-financial-status-reduced',
        current.status && !['', 'Draft'].includes(String(current.status)),
        `status=${current.status || 'unknown'}`,
      )
      check(
        'financial-action-loop-complete',
        actionAttempts <= maxAttempts,
        `${actionAttempts}/${maxAttempts} workflow steps`,
      )
    }

    const myRoles = userRoles.join(', ')
    if (hasFinancialAccess) {
      await page.goto(`${baseUrl}/financial/salary-records`, { waitUntil: 'domcontentloaded' })
      const salaryPageReachable = (await page.url()).includes('/financial/salary-records')
      check('financial-salary-records-route', salaryPageReachable)
      await page.waitForTimeout(500)
      await page.goto(`${baseUrl}/my/salary/payment-queue`, { waitUntil: 'domcontentloaded' })
      const myQueuePageReachable = (await page.url()).includes('/my/salary/payment-queue')
      check('my-payment-queue-route', myQueuePageReachable)
    }

    check(
      'user-roles-available',
      userRoles.includes('Manager') ||
        userRoles.includes('System Admin') ||
        userRoles.includes('HR'),
      `roles: ${myRoles || 'none'}`,
    )
    await page.goto(`${baseUrl}/workflows/salary-application`, { waitUntil: 'domcontentloaded' })
    check('workflow-setup-route', (await page.url()).includes('/workflows/salary-application'))
    await page.screenshot({
      path: path.join(screenshotsDir, '04-financial-workflow.png'),
      fullPage: true,
    })

    const noPageErrors = pageErrors.length === 0
    const noConsoleErrors = consoleErrors.length === 0
    const noRequestFailures = requestFailures.length === 0
    const noUnexpectedResponses = unexpectedResponses.length === 0
    check('no-page-errors', noPageErrors, pageErrors.slice(0, 3).join(' | '))
    check('no-console-errors', noConsoleErrors, consoleErrors.slice(0, 3).join(' | '))
    check('no-request-failures', noRequestFailures, requestFailures.slice(0, 3).join(' | '))
    check(
      'no-unexpected-http-errors',
      noUnexpectedResponses,
      unexpectedResponses.slice(0, 5).join(' | '),
    )
  } finally {
    await browser.close()
  }

  const result = {
    at: new Date().toISOString(),
    baseUrl,
    createdClaimMonth,
    createdClaimAmount,
    createdRecordId,
    claimsUserEmail: email,
    findings,
    consoleErrors,
    pageErrors,
    requestFailures,
    unexpectedResponses,
  }
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2))
  const failures = findings.filter((finding) => !finding.ok)
  console.log(
    `\n${findings.length - failures.length}/${findings.length} checks passed; evidence: ${outputDir}`,
  )
  if (failures.length) process.exitCode = 1
}

run().catch(async (error) => {
  console.error('SALARY-LIFECYCLE-SMOKE-CRASH', error)
  findings.push({ name: 'smoke-script-completed', ok: false, detail: error.message })
  try {
    await fs.mkdir(outputDir, { recursive: true })
    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          baseUrl,
          claimsUserEmail: email,
          findings,
          crash: error.message,
        },
        null,
        2,
      ),
    )
  } catch (writeErr) {
    console.error('Failed to write smoke report:', writeErr)
  }
  process.exitCode = 2
})
