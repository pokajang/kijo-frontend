import { describe, expect, it } from 'vitest'
import { normalizeHandbookHtml } from '../utils/handbookContentUtils'

const compact = (value) => value.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()

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
})
