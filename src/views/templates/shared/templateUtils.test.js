import { describe, expect, it } from 'vitest'
import {
  formatTemplateDate,
  getTemplateId,
  isSuccess,
  normalizeTemplateLanguage,
  sanitizeDisplayHtml,
  stripHtml,
  unwrapRows,
} from './templateUtils'

describe('templateUtils', () => {
  describe('isSuccess', () => {
    it('accepts supported success response shapes', () => {
      expect(isSuccess({ status: 'success' })).toBe(true)
      expect(isSuccess({ success: true })).toBe(true)
      expect(isSuccess({ ok: true })).toBe(true)
      expect(isSuccess({ status: 'error' })).toBe(false)
    })
  })

  describe('unwrapRows', () => {
    it('normalizes common list response shapes', () => {
      const rows = [{ id: 1 }]

      expect(unwrapRows(rows)).toBe(rows)
      expect(unwrapRows({ data: rows })).toEqual(rows)
      expect(unwrapRows({ result: rows })).toEqual(rows)
      expect(unwrapRows({ rows })).toEqual(rows)
      expect(unwrapRows({ data: { data: rows } })).toEqual(rows)
      expect(unwrapRows({ data: { rows } })).toEqual(rows)
    })

    it('wraps single template response shapes', () => {
      expect(unwrapRows({ data: { id: 1, serviceTitle: 'A' } })).toEqual([
        { id: 1, serviceTitle: 'A' },
      ])
      expect(unwrapRows({ template_id: 2, serviceTitle: 'B' })).toEqual([
        { template_id: 2, serviceTitle: 'B' },
      ])
      expect(unwrapRows({ message: 'empty' })).toEqual([])
    })
  })

  describe('getTemplateId', () => {
    it('returns a positive numeric id from supported fields', () => {
      expect(getTemplateId({ id: '4' })).toBe(4)
      expect(getTemplateId({ template_id: 5 })).toBe(5)
      expect(getTemplateId({ templateId: '6' })).toBe(6)
      expect(getTemplateId({ proposal_id: '7' })).toBe(7)
      expect(getTemplateId({ status: 'success', data: { id: '8' } })).toBe(8)
      expect(getTemplateId({ id: 0 })).toBeNull()
      expect(getTemplateId({ id: 'abc' })).toBeNull()
    })
  })

  describe('normalizeTemplateLanguage', () => {
    it('normalizes supported BM aliases and defaults to English', () => {
      expect(normalizeTemplateLanguage('ms-MY')).toBe('ms-MY')
      expect(normalizeTemplateLanguage('BM')).toBe('ms-MY')
      expect(normalizeTemplateLanguage('bahasa melayu')).toBe('ms-MY')
      expect(normalizeTemplateLanguage('en')).toBe('en')
      expect(normalizeTemplateLanguage()).toBe('en')
    })
  })

  describe('stripHtml', () => {
    it('removes tags, script/style blocks, and non-breaking spaces', () => {
      expect(stripHtml('<p>Hello&nbsp;<strong>World</strong></p><script>x()</script>')).toBe(
        'Hello World',
      )
    })
  })

  describe('sanitizeDisplayHtml', () => {
    it('allows basic formatting and strips attributes, unsafe blocks, and disallowed tags', () => {
      expect(
        sanitizeDisplayHtml(
          '<h2 style="color:red">Heading</h2><p onclick="x"><strong>Ok</strong><script>bad()</script><a href="/">Link</a></p>',
        ),
      ).toBe('<h2>Heading</h2><p><strong>Ok</strong>Link</p>')
    })

    it('keeps table structure without attributes because TinyMCE has table support', () => {
      expect(
        sanitizeDisplayHtml(
          '<table style="width:100%"><tbody><tr><td onclick="x()">Cell</td></tr></tbody></table>',
        ),
      ).toBe('<table><tbody><tr><td>Cell</td></tr></tbody></table>')
    })
  })

  describe('formatTemplateDate', () => {
    it('formats valid dates and preserves invalid strings', () => {
      expect(formatTemplateDate(new Date(2026, 4, 12))).toBe('12 May 2026')
      expect(formatTemplateDate('not-a-date')).toBe('not-a-date')
      expect(formatTemplateDate('')).toBe('-')
    })
  })
})
