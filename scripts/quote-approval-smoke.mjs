import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `quote-approval-smoke-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const password = process.env.SMOKE_PASSWORD
const quoteRef = process.env.SMOKE_QUOTE_REF || 'SMOKE-QA-APPROVAL-20260720'

const findings = []
const check = (name, ok, detail = '') => {
  findings.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`)
}

const run = async () => {
  if (!password) {
    throw new Error('SMOKE_PASSWORD environment variable is required.')
  }

  await fs.mkdir(screenshotsDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  page.setDefaultNavigationTimeout(30_000)

  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []
  const unexpectedResponses = []

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
    if (response.status() < 400) return
    unexpectedResponses.push(
      `${response.status()} ${response.request().method()} ${response.url()}`,
    )
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('#loginEmail', email)
    await page.fill('#loginPassword', password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.click('button[type="submit"]'),
    ])
    check('real-ui-login', true, page.url())

    const approvalResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/quote-approvals'),
    )
    await page.goto(`${baseUrl}/crm/records?approval_scope=mine`, {
      waitUntil: 'domcontentloaded',
    })
    const approvalResponse = await approvalResponsePromise
    check(
      'approval-list-api',
      approvalResponse.status() === 200,
      `HTTP ${approvalResponse.status()}`,
    )

    await page.getByText(/quotation requires your approval/i).waitFor()
    check('same-page-approval-notice', true)
    check('review-now-cta', await page.getByRole('button', { name: 'Review Now' }).isVisible())
    check(
      'sidebar-approval-badge-visible',
      await page.locator('[title="Quotations need approval"]').first().isVisible(),
    )
    check(
      'temporary-quote-visible',
      await page.getByText(quoteRef, { exact: true }).first().isVisible(),
    )
    await page.screenshot({
      path: path.join(screenshotsDir, '01-records-pending.png'),
      fullPage: true,
    })

    const bell = page.getByRole('button', { name: /notification/i }).first()
    await bell.click()
    const notification = page.getByText('HOD quotation approval required', { exact: true }).first()
    await notification.waitFor()
    check('in-app-notification-visible', true)
    await page.screenshot({ path: path.join(screenshotsDir, '02-notification.png') })
    await page.keyboard.press('Escape')

    const approvalsPayload = await page.evaluate(async () => {
      const response = await fetch('/proxy/quote-approvals', { credentials: 'include' })
      return response.json()
    })
    const approval = approvalsPayload.data?.find((item) => item.quote_ref_no === quoteRef)
    check(
      'approval-contract-found',
      Boolean(approval?.id),
      approval ? `request #${approval.id}` : '',
    )
    check('assigned-user-can-decide', approval?.can_decide === true)
    check('yellow-routes-to-hod', approval?.zone === 'yellow' && approval?.required_step === 'hod')

    const pdfUrl = `/proxy/quote-records/training/${approval.quote_id}/pdf?quote_id=${approval.quote_id}`
    const blockedPdfResponse = await context.request.get(new URL(pdfUrl, baseUrl).toString())
    const blockedPdf = {
      status: blockedPdfResponse.status(),
      payload: await blockedPdfResponse.json(),
    }
    check(
      'official-pdf-blocked-before-approval',
      blockedPdf.status === 409 && blockedPdf.payload?.code === 'QUOTE_APPROVAL_REQUIRED',
      `HTTP ${blockedPdf.status}`,
    )

    await page.getByRole('button', { name: 'Review Now' }).click()
    const modal = page.getByRole('dialog')
    await modal.waitFor()
    check(
      'review-modal-on-records-page',
      await modal.getByText(quoteRef, { exact: true }).isVisible(),
    )
    check('approve-cta-visible', await modal.getByRole('button', { name: 'Approve' }).isVisible())
    check('reject-cta-visible', await modal.getByRole('button', { name: 'Reject' }).isVisible())
    check(
      'draft-preview-visible',
      await modal.getByRole('link', { name: 'Preview Draft PDF' }).isVisible(),
    )
    await page.waitForTimeout(350)
    await page.screenshot({ path: path.join(screenshotsDir, '03-approval-modal.png') })

    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/quote-approvals/${approval.id}/approve`) &&
        response.request().method() === 'PATCH',
    )
    await modal.getByRole('button', { name: 'Approve' }).click()
    const approveResponse = await approveResponsePromise
    check('approve-api', approveResponse.status() === 200, `HTTP ${approveResponse.status()}`)
    await modal.waitFor({ state: 'hidden' })
    await page.getByText(/quotation requires your approval/i).waitFor({ state: 'hidden' })
    check('pending-notice-clears', true)

    const approvedPdfResponse = await context.request.get(new URL(pdfUrl, baseUrl).toString())
    const approvedPdf = {
      status: approvedPdfResponse.status(),
      contentType: approvedPdfResponse.headers()['content-type'] || '',
      size: (await approvedPdfResponse.body()).byteLength,
    }
    check(
      'official-pdf-available-after-approval',
      approvedPdf.status === 200 &&
        approvedPdf.contentType.includes('application/pdf') &&
        approvedPdf.size > 1000,
      `HTTP ${approvedPdf.status}, ${approvedPdf.size} bytes`,
    )

    await page.goto(`${baseUrl}/workflows/quote-approval`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Quotation Traffic-Light Approval Setup', { exact: true }).waitFor()
    await page.getByText('HOD Approval', { exact: true }).waitFor({ timeout: 30_000 })
    await page.getByText('BD Final Approval', { exact: true }).waitFor({ timeout: 30_000 })
    check('workflow-setup-route', true)
    check('workflow-hod-step', await page.getByText('HOD Approval', { exact: true }).isVisible())
    check(
      'workflow-bd-step',
      await page.getByText('BD Final Approval', { exact: true }).isVisible(),
    )
    check('workflow-hod-default', await page.getByText(/Azlin/i).first().isVisible())
    check(
      'workflow-bd-default',
      await page
        .getByText(/Kamarul/i)
        .first()
        .isVisible(),
    )
    check(
      'workflow-editable-for-system-admin',
      await page.getByRole('button', { name: /save settings/i }).isEnabled(),
    )
    await page.screenshot({
      path: path.join(screenshotsDir, '04-workflow-setup.png'),
      fullPage: true,
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${baseUrl}/crm/records/training`, { waitUntil: 'domcontentloaded' })
    await page.locator('.records-mobile-item').first().waitFor({ timeout: 30_000 })
    const documentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check('mobile-records-no-horizontal-overflow', documentOverflow <= 8, `${documentOverflow}px`)
    await page.screenshot({
      path: path.join(screenshotsDir, '05-records-mobile.png'),
      fullPage: true,
    })

    check('no-page-errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
    check('no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
    check(
      'no-request-failures',
      requestFailures.length === 0,
      requestFailures.slice(0, 3).join(' | '),
    )
    check(
      'no-unexpected-http-errors',
      unexpectedResponses.length === 0,
      unexpectedResponses.slice(0, 5).join(' | '),
    )
  } finally {
    await browser.close()
  }

  const result = {
    at: new Date().toISOString(),
    baseUrl,
    quoteRef,
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
      { at: new Date().toISOString(), baseUrl, quoteRef, findings, crash: error.stack },
      null,
      2,
    ),
  )
  process.exitCode = 2
})
