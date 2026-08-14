import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { redactEmail, validateSmokeTarget } from './ih-smoke-safety.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `pdf-filenames-${stamp}`)
const downloadDir = path.join(outputDir, 'downloads')
const baseUrl = validateSmokeTarget(process.env.FRONTEND_URL || 'http://127.0.0.1:3000')
const apiBase = `${baseUrl}/proxy`
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
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

const rowsFrom = (payload) => {
  if (Array.isArray(payload)) return payload
  for (const key of ['data', 'records', 'quotations', 'invoices', 'forms', 'purchase_orders']) {
    if (Array.isArray(payload?.[key])) return payload[key]
    if (Array.isArray(payload?.[key]?.data)) return payload[key].data
  }
  return []
}

const assertSavedPdf = async (savedPath, label) => {
  const body = await fs.readFile(savedPath)
  assert(body.byteLength > 1000, `${label} PDF is unexpectedly small.`)
  assert(body.subarray(0, 1024).includes(Buffer.from('%PDF-')), `${label} file is not a PDF.`)
  return body.byteLength
}

const run = async () => {
  if (!email || !password) throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required.')
  await fs.mkdir(downloadDir, { recursive: true })

  const browser = await chromium.launch({ headless: process.env.SMOKE_HEADLESS !== '0' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(90_000)
  page.setDefaultNavigationTimeout(120_000)

  const step = async (label, action) => {
    const startedAt = Date.now()
    try {
      const detail = await action()
      const result = { label, status: 'passed', durationMs: Date.now() - startedAt, ...detail }
      results.push(result)
      console.log(`PASS  ${label} :: ${result.filename || result.detail || ''}`)
      return result
    } catch (error) {
      results.push({
        label,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        detail: error.message,
      })
      console.error(`FAIL  ${label} :: ${error.message}`)
      throw error
    }
  }

  const apiJson = async (route) => {
    const response = await page.request.get(`${apiBase}/${route.replace(/^\/+/, '')}`, {
      headers: { Accept: 'application/json' },
    })
    const text = await response.text()
    assert(response.ok(), `GET ${route} returned ${response.status()}: ${text.slice(0, 300)}`)
    return text ? JSON.parse(text) : {}
  }

  const probePdf = async (route) => {
    const response = await page.request.get(`${apiBase}/${route.replace(/^\/+/, '')}`, {
      headers: { Accept: 'application/pdf' },
    })
    return {
      ok: response.ok() && (response.headers()['content-type'] || '').includes('application/pdf'),
      status: response.status(),
      expectedFilename: filenameFromDisposition(response.headers()['content-disposition']),
    }
  }

  const quoteTypes = [
    { key: 'training', list: 'quote-records/training?per_page=100', route: 'training' },
    {
      key: 'industrial hygiene',
      list: 'quote-records/ih?per_page=100',
      route: 'industrial-hygiene',
      api: 'ih',
    },
    {
      key: 'equipment supply',
      list: 'quote-records/equipment?per_page=100',
      route: 'equipment-supply',
      api: 'equipment',
    },
    {
      key: 'manpower supply',
      list: 'quote-records/manpower?per_page=100',
      route: 'manpower-supply',
      api: 'manpower',
    },
    { key: 'special', list: 'quote-records/special?per_page=100', route: 'special' },
  ]

  try {
    await step('authenticate through real UI', async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
      await page.locator('#loginEmail').fill(email)
      await page.locator('#loginPassword').fill(password)
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login')),
        page.locator('button[type="submit"]').click(),
      ])
      return { detail: redactEmail(email) }
    })

    for (const type of quoteTypes) {
      await step(`${type.key} quotation browser download`, async () => {
        const records = rowsFrom(await apiJson(type.list))
        let selected = null
        let expectedFilename = ''
        let previewOnly = false
        for (const record of records) {
          const id = Number(record.id || record.quote_id || 0)
          if (!id) continue
          const apiKey = type.api || type.key
          const probe = await probePdf(`quote-records/${apiKey}/${id}/pdf?quote_id=${id}`)
          if (probe.ok && probe.expectedFilename) {
            selected = { ...record, id }
            expectedFilename = probe.expectedFilename
            break
          }
        }
        if (!selected) {
          for (const record of records) {
            const id = Number(record.id || record.quote_id || 0)
            if (!id) continue
            const apiKey = type.api || type.key
            const probe = await probePdf(
              `quote-records/${apiKey}/${id}/pdf?quote_id=${id}&approval_preview=1`,
            )
            if (probe.ok && probe.expectedFilename) {
              selected = { ...record, id }
              expectedFilename = probe.expectedFilename
              previewOnly = true
              break
            }
          }
        }
        assert(selected, `No issuable ${type.key} quotation was available.`)

        if (previewOnly) {
          const apiKey = type.api || type.key
          const pdfUrl = `${apiBase}/quote-records/${apiKey}/${selected.id}/pdf?quote_id=${selected.id}&approval_preview=1`
          const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.evaluate(
              async ({ url, filename }) => {
                const response = await fetch(url, {
                  credentials: 'include',
                  headers: { Accept: 'application/pdf' },
                })
                if (!response.ok) throw new Error(`PDF returned HTTP ${response.status}.`)
                const blob = await response.blob()
                const objectUrl = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = objectUrl
                link.download = filename
                document.body.appendChild(link)
                link.click()
                link.remove()
                setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
              },
              { url: pdfUrl, filename: expectedFilename },
            ),
          ])
          const suggestedFilename = download.suggestedFilename()
          assert(
            suggestedFilename === expectedFilename,
            `${type.key} browser filename was "${suggestedFilename}"; expected "${expectedFilename}".`,
          )
          const savedPath = path.join(downloadDir, suggestedFilename)
          await download.saveAs(savedPath)
          const bytes = await assertSavedPdf(savedPath, type.key)
          return {
            filename: suggestedFilename,
            bytes,
            sourceId: selected.id,
            coverage: 'approval preview browser download; normal issuance is currently blocked',
          }
        }

        await page.goto(`${baseUrl}/crm/records/${type.route}/${selected.id}`, {
          waitUntil: 'domcontentloaded',
        })
        const generate = page.getByRole('button', { name: 'Generate Quote' })
        await generate.waitFor()
        assert(await generate.isEnabled(), `${type.key} Generate Quote action is disabled.`)

        const pdfResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes(`/quote-records/${type.api || type.key}/${selected.id}/pdf`),
          { timeout: 120_000 },
        )
        await generate.click()
        const legacyGenerate = page.getByRole('button', { name: 'Generate PDF' })
        const legacyPromptVisible = await legacyGenerate
          .waitFor({ state: 'visible', timeout: 3000 })
          .then(() => true)
          .catch(() => false)
        if (legacyPromptVisible) {
          await legacyGenerate.click()
        }
        const pdfResponse = await pdfResponsePromise
        assert(pdfResponse.ok(), `${type.key} UI PDF returned HTTP ${pdfResponse.status()}.`)
        const uiFilename = filenameFromDisposition(pdfResponse.headers()['content-disposition'])
        assert(
          uiFilename === expectedFilename,
          `${type.key} PDF filename changed between requests.`,
        )

        const downloadLink = page.getByRole('link', { name: 'Download PDF' })
        await downloadLink.waitFor()
        const [download] = await Promise.all([page.waitForEvent('download'), downloadLink.click()])
        const suggestedFilename = download.suggestedFilename()
        assert(
          suggestedFilename === expectedFilename,
          `${type.key} browser filename was "${suggestedFilename}"; expected "${expectedFilename}".`,
        )
        const savedPath = path.join(downloadDir, suggestedFilename)
        await download.saveAs(savedPath)
        const bytes = await assertSavedPdf(savedPath, type.key)
        await page.getByRole('button', { name: 'Close', exact: true }).last().click()
        return { filename: suggestedFilename, bytes, sourceId: selected.id }
      })
    }

    const storageState = await context.storageState()
    const downloadBrowser = await chromium.launch({
      headless: process.env.SMOKE_HEADLESS !== '0',
      args: ['--disable-pdf-extension'],
    })
    const downloadContext = await downloadBrowser.newContext({
      storageState,
      acceptDownloads: true,
    })

    const browserDownload = async (label, route) => {
      const probe = await probePdf(route)
      assert(probe.ok, `${label} PDF returned HTTP ${probe.status}.`)
      assert(probe.expectedFilename, `${label} omitted its Content-Disposition filename.`)
      const downloadPage = await downloadContext.newPage()
      const downloadPromise = downloadPage.waitForEvent('download')
      await downloadPage
        .goto(`${apiBase}/${route.replace(/^\/+/, '')}`, { waitUntil: 'commit' })
        .catch((error) => {
          if (!String(error?.message || '').includes('Download is starting')) throw error
        })
      const download = await downloadPromise
      const suggestedFilename = download.suggestedFilename()
      assert(
        suggestedFilename === probe.expectedFilename,
        `${label} browser filename was "${suggestedFilename}"; expected "${probe.expectedFilename}".`,
      )
      const savedPath = path.join(downloadDir, suggestedFilename)
      await download.saveAs(savedPath)
      const bytes = await assertSavedPdf(savedPath, label)
      await downloadPage.close().catch(() => {})
      return { filename: suggestedFilename, bytes }
    }

    const invoices = rowsFrom(await apiJson('invoices?per_page=100'))
    if (invoices[0]?.id) {
      await step('invoice browser download', () =>
        browserDownload('invoice', `invoices/${invoices[0].id}/pdf`),
      )
      const receiptProbe = await probePdf(`invoices/${invoices[0].id}/receipt-pdf`)
      if (receiptProbe.ok) {
        await step('receipt browser download', () =>
          browserDownload('receipt', `invoices/${invoices[0].id}/receipt-pdf`),
        )
      } else {
        results.push({
          label: 'receipt browser download',
          status: 'skipped',
          detail: `HTTP ${receiptProbe.status}; no downloadable receipt on the selected invoice.`,
        })
      }
    }

    const jd14 = rowsFrom(await apiJson('jd14-forms?per_page=100'))
    if (jd14[0]?.id)
      await step('JD14 browser download', () =>
        browserDownload('JD14', `jd14-forms/${jd14[0].id}/pdf`),
      )

    const supplierPos = rowsFrom(await apiJson('catalog/purchase-orders?per_page=100'))
    const supplierPoId = supplierPos[0]?.po_id || supplierPos[0]?.id
    if (supplierPoId)
      await step('supplier PO browser download', () =>
        browserDownload('supplier PO', `catalog/purchase-orders/${supplierPoId}/pdf`),
      )

    const deliveryOrders = rowsFrom(await apiJson('delivery-orders?per_page=100'))
    const deliveryOrderId = deliveryOrders[0]?.do_id || deliveryOrders[0]?.id
    if (deliveryOrderId) {
      await step('delivery order browser download', () =>
        browserDownload('delivery order', `delivery-orders/${deliveryOrderId}/pdf`),
      )
    } else {
      results.push({
        label: 'delivery order browser download',
        status: 'skipped',
        detail:
          'No delivery order exists; covered by the disposable equipment commercial lifecycle test.',
      })
    }

    const vendorLoas = rowsFrom(await apiJson('vendor-loas?per_page=100'))
    const loa = vendorLoas.find(
      (record) => record.project_id && (record.assignment_id || record.id),
    )
    if (loa) {
      const assignmentId = loa.assignment_id || loa.id
      await step('vendor LOA browser download', () =>
        browserDownload(
          'vendor LOA',
          `projects/${loa.project_id}/loa?project_id=${loa.project_id}&vendor_id=${loa.vendor_id || ''}&assignment_id=${assignmentId}`,
        ),
      )
    } else {
      results.push({
        label: 'vendor LOA browser download',
        status: 'skipped',
        detail:
          'No existing vendor assignment exposes a downloadable LOA; covered by the disposable equipment commercial lifecycle test.',
      })
    }

    await downloadBrowser.close()
  } finally {
    await fs.writeFile(
      path.join(outputDir, 'result.json'),
      JSON.stringify(
        { at: new Date().toISOString(), baseUrl, account: redactEmail(email), results },
        null,
        2,
      ),
    )
    await browser.close()
  }

  const failures = results.filter((result) => result.status === 'failed')
  if (failures.length) throw new Error(`${failures.length} PDF filename check(s) failed.`)
  console.log(`Evidence: ${outputDir}`)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
