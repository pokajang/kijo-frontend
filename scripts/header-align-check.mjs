import { chromium } from 'playwright'

const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL || 'azam@amiosh.com'
const password = process.env.SMOKE_PASSWORD || 'dok ghok'

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser
    .newContext({ viewport: { width: 1366, height: 768 } })
    .then((c) => c.newPage())
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#loginEmail', email)
  await page.fill('#loginPassword', password)
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(800)

  // Measure the actual rendered SVG icon glyph midlines in the right-hand action cluster.
  const rows = await page.$$eval('.app-bottom-nav-actions .app-bottom-nav-icon svg', (svgs) =>
    svgs.map((svg, i) => {
      const r = svg.getBoundingClientRect()
      return {
        i,
        top: +r.top.toFixed(1),
        bottom: +r.bottom.toFixed(1),
        mid: +(r.top + r.height / 2).toFixed(1),
        h: +r.height.toFixed(1),
      }
    }),
  )

  // Ignore hidden/zero-size icons (e.g. the d-md-none mobile Home icon).
  const visible = rows.filter((r) => r.h > 0)
  const mids = visible.map((r) => r.mid)
  const spread = Math.max(...mids) - Math.min(...mids)
  console.log('visible icon midlines (top→bottom of DOM order):')
  visible.forEach((r) =>
    console.log(`  #${r.i}  mid=${r.mid}  h=${r.h}  top=${r.top} bottom=${r.bottom}`),
  )
  console.log(`\nmidline spread = ${spread.toFixed(2)}px  (0 = perfectly aligned)`)
  console.log(spread <= 1.0 ? 'RESULT: ALIGNED' : 'RESULT: MISALIGNED')

  await browser.close()
  process.exit(spread <= 1.0 ? 0 : 1)
}
run().catch((e) => {
  console.error(e)
  process.exit(2)
})
