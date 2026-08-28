import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const workspaceRoot = path.resolve(projectRoot, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const runLabel = `UAT ${stamp}`
const outputDir = path.join(projectRoot, 'test-results', `salary-claims-multirole-uat-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const apiBase = `${baseUrl}/proxy`
const applicantEmail = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const applicantPassword = process.env.SMOKE_PASSWORD
const financePassword = process.env.SALARY_UAT_PASSWORD
const reviewerEmail = 'salary.reviewer@amiosh.test'
const approverEmail = 'salary.approver@amiosh.test'
const evidencePath =
  process.env.SALARY_UAT_PDF ||
  path.join(workspaceRoot, 'backend-laravel', 'tmp', 'pdfs', 'jd14-31-final.pdf')

if (!applicantPassword) throw new Error('SMOKE_PASSWORD is required.')
if (!financePassword) throw new Error('SALARY_UAT_PASSWORD is required.')

const results = []
const diagnostics = []
const records = { salaryId: null, salaryMonth: null, claimId: null, claimMonth: null }

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const step = async (name, callback) => {
  const startedAt = Date.now()
  try {
    const detail = await callback()
    results.push({
      name,
      status: 'passed',
      durationMs: Date.now() - startedAt,
      detail: detail ?? '',
    })
    console.log(
      `PASS  ${name}${detail ? ` :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`,
    )
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

const readPayload = async (response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { text: text.slice(0, 500) }
  }
}

const createActor = async (browser, label, email, password) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(25_000)
  page.setDefaultNavigationTimeout(40_000)
  const actorDiagnostics = {
    label,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
  }
  let csrfToken = ''

  page.on('console', (message) => {
    if (message.type() === 'error') actorDiagnostics.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => actorDiagnostics.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'unknown'
    if (!reason.includes('ERR_ABORTED'))
      actorDiagnostics.requestFailures.push(`${request.method()} ${request.url()} -> ${reason}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 500)
      actorDiagnostics.httpErrors.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      )
  })

  const api = async (route, { method = 'GET', body, expected = [200] } = {}) => {
    const options = { method, headers: { Accept: 'application/json' } }
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json'
      options.data = JSON.stringify(body)
    }
    if (csrfToken && method !== 'GET') options.headers['X-CSRF-TOKEN'] = csrfToken
    const response = await page.request.fetch(`${apiBase}/${route.replace(/^\//, '')}`, options)
    const payload = await readPayload(response)
    if (typeof payload?.csrf_token === 'string') csrfToken = payload.csrf_token
    if (!expected.includes(response.status())) {
      throw new Error(
        `${label} API ${method} ${route} returned ${response.status()}: ${payload?.message || payload?.error || JSON.stringify(payload)}`,
      )
    }
    return { response, payload }
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#loginEmail').fill(email)
  await page.locator('#loginPassword').fill(password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: /sign in|login/i }).click(),
  ])
  const session = await api('auth/session')
  await api('notifications/summary')
  const user = session.payload?.user || session.payload?.data?.user
  assert(user?.staff_id, `${label} login did not establish an authenticated staff session.`)
  diagnostics.push(actorDiagnostics)
  return { label, email, context, page, api, user, diagnostics: actorDiagnostics }
}

const screenshot = (actor, name) =>
  actor.page.screenshot({ path: path.join(screenshotsDir, `${name}.png`), fullPage: true })

const waitForRecordStatus = async (actor, route, status) => {
  let latest = null
  await actor.page.waitForFunction(
    async ({ apiUrl, expectedStatus }) => {
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) return false
      const payload = await response.json()
      return payload.record?.status === expectedStatus
    },
    { apiUrl: `${apiBase}/${route}`, expectedStatus: status },
    { timeout: 30_000 },
  )
  latest = (await actor.api(route)).payload?.record
  return latest
}

const monthValue = (offset = 0) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (value) =>
  new Intl.DateTimeFormat('en-MY', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(`${value}-01T00:00:00+08:00`))

const findOwnClaimByDescription = async (actor, description) => {
  const list = (await actor.api('hr/salary/other-claims')).payload?.records || []
  for (const record of list) {
    const detail = (await actor.api(`hr/salary/other-claims/${record.id}`)).payload?.record
    if (detail?.claims?.some((claim) => claim.description === description)) return detail
  }
  return null
}

const runWorkflowAction = async (actor, module, id, action, remarks = '') => {
  const route =
    module === 'salary'
      ? `hr/salary/financial-records/${id}`
      : `hr/salary/other-claims/financial-records/${id}`
  const before = (await actor.api(route)).payload?.record
  assert(before?.workflow?.instanceId, `${module} record ${id} has no workflow instance.`)
  const available = before.workflow.availableActions || []
  assert(
    available.some((item) => item.action === action),
    `${actor.label} cannot ${action} ${module} record ${id}; available=${available.map((item) => item.action).join(',')}`,
  )

  await actor.page.goto(
    `${baseUrl}/financial/${module === 'salary' ? 'salary-records' : 'other-claim-records'}/${id}`,
    { waitUntil: 'domcontentloaded' },
  )
  await actor.page
    .getByText(module === 'salary' ? 'Review Salary' : 'Review Other Claim', { exact: true })
    .waitFor()
  const label = available.find((item) => item.action === action)?.label
  await actor.page.getByRole('button', { name: label, exact: true }).click()
  const dialog = actor.page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible' })

  if (['return', 'reject'].includes(action)) {
    await dialog.getByRole('button', { name: label, exact: true }).click()
    const validationAlert = dialog.locator('[role="alert"].text-danger')
    await validationAlert.waitFor({ state: 'visible' })
    assert(
      (await validationAlert.innerText()).trim().length > 0,
      `${label} did not enforce a reason.`,
    )
    await dialog.locator('textarea').fill(remarks)
  } else if (remarks) {
    await dialog.locator('textarea').fill(remarks)
  }

  await dialog.getByRole('button', { name: label, exact: true }).click()
  const targetStatus = {
    return: 'Returned',
    check: 'Checked',
    approve: 'Approved',
    reject: 'Rejected',
  }[action]
  const updated = await waitForRecordStatus(actor, route, targetStatus)
  assert(
    Number(updated.recordVersion) > Number(before.recordVersion),
    `${module} record version did not advance after ${action}.`,
  )
  return updated
}

await fs.mkdir(screenshotsDir, { recursive: true })
await fs.access(evidencePath)
const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' })

let applicant
let reviewer
let approver

try {
  await step('authenticate applicant, reviewer, and approver through the real UI', async () => {
    applicant = await createActor(browser, 'Applicant', applicantEmail, applicantPassword)
    reviewer = await createActor(browser, 'Reviewer', reviewerEmail, financePassword)
    approver = await createActor(browser, 'Approver', approverEmail, financePassword)
    assert((reviewer.user.roles || []).includes('Finance'), 'Reviewer is not a Finance user.')
    assert((approver.user.roles || []).includes('Finance'), 'Approver is not a Finance user.')
    assert(
      reviewer.user.staff_id !== approver.user.staff_id,
      'Reviewer and approver must be different staff identities.',
    )
    return `${applicantEmail} → ${reviewerEmail} → ${approverEmail}`
  })

  await step('remove only disposable UAT salary drafts left by interrupted runs', async () => {
    const own = (await applicant.api('hr/salary/records')).payload?.records || []
    const removed = []
    for (const summary of own.filter((item) => item.status === 'Draft')) {
      const detail = (await applicant.api(`hr/salary/records/${summary.id}`)).payload?.record
      const isDisposable = detail?.claims?.some((claim) =>
        String(claim.description || '').startsWith('UAT '),
      )
      if (!isDisposable) continue
      await applicant.api(`hr/salary/records/${summary.id}`, { method: 'DELETE' })
      removed.push(summary.id)
    }
    return `removed=${removed.join(',') || 'none'}`
  })

  await step('applicant creates and submits salary adjustment with PDF evidence', async () => {
    const own = (await applicant.api('hr/salary/records')).payload?.records || []
    for (const summary of own) {
      const detail = (await applicant.api(`hr/salary/records/${summary.id}`)).payload?.record
      if (detail?.claims?.some((claim) => String(claim.description || '').startsWith('UAT '))) {
        records.salaryId = detail.id
        records.salaryMonth = detail.salaryMonthValue
        return `reusing UAT record=${detail.id}; month=${detail.salaryMonthValue}; status=${detail.status}`
      }
    }
    const usedMonths = new Set(
      own.filter((item) => item.status !== 'Draft').map((item) => item.salaryMonthValue),
    )
    const targetMonth = [monthValue(0), monthValue(1), monthValue(2)].find(
      (value) => !usedMonths.has(value),
    )
    assert(
      targetMonth,
      'No unsubmitted salary month is available in the three-month application window.',
    )
    records.salaryMonth = targetMonth

    await applicant.page.goto(`${baseUrl}/my/salary/apply`, { waitUntil: 'domcontentloaded' })
    await applicant.page.getByRole('heading', { name: 'Apply Salary', exact: true }).waitFor()
    await applicant.page.getByRole('button', { name: monthLabel(targetMonth), exact: true }).click()
    await applicant.page.getByRole('button', { name: 'Add Adjustment', exact: true }).click()
    await applicant.page.locator('#allowanceDate').fill(`${targetMonth}-15`)
    await applicant.page.locator('#allowanceDescription').fill(`${runLabel} salary adjustment`)
    await applicant.page.locator('#allowanceAmount').fill('17.35')
    await applicant.page.locator('#allowanceAttachment').setInputFiles(evidencePath)
    await applicant.page.getByRole('button', { name: 'Save', exact: true }).click()
    await applicant.page.getByText(`${runLabel} salary adjustment`, { exact: true }).waitFor()
    await applicant.page.getByRole('button', { name: 'Submit', exact: true }).click()
    await applicant.page
      .getByRole('button', { name: 'Apply Another', exact: true })
      .waitFor({ timeout: 40_000 })

    const refreshed = (await applicant.api('hr/salary/records')).payload?.records || []
    const summary = refreshed.find((item) => item.salaryMonthValue === targetMonth)
    assert(summary?.id, 'Submitted salary record was not returned by the applicant records API.')
    records.salaryId = summary.id
    const detail = (await applicant.api(`hr/salary/records/${summary.id}`)).payload?.record
    assert(detail.status === 'Submitted', `Expected Submitted salary, received ${detail.status}.`)
    assert(
      detail.claims?.some((claim) => claim.attachment?.name),
      'Salary PDF evidence was not persisted.',
    )
    await screenshot(applicant, '01-applicant-salary-submitted')
    return `record=${summary.id}; month=${targetMonth}`
  })

  await step(
    'reviewer worklist contains submitted salary and approver cannot act early',
    async () => {
      const current = (await applicant.api(`hr/salary/records/${records.salaryId}`)).payload?.record
      if (current.status === 'Approved') {
        assert(
          current.workflow?.history?.some(
            (event) => String(event.action).toLowerCase() === 'check',
          ),
          'Approved salary lacks its Check history.',
        )
        return 'already exercised before approved state'
      }
      await reviewer.page.goto(`${baseUrl}/financial/salary-records`, {
        waitUntil: 'domcontentloaded',
      })
      const applicantLabel =
        applicant.user.full_name || applicant.user.fullName || applicant.user.name || applicantEmail
      await reviewer.page
        .locator('table tbody tr')
        .filter({ hasText: applicantLabel })
        .getByText(monthLabel(records.salaryMonth), { exact: true })
        .waitFor()
      const reviewerRecord = (await reviewer.api(`hr/salary/financial-records/${records.salaryId}`))
        .payload?.record
      const approverResponse = await approver.api(
        `hr/salary/financial-records/${records.salaryId}`,
        { expected: [200, 403] },
      )
      const approverRecord = approverResponse.payload?.record
      assert(
        reviewerRecord.workflow.availableActions.some((item) => item.action === 'check'),
        'Reviewer does not receive Check at Submitted.',
      )
      assert(
        approverResponse.response.status() === 403 ||
          !approverRecord?.workflow?.availableActions?.some((item) => item.action === 'approve'),
        'Approver can approve before checking.',
      )
      await screenshot(reviewer, '02-reviewer-salary-worklist')
    },
  )

  await step('reviewer returns salary with required comment', async () => {
    const current = (await applicant.api(`hr/salary/records/${records.salaryId}`)).payload?.record
    if (current.status === 'Approved') {
      assert(
        current.workflow?.history?.some((event) => String(event.action).toLowerCase() === 'return'),
        'Approved salary lacks its Return history.',
      )
      return 'return already recorded'
    }
    const comment = `${runLabel}: correct the adjustment description\nand reconfirm the supporting PDF & amount.`
    const returned = await runWorkflowAction(
      reviewer,
      'salary',
      records.salaryId,
      'return',
      comment,
    )
    assert(returned.returnRemarks === comment, 'Salary return comment did not persist exactly.')
    assert(
      returned.returnedStage === 'check',
      `Expected check return stage, received ${returned.returnedStage}.`,
    )
    await screenshot(reviewer, '03-reviewer-salary-returned')
  })

  await step('applicant sees salary return reason and resubmits the same record', async () => {
    const current = (await applicant.api(`hr/salary/records/${records.salaryId}`)).payload?.record
    if (current.status === 'Approved') {
      assert(
        current.workflow?.history?.some(
          (event) => String(event.action).toLowerCase() === 'resubmit',
        ),
        'Approved salary lacks its Resubmitted history.',
      )
      assert(
        current.claims?.some((claim) => claim.attachment?.name),
        'Approved salary lost its evidence.',
      )
      return 'same-record resubmission already recorded'
    }
    await applicant.page.goto(`${baseUrl}/my/salary/records/${records.salaryId}`, {
      waitUntil: 'domcontentloaded',
    })
    await applicant.page.getByText('Changes requested:', { exact: false }).waitFor()
    await applicant.page.getByRole('button', { name: 'Edit & Resubmit', exact: true }).click()
    await applicant.page.getByRole('heading', { name: 'Apply Salary', exact: true }).waitFor()
    await applicant.page.getByRole('button', { name: 'Submit', exact: true }).click()
    await applicant.page
      .getByRole('button', { name: 'Apply Another', exact: true })
      .waitFor({ timeout: 40_000 })
    const detail = (await applicant.api(`hr/salary/records/${records.salaryId}`)).payload?.record
    assert(
      detail.id === records.salaryId && detail.status === 'Submitted',
      'Salary resubmission did not preserve ID/restart checking.',
    )
    assert(
      detail.claims?.some((claim) => claim.attachment?.name),
      'Salary evidence was lost during resubmission.',
    )
    assert(
      detail.workflow?.history?.some((event) => String(event.action).toLowerCase() === 'resubmit'),
      'Salary audit history lacks Resubmitted.',
    )
    await screenshot(applicant, '04-applicant-salary-resubmitted')
  })

  await step('reviewer checks and distinct approver approves salary', async () => {
    const current = (await applicant.api(`hr/salary/records/${records.salaryId}`)).payload?.record
    if (current.status === 'Approved') {
      assert(
        current.workflow?.history?.some(
          (event) => String(event.action).toLowerCase() === 'approve',
        ),
        'Approved salary lacks its approval history.',
      )
      return 'already approved by distinct seeded approver'
    }
    await runWorkflowAction(
      reviewer,
      'salary',
      records.salaryId,
      'check',
      `${runLabel} reviewer check complete`,
    )
    const reviewerAfterCheck = (
      await reviewer.api(`hr/salary/financial-records/${records.salaryId}`)
    ).payload?.record
    assert(
      !reviewerAfterCheck.workflow.availableActions.some((item) => item.action === 'approve'),
      'Checker can approve the same salary record.',
    )
    const approved = await runWorkflowAction(
      approver,
      'salary',
      records.salaryId,
      'approve',
      `${runLabel} finance approval complete`,
    )
    assert(approved.status === 'Approved', 'Salary did not reach Approved.')
    assert(
      approved.workflow.history.some((event) => String(event.action).toLowerCase() === 'return'),
      'Salary workflow history lost Return.',
    )
    await screenshot(approver, '05-approver-salary-approved')
  })

  await step('applicant creates and submits an other claim with PDF evidence', async () => {
    const description = `${runLabel} other allowance`
    const ownClaims = (await applicant.api('hr/salary/other-claims')).payload?.records || []
    for (const summary of ownClaims) {
      const existing = (await applicant.api(`hr/salary/other-claims/${summary.id}`)).payload?.record
      if (
        existing?.claims?.some((claim) =>
          /^UAT .* other allowance$/.test(String(claim.description || '')),
        )
      ) {
        records.claimId = existing.id
        records.claimMonth = existing.claimMonthValue
        return `reusing UAT record=${existing.id}; month=${existing.claimMonthValue}; status=${existing.status}`
      }
    }
    records.claimMonth = monthValue(0)
    await applicant.page.goto(`${baseUrl}/my/salary/other-claims/apply`, {
      waitUntil: 'domcontentloaded',
    })
    await applicant.page
      .getByRole('heading', { name: /^(New Other Claim|Other Claim Summary)$/ })
      .waitFor()
    await applicant.page
      .getByRole('button', { name: monthLabel(records.claimMonth), exact: true })
      .click()
    if (await applicant.page.getByRole('button', { name: 'Add Claim', exact: true }).count()) {
      await applicant.page.getByRole('button', { name: 'Add Claim', exact: true }).click()
    }
    await applicant.page
      .getByRole('button', { name: 'Non-Recurring Allowance', exact: true })
      .click()
    await applicant.page.locator('#otherAllowanceDate').fill(`${records.claimMonth}-16`)
    await applicant.page.locator('#otherAllowanceDescription').fill(description)
    await applicant.page.locator('#otherAllowanceAmount').fill('23.45')
    await applicant.page.locator('#otherAllowanceAttachment').setInputFiles(evidencePath)
    await applicant.page.getByRole('button', { name: 'Save', exact: true }).click()
    await applicant.page
      .getByRole('button', { name: `Open ${path.basename(evidencePath)}`, exact: true })
      .waitFor()
    await applicant.page.getByRole('button', { name: 'Submit', exact: true }).click()
    await applicant.page
      .getByRole('button', { name: 'Apply Another', exact: true })
      .waitFor({ timeout: 40_000 })
    const detail = await findOwnClaimByDescription(applicant, description)
    assert(
      detail?.id && detail.status === 'Submitted',
      'Submitted claim was not persisted as Submitted.',
    )
    assert(detail.claims[0]?.attachment?.name, 'Other claim PDF evidence was not persisted.')
    records.claimId = detail.id
    await screenshot(applicant, '06-applicant-claim-submitted')
    return `record=${detail.id}; month=${records.claimMonth}`
  })

  await step(
    'reviewer returns claim and applicant resubmits same ID with evidence intact',
    async () => {
      const current = (await applicant.api(`hr/salary/other-claims/${records.claimId}`)).payload
        ?.record
      if (current.status === 'Approved') {
        assert(
          current.workflow?.history?.some(
            (event) => String(event.action).toLowerCase() === 'return',
          ),
          'Approved claim lacks its Return history.',
        )
        assert(
          current.workflow?.history?.some(
            (event) => String(event.action).toLowerCase() === 'resubmit',
          ),
          'Approved claim lacks its Resubmitted history.',
        )
        assert(
          current.claims?.some((claim) => claim.attachment?.name),
          'Approved claim lost its evidence.',
        )
        return 'return and same-record resubmission already recorded'
      }
      const comment = `${runLabel}: provide clearer business purpose before approval.`
      const returned = await runWorkflowAction(
        reviewer,
        'claim',
        records.claimId,
        'return',
        comment,
      )
      assert(
        returned.returnedStage === 'check',
        'Other claim did not record a checking-stage return.',
      )
      await applicant.page.goto(`${baseUrl}/my/salary/other-claims/records/${records.claimId}`, {
        waitUntil: 'domcontentloaded',
      })
      await applicant.page.getByText('Changes requested:', { exact: false }).waitFor()
      await applicant.page.getByRole('button', { name: 'Edit & Resubmit', exact: true }).click()
      await applicant.page
        .getByRole('heading', { name: /^(Edit Other Claim|Other Claim Summary)$/ })
        .waitFor()
      await applicant.page.getByRole('button', { name: 'Submit', exact: true }).click()
      await applicant.page
        .getByRole('button', { name: 'Apply Another', exact: true })
        .waitFor({ timeout: 40_000 })
      const detail = (await applicant.api(`hr/salary/other-claims/${records.claimId}`)).payload
        ?.record
      assert(
        detail.id === records.claimId && detail.status === 'Submitted',
        'Claim resubmission created/referenced the wrong record.',
      )
      assert(
        detail.claims?.some((claim) => claim.attachment?.name),
        'Claim evidence was lost during return/resubmission.',
      )
      assert(
        detail.workflow?.history?.some(
          (event) => String(event.action).toLowerCase() === 'resubmit',
        ),
        'Claim history lacks Resubmitted.',
      )
      await screenshot(applicant, '07-applicant-claim-resubmitted')
    },
  )

  await step('reviewer checks and distinct approver approves other claim', async () => {
    const current = (await applicant.api(`hr/salary/other-claims/${records.claimId}`)).payload
      ?.record
    if (current.status === 'Approved') {
      assert(
        current.workflow?.history?.some((event) => String(event.action).toLowerCase() === 'check'),
        'Approved claim lacks its Check history.',
      )
      assert(
        current.workflow?.history?.some(
          (event) => String(event.action).toLowerCase() === 'approve',
        ),
        'Approved claim lacks its approval history.',
      )
      return 'already approved by distinct seeded approver'
    }
    await runWorkflowAction(
      reviewer,
      'claim',
      records.claimId,
      'check',
      `${runLabel} reviewer claim check`,
    )
    const reviewerAfterCheck = (
      await reviewer.api(`hr/salary/other-claims/financial-records/${records.claimId}`)
    ).payload?.record
    assert(
      !reviewerAfterCheck.workflow.availableActions.some((item) => item.action === 'approve'),
      'Checker can approve the same other claim.',
    )
    const approved = await runWorkflowAction(
      approver,
      'claim',
      records.claimId,
      'approve',
      `${runLabel} claim approved`,
    )
    assert(approved.status === 'Approved', 'Other claim did not reach Approved.')
    await screenshot(approver, '08-approver-claim-approved')
  })

  await step('approved PDFs and applicant records remain available', async () => {
    for (const [route, label] of [
      [`hr/salary/records/${records.salaryId}/claims-pdf`, 'salary claims PDF'],
      [`hr/salary/other-claims/${records.claimId}/claims-pdf`, 'other claim PDF'],
    ]) {
      const response = await applicant.page.request.get(`${apiBase}/${route}`)
      assert(response.status() === 200, `${label} returned HTTP ${response.status()}.`)
      assert(
        (response.headers()['content-type'] || '').includes('application/pdf'),
        `${label} is not a PDF response.`,
      )
      assert((await response.body()).length > 1000, `${label} response is unexpectedly small.`)
    }
    const salaryRecords = (await applicant.api('hr/salary/records')).payload?.records || []
    const currentSalary = salaryRecords.find((item) => String(item.id) === String(records.salaryId))
    const availableFrom = new Date(`${currentSalary.salaryMonthValue}-01T00:00:00+08:00`)
    availableFrom.setMonth(availableFrom.getMonth() + 1)
    if (new Date() < availableFrom) {
      const guarded = await applicant.page.request.get(
        `${apiBase}/hr/salary/records/${records.salaryId}/payslip-pdf`,
      )
      const payload = await readPayload(guarded)
      assert(
        guarded.status() === 422,
        `Open-month payslip should be guarded, received HTTP ${guarded.status()}.`,
      )
      assert(
        /after salary month closes|available from/i.test(payload?.message || ''),
        'Open-month payslip guard is not actionable.',
      )
    }
    const closedApproved = salaryRecords.find((item) => {
      if (item.status !== 'Approved' || !item.salaryMonthValue) return false
      const closedFrom = new Date(`${item.salaryMonthValue}-01T00:00:00+08:00`)
      closedFrom.setMonth(closedFrom.getMonth() + 1)
      return new Date() >= closedFrom
    })
    if (closedApproved?.id) {
      const payslip = await applicant.page.request.get(
        `${apiBase}/hr/salary/records/${closedApproved.id}/payslip-pdf`,
      )
      assert(
        payslip.status() === 200,
        `Closed-month salary payslip returned HTTP ${payslip.status()}.`,
      )
      assert(
        (payslip.headers()['content-type'] || '').includes('application/pdf'),
        'Closed-month payslip is not a PDF response.',
      )
      assert(
        (await payslip.body()).length > 1000,
        'Closed-month payslip response is unexpectedly small.',
      )
    }
    await applicant.page.goto(`${baseUrl}/my/salary/other-claims/records/${records.claimId}`, {
      waitUntil: 'domcontentloaded',
    })
    await applicant.page.getByText('Approved', { exact: true }).first().waitFor()
    await screenshot(applicant, '09-applicant-final-approved-records')
  })

  await step('browser, page, transport, and server diagnostics are clean', async () => {
    const failures = diagnostics.flatMap((item) => [
      ...item.consoleErrors.map((detail) => `${item.label} console: ${detail}`),
      ...item.pageErrors.map((detail) => `${item.label} page: ${detail}`),
      ...item.requestFailures.map((detail) => `${item.label} request: ${detail}`),
      ...item.httpErrors.map((detail) => `${item.label} HTTP: ${detail}`),
    ])
    assert(failures.length === 0, failures.slice(0, 8).join(' | '))
    return 'no console errors, page errors, failed requests, or HTTP 5xx responses'
  })
} catch (error) {
  if (applicant) await screenshot(applicant, 'failure-applicant').catch(() => {})
  if (reviewer) await screenshot(reviewer, 'failure-reviewer').catch(() => {})
  if (approver) await screenshot(approver, 'failure-approver').catch(() => {})
  process.exitCode = 1
} finally {
  await fs.writeFile(
    path.join(outputDir, 'result.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        baseUrl,
        browser: 'Chromium',
        viewport: '1440x900',
        accounts: { applicant: applicantEmail, reviewer: reviewerEmail, approver: approverEmail },
        records,
        results,
        diagnostics,
      },
      null,
      2,
    ),
  )
  await browser.close()
}

const failed = results.filter((result) => result.status === 'failed')
console.log(`\n${results.length - failed.length}/${results.length} lifecycle steps passed.`)
console.log(`Evidence: ${outputDir}`)
if (failed.length) process.exitCode = 1
