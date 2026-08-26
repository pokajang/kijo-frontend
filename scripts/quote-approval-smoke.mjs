import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `quote-approval-smoke-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const requestedBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const password = process.env.SMOKE_PASSWORD
const smokeMarker = `SMOKE-QUOTE-APPROVAL-${stamp}`

const findings = []
const check = (name, ok, detail = '') => {
  findings.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`)
}
const requireCheck = (name, ok, detail = '') => {
  check(name, ok, detail)
  if (!ok) throw new Error(`${name}${detail ? `: ${detail}` : ''}`)
}
const readJson = async (response) => {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

const selectFirstOption = async (page, placeholder) => {
  const select = page.locator('.react-select-container').filter({ hasText: placeholder })
  await select.getByRole('combobox').click()
  const option = page.locator('.react-select__option').first()
  await option.waitFor()
  const label = (await option.textContent())?.trim() || 'first available option'
  await option.click()
  return label
}

const createPendingTrainingQuote = async (page, baseUrl, sequence) => {
  await page.goto(`${baseUrl}/crm/quotes?service=training`, { waitUntil: 'commit' })
  await page.getByText('Client / Company', { exact: true }).waitFor()
  const clientLabel = await selectFirstOption(page, 'Search client')
  await selectFirstOption(page, 'Select Source...')
  const trainingLabel = await selectFirstOption(page, 'Search and select training topic...')
  await page.getByLabel('Training Venue').fill(`${smokeMarker} temporary venue ${sequence}`)
  await page.getByText('Traffic Light', { exact: true }).waitFor()
  await page.getByLabel('Estimated Cost (RM)').fill('1000')
  await page.getByText('Pricing Details', { exact: true }).waitFor()
  await page.locator('#trainingRateType').selectOption('client_site_special_trainer')
  await page.locator('#trainingQty').fill('1')
  await page.locator('#trainingDuration').fill('1')
  await page.locator('#noOfPax').fill('1')
  await page.locator('#unitPrice').fill('1300')
  await page.locator('#unitPrice').blur()
  await page.getByRole('button', { name: 'Save & Apply Approval', exact: true }).waitFor()
  if (sequence === 1) {
    await page.screenshot({
      path: path.join(screenshotsDir, '00-create-approval-required-quote-desktop.png'),
      fullPage: true,
    })
  }

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/proxy/quotes/training') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Save & Apply Approval', exact: true }).click()
  const response = await createResponsePromise
  const payload = await readJson(response)
  const quoteId = Number(payload?.quote_id || payload?.data?.quote_id || payload?.data?.id || 0)
  requireCheck(
    `create-approval-required-training-quote-${sequence}`,
    response.status() === 200 && quoteId > 0,
    `HTTP ${response.status()}, quote #${quoteId || 'unknown'}`,
  )
  const createAnother = page.getByRole('button', { name: 'Create another', exact: true })
  await createAnother.waitFor()
  await createAnother.click()
  await page.getByText('Client / Company', { exact: true }).waitFor()
  return { quoteId, clientLabel, trainingLabel }
}

const deleteQuoteThroughUi = async (page, baseUrl, quoteId) => {
  await page.goto(`${baseUrl}/crm/records/training/${quoteId}`, { waitUntil: 'commit' })
  await page.getByText('Quotation Details', { exact: true }).waitFor()
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/proxy/quote-records/training/${quoteId}`) &&
      response.request().method() === 'DELETE',
  )
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const confirmation = page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true })
  await confirmation.waitFor()
  await confirmation.click()
  return (await deleteResponsePromise).status() === 200
}

const closeResolvedReview = async (modal) => {
  const closedAutomatically = await modal
    .waitFor({ state: 'hidden', timeout: 5000 })
    .then(() => true)
    .catch(() => false)
  if (closedAutomatically) return true

  await modal.getByRole('button', { name: 'Close', exact: true }).click()
  await modal.waitFor({ state: 'hidden' })
  return true
}

const run = async () => {
  const baseUrl = validateSmokeTarget(requestedBaseUrl)
  if (!password) throw new Error('SMOKE_PASSWORD environment variable is required.')

  await fs.mkdir(screenshotsDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(90_000)
  page.setDefaultNavigationTimeout(120_000)

  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []
  const unexpectedResponses = []
  const quoteIds = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || ''
    if (!reason.includes('ERR_ABORTED'))
      requestFailures.push(`${request.method()} ${request.url()} ${reason}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/proxy/')) {
      unexpectedResponses.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      )
    }
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'commit' })
    await page.fill('#loginEmail', email)
    await page.fill('#loginPassword', password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { waitUntil: 'commit' }),
      page.click('button[type="submit"]'),
    ])
    check('real-ui-login', true, page.url())

    const firstQuote = await createPendingTrainingQuote(page, baseUrl, 1)
    quoteIds.push(firstQuote.quoteId)
    const secondQuote = await createPendingTrainingQuote(page, baseUrl, 2)
    quoteIds.push(secondQuote.quoteId)
    check(
      'quote-create-client-selected',
      Boolean(firstQuote.clientLabel && secondQuote.clientLabel),
    )

    await page.goto(`${baseUrl}/crm/records?approval_scope=mine`, { waitUntil: 'commit' })
    await page.waitForTimeout(1000)
    check(
      'records-list-has-no-unsolicited-review-modal',
      !(await page
        .getByRole('dialog')
        .isVisible()
        .catch(() => false)),
    )

    const approvals = await page.evaluate(async () => {
      const response = await fetch('/proxy/quote-approvals', { credentials: 'include' })
      return { status: response.status, payload: await response.json() }
    })
    const pendingQuotes =
      approvals.payload?.data?.filter((item) => quoteIds.includes(Number(item.quote_id))) || []
    requireCheck('approval-list-api', approvals.status === 200, `HTTP ${approvals.status}`)
    requireCheck(
      'two-created-quotes-are-pending',
      pendingQuotes.length === 2,
      `found ${pendingQuotes.length}`,
    )
    pendingQuotes.forEach((approval) => {
      check(
        `approval-metadata-complete-${approval.quote_id}`,
        Boolean(
          approval.quote_ref_no &&
            approval.quote_title &&
            approval.quote_date &&
            approval.client_name &&
            approval.quoted_total != null &&
            approval.estimated_cost != null &&
            approval.margin_percent != null,
        ),
      )
      check(
        `approval-is-hod-yellow-${approval.quote_id}`,
        approval.zone === 'yellow' &&
          approval.required_step === 'hod' &&
          approval.can_decide === true,
      )
    })

    const reviewBanner = page.getByText(/quotation(?:s)? (?:requires|require) your approval/i)
    const reviewBannerVisible = await reviewBanner.isVisible().catch(() => false)
    requireCheck(
      'review-all-pending-banner-visible',
      reviewBannerVisible,
      `records text: ${(await page.locator('body').innerText()).slice(0, 500).replaceAll('\n', ' | ')}`,
    )
    await page.screenshot({
      path: path.join(screenshotsDir, '01-pending-records-desktop.png'),
      fullPage: true,
    })

    const firstApproval = pendingQuotes[0]
    const blockedPdf = await context.request.get(
      `${baseUrl}/proxy/quote-records/training/${firstApproval.quote_id}/pdf?quote_id=${firstApproval.quote_id}`,
    )
    check(
      'official-pdf-blocked-before-approval',
      blockedPdf.status() === 409,
      `HTTP ${blockedPdf.status()}`,
    )

    await page.goto(`${baseUrl}/crm/records?approval_scope=mine&approvalId=${firstApproval.id}`, {
      waitUntil: 'commit',
    })
    const modal = page.getByRole('dialog')
    await modal.waitFor()
    await modal.getByText(firstApproval.client_name, { exact: true }).waitFor()
    check(
      'review-request-modal-visible',
      await modal.getByRole('heading', { name: 'Review Quotation Approval' }).isVisible(),
    )
    check(
      'review-modal-client-visible',
      await modal.getByText(pendingQuotes[0].client_name, { exact: true }).isVisible(),
    )
    check('review-modal-quoted-total-visible', await modal.getByText(/RM 1,300\.00/).isVisible())
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(screenshotsDir, '02-review-all-modal-desktop.png') })

    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/quote-approvals/${firstApproval.id}/approve`) &&
        response.request().method() === 'PATCH',
    )
    await modal.getByRole('button', { name: 'Approve', exact: true }).click()
    const approveResponse = await approveResponsePromise
    check(
      'queue-first-quote-approved',
      approveResponse.status() === 200,
      `HTTP ${approveResponse.status()}`,
    )

    check('approved-review-can-close', await closeResolvedReview(modal))

    const secondApproval = pendingQuotes[1]
    await page.goto(`${baseUrl}/crm/records?approval_scope=mine&approvalId=${secondApproval.id}`, {
      waitUntil: 'commit',
    })
    await modal.waitFor()
    await modal.getByLabel('Decision remarks').waitFor()
    await modal.getByLabel('Decision remarks').fill(`${smokeMarker} rejection verification`)
    const rejectResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/quote-approvals/${secondApproval.id}/reject`) &&
        response.request().method() === 'PATCH',
    )
    await modal.getByRole('button', { name: 'Reject', exact: true }).click()
    const rejectResponse = await rejectResponsePromise
    check(
      'queue-second-quote-rejected-with-remarks',
      rejectResponse.status() === 200,
      `HTTP ${rejectResponse.status()}`,
    )
    check('rejected-review-can-close', await closeResolvedReview(modal))

    const approvedPdf = await context.request.get(
      `${baseUrl}/proxy/quote-records/training/${firstApproval.quote_id}/pdf?quote_id=${firstApproval.quote_id}`,
    )
    const approvedPdfBody = await approvedPdf.body()
    check(
      'official-pdf-available-after-approval',
      approvedPdf.status() === 200 &&
        (approvedPdf.headers()['content-type'] || '').includes('application/pdf') &&
        approvedPdfBody.byteLength > 1000,
      `HTTP ${approvedPdf.status()}, ${approvedPdfBody.byteLength} bytes`,
    )

    await page.goto(
      `${baseUrl}/crm/quotes?service=training&edit=true&quoteId=${secondQuote.quoteId}`,
      { waitUntil: 'commit' },
    )
    await page.getByText('Pricing Details', { exact: true }).waitFor()
    await page.screenshot({
      path: path.join(screenshotsDir, '03-edit-rejected-quote-desktop.png'),
      fullPage: true,
    })
    await page.locator('#unitPrice').fill('1301')
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/proxy/quotes/training/${secondQuote.quoteId}`) &&
        response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Update & Apply Approval', exact: true }).click()
    const updateResponse = await updateResponsePromise
    check(
      'rejected-quote-revised-through-ui',
      updateResponse.status() === 200,
      `HTTP ${updateResponse.status()}`,
    )

    await page.goto(`${baseUrl}/crm/records?approval_scope=mine`, { waitUntil: 'commit' })
    await page.getByText(/quotation(?:s)? (?:requires|require) your approval/i).waitFor()
    const revisedApproval = await page.evaluate(async (quoteId) => {
      const response = await fetch('/proxy/quote-approvals', { credentials: 'include' })
      const payload = await response.json()
      return (
        payload.data?.find(
          (item) => Number(item.quote_id) === quoteId && item.status === 'pending',
        ) || null
      )
    }, secondQuote.quoteId)
    requireCheck('revised-quote-creates-new-pending-approval', Boolean(revisedApproval?.id))
    await page.goto(`${baseUrl}/crm/records?approval_scope=mine&approvalId=${revisedApproval.id}`, {
      waitUntil: 'commit',
    })
    await modal.waitFor()
    const finalApproveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/quote-approvals/${revisedApproval.id}/approve`) &&
        response.request().method() === 'PATCH',
    )
    await modal.getByRole('button', { name: 'Approve', exact: true }).click()
    const finalApproveResponse = await finalApproveResponsePromise
    check(
      'revised-quote-approved',
      finalApproveResponse.status() === 200,
      `HTTP ${finalApproveResponse.status()}`,
    )

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${baseUrl}/crm/records/training`, { waitUntil: 'commit' })
    await page.locator('.records-mobile-item').first().waitFor()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check('mobile-records-no-horizontal-overflow', overflow <= 8, `${overflow}px`)
    await page.screenshot({
      path: path.join(screenshotsDir, '04-records-mobile.png'),
      fullPage: true,
    })
  } catch (error) {
    await page
      .screenshot({ path: path.join(screenshotsDir, 'smoke-failure.png'), fullPage: true })
      .catch(() => {})
    await fs
      .writeFile(path.join(outputDir, 'failure-page.txt'), await page.locator('body').innerText())
      .catch(() => {})
    throw error
  } finally {
    for (const quoteId of quoteIds) {
      try {
        check(`cleanup-quote-${quoteId}`, await deleteQuoteThroughUi(page, baseUrl, quoteId))
      } catch (error) {
        check(`cleanup-quote-${quoteId}`, false, error.message)
      }
    }
    await browser.close()
  }

  check('no-page-errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
  check('no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
  check(
    'no-request-failures',
    requestFailures.length === 0,
    requestFailures.slice(0, 3).join(' | '),
  )
  check(
    'no-unexpected-api-errors',
    unexpectedResponses.length === 0,
    unexpectedResponses.slice(0, 5).join(' | '),
  )
  const result = {
    at: new Date().toISOString(),
    baseUrl,
    smokeAccount: redactEmail(email),
    smokeMarker,
    quoteIds,
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
  console.error('QUOTE-APPROVAL-SMOKE-CRASH', error)
  findings.push({ name: 'smoke-script-completed', ok: false, detail: error.message })
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(
    path.join(outputDir, 'result.json'),
    JSON.stringify(
      { at: new Date().toISOString(), smokeMarker, findings, crash: error.stack },
      null,
      2,
    ),
  )
  process.exitCode = 2
})
