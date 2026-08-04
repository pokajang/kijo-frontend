import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `pipeline-service-category-${stamp}`)
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const apiBase = `${baseUrl}/proxy`
const email = process.env.PIPELINE_SERVICE_E2E_EMAIL
const password = process.env.PIPELINE_SERVICE_E2E_PASSWORD
const allowMutation = process.env.PIPELINE_SERVICE_E2E_ALLOW_MUTATION === '1'
const headless = process.env.PIPELINE_SERVICE_E2E_HEADLESS !== '0'
const runLabel = `Pipeline service E2E ${stamp}`
const prospectName = `${runLabel} prospect`
const customService = `${runLabel} environmental monitoring`
const estimatedRm = Number((100 + Math.random() * 50).toFixed(2))
const today = new Date().toLocaleDateString('en-CA')
const results = []

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const requireConfiguration = () => {
  const missing = []
  if (!email) missing.push('PIPELINE_SERVICE_E2E_EMAIL')
  if (!password) missing.push('PIPELINE_SERVICE_E2E_PASSWORD')
  if (!allowMutation) missing.push('PIPELINE_SERVICE_E2E_ALLOW_MUTATION=1')
  if (missing.length) {
    throw new Error(`Pipeline service E2E is mutative. Missing: ${missing.join(', ')}`)
  }
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

const poll = async (label, callback, { timeoutMs = 30_000, intervalMs = 400 } = {}) => {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const value = await callback()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ''}`)
}

const run = async () => {
  requireConfiguration()
  await fs.mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  page.setDefaultNavigationTimeout(40_000)
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true })

  const diagnostics = { consoleErrors: [], pageErrors: [], requestFailures: [] }
  const createdIds = new Set()
  let csrfToken = ''
  let failed = false

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

  const apiRequest = async ({ route, method = 'GET', body, expectedStatuses = [200] }) => {
    const response = await page.request.fetch(`${apiBase}/${String(route).replace(/^\/+/, '')}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      data: body === undefined ? undefined : JSON.stringify(body),
    })
    const contentType = response.headers()['content-type'] || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { text: await response.text() }

    if (typeof payload?.csrf_token === 'string') csrfToken = payload.csrf_token
    if (!expectedStatuses.includes(response.status())) {
      throw new Error(
        `${method} ${route} returned ${response.status()}: ${JSON.stringify(payload).slice(0, 600)}`,
      )
    }

    return payload
  }

  const statusRows = async () => {
    const payload = await apiRequest({
      route: 'stats/monitoring-pipeline-status',
      method: 'POST',
      body: { period: 'currentYear', start_date: `${today.slice(0, 4)}-01-01`, end_date: today },
    })
    return new Map((payload.rows || []).map((row) => [row.label, row]))
  }

  const findRecord = async () => {
    const payload = await apiRequest({
      route: 'stats/monitoring-manual-pipeline-entries',
      method: 'POST',
      body: { start_date: `${today.slice(0, 4)}-01-01`, end_date: today, q: prospectName },
    })
    return (payload.entries || []).find((entry) => entry.prospectName === prospectName) || null
  }

  try {
    await recordStep('login', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.locator('#loginEmail').fill(email)
      await page.locator('#loginPassword').fill(password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login')),
        page.getByRole('button', { name: /sign in|login/i }).click(),
      ])
      const session = await apiRequest({ route: 'auth/session' })
      assert(
        session.user?.staff_id || session.data?.user?.staff_id,
        'Authenticated staff session missing',
      )
      return page.url()
    })

    const baseline = await recordStep('capture dashboard baseline', statusRows)
    const baselineOther = baseline.get('OTHERS') || { totalQty: 0, totalRm: 0 }
    const baselineOsh = baseline.get('CONSULTANCY - OSH') || { totalQty: 0, totalRm: 0 }

    await recordStep('create Other entry through dashboard quick add', async () => {
      await page.goto(`${baseUrl}/dashboard/monitoring`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Add Manual Entry' }).click()
      const dialog = page.getByRole('dialog').filter({ hasText: 'Add Manual Pipeline Entry' })
      await dialog.getByLabel('Entry type').selectOption('closed')
      await dialog.getByLabel('Entry date').fill(today)
      await dialog.getByLabel('Service category').selectOption('other')
      await dialog.getByLabel('Company / prospect').fill(prospectName)
      await dialog.getByLabel('Estimated RM').fill(String(estimatedRm))
      await dialog.getByRole('button', { name: 'Add to Batch' }).click()
      await expectText(dialog, 'Specify the service category when Others is selected.')
      await dialog.getByLabel('Specify service category').fill(customService)
      await dialog.getByRole('button', { name: 'Add to Batch' }).click()
      await expectText(dialog, `Others — ${customService}`)
      await dialog.getByRole('button', { name: 'Save Entries' }).click()
      await dialog.waitFor({ state: 'hidden' })
      await page.screenshot({
        path: path.join(outputDir, 'dashboard-after-create.png'),
        fullPage: true,
      })
    })

    const record = await recordStep('verify API round trip', async () =>
      poll('created pipeline record', async () => {
        const nextRecord = await findRecord()
        if (!nextRecord) return null
        assert(nextRecord.serviceCategory === 'other', 'Created category is not other')
        assert(
          nextRecord.customServiceCategory === customService,
          'Custom service did not round trip',
        )
        createdIds.add(nextRecord.id)
        return nextRecord
      }),
    )

    await recordStep('verify Others dashboard delta and detail', async () => {
      await poll('Others dashboard delta', async () => {
        const rows = await statusRows()
        const other = rows.get('OTHERS')
        return (
          other &&
          Number(other.totalQty) === Number(baselineOther.totalQty) + 1 &&
          Math.abs(Number(other.totalRm) - Number(baselineOther.totalRm) - estimatedRm) < 0.01
        )
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expectText(page, 'Others')
      return `RM ${estimatedRm}`
    })

    await recordStep('verify records display and edit hydration', async () => {
      await page.goto(`${baseUrl}/pipeline/entries`, { waitUntil: 'domcontentloaded' })
      await expectText(page, prospectName)
      await expectText(page, `Others — ${customService}`)
      await page.goto(`${baseUrl}/pipeline/entries/${record.id}/edit`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByLabel('Service').waitFor()
      assert(
        (await page.getByLabel('Service').inputValue()) === 'other',
        'Edit category was not restored',
      )
      assert(
        (await page.getByLabel('Specify service category').inputValue()) === customService,
        'Edit custom service was not restored',
      )
    })

    await recordStep('change Other to Consultancy - OSH and reaggregate', async () => {
      await page.getByLabel('Service').selectOption('consultancy_osh')
      assert(
        (await page.getByLabel('Specify service category').count()) === 0,
        'Custom field remained visible',
      )
      await page.getByRole('button', { name: 'Save Changes' }).click()
      await page.waitForURL((url) => url.pathname === '/pipeline/entries')

      await poll('updated API and dashboard values', async () => {
        const updated = await findRecord()
        if (
          updated?.serviceCategory !== 'consultancy_osh' ||
          String(updated?.customServiceCategory || '') !== ''
        ) {
          return null
        }
        const rows = await statusRows()
        const other = rows.get('OTHERS')
        const osh = rows.get('CONSULTANCY - OSH')
        return (
          Number(other?.totalQty || 0) === Number(baselineOther.totalQty) &&
          Number(osh?.totalQty || 0) === Number(baselineOsh.totalQty) + 1 &&
          Math.abs(Number(osh?.totalRm || 0) - Number(baselineOsh.totalRm) - estimatedRm) < 0.01
        )
      })
      await expectText(page, 'Consultancy - OSH')
    })
  } catch (error) {
    failed = true
    await page
      .screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true })
      .catch(() => {})
    throw error
  } finally {
    if (createdIds.size === 0 && csrfToken) {
      const orphanedRecord = await findRecord().catch(() => null)
      if (orphanedRecord?.id) createdIds.add(orphanedRecord.id)
    }

    for (const id of createdIds) {
      await apiRequest({
        route: `stats/monitoring-manual-pipeline-entry/${id}`,
        method: 'DELETE',
        expectedStatuses: [200, 404],
      }).catch((error) => {
        diagnostics.requestFailures.push(`cleanup ${id}: ${error.message}`)
      })
    }

    await context.tracing.stop({ path: path.join(outputDir, 'trace.zip') }).catch(() => {})
    await fs.writeFile(
      path.join(outputDir, 'results.json'),
      JSON.stringify(
        { failed, prospectName, customService, estimatedRm, results, diagnostics },
        null,
        2,
      ),
    )
    await browser.close()
  }
}

const expectText = async (scope, text) => {
  const locator = scope.getByText(text, { exact: false }).first()
  await locator.waitFor({ state: 'visible' })
  return locator
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
