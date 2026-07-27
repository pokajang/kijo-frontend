import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(projectRoot, 'test-results', `quotation-details-visual-qa-${stamp}`)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD

const services = [
  {
    key: 'training',
    slug: 'training',
    serviceHeading: 'Training Details',
    extraHeadings: ['Pricing Governance', 'Pricing Configuration'],
  },
  {
    key: 'ih',
    slug: 'industrial-hygiene',
    serviceHeading: 'Industrial Hygiene Details',
    extraHeadings: ['Pricing Governance', 'Pricing Configuration'],
  },
  {
    key: 'manpower',
    slug: 'manpower-supply',
    serviceHeading: 'Manpower Details',
    extraHeadings: ['Pricing Governance', 'Pricing Configuration'],
  },
  {
    key: 'special',
    slug: 'special',
    serviceHeading: 'Special Service Details',
    extraHeadings: [],
  },
  {
    key: 'equipment',
    slug: 'equipment-supply',
    serviceHeading: 'Equipment Items',
    extraHeadings: ['Pricing Governance'],
  },
]

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 900, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]

const unwrapRows = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const scoreRecord = (row) => {
  const values = []
  const visit = (value) => {
    if (Array.isArray(value)) {
      values.push(value.length)
      value.slice(0, 5).forEach(visit)
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(visit)
    } else {
      values.push(value)
    }
  }
  visit(row)
  return values.filter(
    (value) => value !== null && value !== undefined && value !== '' && value !== 0,
  ).length
}

const getMetrics = (page) =>
  page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    }
    const table = document.querySelector('.quotation-calculation-table')
    const tableHead = table?.querySelector('thead')
    const sectionHeaders = [...document.querySelectorAll('.records-detail-section-header')].filter(
      isVisible,
    )

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      headings: [...document.querySelectorAll('h1, h2')]
        .filter(isVisible)
        .map((heading) => heading.textContent.replace(/\s+/g, ' ').trim()),
      sectionHeaderStyles: sectionHeaders.map((header) => {
        const style = window.getComputedStyle(header)
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
        }
      }),
      calculationTable: table
        ? {
            display: window.getComputedStyle(table).display,
            headPosition: tableHead ? window.getComputedStyle(tableHead).position : null,
            rowCount: table.querySelectorAll('tbody tr').length,
          }
        : null,
      duplicateClientSections: [...document.querySelectorAll('h2')].filter(
        (heading) => heading.textContent.trim() === 'Client & Contact',
      ).length,
    }
  })

const capture = async (page, service, theme, viewport) => {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.waitForTimeout(250)
  const screenshotPath = path.join(
    screenshotsDir,
    `${service.key}-detail-${theme}-${viewport.name}.png`,
  )
  await page.screenshot({ path: screenshotPath, fullPage: true })
  return { theme, ...viewport, screenshotPath, metrics: await getMetrics(page) }
}

const run = async () => {
  if (!email || !password) {
    throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required for authenticated visual QA.')
  }

  await fs.mkdir(screenshotsDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: viewports[0] })
  const page = await context.newPage()
  page.setDefaultTimeout(60_000)
  page.setDefaultNavigationTimeout(90_000)

  const errors = { console: [], page: [], requests: [], api: [], mutations: [] }
  page.on('console', (message) => {
    if (message.type() === 'error') errors.console.push(message.text())
  })
  page.on('pageerror', (error) => errors.page.push(error.message))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || ''
    if (!reason.includes('ERR_ABORTED')) {
      errors.requests.push(`${request.method()} ${request.url()} ${reason}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/proxy/')) {
      errors.api.push(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#loginEmail').fill(email)
    await page.locator('#loginPassword').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login')),
      page.locator('button[type="submit"]').click(),
    ])

    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
        errors.mutations.push(`${request.method()} ${request.url()}`)
      }
    })

    const results = []
    for (const service of services) {
      const records = await page.evaluate(async (serviceKey) => {
        const response = await fetch(`/proxy/quote-records/${serviceKey}`, {
          credentials: 'include',
        })
        return { ok: response.ok, payload: await response.json() }
      }, service.key)
      if (!records.ok) throw new Error(`Unable to load ${service.key} quotation records.`)
      const selected = unwrapRows(records.payload)
        .filter((row) => Number(row?.id) > 0)
        .map((row) => ({ id: row.id, score: scoreRecord(row) }))
        .sort((a, b) => b.score - a.score)[0]

      if (!selected) {
        results.push({ service: service.key, skipped: 'No existing quotation available.' })
        continue
      }

      await page.evaluate(() => {
        window.localStorage.setItem('coreui-free-react-admin-template-theme', 'light')
      })
      await page.goto(
        `${baseUrl}/crm/quotes?service=${service.key}&edit=true&quoteId=${selected.id}`,
        { waitUntil: 'domcontentloaded' },
      )
      await page.getByText('Edit Quotation', { exact: true }).waitFor()
      await page.getByText('Loading quotation data...', { exact: true }).waitFor({
        state: 'hidden',
      })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(250)
      await page.screenshot({
        path: path.join(screenshotsDir, `${service.key}-form-light-desktop.png`),
        fullPage: true,
      })

      await page.goto(`${baseUrl}/crm/records/${service.slug}/${selected.id}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('heading', { name: service.serviceHeading }).waitFor()
      await page.getByRole('heading', { name: 'Quotation Calculation' }).waitFor()
      const light = []
      for (const viewport of viewports) {
        light.push(await capture(page, service, 'light', viewport))
      }

      await page.evaluate(() => {
        window.localStorage.setItem('coreui-free-react-admin-template-theme', 'dark')
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Quotation Calculation' }).waitFor()
      const dark = []
      for (const viewport of viewports.filter(({ name }) => name !== 'tablet')) {
        dark.push(await capture(page, service, 'dark', viewport))
      }

      const expectedHeadings = [
        'Quotation Details',
        'Client & Contact',
        'Quotation Context',
        service.serviceHeading,
        ...service.extraHeadings,
        'Quotation Calculation',
        'Proposal',
        'Status & Follow-up History',
        'Actions',
      ]
      const captures = [...light, ...dark]
      results.push({
        service: service.key,
        quoteId: selected.id,
        score: selected.score,
        captures,
        checks: {
          noHorizontalOverflow: captures.every(({ metrics }) => metrics.horizontalOverflow === 0),
          headingOrder: captures.every(
            ({ metrics }) => JSON.stringify(metrics.headings) === JSON.stringify(expectedHeadings),
          ),
          oneClientSection: captures.every(({ metrics }) => metrics.duplicateClientSections === 1),
          consistentSectionHeaders: captures.every(({ metrics }) => {
            const styles = metrics.sectionHeaderStyles.map((style) => JSON.stringify(style))
            return new Set(styles).size === 1
          }),
          responsiveCalculation: captures.every(({ name, metrics }) =>
            name === 'mobile'
              ? metrics.calculationTable?.display === 'block' &&
                metrics.calculationTable?.headPosition === 'absolute'
              : metrics.calculationTable?.display === 'table',
          ),
          calculationHasRows: captures.every(
            ({ metrics }) => Number(metrics.calculationTable?.rowCount || 0) > 0,
          ),
        },
      })
    }

    const checksPass = results
      .filter((result) => !result.skipped)
      .every((result) => Object.values(result.checks).every(Boolean))
    const noRuntimeErrors = Object.values(errors).every((items) => items.length === 0)
    const report = {
      baseUrl,
      generatedAt: new Date().toISOString(),
      results,
      checks: { allServiceChecksPass: checksPass, noRuntimeErrors },
      errors,
    }
    const reportPath = path.join(outputDir, 'report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ outputDir, reportPath, checks: report.checks }, null, 2))

    if (!checksPass || !noRuntimeErrors) {
      throw new Error('Cross-service visual QA failed. See report.json for details.')
    }
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
