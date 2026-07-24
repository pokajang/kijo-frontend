import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `other-claim-crud-e2e-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const apiBase = `${baseUrl}/proxy`
const email = process.env.OTHER_CLAIM_E2E_EMAIL
const password = process.env.OTHER_CLAIM_E2E_PASSWORD
const reviewerEmail = process.env.OTHER_CLAIM_E2E_REVIEWER_EMAIL
const reviewerPassword = process.env.OTHER_CLAIM_E2E_REVIEWER_PASSWORD
const approverEmail = process.env.OTHER_CLAIM_E2E_APPROVER_EMAIL
const approverPassword = process.env.OTHER_CLAIM_E2E_APPROVER_PASSWORD
const allowMutation = process.env.OTHER_CLAIM_E2E_ALLOW_MUTATION === '1'
const headless = process.env.OTHER_CLAIM_E2E_HEADLESS !== '0'

const runLabel = `E2E ${stamp}`
const draftDescription = `${runLabel} draft`
const updatedDraftDescription = `${runLabel} draft updated`
const submittedDescription = `${runLabel} submitted`
const revisedDescription = `${runLabel} revision`
const draftAmount = (41 + Math.random()).toFixed(2)
const submittedAmount = (61 + Math.random()).toFixed(2)
const updatedAmount = (71 + Math.random()).toFixed(2)
const today = new Date().toLocaleDateString('en-CA')
const results = []

const requireConfiguration = () => {
  const missing = []
  if (!email) missing.push('OTHER_CLAIM_E2E_EMAIL')
  if (!password) missing.push('OTHER_CLAIM_E2E_PASSWORD')
  if (!reviewerEmail) missing.push('OTHER_CLAIM_E2E_REVIEWER_EMAIL')
  if (!reviewerPassword) missing.push('OTHER_CLAIM_E2E_REVIEWER_PASSWORD')
  if (!approverEmail) missing.push('OTHER_CLAIM_E2E_APPROVER_EMAIL')
  if (!approverPassword) missing.push('OTHER_CLAIM_E2E_APPROVER_PASSWORD')
  if (!allowMutation) missing.push('OTHER_CLAIM_E2E_ALLOW_MUTATION=1')
  if (missing.length) {
    throw new Error(
      `Full Other Claim E2E is intentionally mutative and requires a dedicated account. Missing: ${missing.join(
        ', ',
      )}`,
    )
  }
  assert(
    new Set([email, reviewerEmail, approverEmail].map((value) => value.toLowerCase())).size === 3,
    'Applicant, reviewer, and approver accounts must be distinct.',
  )
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
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

const monthCandidates = () =>
  [0, 1, 2].map((offset) => {
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })

const formatMonth = (value) => {
  const [year, month] = String(value).split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

const moneyText = (value) => `RM ${Number(value).toFixed(2)}`

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const poll = async (label, callback, { timeoutMs = 25_000, intervalMs = 400 } = {}) => {
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

const run = async () => {
  requireConfiguration()
  await fs.mkdir(screenshotsDir, { recursive: true })

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  page.setDefaultNavigationTimeout(40_000)

  let csrfToken = ''
  let claimMonth = ''
  let draftRecordId = null
  let originalRecordId = null
  let revisionRecordId = null
  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
  }

  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'unknown'
    if (!reason.includes('ERR_ABORTED')) {
      diagnostics.requestFailures.push(`${request.method()} ${request.url()} -> ${reason}`)
    }
  })

  const apiUrl = (route) => `${apiBase}/${String(route).replace(/^\/+/, '')}`
  const apiRequest = async ({ route, method = 'GET', body, expectedStatuses = [200] }) => {
    const headers = {
      Accept: 'application/json',
      ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const response = await page.request.fetch(apiUrl(route), {
      method,
      headers,
      data: body === undefined ? undefined : JSON.stringify(body),
    })
    const contentType = response.headers()['content-type'] || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { text: await response.text() }

    if (typeof payload?.csrf_token === 'string') csrfToken = payload.csrf_token
    if (!expectedStatuses.includes(response.status())) {
      throw new Error(
        `${method} ${route} returned ${response.status()}: ${JSON.stringify(payload).slice(0, 500)}`,
      )
    }

    return { response, payload }
  }

  const loginAs = async (credentials) => {
    await page
      .evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      .catch(() => {})
    await context.clearCookies()
    csrfToken = ''
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#loginEmail').fill(credentials.email)
    await page.locator('#loginPassword').fill(credentials.password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.getByRole('button', { name: /sign in|login/i }).click(),
    ])

    const { payload } = await apiRequest({ route: 'auth/session' })
    const user = payload.user || payload.data?.user
    assert(
      user?.staff_id,
      `Authenticated session did not return a staff user for ${credentials.email}.`,
    )
    return user
  }

  const ownRecords = async () => {
    const { payload } = await apiRequest({ route: 'hr/salary/other-claims' })
    return Array.isArray(payload.records) ? payload.records : []
  }

  const ownRecord = async (id, expectedStatuses = [200]) => {
    const { payload, response } = await apiRequest({
      route: `hr/salary/other-claims/${id}`,
      expectedStatuses,
    })
    return response.status() === 200 ? payload.record : null
  }

  const financialRecord = async (id) => {
    const { payload } = await apiRequest({
      route: `hr/salary/other-claims/financial-records/${id}`,
    })
    return payload.record
  }

  const findOwnRecordByDescription = async (description, expectedStatus = null) => {
    const records = await ownRecords()
    const candidates = records.filter(
      (record) =>
        record.claimMonthValue === claimMonth &&
        (!expectedStatus || record.status === expectedStatus),
    )
    for (const candidate of candidates) {
      const detail = await ownRecord(candidate.id)
      if (detail?.claims?.some((claim) => String(claim.description || '').includes(description))) {
        return detail
      }
    }
    return null
  }

  const removeInterruptedE2ERecords = async () => {
    const records = await ownRecords()
    const removed = []

    for (const record of records) {
      if (record.status === 'Cancelled' || record.status === 'Paid') continue
      const detail = await ownRecord(record.id)
      const belongsToE2E = detail?.claims?.some((claim) =>
        String(claim.description || '').startsWith('E2E '),
      )
      if (!belongsToE2E) continue

      await apiRequest({
        route: `hr/salary/other-claims/${record.id}`,
        method: 'DELETE',
        body: {
          reason: `${runLabel} cleanup of interrupted E2E record`,
          record_version: Number(detail.recordVersion || 0) || undefined,
        },
      })
      removed.push(record.id)
    }

    return removed
  }

  const selectClaimMonth = async () => {
    await page.getByRole('button', { name: formatMonth(claimMonth), exact: true }).click()
    await poll('claim month selection', async () => {
      return (await page.locator('#otherClaimMonth').inputValue()) === claimMonth
    })
  }

  const openNewAllowance = async () => {
    await page.getByRole('button', { name: 'Add Claim', exact: true }).click()
    await page.getByRole('button', { name: 'Non-Recurring Allowance', exact: true }).click()
    await page.locator('#otherAllowanceDate').waitFor({ state: 'visible' })
  }

  const fillAllowance = async (description, amount) => {
    await page.locator('#otherAllowanceDate').fill(today)
    await page.locator('#otherAllowanceDescription').fill(description)
    await page.locator('#otherAllowanceAmount').fill(String(amount))
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByText(description, { exact: false }).first().waitFor({ state: 'visible' })
  }

  const screenshot = async (name) => {
    await page.screenshot({
      path: path.join(screenshotsDir, `${name}.png`),
      fullPage: true,
    })
  }

  const performFinancialAction = async (id, action, remarks) => {
    const before = await financialRecord(id)
    const available = Array.isArray(before?.workflow?.availableActions)
      ? before.workflow.availableActions
      : []
    const actionConfig = available.find((candidate) => candidate.action === action)
    assert(
      actionConfig,
      `Workflow action "${action}" is not available for status ${before?.status}`,
    )

    await page.goto(`${baseUrl}/financial/other-claim-records/${id}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByText('Review Other Claim', { exact: true }).first().waitFor()
    await page.getByRole('button', { name: actionConfig.label, exact: true }).click()
    const modal = page.locator('.modal.show')
    await modal.waitFor({ state: 'visible' })
    if (remarks) await modal.locator('#financialOtherClaimActionRemarks').fill(remarks)
    await modal.getByRole('button', { name: actionConfig.label, exact: true }).click()

    return poll(`financial action ${action}`, async () => {
      const updated = await financialRecord(id)
      const beforeHistoryCount = before?.workflow?.history?.length || 0
      const updatedHistoryCount = updated?.workflow?.history?.length || 0
      return updated?.status !== before.status || updatedHistoryCount > beforeHistoryCount
        ? updated
        : null
    })
  }

  const progressToApproved = async (id) => {
    let actor = 'reviewer'
    await loginAs({ email: reviewerEmail, password: reviewerPassword })

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const record = await financialRecord(id)
      if (record.status === 'Approved') return record
      const available = Array.isArray(record?.workflow?.availableActions)
        ? record.workflow.availableActions
        : []
      const next = available.find(
        (action) => !['reject', 'cancel', 'withdraw', 'return'].includes(action.action),
      )
      if (!next && actor === 'reviewer') {
        await loginAs({ email: approverEmail, password: approverPassword })
        actor = 'approver'
        continue
      }
      assert(next, `No positive workflow action is available for ${record.status}`)
      await performFinancialAction(id, next.action, `${runLabel} ${next.action}`)
    }
    throw new Error('Other claim did not reach Approved within six workflow actions.')
  }

  const queueRecordFor = async (staffId, period) => {
    const { payload } = await apiRequest({ route: 'hr/salary/payment-queue' })
    const rows = Array.isArray(payload.records) ? payload.records : []
    return rows.find(
      (row) => String(row.staffId) === String(staffId) && String(row.period) === String(period),
    )
  }

  try {
    await recordStep('authenticate dedicated E2E applicant', async () => {
      const user = await loginAs({ email, password })
      const roles = Array.isArray(user.roles) ? user.roles : []
      return `${user.email || email} (${roles.join(', ')})`
    })

    await recordStep('clean interrupted E2E records', async () => {
      const removed = await removeInterruptedE2ERecords()
      return removed.length ? `removed=${removed.join(',')}` : 'none found'
    })

    await recordStep('choose an available claim month', async () => {
      const records = await ownRecords()
      const draftMonths = new Set(
        records
          .filter((record) => record.status === 'Draft')
          .map((record) => record.claimMonthValue),
      )
      claimMonth = monthCandidates().find((candidate) => !draftMonths.has(candidate)) || ''
      assert(claimMonth, 'All three selectable claim months already contain a draft.')
      return claimMonth
    })

    await recordStep('CREATE server-backed draft through OtherClaimApply', async () => {
      await page.goto(`${baseUrl}/my/salary/other-claims/apply`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Other Claim Summary', { exact: true }).waitFor()
      await selectClaimMonth()
      await openNewAllowance()
      await fillAllowance(draftDescription, draftAmount)

      const draft = await poll('draft creation', () =>
        findOwnRecordByDescription(draftDescription, 'Draft'),
      )
      draftRecordId = draft.id
      assert(
        Number(draft.claimsTotal) === Number(draftAmount),
        'Draft total does not match UI input.',
      )
      await screenshot('01-draft-created')
      return `record=${draftRecordId}`
    })

    await recordStep('READ draft from staff records and detail UI', async () => {
      await page.goto(`${baseUrl}/my/salary/other-claims/records/${draftRecordId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText(draftDescription, { exact: false }).first().waitFor()
      await page.getByText('Draft', { exact: true }).first().waitFor()
      assert(
        await page.getByRole('button', { name: 'Edit Draft', exact: true }).isVisible(),
        'Draft detail does not expose Edit Draft.',
      )
      return `detail=${draftRecordId}`
    })

    await recordStep('UPDATE draft item through edit UI', async () => {
      await page.getByRole('button', { name: 'Edit Draft', exact: true }).click()
      await page.waitForURL(/\/my\/salary\/other-claims\/apply/)
      await page.getByRole('button', { name: `Edit ${draftDescription}`, exact: true }).click()
      await page.locator('#otherAllowanceDescription').fill(updatedDraftDescription)
      await page.locator('#otherAllowanceAmount').fill(updatedAmount)
      await page.getByRole('button', { name: 'Save', exact: true }).click()

      const updated = await poll('draft update', () =>
        findOwnRecordByDescription(updatedDraftDescription, 'Draft'),
      )
      assert(updated.id === draftRecordId, 'Draft update created a different application.')
      assert(
        Number(updated.claimsTotal) === Number(updatedAmount),
        'Updated draft total does not match.',
      )
      await screenshot('02-draft-updated')
      return `record=${updated.id}`
    })

    await recordStep('DELETE draft through staff records UI and clear browser draft', async () => {
      await page.goto(`${baseUrl}/my/salary/other-claims/records`, {
        waitUntil: 'domcontentloaded',
      })
      await page
        .getByText('Loading other claim records...')
        .waitFor({ state: 'detached' })
        .catch(() => {})
      const row = page
        .locator('table tbody tr')
        .filter({ hasText: moneyText(updatedAmount) })
        .first()
      await row.waitFor({ state: 'visible' })
      await row.locator('.data-table-action-toggle').click()
      await page.locator('.dropdown-menu.show').getByText('Delete Draft', { exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click()

      await poll('draft deletion', async () => {
        const record = await ownRecord(draftRecordId, [200, 404])
        return record === null
      })
      const localDraftExists = await page.evaluate(
        (month) => localStorage.getItem(`otherClaimDraft:v1:${month}`) !== null,
        claimMonth,
      )
      assert(!localDraftExists, 'Deleting a draft left its local browser draft behind.')
      return `deleted=${draftRecordId}`
    })

    await recordStep('CREATE and SUBMIT claim through OtherClaimApply', async () => {
      await page.goto(`${baseUrl}/my/salary/other-claims/apply`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Other Claim Summary', { exact: true }).waitFor()
      await selectClaimMonth()
      await openNewAllowance()
      await fillAllowance(submittedDescription, submittedAmount)
      await page.getByRole('button', { name: 'Submit', exact: true }).click()
      await page.getByRole('button', { name: 'Apply Another', exact: true }).waitFor()

      const submitted = await poll('claim submission', () =>
        findOwnRecordByDescription(submittedDescription, 'Submitted'),
      )
      originalRecordId = submitted.id
      assert(submitted.claimReference, 'Submitted record has no claim reference.')
      await screenshot('03-claim-submitted')
      return `${submitted.claimReference} rev ${submitted.revisionNo}`
    })

    await recordStep('READ submitted record and enforce immutable submitted UI', async () => {
      await page.goto(`${baseUrl}/my/salary/other-claims/records/${originalRecordId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText(submittedDescription, { exact: false }).first().waitFor()
      await page.getByText('Submitted', { exact: true }).first().waitFor()
      assert(
        !(await page
          .getByRole('button', { name: 'Edit Draft', exact: true })
          .isVisible()
          .catch(() => false)),
        'Submitted record incorrectly exposes direct draft editing.',
      )
      return `record=${originalRecordId}`
    })

    await recordStep('REJECT submitted claim through finance detail UI', async () => {
      await loginAs({ email: reviewerEmail, password: reviewerPassword })
      const before = await financialRecord(originalRecordId)
      const reject = before.workflow?.availableActions?.find((action) => action.action === 'reject')
      assert(reject, `Reject is not available for initial status ${before.status}.`)
      const rejected = await performFinancialAction(
        originalRecordId,
        'reject',
        `${runLabel} rejection for revision coverage`,
      )
      assert(rejected.status === 'Rejected', `Expected Rejected, received ${rejected.status}.`)
      await screenshot('04-claim-rejected')
      return rejected.status
    })

    await recordStep('UPDATE rejected claim by creating and submitting a revision', async () => {
      await loginAs({ email, password })
      await page.goto(`${baseUrl}/my/salary/other-claims/records/${originalRecordId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Rejected', { exact: true }).first().waitFor()
      await page.getByRole('button', { name: 'Create Revision', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.locator('textarea').fill(`${runLabel} corrected description and amount`)
      await dialog.getByRole('button', { name: 'Create Revision', exact: true }).click()
      await page.waitForURL(/\/my\/salary\/other-claims\/apply/)

      await page.getByRole('button', { name: `Edit ${submittedDescription}`, exact: true }).click()
      await page.locator('#otherAllowanceDescription').fill(revisedDescription)
      await page.locator('#otherAllowanceAmount').fill(updatedAmount)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await page.getByRole('button', { name: 'Submit', exact: true }).click()
      await page.getByRole('button', { name: 'Apply Another', exact: true }).waitFor()

      const revision = await poll('revision submission', () =>
        findOwnRecordByDescription(revisedDescription, 'Submitted'),
      )
      const original = await ownRecord(originalRecordId)
      assert(revision.id !== originalRecordId, 'Revision reused the rejected application id.')
      assert(Number(revision.revisionNo) === 2, `Expected revision 2, got ${revision.revisionNo}.`)
      assert(
        revision.claimReference === original.claimReference,
        'Revision did not preserve the claim reference.',
      )
      revisionRecordId = revision.id
      await screenshot('05-revision-submitted')
      return `${revision.claimReference} rev ${revision.revisionNo}`
    })

    await recordStep('APPROVE revised claim through every available finance stage', async () => {
      const approved = await progressToApproved(revisionRecordId)
      assert(approved.status === 'Approved', `Expected Approved, received ${approved.status}.`)
      await screenshot('06-revision-approved')
      return approved.status
    })

    await recordStep('MARK PAID from payment queue UI', async () => {
      const approved = await financialRecord(revisionRecordId)
      const queueRow = await poll('payment queue row', () =>
        queueRecordFor(approved.staffId, claimMonth),
      )
      assert(
        queueRow.canMarkPaid,
        `Payment row is not payable: ${queueRow.blockReason || 'blocked'}`,
      )

      await page.goto(`${baseUrl}/financial/payment-queue`, { waitUntil: 'domcontentloaded' })
      const row = page
        .locator('table tbody tr')
        .filter({ hasText: queueRow.staffName })
        .filter({ hasText: queueRow.periodLabel || formatMonth(claimMonth) })
        .first()
      await row.waitFor({ state: 'visible' })
      await row.getByRole('button', { name: 'Mark Paid', exact: true }).click()
      const modal = page.locator('.modal.show')
      await modal.locator('#paymentQueueReference').fill(`E2E-${stamp}`)
      await modal.locator('#paymentQueueMethod').fill('E2E test transfer')
      await modal.locator('#paymentQueueRemarks').fill(`${runLabel} payment lifecycle`)
      await modal.getByRole('button', { name: 'Mark Paid', exact: true }).click()

      const paid = await poll('paid status', async () => {
        const record = await financialRecord(revisionRecordId)
        return record.status === 'Paid' ? record : null
      })
      assert(paid.paymentHistory?.length > 0, 'Paid record has no payment history.')
      await screenshot('07-claim-paid')
      return paid.status
    })

    await recordStep('UNDO PAID through payment queue UI', async () => {
      const paid = await financialRecord(revisionRecordId)
      const queueRow = await poll('paid queue row', () => queueRecordFor(paid.staffId, claimMonth))
      assert(queueRow.canUndoPaid, 'Paid queue row does not permit reversal.')

      await page.goto(`${baseUrl}/financial/payment-queue`, { waitUntil: 'domcontentloaded' })
      const row = page
        .locator('table tbody tr')
        .filter({ hasText: queueRow.staffName })
        .filter({ hasText: queueRow.periodLabel || formatMonth(claimMonth) })
        .first()
      await row.waitFor({ state: 'visible' })
      await row.getByRole('button', { name: 'Undo Paid', exact: true }).click()
      const modal = page.locator('.modal.show')
      await modal.locator('#paymentQueueUndoReason').fill(`${runLabel} payment reversal coverage`)
      await modal.getByRole('button', { name: 'Undo Paid', exact: true }).click()

      const reversed = await poll('payment reversal', async () => {
        const record = await financialRecord(revisionRecordId)
        return record.status === 'Approved' ? record : null
      })
      assert(
        reversed.paymentHistory?.some((payment) => payment.reversedAt),
        'Reversed record does not expose reversal history.',
      )
      return reversed.status
    })

    await recordStep('DELETE lifecycle record by withdrawing approved revision', async () => {
      await loginAs({ email, password })
      await page.goto(`${baseUrl}/my/salary/other-claims/records/${revisionRecordId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('button', { name: 'Withdraw Claim', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.locator('textarea').fill(`${runLabel} cleanup after full lifecycle`)
      await dialog.getByRole('button', { name: 'Withdraw Claim', exact: true }).click()

      const cancelled = await poll('withdrawal', async () => {
        const record = await ownRecord(revisionRecordId)
        return record.status === 'Cancelled' ? record : null
      })
      assert(cancelled.cancelReason, 'Withdrawn record has no retained cancellation reason.')
      await screenshot('08-claim-withdrawn')
      return cancelled.status
    })

    await recordStep('no page crashes or network transport failures', async () => {
      assert(diagnostics.pageErrors.length === 0, diagnostics.pageErrors.join(' | '))
      assert(diagnostics.requestFailures.length === 0, diagnostics.requestFailures.join(' | '))
      return `${diagnostics.consoleErrors.length} console error(s) captured for review`
    })
  } catch (error) {
    await screenshot('failure').catch(() => {})
    throw error
  } finally {
    const report = {
      at: new Date().toISOString(),
      baseUrl,
      email,
      claimMonth,
      draftRecordId,
      originalRecordId,
      revisionRecordId,
      results,
      diagnostics,
    }
    await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(report, null, 2))
    await browser.close()
  }

  console.log(`\n${results.length}/${results.length} lifecycle steps passed.`)
  console.log(`Evidence: ${outputDir}`)
}

run().catch((error) => {
  console.error('OTHER-CLAIM-CRUD-E2E-FAILED', error)
  process.exitCode = 1
})
