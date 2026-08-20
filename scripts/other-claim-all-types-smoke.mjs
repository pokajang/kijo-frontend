import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `other-claim-all-types-smoke-${stamp}`)
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const apiBase = `${baseUrl}/proxy`
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const password = process.env.SMOKE_PASSWORD
const allowMutation = process.env.SMOKE_OTHER_CLAIM_ALLOW_MUTATION === '1'
const headless = process.env.SMOKE_HEADLESS !== '0'
const runLabel = `SMOKE Other Claim ${stamp}`
const receiptFor = (claimType) => ({
  name: `receipt-${claimType}-${stamp}.pdf`,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
})

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const poll = async (label, callback, { timeoutMs = 25_000, intervalMs = 400 } = {}) => {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const value = await callback()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await sleep(intervalMs)
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ''}`)
}

const monthCandidates = () =>
  [0, 1, 2].map((offset) => {
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })

const formatMonth = (value) => {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

const claimDate = () => `${claimMonth}-15`

if (!password || !allowMutation) {
  throw new Error(
    'This disposable draft smoke test needs SMOKE_PASSWORD and SMOKE_OTHER_CLAIM_ALLOW_MUTATION=1.',
  )
}

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
page.setDefaultTimeout(20_000)
page.setDefaultNavigationTimeout(40_000)

const results = []
const diagnostics = { consoleErrors: [], pageErrors: [], requestFailures: [] }
let csrfToken = ''
let claimMonth = ''
let recordId = null

page.on('console', (message) => {
  if (message.type() === 'error') diagnostics.consoleErrors.push(message.text())
})
page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
page.on('requestfailed', (request) => {
  const reason = request.failure()?.errorText || 'unknown'
  if (!reason.includes('ERR_ABORTED'))
    diagnostics.requestFailures.push(`${request.method()} ${request.url()} -> ${reason}`)
})

const apiRequest = async ({ route, method = 'GET', body, expectedStatuses = [200] }) => {
  const headers = {
    Accept: 'application/json',
    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await page.request.fetch(`${apiBase}/${route.replace(/^\/+/, '')}`, {
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

const step = async (name, action) => {
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

const ownRecords = async () => {
  const { payload } = await apiRequest({ route: 'hr/salary/other-claims' })
  return Array.isArray(payload.records) ? payload.records : []
}

const ownRecord = async (id, expectedStatuses = [200]) => {
  const { response, payload } = await apiRequest({
    route: `hr/salary/other-claims/${id}`,
    expectedStatuses,
  })
  return response.status() === 200 ? payload.record : null
}

const selectClaimMonth = async () => {
  await page.getByRole('button', { name: formatMonth(claimMonth), exact: true }).click()
  await poll(
    'claim month selection',
    async () => (await page.locator('#otherClaimMonth').inputValue()) === claimMonth,
  )
}

const selectType = async (name, inputId) => {
  if (!(await page.getByRole('button', { name, exact: true }).count())) {
    await page.getByRole('button', { name: 'Add Claim', exact: true }).click()
  }
  await page.getByRole('button', { name, exact: true }).click()
  await page.locator(inputId).waitFor({ state: 'visible' })
}

const attachReceipt = async (inputId, receipt) => {
  await page.locator(inputId).setInputFiles(receipt)
  await page.getByText(receipt.name, { exact: false }).last().waitFor({ state: 'visible' })
  await poll(
    'attachment preparation',
    async () => !(await page.getByRole('button', { name: 'Preparing', exact: true }).count()),
  )
}

const saveDraft = async (description) => {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByText(description, { exact: false }).first().waitFor({ state: 'visible' })
}

const assertSummaryAttachment = async (receipt) => {
  await page
    .getByRole('button', { name: `Open ${receipt.name}`, exact: true })
    .waitFor({ state: 'visible' })
}

const screenshot = (name) =>
  page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true })

const cleanupFixture = async () => {
  const records = await ownRecords()
  for (const record of records.filter((item) => item.status === 'Draft')) {
    const detail = await ownRecord(record.id)
    if (!detail?.claims?.some((claim) => String(claim.description || '').startsWith(runLabel)))
      continue
    await apiRequest({
      route: `hr/salary/other-claims/${record.id}`,
      method: 'DELETE',
      body: {
        reason: `${runLabel} smoke cleanup`,
        record_version: Number(detail.recordVersion || 0) || undefined,
      },
    })
    return record.id
  }
  return null
}

try {
  await step('authenticate through the real UI', async () => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#loginEmail').fill(email)
    await page.locator('#loginPassword').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.getByRole('button', { name: /sign in|login/i }).click(),
    ])
    const { payload } = await apiRequest({ route: 'auth/session' })
    assert(
      payload.user?.staff_id || payload.data?.user?.staff_id,
      'Authenticated session did not return a staff account.',
    )
    return email
  })

  await step('open Other Claim Apply and choose a disposable month', async () => {
    const records = await ownRecords()
    const draftMonths = new Set(
      records.filter((record) => record.status === 'Draft').map((record) => record.claimMonthValue),
    )
    claimMonth = monthCandidates().find((month) => !draftMonths.has(month)) || ''
    assert(
      claimMonth,
      'All selectable claim months already have a draft; no existing data was changed.',
    )
    await page.goto(`${baseUrl}/my/salary/other-claims/apply`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Other Claim Summary', { exact: true }).waitFor()
    await selectClaimMonth()
    return claimMonth
  })

  await step('create allowance claim', async () => {
    const description = `${runLabel} allowance`
    const receipt = receiptFor('allowance')
    await selectType('Non-Recurring Allowance', '#otherAllowanceDate')
    await page.locator('#otherAllowanceDate').fill(claimDate())
    await page.locator('#otherAllowanceDescription').fill(description)
    await page.locator('#otherAllowanceAmount').fill('11.10')
    await attachReceipt('#otherAllowanceAttachment', receipt)
    await saveDraft(description)
    await assertSummaryAttachment(receipt)
    return { description, receipt }
  })

  await step('create expense claim with receipt and preview it', async () => {
    const description = `${runLabel} expense`
    const receipt = receiptFor('expense')
    await selectType('Expense', '#otherExpenseDate')
    await page.locator('#otherExpenseDate').fill(claimDate())
    await page.locator('#otherExpenseDescription').fill(description)
    await page.locator('#otherExpenseAmount').fill('22.20')
    await attachReceipt('#otherExpenseAttachment', receipt)
    await saveDraft(description)
    await assertSummaryAttachment(receipt)
    await page.getByRole('button', { name: `Open ${receipt.name}`, exact: true }).click()
    const preview = page.locator('iframe.salary-attachment-preview-frame')
    await preview.waitFor({ state: 'visible' })
    assert(
      (await preview.getAttribute('src'))?.startsWith('data:application/pdf'),
      'New receipt did not retain an inline preview URL.',
    )
    await page.getByRole('button', { name: /close/i }).first().click()
    return { description, receipt }
  })

  await step('create travel mileage claim with receipt', async () => {
    const description = `${runLabel} mileage`
    const receipt = receiptFor('mileage')
    await selectType('Travel & Mileage', '#otherMileageDate')
    await page.locator('#otherMileageDate').fill(claimDate())
    await page.locator('#otherMileagePurpose').fill(description)
    await page.locator('#otherStartLocation').fill('Smoke origin')
    await page.locator('#otherEndLocation').fill('Smoke destination')
    await page.locator('#otherMileageKm').fill('5')
    await attachReceipt('#otherTravelEvidence', receipt)
    await saveDraft(description)
    await assertSummaryAttachment(receipt)
    return { description, receipt }
  })

  await step('create medical claim or verify its entitlement guard', async () => {
    const description = `${runLabel} medical`
    const receipt = receiptFor('medical')
    await selectType('Medical', '#otherMedicalDate')
    if (
      await page
        .getByText('Set your annual medical entitlement before submitting.', { exact: true })
        .count()
    ) {
      assert(
        await page
          .getByRole('button', { name: 'Set Medical Entitlement', exact: true })
          .isVisible(),
        'Medical entitlement guard has no recovery action.',
      )
      return 'guarded: account has no medical entitlement'
    }
    await page.locator('#otherMedicalDate').fill(claimDate())
    await page.locator('#otherMedicalDescription').fill(description)
    await page.locator('#otherMedicalAmount').fill('33.30')
    await attachReceipt('#otherMedicalAttachment', receipt)
    await saveDraft(description)
    await assertSummaryAttachment(receipt)
    return { description, receipt }
  })

  await step('verify the persisted draft and all covered items', async () => {
    const expectedClaims = [
      { description: `${runLabel} allowance`, receipt: receiptFor('allowance') },
      { description: `${runLabel} expense`, receipt: receiptFor('expense') },
      { description: `${runLabel} mileage`, receipt: receiptFor('mileage') },
    ]
    const medicalDescription = `${runLabel} medical`
    const medicalGuarded = await page
      .getByText('Set your annual medical entitlement before submitting.', { exact: true })
      .count()
    if (!medicalGuarded) {
      expectedClaims.push({ description: medicalDescription, receipt: receiptFor('medical') })
    }
    const expectedDescriptions = expectedClaims.map((claim) => claim.description)
    const records = await ownRecords()
    const record = records.find(
      (item) => item.status === 'Draft' && item.claimMonthValue === claimMonth,
    )
    assert(record?.id, 'The server did not create a draft record.')
    recordId = record.id
    const detail = await poll('draft persistence', async () => {
      const current = await ownRecord(recordId)
      return current?.claims?.every((claim) => expectedDescriptions.includes(claim.description)) &&
        expectedDescriptions.every((description) =>
          current.claims.some((claim) => claim.description === description),
        )
        ? current
        : null
    })
    for (const { description, receipt } of expectedClaims) {
      const claim = detail.claims.find((item) => item.description === description)
      assert(claim, `Missing persisted claim: ${description}`)
      assert(
        Array.isArray(claim.attachments) &&
          claim.attachments.some((attachment) => attachment.name === receipt.name),
        `Missing persisted attachment for: ${description}`,
      )
    }
    if (!medicalGuarded)
      assert(
        detail.claims.some((claim) => claim.description === medicalDescription),
        'Missing persisted medical claim.',
      )
    await screenshot('all-types-draft')
    return `record=${recordId}; claims=${detail.claims.length}`
  })

  await step('read, filter, and delete the disposable draft through the UI', async () => {
    await page.goto(`${baseUrl}/my/salary/other-claims/records`, { waitUntil: 'domcontentloaded' })
    await page
      .getByText('Loading other claim records...')
      .waitFor({ state: 'detached' })
      .catch(() => {})
    const detail = await ownRecord(recordId)
    const total = `RM ${Number(detail?.claimsTotal || 0).toFixed(2)}`
    const row = page
      .locator('table tbody tr')
      .filter({ hasText: 'Draft' })
      .filter({ hasText: total })
      .first()
    await row.waitFor({ state: 'visible' })
    await row.locator('.data-table-action-toggle').click()
    await page.locator('.dropdown-menu.show').getByText('Delete Draft', { exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await poll('draft deletion', async () => (await ownRecord(recordId, [200, 404])) === null)
    const localDraftExists = await page.evaluate(
      (month) => localStorage.getItem(`otherClaimDraft:v1:${month}`) !== null,
      claimMonth,
    )
    assert(!localDraftExists, 'Deleting the draft left a browser draft behind.')
    return `deleted=${recordId}`
  })

  await step('check browser and transport diagnostics', async () => {
    assert(diagnostics.pageErrors.length === 0, diagnostics.pageErrors.join(' | '))
    assert(diagnostics.requestFailures.length === 0, diagnostics.requestFailures.join(' | '))
    return `${diagnostics.consoleErrors.length} console error(s) captured`
  })
} catch (error) {
  await screenshot('failure').catch(() => {})
  throw error
} finally {
  const cleanedRecordId = await cleanupFixture().catch(() => null)
  await fs.writeFile(
    path.join(outputDir, 'result.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        baseUrl,
        email,
        claimMonth,
        recordId,
        cleanedRecordId,
        results,
        diagnostics,
      },
      null,
      2,
    ),
  )
  await browser.close()
}

console.log(`\n${results.length}/${results.length} smoke steps passed.`)
console.log(`Evidence: ${outputDir}`)
