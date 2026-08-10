import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const email = process.env.PROJECT_REACTIVATION_E2E_EMAIL
const password = process.env.PROJECT_REACTIVATION_E2E_PASSWORD
const allowMutation = process.env.PROJECT_REACTIVATION_E2E_ALLOW_MUTATION === '1'
const headless = process.env.PROJECT_REACTIVATION_E2E_HEADLESS !== '0'
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const validateEnvironment = () => {
  const parsedUrl = new URL(baseUrl)
  assert(loopbackHosts.has(parsedUrl.hostname), 'E2E target must be a loopback host.')
  assert(email, 'PROJECT_REACTIVATION_E2E_EMAIL is required.')
  assert(password, 'PROJECT_REACTIVATION_E2E_PASSWORD is required.')
  assert(
    allowMutation,
    'PROJECT_REACTIVATION_E2E_ALLOW_MUTATION=1 is required because this test mutates local data.',
  )
}

const run = async () => {
  validateEnvironment()

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
  const projectName = `E2E Project Reactivation ${stamp}`
  const reactivationReason = `Playwright lifecycle verification ${stamp}`
  const screenshotPath = path.join(projectRoot, 'test-results', `project-reactivation-${stamp}.png`)
  let projectId = null

  page.on('pageerror', (error) => pageErrors.push(error.message))

  const apiJson = async (apiPath, { method = 'GET', body } = {}) =>
    page.evaluate(
      async ({ requestedPath, requestedMethod, requestedBody }) => {
        const response = await window.fetch(`/proxy/${requestedPath}`, {
          method: requestedMethod,
          credentials: 'include',
          headers: requestedBody === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: requestedBody === undefined ? undefined : JSON.stringify(requestedBody),
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok || payload?.status === 'error') {
          throw new Error(payload?.message || `Request failed with status ${response.status}`)
        }

        return payload
      },
      { requestedPath: apiPath, requestedMethod: method, requestedBody: body },
    )

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#loginEmail').fill(email)
    await page.locator('#loginPassword').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ])

    const clientPayload = await apiJson('client-companies/options')
    const clients = Array.isArray(clientPayload?.data) ? clientPayload.data : clientPayload
    const clientId = Number(clients?.[0]?.company_id)
    assert(clientId > 0, 'No client is available for the temporary project fixture.')

    await apiJson('projects', {
      method: 'POST',
      body: {
        client_id: clientId,
        project_name: projectName,
        project_type: 'Special Service',
        quote_value: 1,
        award_date: new Date().toISOString().slice(0, 10),
        description: 'Temporary Playwright project reactivation fixture.',
      },
    })

    const projectList = await apiJson('projects')
    const createdProject = projectList.find((project) => project.project_name === projectName)
    projectId = Number(createdProject?.id)
    assert(projectId > 0, 'Temporary project was created but could not be found.')

    await apiJson(`projects/${projectId}/close`, {
      method: 'POST',
      body: {
        closeDate: new Date().toISOString().slice(0, 10),
        closeType: 'Terminated',
        reason: 'Prepare the temporary project for reactivation testing.',
      },
    })

    await page.goto(`${baseUrl}/project/manage/${projectId}`, { waitUntil: 'domcontentloaded' })
    const reactivateButton = page.getByRole('button', { name: 'Reactivate Project', exact: true })
    await reactivateButton.waitFor({ state: 'visible', timeout: 30_000 })
    await reactivateButton.click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('heading', { name: 'Reactivate Project' }).waitFor()
    await dialog.getByText(/from Terminated to Active/i).waitFor()

    const reasonInput = dialog.getByLabel('Reactivation Reason')
    await reasonInput.waitFor({ state: 'visible' })
    assert(
      await reasonInput.evaluate((element) => element === document.activeElement),
      'Reason input did not receive initial focus.',
    )

    await page.setViewportSize({ width: 390, height: 844 })
    const dialogBox = await dialog.boundingBox()
    assert(dialogBox, 'Reactivation dialog has no visible bounding box.')
    assert(dialogBox.x >= 0, 'Reactivation dialog overflows the left viewport edge.')
    assert(
      dialogBox.x + dialogBox.width <= 390,
      'Reactivation dialog overflows the right viewport edge.',
    )

    await reasonInput.fill(reactivationReason)
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true })
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await dialog.getByRole('button', { name: 'Reactivate Project', exact: true }).click()

    await page.getByText('Project reactivated.', { exact: true }).waitFor({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Complete Project', exact: true }).waitFor()
    await reactivateButton.waitFor({ state: 'detached' })

    const projectPayload = await apiJson(`projects/${projectId}`)
    const reactivatedProject = projectPayload?.data ?? projectPayload
    assert(reactivatedProject?.status === 'Active', 'Project did not return to Active status.')

    const progressPayload = await apiJson(`projects/${projectId}/progress`)
    const progressRows = Array.isArray(progressPayload?.data)
      ? progressPayload.data
      : progressPayload
    assert(
      progressRows.some(
        (row) =>
          row.progress_text?.includes('Project reactivated from Terminated by') &&
          row.progress_text?.includes(`Reason: ${reactivationReason}`),
      ),
      'Project progress does not contain the reactivation audit entry.',
    )
    assert(pageErrors.length === 0, `Browser page errors: ${pageErrors.join(' | ')}`)

    console.log(
      JSON.stringify({
        result: 'passed',
        projectId,
        verifiedTransition: 'Terminated -> Active',
        verifiedProgress: true,
        verifiedMobileDialog: true,
        screenshotPath,
      }),
    )
  } finally {
    if (projectId) {
      try {
        await apiJson(`projects/${projectId}`, { method: 'DELETE', body: { id: projectId } })
      } catch (error) {
        console.error(`Fixture cleanup failed for project ${projectId}: ${error.message}`)
      }
    }

    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
