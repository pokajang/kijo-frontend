import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `equipment-commercial-${stamp}`)
const pdfDir = path.join(outputDir, 'pdfs')
const screenshotDir = path.join(outputDir, 'screenshots')
const baseUrl = validateSmokeTarget(process.env.FRONTEND_URL || 'http://127.0.0.1:3000')
const apiBase = `${baseUrl}/proxy`
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
const today = new Date().toISOString().slice(0, 10)

const quotationRemarks = `GENERAL_START ${'Client coordinated finish and delivery requirement. '.repeat(32)} GENERAL_END`
const itemRemarks = `ITEM_START ${'Size XXL, matte navy-blue finish, individually labelled carton. '.repeat(27)} ITEM_END`
const longDescription = [
  'DESCRIPTION_START Personal air sampling equipment',
  'Includes:',
  '• air sampling pump',
  '• standard charging dock with power adapter',
  '3) filter cassette holder',
  `${'Registered catalogue equipment description with calibration, enclosure, operating and handling detail. '.repeat(32)} DESCRIPTION_END`,
].join('\r\n')
const results = []
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const filenameFromDisposition = (contentDisposition = '') => {
  const extended = String(contentDisposition).match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ''))
    } catch {
      return extended[1].trim().replace(/^"|"$/g, '')
    }
  }

  const standard = String(contentDisposition).match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)
  return String(standard?.[1] || standard?.[2] || '').trim()
}

const run = async () => {
  if (!email || !password) {
    throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required.')
  }

  await fs.mkdir(pdfDir, { recursive: true })
  await fs.mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch({
    headless: process.env.SMOKE_HEADLESS !== '0',
    args: ['--disable-pdf-extension'],
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(90_000)
  page.setDefaultNavigationTimeout(120_000)

  const runtimeIssues = []
  let csrfToken = ''
  let catalogItemId = null
  let quoteId = null
  let projectId = null
  let invoiceId = null
  let invoiceRef = ''
  let invoicePaid = false
  let deliveryOrderId = null
  let supplierPoId = null
  let vendorAssignmentId = null
  let selectedVendorId = null

  page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeIssues.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || 'unknown'
    if (!reason.includes('ERR_ABORTED')) {
      runtimeIssues.push(`request: ${request.method()} ${request.url()} ${reason}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 500 && response.url().includes('/proxy/')) {
      runtimeIssues.push(
        `api: ${response.status()} ${response.request().method()} ${response.url()}`,
      )
    }
  })

  const step = async (name, action) => {
    const startedAt = Date.now()
    try {
      const detail = await action()
      results.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail })
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

  const apiRequest = async ({ route, method = 'GET', body, expected = [200] }) => {
    const response = await page.request.fetch(`${apiBase}/${String(route).replace(/^\/+/, '')}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      data: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let payload = {}
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { text }
    }
    if (typeof payload?.csrf_token === 'string') csrfToken = payload.csrf_token
    if (!expected.includes(response.status())) {
      throw new Error(`${method} ${route} returned ${response.status()}: ${text.slice(0, 500)}`)
    }
    return payload
  }

  const downloadPdf = async (name, route) => {
    const pdfUrl = `${apiBase}/${route.replace(/^\/+/, '')}`
    const response = await page.request.get(pdfUrl, {
      headers: csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {},
    })
    const contentType = response.headers()['content-type'] || ''
    const contentDisposition = response.headers()['content-disposition'] || ''
    const expectedFilename = filenameFromDisposition(contentDisposition)
    assert(response.status() === 200, `${name} PDF returned HTTP ${response.status()}.`)
    assert(
      contentType.includes('application/pdf'),
      `${name} returned ${contentType || 'no content type'}.`,
    )
    assert(expectedFilename, `${name} PDF omitted its Content-Disposition filename.`)

    const downloadPage = await context.newPage()
    const downloadPromise = downloadPage.waitForEvent('download')
    await downloadPage.goto(pdfUrl, { waitUntil: 'commit' }).catch((error) => {
      if (!String(error?.message || '').includes('Download is starting')) throw error
    })
    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()
    assert(
      suggestedFilename === expectedFilename,
      `${name} browser filename was "${suggestedFilename}"; expected "${expectedFilename}".`,
    )
    assert(/\.pdf$/i.test(suggestedFilename), `${name} browser filename is not a PDF.`)

    const savedPath = path.join(pdfDir, suggestedFilename)
    await download.saveAs(savedPath)
    await downloadPage.close().catch(() => {})
    const body = await fs.readFile(savedPath)
    assert(body.byteLength > 1000, `${name} PDF is unexpectedly small.`)
    assert(body.subarray(0, 1024).includes(Buffer.from('%PDF-')), `${name} file is not a PDF.`)
    return `${suggestedFilename} (${body.byteLength} bytes)`
  }

  const selectFirstOption = async (placeholder) => {
    const select = page.locator('.react-select-container').filter({ hasText: placeholder })
    await select.getByRole('combobox').click()
    const option = page.locator('.react-select__option').first()
    await option.waitFor()
    const label = (await option.textContent())?.trim() || 'first option'
    await option.click()
    return label
  }

  const selectOptionContaining = async (placeholder, expectedText) => {
    const select = page.locator('.react-select-container').filter({ hasText: placeholder })
    await select.getByRole('combobox').click()
    const option = page.locator('.react-select__option').filter({ hasText: expectedText }).first()
    await option.waitFor()
    const label = (await option.textContent())?.trim() || expectedText
    await option.click()
    return label
  }

  const assertDetailPage = async (route, heading, markers, screenshotName) => {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
    await page.getByText(heading, { exact: true }).first().waitFor()
    await page.waitForFunction(
      (expectedMarkers) =>
        expectedMarkers.every((marker) => document.body.innerText.includes(marker)),
      markers,
    )
    const text = await page.locator('body').innerText()
    for (const marker of markers) assert(text.includes(marker), `${route} omitted ${marker}.`)
    await page.screenshot({ path: path.join(screenshotDir, screenshotName), fullPage: true })
  }

  const cleanup = async (name, action) => {
    try {
      await action()
      results.push({ name, status: 'passed' })
      console.log(`PASS  ${name}`)
    } catch (error) {
      results.push({ name, status: 'failed', detail: error.message })
      console.error(`FAIL  ${name} :: ${error.message}`)
    }
  }

  try {
    await step('authenticate through real UI', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.locator('#loginEmail').fill(email)
      await page.locator('#loginPassword').fill(password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login')),
        page.locator('button[type="submit"]').click(),
      ])
      const session = await apiRequest({ route: 'auth/session' })
      assert(session.user || session.data?.user, 'Authenticated session returned no user.')
      return redactEmail(email)
    })

    const catalogItemName = `SMOKE Equipment ${stamp}`
    await step('create catalogue fixture with pasted bullets and line endings', async () => {
      const catalogItem = await apiRequest({
        route: 'catalog/items',
        method: 'POST',
        body: {
          item_name: catalogItemName,
          category_id: 'Monitoring Device / Equipment',
          description: longDescription,
          unit: 'unit',
          supplier_name: 'Smoke Equipment Supplier',
          supplier_price: 1,
          price_date: today,
          entry_remarks: 'Disposable equipment commercial lifecycle fixture.',
        },
      })
      catalogItemId = Number(catalogItem.id || 0)
      assert(catalogItemId > 0, 'Catalogue fixture response omitted ID.')
      return `catalog_item=${catalogItemId}`
    })

    let quote
    await step('create equipment quotation with long general and item remarks in UI', async () => {
      await page.goto(`${baseUrl}/crm/quotes?service=equipment`, { waitUntil: 'domcontentloaded' })
      await page.getByText('Client / Company', { exact: true }).waitFor()
      await selectFirstOption('Search client')
      await page.locator('#serviceType').selectOption('equipment')
      await selectFirstOption('Select Source...')
      await page.getByText('Equipment Supply List', { exact: true }).waitFor()
      await selectOptionContaining('Select equipment...', catalogItemName)
      await page.locator('#equipmentQuotationRemarks').fill(quotationRemarks)
      await page.getByLabel('Estimated Cost (RM)').fill('1')
      await page.getByText('Pricing Details', { exact: true }).waitFor()
      await page.locator('textarea[id^="equipmentItemRemarks-"]').first().fill(itemRemarks)

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/proxy/quotes/equipment') &&
          response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: /^Save/ }).click()
      const response = await responsePromise
      const payload = await response.json()
      quoteId = Number(payload.quote_id || payload.data?.quote_id || 0)
      assert(
        response.status() === 200 && quoteId > 0,
        `Quote create returned HTTP ${response.status()}.`,
      )
      const quotePayload = await apiRequest({ route: `quotes/equipment/${quoteId}` })
      quote = quotePayload.data || quotePayload
      assert(
        quote.quotation_remarks === quotationRemarks,
        'Quote-level remarks were not persisted.',
      )
      assert(quote.items?.[0]?.item_remarks === itemRemarks, 'Item remarks were not persisted.')
      return `quote=${quoteId}`
    })

    let project
    await step('award quotation and verify project snapshot', async () => {
      const award = await apiRequest({
        route: `quote-records/equipment/${quoteId}/award`,
        method: 'POST',
        body: {
          quote_id: quoteId,
          remarks: 'Disposable equipment commercial lifecycle smoke.',
          award_date: today,
          description: 'Equipment commercial lifecycle smoke project.',
          client_award_ref_no: `SMOKE-EQUIP-${stamp}`,
        },
      })
      projectId = Number(award.project_id || 0)
      assert(projectId > 0, 'Award response returned no project ID.')
      const projectPayload = await apiRequest({ route: `projects/${projectId}` })
      project = projectPayload.data || projectPayload
      assert(project.quotation_remarks === quotationRemarks, 'Project omitted quote remarks.')
      assert(
        project.equipment_items?.[0]?.item_remarks === itemRemarks,
        'Project omitted item remarks.',
      )
      return `project=${projectId}`
    })

    await step('hydrate direct Supplier PO route from project ID', async () => {
      await page.goto(`${baseUrl}/commercial/supplier-po/create/${projectId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Create Supplier PO', { exact: true }).waitFor()
      const placeholder = 'General specifications carried from the equipment quotation'
      const remarks = page.getByPlaceholder(placeholder)
      await remarks.waitFor()
      await page.waitForFunction(
        (fieldPlaceholder) =>
          document
            .querySelector(`textarea[placeholder="${fieldPlaceholder}"]`)
            ?.value.includes('GENERAL_END'),
        placeholder,
      )
      assert(
        (await remarks.inputValue()) === quotationRemarks,
        'Direct Supplier PO route lost quote remarks.',
      )
      // Let the route's independent supplier/catalog requests settle before
      // navigating away so the browser does not report our own cancellation.
      await page.waitForLoadState('networkidle')
      return 'loaded full equipment snapshot from route-only project ID'
    })

    await step('hydrate direct Vendor LOA route from project ID', async () => {
      await page.goto(`${baseUrl}/commercial/vendor-loa/create/${projectId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByText('Create Vendor LOA', { exact: true }).first().waitFor()
      const remarks = page.locator('#vendorLoaRemarks')
      const services = page.locator('#vendorLoaServicesDescription')
      await remarks.waitFor()
      await page.waitForFunction(() =>
        document.querySelector('#vendorLoaRemarks')?.value.includes('GENERAL_END'),
      )
      assert(
        (await remarks.inputValue()) === quotationRemarks,
        'Direct Vendor LOA route lost quote remarks.',
      )
      assert(
        (await services.inputValue()).includes('ITEM_END'),
        'Direct Vendor LOA route lost item remarks.',
      )
      await page.waitForLoadState('networkidle')
      return 'preloaded quote and item wording into the LOA form'
    })

    const item = quote.items[0]
    const itemId = Number(item.catalog_item_id || item.item_id || item.id)
    const itemName = item.item_name || item.name || 'Equipment lifecycle item'
    const quantity = Number(item.quantity || 1)
    const unitPrice = Number(item.marked_up_price || item.unit_price || 1)
    const lineTotal = Number(item.total_price || quantity * unitPrice)
    const grandTotal = Number(quote.grand_total || lineTotal)
    const clientName = quote.client_name || project.client_name || 'Equipment lifecycle client'
    const clientAddress = [
      quote.client_address,
      quote.client_city,
      quote.client_state,
      quote.client_zip,
    ]
      .filter(Boolean)
      .join(', ')

    await step('create invoice and verify immutable remarks snapshot', async () => {
      const invoice = await apiRequest({
        route: 'invoices',
        method: 'POST',
        body: {
          project_id: projectId,
          quote_id: quoteId,
          service_type: 'Equipment Supply',
          invoice_purpose: 'Equipment commercial lifecycle smoke',
          invoice_client_name: clientName,
          invoice_client_ssm: quote.client_ssm || '',
          invoice_client_tin: quote.client_tin || '',
          invoice_client_address: quote.client_address || clientAddress,
          invoice_client_city: quote.client_city || '',
          invoice_client_state: quote.client_state || '',
          invoice_client_zip: quote.client_zip || '',
          invoice_pic_name: quote.pic_name || 'Client PIC',
          invoice_pic_phone: quote.pic_phone || '601100000000',
          invoice_pic_email: quote.pic_email || 'smoke@example.test',
          invoice_pic_position: quote.pic_position || 'Manager',
          invoice_date: today,
          payment_method: 'Bank Transfer',
          amount: grandTotal,
          sst_amount: 0,
          grand_total: grandTotal,
          quotation_remarks: quotationRemarks,
          breakdown: [
            {
              item_id: itemId,
              item_description: itemName,
              description: longDescription,
              item_remarks: itemRemarks,
              unit: item.unit || 'unit',
              quantity,
              unit_price: unitPrice,
              subtotal: lineTotal,
            },
          ],
        },
      })
      invoiceId = Number(invoice.invoice_id || 0)
      invoiceRef = invoice.invoice_ref_no || ''
      assert(invoiceId > 0 && invoiceRef, 'Invoice response omitted identity fields.')
      const invoices = await apiRequest({ route: `invoices?project_id=${projectId}&per_page=100` })
      const record = (invoices.data || invoices.invoices || []).find(
        (entry) => Number(entry.id) === invoiceId,
      )
      assert(
        record?.quotation_remarks === quotationRemarks,
        'Invoice snapshot omitted quote remarks.',
      )
      assert(
        record?.breakdown?.[0]?.item_remarks === itemRemarks,
        'Invoice snapshot omitted item remarks.',
      )
      return `${invoiceRef}`
    })

    await step('render invoice detail and PDF without truncation', async () => {
      await assertDetailPage(
        `/commercial/invoice/${invoiceId}`,
        'Invoice Details',
        ['GENERAL_END', 'ITEM_END', 'DESCRIPTION_END'],
        '01-invoice-detail.png',
      )
      return downloadPdf('invoice', `invoices/${invoiceId}/pdf`)
    })

    await step('mark invoice paid and generate receipt PDF', async () => {
      await apiRequest({
        route: `invoices/${invoiceId}/mark-paid`,
        method: 'PATCH',
        body: {
          id: invoiceId,
          paid_date: today,
          payment_method: 'Bank Transfer',
          paid_remarks: 'Smoke receipt.',
        },
      })
      invoicePaid = true
      return downloadPdf('receipt', `invoices/${invoiceId}/receipt-pdf`)
    })

    await step('create delivery order and verify detail/PDF', async () => {
      const deliveryOrder = await apiRequest({
        route: 'delivery-orders',
        method: 'POST',
        body: {
          details: {
            client_name: clientName,
            client_address: clientAddress || 'Client address',
            client_contact_name: quote.pic_name || 'Client PIC',
            client_contact_position: quote.pic_position || 'Manager',
            client_contact_email: quote.pic_email || 'smoke@example.test',
            client_contact_phone: quote.pic_phone || '601100000000',
            company_contact_name: 'System Admin',
            company_contact_email: 'azam@amiosh.com',
            company_contact_phone: '601100000000',
            project_id: projectId,
            project_name: project.project_name || `Equipment project ${projectId}`,
            project_code: project.project_code || `EQUIP-${projectId}`,
            project_award_date: project.award_date || today,
            project_type: 'Equipment Supply',
            project_description: 'Equipment commercial lifecycle smoke project.',
            project_service_period: today,
            quotation_remarks: quotationRemarks,
          },
          breakdown: [
            {
              item_id: itemId,
              item_name: itemName,
              description: longDescription,
              item_remarks: itemRemarks,
              quantity,
              unit: item.unit || 'unit',
            },
          ],
        },
      })
      deliveryOrderId = Number(deliveryOrder.do_id || 0)
      assert(deliveryOrderId > 0, 'Delivery order response omitted ID.')
      await assertDetailPage(
        `/commercial/delivery-order/${deliveryOrderId}`,
        'Delivery Order Details',
        ['GENERAL_END', 'ITEM_END', 'DESCRIPTION_END'],
        '02-delivery-order-detail.png',
      )
      return downloadPdf('delivery-order', `delivery-orders/${deliveryOrderId}/pdf`)
    })

    let vendor
    await step('assign vendor and verify LOA detail/PDF', async () => {
      const vendorPayload = await apiRequest({ route: 'vendors?status=active&per_page=100' })
      vendor = (vendorPayload.vendors || vendorPayload.data || [])[0]
      selectedVendorId = Number(vendor?.vendor_id || vendor?.id || 0)
      assert(selectedVendorId > 0, 'No active vendor is available for the smoke fixture.')
      await apiRequest({
        route: `projects/${projectId}/vendors`,
        method: 'POST',
        body: {
          vendor_id: selectedVendorId,
          award_value: Math.max(1, Math.min(grandTotal, lineTotal)),
          award_date: today,
          position: 'Equipment supplier',
          remarks: quotationRemarks,
          venue_details: clientAddress || 'Client site',
          fee_breakdown: `Equipment supply: RM ${lineTotal.toFixed(2)}`,
          payment_terms: '30 days from complete delivery.',
        },
      })
      const assignments = await apiRequest({
        route: `projects/${projectId}/vendors?project_id=${projectId}`,
      })
      const assignment = (assignments.vendors || []).find(
        (entry) => Number(entry.vendor_id) === selectedVendorId,
      )
      vendorAssignmentId = Number(assignment?.assignment_id || 0)
      assert(vendorAssignmentId > 0, 'Vendor assignment response omitted ID.')
      await assertDetailPage(
        `/commercial/vendor-loa/${vendorAssignmentId}`,
        'Vendor LOA Details',
        ['GENERAL_END', 'ITEM_END', 'DESCRIPTION_END'],
        '03-vendor-loa-detail.png',
      )
      return downloadPdf(
        'vendor-loa',
        `projects/${projectId}/loa?assignment_id=${vendorAssignmentId}&project_id=${projectId}`,
      )
    })

    await step('create supplier PO and verify detail/PDF', async () => {
      const supplierPo = await apiRequest({
        route: 'catalog/purchase-orders',
        method: 'POST',
        body: {
          project_id: projectId,
          supplier: {
            id: selectedVendorId,
            company_name: vendor.vendor_name || vendor.name || 'Equipment supplier',
            full_address: [vendor.address, vendor.city, vendor.state, vendor.zip]
              .filter(Boolean)
              .join(', '),
            contact_name: vendor.contact_person_name || '',
            contact_number: vendor.mobile_number || '',
          },
          items: [
            {
              item_id: itemId,
              item_name: itemName,
              description: longDescription,
              unit: item.unit || 'unit',
              quantity,
              unit_price: unitPrice,
              line_total: lineTotal,
            },
          ],
          discount: 0,
          delivery_charge: 0,
          sst_percent: 0,
          sst_amount: 0,
          grand_total: lineTotal,
        },
      })
      supplierPoId = Number(supplierPo.po_id || 0)
      assert(supplierPoId > 0, 'Supplier PO response omitted ID.')
      await assertDetailPage(
        `/commercial/supplier-po/${supplierPoId}`,
        'Supplier PO Details',
        ['GENERAL_END', 'ITEM_END', 'DESCRIPTION_END'],
        '04-supplier-po-detail.png',
      )
      return downloadPdf('supplier-po', `catalog/purchase-orders/${supplierPoId}/pdf`)
    })

    await step('generate quote PDF and verify related commercial chain', async () => {
      await downloadPdf(
        'equipment-quotation',
        `quote-records/equipment/${quoteId}/pdf?quote_id=${quoteId}`,
      )
      const related = await apiRequest({ route: `quote-records/equipment/${quoteId}/related-docs` })
      const data = related.data || related
      assert(
        data.projects?.some((entry) => Number(entry.id) === projectId),
        'Related docs omitted project.',
      )
      assert(
        data.invoices?.some((entry) => Number(entry.id) === invoiceId),
        'Related docs omitted invoice.',
      )
      assert(
        data.delivery_orders?.some((entry) => Number(entry.id) === deliveryOrderId),
        'Related docs omitted DO.',
      )
      assert(
        data.vendor_loas?.some((entry) => Number(entry.id) === vendorAssignmentId),
        'Related docs omitted LOA.',
      )
      assert(
        data.supplier_pos?.some((entry) => Number(entry.po_id) === supplierPoId),
        'Related docs omitted PO.',
      )
      return 'quote > project > invoice/receipt > DO > supplier PO > vendor LOA'
    })

    await step('browser runtime and API health', async () => {
      assert(runtimeIssues.length === 0, runtimeIssues.slice(0, 5).join(' | '))
      return 'no page, console, request, or server errors'
    })
  } catch (error) {
    await page
      .screenshot({ path: path.join(screenshotDir, 'failure.png'), fullPage: true })
      .catch(() => {})
    throw error
  } finally {
    if (invoicePaid && invoiceId) {
      await cleanup('cleanup: reverse invoice payment', async () => {
        await apiRequest({
          route: `invoices/${invoiceId}/mark-unpaid`,
          method: 'PATCH',
          body: { id: invoiceId, reason: `Equipment lifecycle smoke cleanup ${stamp}` },
        })
        invoicePaid = false
      })
    }
    if (supplierPoId) {
      await cleanup('cleanup: supplier PO', () =>
        apiRequest({ route: `catalog/purchase-orders/${supplierPoId}`, method: 'DELETE' }),
      )
    }
    if (deliveryOrderId) {
      await cleanup('cleanup: delivery order', () =>
        apiRequest({ route: `delivery-orders/${deliveryOrderId}`, method: 'DELETE' }),
      )
    }
    if (invoiceRef) {
      await cleanup('cleanup: invoice', () =>
        apiRequest({
          route: 'invoices',
          method: 'DELETE',
          body: {
            invoice_ref_no: invoiceRef,
            reason: `Equipment lifecycle smoke cleanup ${stamp}`,
          },
        }),
      )
    }
    if (vendorAssignmentId && projectId) {
      await cleanup('cleanup: vendor assignment', () =>
        apiRequest({
          route: `projects/${projectId}/vendors/${vendorAssignmentId}`,
          method: 'DELETE',
          body: { project_id: projectId, assignment_id: vendorAssignmentId },
        }),
      )
    }
    if (quoteId && projectId) {
      await cleanup('cleanup: un-award project', () =>
        apiRequest({
          route: `quote-records/equipment/${quoteId}/un-award`,
          method: 'POST',
          body: { quote_id: quoteId },
        }),
      )
    }
    if (quoteId) {
      await cleanup('cleanup: quotation', () =>
        apiRequest({
          route: `quote-records/equipment/${quoteId}`,
          method: 'DELETE',
          expected: [200, 404],
        }),
      )
    }
    if (catalogItemId) {
      await cleanup('cleanup: catalogue fixture', () =>
        apiRequest({
          route: `catalog/items/${catalogItemId}`,
          method: 'DELETE',
          expected: [200, 404],
        }),
      )
    }

    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          baseUrl,
          smokeAccount: redactEmail(email),
          ids: {
            catalogItemId,
            quoteId,
            projectId,
            invoiceId,
            deliveryOrderId,
            supplierPoId,
            vendorAssignmentId,
          },
          markers: ['GENERAL_END', 'ITEM_END', 'DESCRIPTION_END'],
          results,
          runtimeIssues,
        },
        null,
        2,
      ),
    )
    await browser.close()
  }

  const failures = results.filter((result) => result.status === 'failed')
  console.log(`\n${results.length - failures.length}/${results.length} checks passed.`)
  console.log(`Evidence: ${outputDir}`)
  if (failures.length) process.exitCode = 1
}

run().catch((error) => {
  console.error('EQUIPMENT-COMMERCIAL-LIFECYCLE-SMOKE-FAILED', error)
  process.exitCode = 1
})
