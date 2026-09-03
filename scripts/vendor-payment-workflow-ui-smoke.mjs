import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `vendor-payment-workflow-${stamp}`)
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const headless = process.env.SMOKE_HEADLESS !== '0'
const results = []

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const formatPerson = (person = {}) => {
  const name = person.fullName || person.full_name || ''
  const code = person.nameCode || person.name_code || ''
  if (name && code) return `${name} (${code})`
  return name || code || ''
}

const displayStageStatus = (payment, stage = {}) => {
  const stageType = stage.stageType || stage.stage_type
  if (stageType === 'finance' && stage.state === 'current' && payment.status === 'Approved') {
    return payment.voucher || payment.voucher_issued ? 'Awaiting payment' : 'Voucher required'
  }

  return stage.status || ''
}

const run = async () => {
  if (!email || !password) {
    throw new Error(
      'SMOKE_EMAIL and SMOKE_PASSWORD are required. The smoke test is read-only and never submits a workflow action.',
    )
  }

  await fs.mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1536, height: 960 } })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  const issues = []
  const apiResponses = []

  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return
    issues.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    )
  })
  page.on('response', (response) => {
    if (response.url().includes('/vendor-payments')) {
      apiResponses.push({ status: response.status(), url: response.url() })
    }
    if (response.status() >= 500) {
      issues.push(`server: ${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  const step = async (name, action) => {
    const startedAt = Date.now()
    const detail = await action()
    results.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail })
    console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`)
  }

  let selectedPayment

  try {
    await step('login through the real UI', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.fill('#loginEmail', email)
      await page.fill('#loginPassword', password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login')),
        page.click('button[type="submit"]'),
      ])
      return 'authenticated session established'
    })

    await step('select a real payment with workflow data', async () => {
      const paymentResponse = page.waitForResponse((response) => {
        const url = new URL(response.url())
        return (
          url.pathname.endsWith('/vendor-payments') && url.searchParams.get('per_page') === '100'
        )
      })
      await page.goto(`${baseUrl}/vendor/payment-records`, { waitUntil: 'domcontentloaded' })
      const response = await paymentResponse
      assert(response.ok(), `Vendor payment API returned ${response.status()}`)
      const payload = await response.json()
      const payments = Array.isArray(payload.history) ? payload.history : []
      selectedPayment =
        payments.find(
          (payment) =>
            ['Pending', 'Checked', 'Approved'].includes(payment.status) &&
            Array.isArray(payment.workflow_flow?.stages) &&
            payment.workflow_flow.stages.length > 0,
        ) ||
        payments.find(
          (payment) =>
            Array.isArray(payment.workflow_flow?.stages) && payment.workflow_flow.stages.length > 0,
        )

      assert(
        selectedPayment,
        'No vendor payment in the current table period has workflow data for smoke testing',
      )
      return `payment #${selectedPayment.id} (${selectedPayment.status})`
    })

    await step('show current stage and progress in the payment table', async () => {
      await page.waitForLoadState('networkidle').catch(() => {})
      if (!['Pending', 'Checked', 'Approved'].includes(selectedPayment.status)) {
        await page.getByRole('button', { name: /filters/i }).click()
        const statusFilter = page.locator('#vendorPaymentRecordsStatusFilter')
        await statusFilter.waitFor({ state: 'visible' })
        await statusFilter.selectOption('all')
      }

      const cell = page.locator(
        `.vendor-payment-workflow-cell[data-payment-id="${selectedPayment.id}"]`,
      )
      await cell.waitFor({ state: 'visible' })
      await cell.scrollIntoViewIfNeeded()
      const text = (await cell.innerText()).replace(/\s+/g, ' ').trim()
      const stages = selectedPayment.workflow_flow.stages
      const completedCount = stages.filter((stage) => stage.state === 'completed').length
      const focusStage =
        stages.find((stage) => stage.state === 'current') ||
        stages.find((stage) => ['returned', 'rejected'].includes(stage.state))

      if (focusStage) {
        assert(text.includes(focusStage.label), `Table cell does not identify ${focusStage.label}`)
        const expectedStatus = displayStageStatus(selectedPayment, focusStage)
        assert(text.includes(expectedStatus), `Table cell does not show ${expectedStatus}`)
      } else {
        assert(text.includes('Workflow complete'), 'Completed workflow summary is missing')
      }
      assert(
        text.includes(`${completedCount} of ${stages.length}`),
        'Table cell workflow progress is incorrect',
      )

      const expectedActions = [
        ['Review', selectedPayment.status === 'Pending' && selectedPayment.can_check],
        ['Approve', selectedPayment.status === 'Checked' && selectedPayment.can_approve],
        [
          'Return',
          ['Pending', 'Checked'].includes(selectedPayment.status) && selectedPayment.can_return,
        ],
        [
          'Reject',
          ['Pending', 'Checked'].includes(selectedPayment.status) && selectedPayment.can_reject,
        ],
        [
          selectedPayment.status === 'Partially Paid' ? 'Record Remaining' : 'Record Payment',
          ['Approved', 'Partially Paid'].includes(selectedPayment.status) &&
            (selectedPayment.permissions?.can_record_payment ?? selectedPayment.can_mark_paid),
        ],
      ]
      for (const [label, expected] of expectedActions) {
        const count = await cell.getByRole('button', { name: label, exact: true }).count()
        assert(
          Boolean(count) === Boolean(expected),
          `${label} action visibility does not match API permission`,
        )
      }

      return text
    })

    await step('open the structured workflow dialog without mutating data', async () => {
      const cell = page.locator(
        `.vendor-payment-workflow-cell[data-payment-id="${selectedPayment.id}"]`,
      )
      const trigger = cell.getByRole('button', { name: 'View flow' })
      await trigger.click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor({ state: 'visible' })
      await page.waitForTimeout(350)
      const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ').trim()

      for (const stage of selectedPayment.workflow_flow.stages) {
        assert(dialogText.includes(stage.label), `Dialog is missing ${stage.label}`)
        const expectedStatus = displayStageStatus(selectedPayment, stage)
        assert(dialogText.includes(expectedStatus), `Dialog is missing ${expectedStatus}`)
        const firstRecipient = formatPerson(stage.recipients?.[0])
        if (firstRecipient) {
          assert(dialogText.includes(firstRecipient), `Dialog is missing ${firstRecipient}`)
        }
      }

      await page.screenshot({ path: path.join(outputDir, 'desktop-workflow-dialog.png') })
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      assert(
        await trigger.evaluate((element) => document.activeElement === element),
        'Focus did not return to View flow after closing the dialog',
      )
      return `${selectedPayment.workflow_flow.stages.length} stages verified`
    })

    await step('keep the workflow dialog usable at intermediate and mobile widths', async () => {
      const trigger = page
        .locator(`.vendor-payment-workflow-cell[data-payment-id="${selectedPayment.id}"]`)
        .getByRole('button', { name: 'View flow' })
      await trigger.click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor({ state: 'visible' })

      for (const viewport of [
        { name: 'intermediate', width: 900, height: 800 },
        { name: 'mobile', width: 390, height: 844 },
      ]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.waitForTimeout(250)
        const metrics = await page
          .locator('.vendor-payment-workflow-dialog .modal-content')
          .evaluate((element) => ({
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          }))
        assert(
          metrics.scrollWidth <= metrics.clientWidth + 1,
          `${viewport.name} workflow dialog has horizontal overflow`,
        )
        await page.screenshot({
          path: path.join(outputDir, `${viewport.name}-workflow-dialog.png`),
        })
      }

      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      return '900px and 390px'
    })

    await step('reuse the complete workflow on the payment detail route', async () => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${baseUrl}/vendor/payment-records/${selectedPayment.id}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForLoadState('networkidle').catch(() => {})
      const timeline = page.getByRole('list', { name: 'Vendor payment workflow' })
      await timeline.waitFor({ state: 'visible' })
      const text = (await timeline.innerText()).replace(/\s+/g, ' ').trim()
      for (const stage of selectedPayment.workflow_flow.stages) {
        assert(text.includes(stage.label), `Detail route is missing ${stage.label}`)
      }
      return `${baseUrl}/vendor/payment-records/${selectedPayment.id}`
    })

    assert(
      apiResponses.every((response) => response.status < 400),
      'A vendor-payment UI API request failed',
    )
    assert(issues.length === 0, `Browser/runtime issues found: ${issues.join(' | ')}`)

    const report = {
      status: 'passed',
      baseUrl,
      paymentId: selectedPayment.id,
      mutationsPerformed: false,
      results,
      apiResponses,
      issues,
      outputDir,
    }
    await fs.writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    await page
      .screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true })
      .catch(() => {})
    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      `${JSON.stringify(
        {
          status: 'failed',
          baseUrl,
          paymentId: selectedPayment?.id || null,
          mutationsPerformed: false,
          results,
          apiResponses,
          issues,
          error: error.message,
          outputDir,
        },
        null,
        2,
      )}\n`,
    )
    throw error
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
