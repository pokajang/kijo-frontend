import { chromium } from 'playwright'

const baseUrl = process.env.FIRST_TOUCH_E2E_BASE_URL || 'http://127.0.0.1:3000'
const email = process.env.FIRST_TOUCH_E2E_EMAIL
const password = process.env.FIRST_TOUCH_E2E_PASSWORD
const clientId = Number(process.env.FIRST_TOUCH_E2E_CLIENT_ID)

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

if (!email || !password || !Number.isInteger(clientId) || clientId <= 0) {
  throw new Error(
    'FIRST_TOUCH_E2E_EMAIL, FIRST_TOUCH_E2E_PASSWORD and FIRST_TOUCH_E2E_CLIENT_ID are required.',
  )
}

const image = {
  name: 'first-touch-evidence.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
}

const selectReactOption = async (page, inputId, label) => {
  const input = page.locator(`#${inputId}`)
  await input.fill(label)
  await input.press('Enter')
}

const fillClaim = async (page, { date, source, contact, notes }) => {
  await page.locator('#first-touch-date').fill(date)
  await selectReactOption(page, 'first-touch-source', source)
  await page.locator('#first-touch-client-contact').fill(contact)
  await selectReactOption(page, 'first-touch-source-contact', 'Shared or automated Amiosh channel')
  await page.locator('#first-touch-notes').fill(notes)
  await page.locator('#first-touch-proof').setInputFiles(image)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(error.stack || error.message))

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#loginEmail').fill(email)
  await page.locator('#loginPassword').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 })

  await page.goto(`${baseUrl}/client/first-touch/${clientId}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByText('First touch has not been documented', { exact: true }).waitFor()

  await page.getByRole('button', { name: 'Submit evidence' }).click()
  await fillClaim(page, {
    date: '2025-02-15',
    source: 'LinkedIn Chat',
    contact: 'E2E Client Contact',
    notes: 'Lifecycle evidence created by the first-touch Playwright test.',
  })
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/client-first-touches/${clientId}/claims`) &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Record first touch' }).click()
  assert(
    (await createResponse).status() === 201,
    'Creating first-touch evidence did not return 201.',
  )
  await page.getByText(/First touch recorded as current/i).waitFor()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('LinkedIn · Direct message', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Edit evidence' }).click()
  await page.locator('#first-touch-notes').fill('Lifecycle evidence updated by Playwright.')
  await page
    .locator('#first-touch-edit-reason')
    .fill('Confirm edit persistence and revision history.')
  const updateResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/client-first-touches/${clientId}/claims/`) &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Save Changes' }).click()
  assert(
    (await updateResponse).status() === 200,
    'Editing first-touch evidence did not return 200.',
  )
  await page.getByText(/Current evidence updated/i).waitFor()

  await page.getByRole('tab', { name: 'Claims & history' }).click()
  await page.getByText('View 1 previous version', { exact: true }).waitFor()
  await page.getByRole('tab', { name: 'Sales by project & salesperson' }).click()

  await page.getByRole('button', { name: 'Submit evidence' }).click()
  await fillClaim(page, {
    date: '2025-02-14',
    source: 'Physical Meeting',
    contact: 'Earlier E2E Contact',
    notes: 'Earlier competing evidence created by the lifecycle test.',
  })
  const competingResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/client-first-touches/${clientId}/claims`) &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Submit evidence' }).last().click()
  assert(
    (await competingResponse).status() === 201,
    'Submitting competing evidence did not return 201.',
  )
  await page.getByText(/current claim is now contested/i).waitFor()
  await page.getByText('Current - contested', { exact: true }).waitFor()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Current - contested', { exact: true }).waitFor()
  await page.getByRole('tab', { name: 'Claims & history' }).click()
  await page.getByText(/open conflict/i).waitFor()
  assert(
    (await page.getByRole('button', { name: 'Edit evidence' }).count()) === 0,
    'Edit evidence should be unavailable while the claim is contested.',
  )

  await page.goto(`${baseUrl}/client/first-touch`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: 'Search client first touch' }).fill('ZZ E2E FIRST TOUCH')
  const listRow = page.locator('tr').filter({ hasText: 'ZZ E2E FIRST TOUCH' })
  await listRow.getByText('LinkedIn · Direct message', { exact: true }).waitFor()

  assert(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(' | ')}`)
  console.log(
    JSON.stringify({
      status: 'passed',
      clientId,
      lifecycle: [
        'create',
        'reload',
        'edit',
        'revision',
        'competing',
        'conflict persistence',
        'list autoload',
      ],
    }),
  )
} catch (error) {
  console.error(
    JSON.stringify({
      url: page.url(),
      title: await page.title().catch(() => ''),
      visibleText: (
        await page
          .locator('body')
          .innerText()
          .catch(() => '')
      ).slice(0, 2000),
      consoleErrors,
      pageErrors,
    }),
  )
  throw error
} finally {
  await browser.close()
}
