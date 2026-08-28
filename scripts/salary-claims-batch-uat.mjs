import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const workspaceRoot = path.resolve(projectRoot, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `salary-claims-batch-uat-${stamp}`)
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const apiBase = `${baseUrl}/proxy`
const password = process.env.SALARY_RC_UAT_PASSWORD
const run = process.env.SALARY_RC_UAT_RUN
const financePassword = process.env.SALARY_UAT_PASSWORD
const evidencePath =
  process.env.SALARY_UAT_PDF ||
  path.join(workspaceRoot, 'backend-laravel', 'tmp', 'pdfs', 'jd14-31-final.pdf')

if (!password || !financePassword || !/^[a-z0-9]{6,24}$/.test(run || '')) {
  throw new Error(
    'SALARY_RC_UAT_RUN, SALARY_RC_UAT_PASSWORD, and SALARY_UAT_PASSWORD are required.',
  )
}

const applicantEmail = (number) => `salary.rc.${run}.${String(number).padStart(2, '0')}@amiosh.test`
const reviewerEmail = 'salary.reviewer@amiosh.test'
const approverEmail = 'salary.approver@amiosh.test'
const monthValue = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  timeZone: 'Asia/Kuala_Lumpur',
}).format(new Date())
const monthLabel = new Intl.DateTimeFormat('en-MY', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kuala_Lumpur',
}).format(new Date(`${monthValue}-01T00:00:00+08:00`))
const diagnostics = []
const results = []

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
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

const step = async (name, callback) => {
  const startedAt = Date.now()
  try {
    const detail = await callback()
    results.push({
      name,
      status: 'passed',
      durationMs: Date.now() - startedAt,
      detail: detail || '',
    })
    console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`)
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

const createActor = async (browser, label, email, actorPassword) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(25_000)
  const actorDiagnostics = {
    label,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
  }
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
      actorDiagnostics.httpErrors.push(`${response.status()} ${response.url()}`)
  })
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#loginEmail').fill(email)
  await page.locator('#loginPassword').fill(actorPassword)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: /sign in|login/i }).click(),
  ])
  diagnostics.push(actorDiagnostics)
  return { label, email, context, page, diagnostics: actorDiagnostics }
}

const api = async (actor, route, { method = 'GET', body, expected = [200] } = {}) => {
  const response = await actor.page.request.fetch(`${apiBase}/${route.replace(/^\//, '')}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    data: body ? JSON.stringify(body) : undefined,
  })
  const payload = await readPayload(response)
  if (!expected.includes(response.status())) {
    throw new Error(
      `${actor.label} ${method} ${route} returned ${response.status()}: ${payload?.message || JSON.stringify(payload)}`,
    )
  }
  return payload
}

const createSalary = async (actor, number) => {
  await actor.page.goto(`${baseUrl}/my/salary/apply`, { waitUntil: 'domcontentloaded' })
  await actor.page.getByRole('heading', { name: 'Apply Salary', exact: true }).waitFor()
  await actor.page.getByRole('button', { name: monthLabel, exact: true }).click()
  await actor.page.getByRole('button', { name: 'Add Adjustment', exact: true }).click()
  await actor.page.locator('#allowanceDate').fill(`${monthValue}-15`)
  await actor.page.locator('#allowanceDescription').fill(`Batch ${run} salary adjustment ${number}`)
  await actor.page.locator('#allowanceAmount').fill(String(20 + number))
  await actor.page.locator('#allowanceAttachment').setInputFiles(evidencePath)
  await actor.page.getByRole('button', { name: 'Save', exact: true }).click()
  await actor.page.getByRole('button', { name: 'Submit', exact: true }).click()
  await actor.page
    .getByRole('button', { name: 'Apply Another', exact: true })
    .waitFor({ timeout: 40_000 })
  const records = (await api(actor, 'hr/salary/records')).records || []
  const record = records.find((item) => item.salaryMonthValue === monthValue)
  assert(record?.status === 'Submitted', `${actor.label} salary was not submitted.`)
  return record
}

const createClaim = async (actor, number) => {
  const description = `Batch ${run} other claim ${number}`
  await actor.page.goto(`${baseUrl}/my/salary/other-claims/apply`, {
    waitUntil: 'domcontentloaded',
  })
  await actor.page
    .getByRole('heading', { name: /^(New Other Claim|Other Claim Summary)$/ })
    .waitFor()
  await actor.page.getByRole('button', { name: monthLabel, exact: true }).click()
  if (await actor.page.getByRole('button', { name: 'Add Claim', exact: true }).count()) {
    await actor.page.getByRole('button', { name: 'Add Claim', exact: true }).click()
  }
  await actor.page.getByRole('button', { name: 'Non-Recurring Allowance', exact: true }).click()
  await actor.page.locator('#otherAllowanceDate').fill(`${monthValue}-16`)
  await actor.page.locator('#otherAllowanceDescription').fill(description)
  await actor.page.locator('#otherAllowanceAmount').fill(String(30 + number))
  await actor.page.locator('#otherAllowanceAttachment').setInputFiles(evidencePath)
  await actor.page.getByRole('button', { name: 'Save', exact: true }).click()
  await actor.page.getByRole('button', { name: 'Submit', exact: true }).click()
  await actor.page
    .getByRole('button', { name: 'Apply Another', exact: true })
    .waitFor({ timeout: 40_000 })
  const records = (await api(actor, 'hr/salary/other-claims')).records || []
  for (const summary of records) {
    const detail = (await api(actor, `hr/salary/other-claims/${summary.id}`)).record
    if (detail?.claims?.some((claim) => claim.description === description)) return detail
  }
  throw new Error(`${actor.label} other claim was not found after submit.`)
}

const selectRows = async (page, staffLabels) => {
  for (const staffLabel of staffLabels) {
    const row = page.locator('table tbody tr').filter({ hasText: staffLabel }).first()
    await row.waitFor()
    await row.getByRole('checkbox').check()
  }
}

const runBatch = async (actor, route, staffLabels, action) => {
  await actor.page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  await selectRows(actor.page, staffLabels)
  await actor.page
    .getByRole('button', { name: new RegExp(`^${action} ${staffLabels.length}$`, 'i') })
    .click()
  const dialog = actor.page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.locator('textarea').fill(`Batch ${run} ${action.toLowerCase()} verified`)
  await dialog.getByRole('button', { name: new RegExp(`^${action} records$`, 'i') }).click()
  await Promise.race([
    dialog.waitFor({ state: 'hidden' }),
    dialog.locator('[role="alert"]').waitFor({ state: 'visible' }),
  ])
  if (await dialog.isVisible()) {
    throw new Error((await dialog.locator('[role="alert"]').innerText()).trim())
  }
}

await fs.mkdir(outputDir, { recursive: true })
await fs.access(evidencePath)
const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' })
const actors = []
const salaryRecords = []
const claimRecords = []

try {
  await step('authenticate disposable applicants and distinct finance actors', async () => {
    for (const number of [2, 3, 4])
      actors.push(
        await createActor(browser, `Applicant ${number}`, applicantEmail(number), password),
      )
    actors.push(await createActor(browser, 'Reviewer', reviewerEmail, financePassword))
    actors.push(await createActor(browser, 'Approver', approverEmail, financePassword))
    return '3 applicants, reviewer, approver'
  })
  const applicants = actors.slice(0, 3)
  const reviewer = actors[3]
  const approver = actors[4]

  await step('two applicants submit fresh salary and claim records with PDF evidence', async () => {
    for (const [index, applicant] of applicants.slice(0, 2).entries()) {
      salaryRecords.push(await createSalary(applicant, index + 2))
      claimRecords.push(await createClaim(applicant, index + 2))
    }
    return `salary=${salaryRecords.map((record) => record.id).join(',')}; claims=${claimRecords.map((record) => record.id).join(',')}`
  })

  const staffLabels = ['Salary RC Applicant 2', 'Salary RC Applicant 3']
  await step('reviewer batch-checks two salary records in the live table', async () => {
    await runBatch(reviewer, '/financial/salary-records', staffLabels, 'Check')
    for (const record of salaryRecords)
      assert(
        (await api(reviewer, `hr/salary/financial-records/${record.id}`)).record.status ===
          'Checked',
        `Salary ${record.id} was not checked.`,
      )
  })
  await step('approver batch-approves the checked salary records', async () => {
    await runBatch(approver, '/financial/salary-records', staffLabels, 'Approve')
    for (const record of salaryRecords)
      assert(
        (await api(approver, `hr/salary/financial-records/${record.id}`)).record.status ===
          'Approved',
        `Salary ${record.id} was not approved.`,
      )
  })
  await step('reviewer batch-checks two other claims in the live table', async () => {
    await runBatch(reviewer, '/financial/other-claim-records', staffLabels, 'Check')
    for (const record of claimRecords)
      assert(
        (await api(reviewer, `hr/salary/other-claims/financial-records/${record.id}`)).record
          .status === 'Checked',
        `Claim ${record.id} was not checked.`,
      )
  })
  await step('approver batch-approves the checked other claims', async () => {
    await runBatch(approver, '/financial/other-claim-records', staffLabels, 'Approve')
    for (const record of claimRecords)
      assert(
        (await api(approver, `hr/salary/other-claims/financial-records/${record.id}`)).record
          .status === 'Approved',
        `Claim ${record.id} was not approved.`,
      )
  })

  await step('individual rejection requires a reason and reaches the applicant', async () => {
    const rejectedSalary = await createSalary(applicants[2], 4)
    const detailRoute = `/financial/salary-records/${rejectedSalary.id}`
    await reviewer.page.goto(`${baseUrl}${detailRoute}`, { waitUntil: 'domcontentloaded' })
    await reviewer.page.getByRole('button', { name: 'Check', exact: true }).click()
    let dialog = reviewer.page.getByRole('dialog')
    await dialog.locator('textarea').fill(`Batch ${run} checked before rejection`)
    await dialog.getByRole('button', { name: 'Check', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })

    await approver.page.goto(`${baseUrl}${detailRoute}`, { waitUntil: 'domcontentloaded' })
    await approver.page.getByRole('button', { name: 'Reject', exact: true }).click()
    dialog = approver.page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Reject', exact: true }).click()
    await dialog.locator('[role="alert"]').waitFor()
    const reason = `Batch ${run} rejection reason verified`
    await dialog.locator('textarea').fill(reason)
    await dialog.getByRole('button', { name: 'Reject', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    const rejected = (await api(applicants[2], `hr/salary/records/${rejectedSalary.id}`)).record
    assert(rejected.status === 'Rejected', 'Applicant salary did not reach Rejected.')
    assert(
      rejected.rejectionRemarks === reason ||
        rejected.workflow?.history?.some((item) => item.remarks === reason),
      'Rejection reason was not visible in applicant data.',
    )
  })

  await step('browser and transport diagnostics remain clean', async () => {
    const failures = diagnostics.flatMap((item) => [
      ...item.consoleErrors.map((value) => `${item.label} console: ${value}`),
      ...item.pageErrors.map((value) => `${item.label} page: ${value}`),
      ...item.requestFailures.map((value) => `${item.label} request: ${value}`),
      ...item.httpErrors.map((value) => `${item.label} HTTP: ${value}`),
    ])
    assert(failures.length === 0, failures.join('\n'))
  })
} finally {
  await fs.writeFile(
    path.join(outputDir, 'results.json'),
    JSON.stringify(
      {
        run,
        results,
        diagnostics,
        salaryRecords: salaryRecords.map((item) => item.id),
        claimRecords: claimRecords.map((item) => item.id),
      },
      null,
      2,
    ),
  )
  await Promise.all(actors.map((actor) => actor.context.close().catch(() => {})))
  await browser.close()
}

const failed = results.filter((result) => result.status === 'failed')
console.log(`\n${results.length - failed.length}/${results.length} batch UAT steps passed.`)
console.log(`Evidence: ${outputDir}`)
if (failed.length) process.exitCode = 1
