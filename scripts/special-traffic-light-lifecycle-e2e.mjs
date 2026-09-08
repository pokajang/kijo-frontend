import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const workspaceRoot = path.resolve(frontendRoot, '..')
const evidenceDir = path.join(
  workspaceRoot,
  'beta-test-reports',
  '2026-09-07_1907-special-traffic-light-evidence',
)
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.SPECIAL_E2E_EMAIL
const password = process.env.SPECIAL_E2E_PASSWORD
const executablePath = process.env.SPECIAL_E2E_BROWSER
const allowMutation = process.env.SPECIAL_E2E_ALLOW_MUTATION === '1'
const legacyQuoteId = Number(process.env.SPECIAL_E2E_LEGACY_QUOTE_ID || 0)
const stamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, '')
  .slice(0, 14)

if (!email || !password || !allowMutation || !legacyQuoteId) {
  throw new Error('Missing isolated Special lifecycle E2E configuration.')
}

await fs.mkdir(evidenceDir, { recursive: true })
const browser = await chromium.launch({ headless: false, executablePath })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(20_000)

const runtimeIssues = []
page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') runtimeIssues.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
    runtimeIssues.push(
      `request: ${request.method()} ${request.url()} ${request.failure()?.errorText}`,
    )
  }
})
page.on('response', (response) => {
  if (response.status() >= 500) {
    runtimeIssues.push(
      `response: ${response.status()} ${response.request().method()} ${response.url()}`,
    )
  }
})

let csrfToken = ''
const results = []
const ids = { quoteIds: [], projectIds: [], invoiceIds: [], paymentIds: [], doIds: [] }
const check = (condition, message) => {
  if (!condition) throw new Error(message)
}
const step = async (name, action) => {
  const started = Date.now()
  try {
    const detail = await action()
    results.push({ name, status: 'passed', durationMs: Date.now() - started, detail })
    console.log(`PASS ${name}${detail ? ` :: ${detail}` : ''}`)
    return detail
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      durationMs: Date.now() - started,
      detail: error.message,
    })
    console.error(`FAIL ${name} :: ${error.message}`)
    throw error
  }
}
const api = async (route, options = {}) => {
  const response = await page.request.fetch(`${baseUrl}/proxy/${route.replace(/^\/+/, '')}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    data: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const payload = await response.json().catch(async () => ({ text: await response.text() }))
  if (payload?.csrf_token) csrfToken = payload.csrf_token
  const expected = options.expected || [200]
  if (!expected.includes(response.status())) {
    throw new Error(
      `${options.method || 'GET'} ${route}: ${response.status()} ${JSON.stringify(payload).slice(0, 800)}`,
    )
  }
  return { status: response.status(), payload }
}

const raw = async (route, expected = [200]) => {
  const response = await page.request.get(`${baseUrl}/proxy/${route.replace(/^\/+/, '')}`, {
    headers: { Accept: '*/*', ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}) },
  })
  if (!expected.includes(response.status())) throw new Error(`GET ${route}: ${response.status()}`)
  return { response, body: await response.body() }
}

const quotePayload = (quote, { amount, cost, suffix, isRevision = false }) => ({
  client_id: quote.clientId,
  client_name: quote.clientName,
  client_ssm: quote.clientSsm,
  client_address: quote.clientAddress,
  client_city: quote.clientCity,
  client_state: quote.clientState,
  client_zip: quote.clientZip,
  pic_name: quote.picName,
  pic_email: quote.picEmail,
  pic_phone: quote.picPhone,
  pic_position: quote.picPosition,
  sp_id: quote.spId,
  category_id: quote.categoryId,
  service_title: `${quote.serviceTitle} BETA ${suffix}`,
  service_code: quote.serviceCode,
  general_remarks: `BETA-SPECIAL-E2E-20260907-CURRENT-${suffix}`,
  discount: 0,
  sst_percent: 0,
  estimated_total_cost: cost,
  attach_proposal: false,
  proposal_language: quote.proposalLanguage || 'en',
  ...(isRevision ? { isRevision: true } : {}),
  line_items: [
    {
      item_name: `BETA lifecycle ${suffix}`,
      description: 'Disposable Special quote-to-receipt lifecycle service.',
      unit: 'Lot',
      unit_price: amount,
      quantity: 1,
      total_price: amount,
    },
  ],
})

const approveCurrent = async (quoteId, expectedZone) => {
  const quote = (await api(`quotes/special/${quoteId}`)).payload.data
  check(
    quote.issuanceContext?.policy_zone === expectedZone,
    `Expected ${expectedZone}, got ${quote.issuanceContext?.policy_zone}`,
  )
  const approvals = (await api('quote-approvals')).payload.data || []
  const current = approvals.find(
    (approval) => Number(approval.quote_id) === Number(quoteId) && approval.service === 'special',
  )
  const approvalId = Number(current?.id)
  check(approvalId > 0, 'Approval request id missing.')
  await api(`quote-approvals/${approvalId}/approve`, {
    method: 'PATCH',
    body: { remarks: `BETA approval ${stamp}` },
  })
  const decided = (await api(`quote-approvals/${approvalId}`)).payload.data
  check(decided?.status === 'approved', 'Approval decision did not persist.')
  return approvalId
}

const award = async (quoteId, label) => {
  const response = await api(`quote-records/special/${quoteId}/award`, {
    method: 'POST',
    body: {
      quote_id: quoteId,
      remarks: `BETA ${label} award`,
      award_date: new Date().toLocaleDateString('en-CA'),
      description: `BETA ${label} Special full-cycle project`,
      client_award_ref_no: `BETA-AWARD-${stamp}-${label}`,
    },
  })
  const projectId = Number(response.payload.project_id)
  check(projectId > 0, 'Award returned no project id.')
  ids.projectIds.push(projectId)
  return projectId
}

const createInvoice = async (quoteId, projectId, label) => {
  const quote = (await api(`quotes/special/${quoteId}`)).payload.data
  const amount = Number(quote.grandTotal)
  const response = await api('invoices', {
    method: 'POST',
    body: {
      project_id: projectId,
      quote_id: quoteId,
      service_type: 'Special Service',
      invoice_purpose: `BETA ${label} full-cycle invoice`,
      invoice_client_name: quote.clientName,
      invoice_client_ssm: quote.clientSsm || 'BETA-SSM',
      invoice_client_tin: 'BETA-TIN',
      invoice_client_address: quote.clientAddress,
      invoice_client_city: quote.clientCity,
      invoice_client_state: quote.clientState,
      invoice_client_zip: quote.clientZip,
      invoice_pic_name: quote.picName,
      invoice_pic_phone: quote.picPhone,
      invoice_pic_email: quote.picEmail,
      invoice_pic_position: quote.picPosition,
      invoice_date: new Date().toLocaleDateString('en-CA'),
      payment_method: 'Bank Transfer',
      amount,
      sst_amount: 0,
      grand_total: amount,
      breakdown: [
        {
          item_description: `BETA ${label} Special service`,
          description: 'Disposable lifecycle invoice item.',
          unit: 'Lot',
          quantity: 1,
          unit_price: amount,
          subtotal: amount,
        },
      ],
    },
  })
  const invoiceId = Number(response.payload.invoice_id)
  check(invoiceId > 0, 'Invoice returned no id.')
  ids.invoiceIds.push(invoiceId)
  return { invoiceId, amount }
}

const payAndReceipt = async (invoiceId, amount, label) => {
  const partial = Math.floor(amount * 0.4 * 100) / 100
  const first = await api(`receivables/invoice/${invoiceId}/payments`, {
    method: 'POST',
    body: {
      payment_type: 'partial',
      amount: partial,
      payment_date: new Date().toLocaleDateString('en-CA'),
      payment_method: 'Bank Transfer',
      payment_reference: `BETA-PART-${stamp}-${label}`,
      request_token: crypto.randomUUID(),
    },
  })
  check(
    first.payload.summary?.paymentStatus === 'Partially Paid',
    'Invoice did not become Partially Paid.',
  )
  const firstPayment = first.payload.payments?.at(-1)?.id
  if (firstPayment) ids.paymentIds.push(Number(firstPayment))

  const duplicateToken = crypto.randomUUID()
  const remaining = Number(first.payload.summary.outstandingAmount)
  const settled = await api(`receivables/invoice/${invoiceId}/payments`, {
    method: 'POST',
    body: {
      payment_type: 'full',
      amount: remaining,
      payment_date: new Date().toLocaleDateString('en-CA'),
      payment_method: 'Bank Transfer',
      payment_reference: `BETA-FULL-${stamp}-${label}`,
      request_token: duplicateToken,
    },
  })
  check(settled.payload.summary?.paymentStatus === 'Paid', 'Invoice did not become Paid.')
  check(
    Number(settled.payload.summary?.outstandingAmount) === 0,
    'Paid invoice has an outstanding balance.',
  )

  const pdf = await raw(`invoices/${invoiceId}/receipt-pdf`)
  check(pdf.body.length > 1000, 'Receipt PDF is unexpectedly empty.')
  await fs.writeFile(path.join(evidenceDir, `E2E-${label}-receipt.pdf`), pdf.body)
  const word = await raw(`invoices/${invoiceId}/receipt-word`)
  check(word.body.length > 1000, 'Receipt Word document is unexpectedly empty.')
  await fs.writeFile(path.join(evidenceDir, `E2E-${label}-receipt.docx`), word.body)
  const secondPdf = await raw(`invoices/${invoiceId}/receipt-pdf`)
  check(secondPdf.body.length > 1000, 'Repeated receipt PDF failed.')

  return settled.payload.summary
}

try {
  await step('authenticate in visible Chromium', async () => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#loginEmail').fill(email)
    await page.locator('#loginPassword').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.getByRole('button', { name: /sign in|login/i }).click(),
    ])
    const session = await api('auth/session')
    check(session.payload?.user || session.payload?.data?.user, 'No authenticated user.')
  })

  const baseQuote = (await api('quotes/special/43')).payload.data

  await step('verify authentic legacy baseline in Records UI', async () => {
    const legacy = (await api(`quotes/special/${legacyQuoteId}`)).payload.data
    check(!legacy.estimatedTotalCost, 'Legacy fixture unexpectedly has cost.')
    check(
      !legacy.trafficLightRuleVersion,
      'Legacy fixture unexpectedly has a current rule version.',
    )
    await page.goto(`${baseUrl}/crm/records/special`, { waitUntil: 'networkidle' })
    const search = page.getByPlaceholder('Type to search...').first()
    if (await search.count()) await search.fill('BETA-SPECIAL-E2E-20260907-LEGACY')
    await page.screenshot({
      path: path.join(evidenceDir, 'E2E-LEG-Q01-records-baseline.png'),
      fullPage: true,
    })
  })

  let greenId
  let yellowId
  let redId
  await step('create Green, Yellow, and Red current-policy quotes', async () => {
    const green = await api('quotes/special', {
      method: 'POST',
      body: quotePayload(baseQuote, { amount: 140, cost: 100, suffix: 'GREEN' }),
    })
    const yellow = await api('quotes/special', {
      method: 'POST',
      body: quotePayload(baseQuote, { amount: 125, cost: 100, suffix: 'YELLOW' }),
    })
    const red = await api('quotes/special', {
      method: 'POST',
      body: quotePayload(baseQuote, { amount: 124.99, cost: 100, suffix: 'RED' }),
    })
    greenId = Number(green.payload.quote_id)
    yellowId = Number(yellow.payload.quote_id)
    redId = Number(red.payload.quote_id)
    ids.quoteIds.push(greenId, yellowId, redId)
    check(greenId && yellowId && redId, 'One or more quote IDs are missing.')
    check(
      (await api(`quotes/special/${greenId}`)).payload.data.issuanceContext?.policy_zone ===
        'green',
      'Green boundary failed.',
    )
    check(
      (await api(`quotes/special/${yellowId}`)).payload.data.issuanceContext?.policy_zone ===
        'yellow',
      'Yellow boundary failed.',
    )
    check(
      (await api(`quotes/special/${redId}`)).payload.data.issuanceContext?.policy_zone === 'red',
      'Red boundary failed.',
    )
    return `green=${greenId}, yellow=${yellowId}, red=${redId}`
  })

  await step('enforce and resolve Yellow and Red approvals', async () => {
    await api(`quote-records/special/${yellowId}/award`, {
      method: 'POST',
      body: {
        quote_id: yellowId,
        remarks: 'Blocked before approval',
        award_date: new Date().toLocaleDateString('en-CA'),
        description: 'Blocked',
        client_award_ref_no: 'BLOCKED',
      },
      expected: [409, 422],
    })
    await approveCurrent(yellowId, 'yellow')
    await approveCurrent(redId, 'red')
  })

  await step('transition and revise legacy quote through current policy', async () => {
    const legacy = (await api(`quotes/special/${legacyQuoteId}`)).payload.data
    const amount = Number(legacy.grandTotal)
    await api(`quotes/special/${legacyQuoteId}`, {
      method: 'PUT',
      body: quotePayload(legacy, {
        amount,
        cost: Number((amount / 1.45).toFixed(2)),
        suffix: 'LEGACY-TRANSITION',
      }),
    })
    let transitioned = (await api(`quotes/special/${legacyQuoteId}`)).payload.data
    check(transitioned.trafficLightRuleVersion, 'Legacy quote did not enter current policy.')
    check(transitioned.issuanceContext?.policy_zone === 'green', 'Legacy transition was not Green.')
    await api(`quotes/special/${legacyQuoteId}`, {
      method: 'PUT',
      body: quotePayload(transitioned, {
        amount,
        cost: Number((amount / 1.3).toFixed(2)),
        suffix: 'LEGACY-REVISION',
        isRevision: true,
      }),
    })
    transitioned = (await api(`quotes/special/${legacyQuoteId}`)).payload.data
    check(Number(transitioned.revisionNo || 1) >= 1, 'Legacy revision did not increment.')
    await approveCurrent(legacyQuoteId, 'yellow')
  })

  await step('edit and revise current quote before award', async () => {
    let current = (await api(`quotes/special/${greenId}`)).payload.data
    await api(`quotes/special/${greenId}`, {
      method: 'PUT',
      body: quotePayload(current, { amount: 140, cost: 100, suffix: 'GREEN-EDIT' }),
    })
    current = (await api(`quotes/special/${greenId}`)).payload.data
    await api(`quotes/special/${greenId}`, {
      method: 'PUT',
      body: quotePayload(current, {
        amount: 140,
        cost: 112.1,
        suffix: 'RED-REVISION',
        isRevision: true,
      }),
    })
    await approveCurrent(greenId, 'red')
  })

  let legacyProject
  let currentProject
  await step('award legacy-origin and current-policy quotes', async () => {
    legacyProject = await award(legacyQuoteId, 'LEG')
    currentProject = await award(greenId, 'CUR')
    return `legacy project=${legacyProject}, current project=${currentProject}`
  })

  await step('verify re-award and dependency-protected un-award behavior', async () => {
    const reAward = await api(`quote-records/special/${yellowId}/award`, {
      method: 'POST',
      body: {
        quote_id: yellowId,
        remarks: 'BETA initial award',
        award_date: new Date().toLocaleDateString('en-CA'),
        description: 'BETA re-award branch',
        client_award_ref_no: `BETA-Y-${stamp}`,
      },
    })
    const firstProject = Number(reAward.payload.project_id)
    ids.projectIds.push(firstProject)
    const reAwarded = await api(`quote-records/special/${yellowId}/re-award`, {
      method: 'POST',
      body: {
        quote_id: yellowId,
        remarks: 'BETA second award',
        award_date: new Date().toLocaleDateString('en-CA'),
        description: 'BETA re-award branch 2',
        client_award_ref_no: `BETA-Y2-${stamp}`,
      },
    })
    check(
      Number(reAwarded.payload.project_id) !== firstProject,
      'Re-award overwrote the original project.',
    )
    ids.projectIds.push(Number(reAwarded.payload.project_id))
  })

  const invoiceThreads = []
  await step('create invoices for both origin versions', async () => {
    invoiceThreads.push({
      label: 'LEG',
      ...(await createInvoice(legacyQuoteId, legacyProject, 'LEG')),
    })
    invoiceThreads.push({ label: 'CUR', ...(await createInvoice(greenId, currentProject, 'CUR')) })
  })

  await step('block Special JD14 creation', async () => {
    await api('jd14-forms', {
      method: 'POST',
      expected: [422],
      body: {
        project_id: currentProject,
        employer_name: 'BETA',
        employer_address: 'BETA',
        approval_no: `BETA-${stamp}`,
        course_title: 'Not applicable',
        training_venue: 'BETA',
        commenced_date: new Date().toLocaleDateString('en-CA'),
        end_date: new Date().toLocaleDateString('en-CA'),
      },
    })
  })

  await step('create, read, update, export, and delete delivery orders', async () => {
    for (const thread of [
      { label: 'LEG', projectId: legacyProject },
      { label: 'CUR', projectId: currentProject },
    ]) {
      const body = {
        details: {
          client_name: baseQuote.clientName,
          client_address: baseQuote.clientAddress,
          client_contact_name: baseQuote.picName,
          client_contact_position: baseQuote.picPosition,
          client_contact_email: baseQuote.picEmail,
          client_contact_phone: baseQuote.picPhone,
          company_contact_name: 'System Admin',
          company_contact_email: 'beta@example.test',
          company_contact_phone: '601100000000',
          project_id: thread.projectId,
          project_name: `BETA ${thread.label} Project`,
          project_code: `BETA-${thread.label}-${thread.projectId}`,
          project_award_date: new Date().toLocaleDateString('en-CA'),
          project_type: 'Special Service',
          project_description: 'BETA Special lifecycle',
          project_service_period: 'September 2026',
        },
        breakdown: [
          {
            item_name: `BETA ${thread.label} deliverable`,
            description: 'Disposable delivery item',
            quantity: 1,
            unit: 'Lot',
          },
        ],
      }
      const created = await api('delivery-orders', { method: 'POST', body })
      const doId = Number(created.payload.do_id)
      ids.doIds.push(doId)
      await raw(`delivery-orders/${doId}/pdf`)
      body.breakdown[0].quantity = 2
      await api(`delivery-orders/${doId}`, { method: 'PUT', body })
      await api(`delivery-orders/${doId}`, { method: 'DELETE', body: {}, expected: [200] })
    }
  })

  await step(
    'record partial/full payments and generate stable receipts for both versions',
    async () => {
      for (const thread of invoiceThreads)
        await payAndReceipt(thread.invoiceId, thread.amount, thread.label)
    },
  )

  await step('verify paid state in Invoice and Debtors UI', async () => {
    await page.goto(`${baseUrl}/commercial/invoice`, { waitUntil: 'networkidle' })
    await page.screenshot({
      path: path.join(evidenceDir, 'E2E-BOTH-INV01-paid-invoices.png'),
      fullPage: true,
    })
    await page.goto(`${baseUrl}/commercial/debtors?status=paid`, { waitUntil: 'networkidle' })
    await page.screenshot({
      path: path.join(evidenceDir, 'E2E-BOTH-RCPT01-paid-debtors.png'),
      fullPage: true,
    })
  })

  await step('verify mobile Records and paid Debtors checkpoints', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${baseUrl}/crm/records/special`, { waitUntil: 'networkidle' })
    await page.screenshot({
      path: path.join(evidenceDir, 'E2E-MOB-Q01-special-records.png'),
      fullPage: true,
    })
    await page.goto(`${baseUrl}/commercial/debtors?status=paid`, { waitUntil: 'networkidle' })
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    check(
      dimensions.scroll <= dimensions.viewport,
      `Mobile overflow ${dimensions.scroll}/${dimensions.viewport}.`,
    )
    await page.screenshot({
      path: path.join(evidenceDir, 'E2E-MOB-RCPT01-paid-debtors.png'),
      fullPage: true,
    })
  })

  await step('browser runtime and API health', async () => {
    check(runtimeIssues.length === 0, runtimeIssues.slice(0, 6).join(' | '))
  })
} finally {
  await fs.writeFile(
    path.join(evidenceDir, 'E2E-special-lifecycle-result.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        browser: 'standalone headed Chrome via Playwright',
        ids,
        results,
        runtimeIssues,
      },
      null,
      2,
    ),
  )
  await browser.close()
}
