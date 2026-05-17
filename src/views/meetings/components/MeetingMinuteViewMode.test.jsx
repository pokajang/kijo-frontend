import { describe, expect, it } from 'vitest'
import { sanitizeMeetingRichHtml } from './MeetingMinuteViewMode'

describe('sanitizeMeetingRichHtml', () => {
  it('removes scripts and event handlers from rich meeting content', () => {
    const html = sanitizeMeetingRichHtml(
      '<p>Agenda</p><img src=x onerror="alert(1)"><script>alert(2)</script><p onclick="x()">Minutes</p>',
    )

    expect(html).toContain('<p>Agenda</p>')
    expect(html).toContain('<p>Minutes</p>')
    expect(html).not.toContain('script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('<img')
  })

  it('falls back to an empty paragraph placeholder', () => {
    expect(sanitizeMeetingRichHtml('')).toBe('<p>-</p>')
  })
})
