import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '')
const outputDir = path.join(projectRoot, 'test-results', 'equipment-word-uat')

const quote = {
  id: 68,
  quote_ref_no: 'QEQ26-0068TST',
  revision_no: 0,
  created_at: '2026-08-13 10:00:00',
  updated_at: '2026-08-13 11:00:00',
  status: 'Open',
  created_by_id: 51,
  created_by_name: 'Test Staff',
  created_by_code: 'TST',
  client_id: 7,
  client_name: 'Test Client Sdn. Bhd.',
  client_address: 'Jalan Ujian',
  client_city: 'Kajang',
  client_state: 'Selangor',
  client_zip: '43000',
  pic_name: 'Client Contact',
  pic_email: 'client@example.test',
  pic_phone: '60123456789',
  quotation_remarks: 'Deliver before inspection.',
  estimated_total_cost: 800,
  discount: 0,
  delivery_charge: 100,
  misc_charge: 0,
  sub_total: 1100,
  sst_percent: 8,
  sst_amount: 88,
  grand_total: 1188,
  line_items: [
    {
      id: 1,
      item_id: 10,
      item_name: 'Portable Gas Detector',
      description: 'Detects oxygen and combustible gases.',
      item_remarks: 'Include calibration certificate.',
      quantity: 2,
      marked_up_price: 500,
      line_total: 1000,
    },
  ],
}

const user = {
  staff_id: 51,
  full_name: 'Test Staff',
  email: 'test@example.test',
  roles: ['Manager'],
}

const run = async (browserType, browserName) => {
  const browserOutputDir = path.join(outputDir, browserName)
  const screenshotsDir = path.join(browserOutputDir, 'screenshots')
  await fs.mkdir(screenshotsDir, { recursive: true })
  const browser = await browserType.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const evidence = {
    browser: browserName,
    verificationLevel: 'mocked browser UAT; API responses are intercepted',
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    wordRequests: [],
    apiRequests: [],
    checks: [],
  }
  let approvalBlocked = false
  let wordShouldFail = false

  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    evidence.requestFailures.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    )
  })

  await page.route('**/*', async (route) => {
    const request = route.request()
    if (!['fetch', 'xhr'].includes(request.resourceType())) {
      await route.continue()
      return
    }

    const url = new URL(request.url())
    evidence.apiRequests.push(`${request.method()} ${url.pathname}`)
    const json = (payload, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) })

    if (url.pathname.endsWith('/auth/session')) {
      await json({ status: 'success', user, csrf_token: 'uat-token' })
      return
    }
    if (url.pathname.endsWith('/quote-records/equipment/68/word')) {
      evidence.wordRequests.push({
        accept: request.headers().accept || '',
        method: request.method(),
      })
      if (wordShouldFail) {
        await json({ status: 'error', message: 'Word generation is temporarily unavailable.' }, 500)
      } else {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition':
              'attachment; filename="QEQ26-0068TST_Test_Client.docx"; filename*=UTF-8\'\'QEQ26-0068TST_Test_Client.docx',
            'Access-Control-Expose-Headers': 'Content-Disposition',
          },
          body: Buffer.from('PK\u0003\u0004mock-docx'),
        })
      }
      return
    }
    if (url.pathname.endsWith('/quote-records/equipment')) {
      await json({ status: 'success', data: [quote], followups: [], award_history: [] })
      return
    }
    if (url.pathname.endsWith('/quote-approvals')) {
      await json({
        status: 'success',
        data: approvalBlocked
          ? [
              {
                id: 90,
                service: 'equipment',
                quote_id: 68,
                status: 'pending',
                required_step: 'bd',
                can_issue: false,
              },
            ]
          : [],
      })
      return
    }

    await json({ status: 'success', data: [] })
  })

  const check = (name, passed, detail = '') => {
    evidence.checks.push({ name, passed, detail })
    if (!passed) throw new Error(`${name}${detail ? `: ${detail}` : ''}`)
  }

  try {
    await page.goto(`${baseUrl}/crm/records/equipment-supply`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByText('QEQ26-0068TST', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Actions' }).first().click()
    const listWordAction = page.getByText('Generate Word', { exact: true }).last()
    await listWordAction.waitFor()
    check('typed-list-word-action-is-visible', await listWordAction.isVisible())

    await page.goto(`${baseUrl}/crm/records/equipment-supply/68`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('heading', { name: 'Quotation Details' }).waitFor()
    await page.waitForTimeout(1_000)
    evidence.bodyAtLoad = await page.locator('body').innerText()
    const pdfButton = page.getByRole('button', { name: 'Generate PDF' })
    const wordButton = page.getByRole('button', { name: 'Generate Word' })
    await wordButton.waitFor()
    check('detail-actions-are-explicit', await pdfButton.isVisible(), 'Generate PDF is visible')
    check('equipment-word-is-visible', await wordButton.isVisible())
    check('equipment-word-is-enabled', await wordButton.isEnabled())
    await page.screenshot({
      path: path.join(screenshotsDir, 'equipment-word-desktop.png'),
      fullPage: true,
    })

    const downloadPromise = page.waitForEvent('download')
    await wordButton.click()
    const download = await downloadPromise
    const downloadPath = path.join(browserOutputDir, download.suggestedFilename())
    await download.saveAs(downloadPath)
    const bytes = await fs.readFile(downloadPath)
    check(
      'docx-filename-preserved',
      download.suggestedFilename() === 'QEQ26-0068TST_Test_Client.docx',
    )
    check('docx-download-triggered', bytes.subarray(0, 2).toString() === 'PK')
    check(
      'docx-accept-header',
      evidence.wordRequests[0]?.accept ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )

    approvalBlocked = true
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText(/BD approval is pending/i).waitFor()
    check(
      'approval-blocks-pdf',
      await page.getByRole('button', { name: 'Generate PDF' }).isDisabled(),
    )
    check(
      'approval-blocks-word',
      await page.getByRole('button', { name: 'Generate Word' }).isDisabled(),
    )

    approvalBlocked = false
    wordShouldFail = true
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Generate Word' }).click()
    const wordErrorDialog = page.getByRole('dialog').filter({
      hasText: 'Word generation is temporarily unavailable.',
    })
    await wordErrorDialog.waitFor()
    check(
      'word-error-is-actionable',
      (await wordErrorDialog.getByText(/Word generation is temporarily unavailable/).count()) === 1,
    )
    check(
      'word-error-is-not-duplicated-as-toast',
      (await page.locator('.toast').filter({
        hasText: 'Word generation is temporarily unavailable.',
      }).count()) === 0,
    )
    await wordErrorDialog.getByRole('button', { name: 'OK' }).click()

    wordShouldFail = false
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Generate Word' }).waitFor()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check('mobile-has-no-horizontal-overflow', overflow <= 1, `overflow=${overflow}px`)
    await page.screenshot({
      path: path.join(screenshotsDir, 'equipment-word-mobile.png'),
      fullPage: true,
    })

    await page.getByRole('button', { name: 'Generate Word' }).focus()
    const keyboardDownload = page.waitForEvent('download')
    await page.keyboard.press('Enter')
    await keyboardDownload
    check('word-action-is-keyboard-operable', true)

    const unexpectedConsoleErrors = evidence.consoleErrors.filter(
      (message) => !message.includes('500 (Internal Server Error)'),
    )
    check(
      'no-unexpected-console-errors',
      unexpectedConsoleErrors.length === 0,
      unexpectedConsoleErrors.join(' | '),
    )
    check('no-page-errors', evidence.pageErrors.length === 0, evidence.pageErrors.join(' | '))
    check(
      'no-unexpected-request-failures',
      evidence.requestFailures.length === 0,
      evidence.requestFailures.join(' | '),
    )
  } finally {
    await fs.writeFile(
      path.join(browserOutputDir, 'report.json'),
      JSON.stringify(evidence, null, 2),
    )
    await browser.close()
  }
}

const runAll = async () => {
  for (const [browserName, browserType] of [
    ['chromium', chromium],
    ['firefox', firefox],
    ['webkit', webkit],
  ]) {
    await run(browserType, browserName)
  }
}

runAll().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
