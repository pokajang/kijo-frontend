import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
const outputDir = path.join(
  projectRoot,
  'test-results',
  `training-quotation-detail-visual-qa-${stamp}`,
)
const screenshotsDir = path.join(outputDir, 'screenshots')
const baseUrl = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD

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
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows
  return []
}

const selectFirstOption = async (page, placeholderText) => {
  const select = page.locator('.react-select-container').filter({ hasText: placeholderText })
  await select.getByRole('combobox').click()
  const option = page.locator('.react-select__option').first()
  await option.waitFor()
  await option.click()
}

const collectPageMetrics = async (page, surface) =>
  page.evaluate((surfaceName) => {
    const parseRgb = (value) => {
      const channels = value
        .match(/[\d.]+/g)
        ?.slice(0, 4)
        .map(Number)
      if (!channels || channels.length < 3) return null
      return {
        red: channels[0],
        green: channels[1],
        blue: channels[2],
        alpha: channels[3] ?? 1,
      }
    }
    const compositeColor = (foreground, background) => {
      const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha)
      if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 }
      const compositeChannel = (foregroundChannel, backgroundChannel) =>
        (foregroundChannel * foreground.alpha +
          backgroundChannel * background.alpha * (1 - foreground.alpha)) /
        alpha
      return {
        red: compositeChannel(foreground.red, background.red),
        green: compositeChannel(foreground.green, background.green),
        blue: compositeChannel(foreground.blue, background.blue),
        alpha,
      }
    }
    const effectiveBackground = (element) => {
      let background = { red: 0, green: 0, blue: 0, alpha: 0 }
      let current = element
      while (current && background.alpha < 1) {
        const layer = parseRgb(window.getComputedStyle(current).backgroundColor)
        if (layer?.alpha > 0) background = compositeColor(background, layer)
        current = current.parentElement
      }
      return `rgb(${Math.round(background.red)}, ${Math.round(background.green)}, ${Math.round(
        background.blue,
      )})`
    }
    const relativeLuminance = (value) => {
      const color = parseRgb(value)
      if (!color) return null
      return [color.red, color.green, color.blue]
        .map((channel) => channel / 255)
        .map((channel) =>
          channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
        )
        .reduce(
          (luminance, channel, index) => luminance + channel * [0.2126, 0.7152, 0.0722][index],
          0,
        )
    }
    const contrastRatio = (foreground, background) => {
      const foregroundLuminance = relativeLuminance(foreground)
      const backgroundLuminance = relativeLuminance(background)
      if (foregroundLuminance === null || backgroundLuminance === null) return null
      const lighter = Math.max(foregroundLuminance, backgroundLuminance)
      const darker = Math.min(foregroundLuminance, backgroundLuminance)
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
    }
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
    const getHeaderMetrics = (header) => {
      const style = window.getComputedStyle(header)
      const rect = header.getBoundingClientRect()
      return {
        text: header.textContent.replace(/\s+/g, ' ').trim(),
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        height: Math.round(rect.height),
      }
    }
    const overflowing = [...document.body.querySelectorAll('*')]
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || '').slice(0, 160),
          text: element.textContent.replace(/\s+/g, ' ').trim().slice(0, 100),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      })
      .filter((item) => item.right > window.innerWidth + 2 || item.left < -2)
      .slice(0, 20)

    const calculationTable = document.querySelector('.quotation-calculation-table')
    const tableHead = calculationTable?.querySelector('thead')
    const firstDetailField = document.querySelector('.records-detail-field--inline')
    const firstDetailLabel = firstDetailField?.querySelector('.records-detail-label')
    const firstDetailValue = firstDetailField?.querySelector('.records-detail-value')
    const proposalHeader = [...document.querySelectorAll('.card-header')].find(
      (header) => header.textContent.trim() === 'Proposal',
    )
    const proposalBadge = proposalHeader?.nextElementSibling?.querySelector('.badge')
    const proposalBadgeStyle = proposalBadge ? window.getComputedStyle(proposalBadge) : null
    const proposalBadgeBackground = proposalBadge ? effectiveBackground(proposalBadge) : null

    return {
      surface: surfaceName,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      overflowing,
      cardHeaders: [...document.querySelectorAll('.card-header')]
        .filter(isVisible)
        .map(getHeaderMetrics),
      cardCount: [...document.querySelectorAll('.card')].filter(isVisible).length,
      sectionHeadingOrder: [...document.querySelectorAll('h1, h2')]
        .filter(isVisible)
        .map((heading) => heading.textContent.replace(/\s+/g, ' ').trim()),
      calculationTable: calculationTable
        ? {
            display: window.getComputedStyle(calculationTable).display,
            width: Math.round(calculationTable.getBoundingClientRect().width),
            headPosition: tableHead ? window.getComputedStyle(tableHead).position : null,
            headClipPath: tableHead ? window.getComputedStyle(tableHead).clipPath : null,
          }
        : null,
      detailField: firstDetailField
        ? {
            display: window.getComputedStyle(firstDetailField).display,
            labelAlignment: firstDetailLabel
              ? window.getComputedStyle(firstDetailLabel).textAlign
              : null,
            valueAlignment: firstDetailValue
              ? window.getComputedStyle(firstDetailValue).textAlign
              : null,
          }
        : null,
      proposalBadge: proposalBadgeStyle
        ? {
            color: proposalBadgeStyle.color,
            backgroundColor: proposalBadgeBackground,
            contrastRatio: contrastRatio(proposalBadgeStyle.color, proposalBadgeBackground),
          }
        : null,
    }
  }, surface)

const captureSurface = async (page, surface, targets = viewports) => {
  const results = []
  for (const viewport of targets) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.waitForTimeout(300)
    const screenshotPath = path.join(screenshotsDir, `${surface}-${viewport.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    results.push({
      ...viewport,
      screenshotPath,
      metrics: await collectPageMetrics(page, surface),
    })
  }
  return results
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

  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []
  const apiErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || ''
    if (!reason.includes('ERR_ABORTED')) {
      requestFailures.push(`${request.method()} ${request.url()} ${reason}`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/proxy/')) {
      apiErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
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

    const trainingRows = await page.evaluate(async () => {
      const response = await fetch('/proxy/quote-records/training', { credentials: 'include' })
      const payload = await response.json()
      return { ok: response.ok, payload }
    })
    if (!trainingRows.ok) throw new Error('Unable to load training quotation records.')
    const quoteId = unwrapRows(trainingRows.payload)
      .filter((row) => Number(row?.id) > 0)
      .map((row) => ({
        id: row.id,
        score: [
          row.training_title,
          row.training_type_option,
          row.training_venue,
          row.pricing_basis,
          row.training_rate_type,
          Number(row.unit_price) > 0,
          Number(row.grand_total ?? row.amount) > 0,
          Number(row.estimated_total_cost) > 0,
        ].filter(Boolean).length,
      }))
      .sort((a, b) => b.score - a.score)[0]?.id
    if (!quoteId) throw new Error('No existing training quotation is available for visual QA.')

    await page.goto(`${baseUrl}/crm/quotes?service=training`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Client / Company', { exact: true }).waitFor()
    await selectFirstOption(page, 'Search client')
    await selectFirstOption(page, 'Select Source...')
    await page.getByText('Training Details', { exact: true }).waitFor()
    await selectFirstOption(page, 'Search and select training topic...')
    await page.getByLabel('Training Venue').fill('Visual QA client training room')
    await page.getByText('Traffic Light', { exact: true }).waitFor()
    await page.getByLabel('Estimated Cost (RM)').fill('1000')
    await page.getByText('Review Quotation', { exact: true }).waitFor()
    const form = await captureSurface(page, 'form')

    await page.goto(`${baseUrl}/crm/records/training/${quoteId}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('heading', { name: 'Quotation Details' }).waitFor()
    await page.getByRole('heading', { name: 'Quotation Calculation' }).waitFor()
    const detail = await captureSurface(page, 'detail')

    await page.evaluate(() => {
      window.localStorage.setItem('coreui-free-react-admin-template-theme', 'dark')
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Quotation Calculation' }).waitFor()
    const darkDetail = await captureSurface(
      page,
      'detail-dark',
      viewports.filter(({ name }) => name !== 'tablet'),
    )

    const expectedDetailHeadings = [
      'Quotation Details',
      'Client & Contact',
      'Quotation Context',
      'Training Details',
      'Pricing Governance',
      'Pricing Configuration',
      'Quotation Calculation',
      'Proposal',
      'Status & Follow-up History',
      'Actions',
    ]
    const allCaptures = [...form, ...detail, ...darkDetail]
    const checks = {
      noHorizontalOverflow: allCaptures.every(({ metrics }) => metrics.horizontalOverflow === 0),
      noRuntimeErrors:
        consoleErrors.length === 0 &&
        pageErrors.length === 0 &&
        requestFailures.length === 0 &&
        apiErrors.length === 0,
      detailHeadingOrder: detail.every(
        ({ metrics }) =>
          JSON.stringify(metrics.sectionHeadingOrder) === JSON.stringify(expectedDetailHeadings),
      ),
      consistentDetailSectionHeaders: [...detail, ...darkDetail].every(({ metrics }) => {
        const sectionBackgrounds = metrics.cardHeaders
          .slice(1)
          .map(({ backgroundColor }) => backgroundColor)
        return new Set(sectionBackgrounds).size === 1
      }),
      responsiveCalculation: detail.every(({ name, metrics }) =>
        name === 'mobile'
          ? metrics.calculationTable?.display === 'block' &&
            metrics.calculationTable?.headPosition === 'absolute'
          : metrics.calculationTable?.display === 'table',
      ),
      proposalBadgeContrast: darkDetail.every(
        ({ metrics }) =>
          metrics.proposalBadge === null || metrics.proposalBadge.contrastRatio >= 4.5,
      ),
    }
    const report = {
      baseUrl,
      quoteId,
      generatedAt: new Date().toISOString(),
      form,
      detail,
      darkDetail,
      checks,
      consoleErrors,
      pageErrors,
      requestFailures,
      apiErrors,
    }
    const reportPath = path.join(outputDir, 'report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ outputDir, reportPath, quoteId, checks }, null, 2))
    if (Object.values(checks).some((passed) => !passed)) {
      throw new Error('One or more visual QA checks failed. See report.json for details.')
    }
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
