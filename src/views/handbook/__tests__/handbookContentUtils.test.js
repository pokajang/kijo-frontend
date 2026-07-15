import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatHandbookDisplayHtml, normalizeHandbookHtml } from '../utils/handbookContentUtils'

const compact = (value) => value.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
const rev02SnapshotPath = path.resolve(
  process.cwd(),
  '../backend-laravel/database/seeders/data/handbook_rev02_2026_07.json',
)
const rev02Snapshot = JSON.parse(fs.readFileSync(rev02SnapshotPath, 'utf8'))

describe('handbookContentUtils', () => {
  it('normalizes old onboarding card layout into document flow for display', () => {
    const html = `
      <div class="row gy-4">
        <div class="col-md-4">
          <div class="card h-100 shadow-sm">
            <div class="card-header text-center fw-semibold">YOUR FIRST DAY</div>
            <div class="card-body">
              <p class="text-center fw-semibold mb-3">Your first day will be fairly slow.</p>
              <p>First, you'll sign the paperwork and read this handbook!</p>
            </div>
          </div>
        </div>
      </div>
    `

    const normalized = normalizeHandbookHtml(html)

    expect(compact(normalized)).toBe(
      compact(
        "<h6>Your First Day</h6><p>Your first day will be fairly slow.</p><p>First, you'll sign the paperwork and read this handbook!</p>",
      ),
    )
    expect(normalized).not.toContain('card')
    expect(normalized).not.toContain('row')
    expect(normalized).not.toContain('col-md-4')
  })

  it('keeps table classes while removing decorative content classes', () => {
    const html =
      '<div class="card"><div class="card-body"><div class="table-responsive"><table class="table table-bordered table-sm mb-4"><tbody><tr><td>A</td></tr></tbody></table></div></div></div>'

    expect(normalizeHandbookHtml(html)).toBe(
      '<div class="table-responsive"><table class="table table-bordered table-sm"><tbody><tr><td>A</td></tr></tbody></table></div>',
    )
  })

  it('normalizes all-caps headings without changing mixed acronym headings', () => {
    expect(normalizeHandbookHtml('<h6>WHEN</h6><h6>4.6 Work-From-Home (WFH) Policy</h6>')).toBe(
      '<h6>When</h6><h6>4.6 Work-From-Home (WFH) Policy</h6>',
    )
  })

  it('reflows PDF visual lines and turns bullet glyphs into a native list for display', () => {
    const formatted = formatHandbookDisplayHtml(`
      <h6>1.1 Welcome Message</h6>
      <p>We are pleased to welcome you to AMIOSH. Our organization is built on a simple,</p>
      <p>uncompromising principle: Performance, Accountability, and Discipline drive success.</p>
      <p></p>
      <p>As part of this journey, we expect every employee to:</p>
      <p>• Take absolute ownership of their responsibilities.</p>
      <p>and deliver measurable results.</p>
      <p>• Maintain unwavering professionalism at all times.</p>
    `)

    expect(formatted).toBe(
      '<h6>1.1 Welcome Message</h6><p>We are pleased to welcome you to AMIOSH. Our organization is built on a simple, uncompromising principle: Performance, Accountability, and Discipline drive success.</p><p>As part of this journey, we expect every employee to:</p><ul><li>Take absolute ownership of their responsibilities. and deliver measurable results.</li><li>Maintain unwavering professionalism at all times.</li></ul>',
    )
  })

  it('leaves ordinarily authored paragraphs as separate paragraphs', () => {
    expect(formatHandbookDisplayHtml('<p>First paragraph.</p><p>Second paragraph.</p>')).toBe(
      '<p>First paragraph.</p><p>Second paragraph.</p>',
    )
  })

  it('formats the published REV02 snapshot without altering its stored source', () => {
    const source = rev02Snapshot.chapters[0].bodyHtml
    const formatted = formatHandbookDisplayHtml(source)

    expect(rev02Snapshot.chapters).toHaveLength(12)
    expect(source).toContain(
      '<p>uncompromising principle: Performance, Accountability, and Discipline drive success.</p>',
    )
    expect(formatted).toContain(
      'Our organization is built on a simple, uncompromising principle: Performance, Accountability, and Discipline drive success.',
    )
    expect(formatted).not.toContain('simple,</p><p>uncompromising principle')
    expect(formatted).toContain('<ul><li>Take absolute ownership of their responsibilities.</li>')
  })
})
