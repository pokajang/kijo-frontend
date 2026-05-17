import { describe, expect, it } from 'vitest'
import slugify from '../lib/slugify'

describe('slugify', () => {
  it('handles basic strings', () => {
    expect(slugify('Safety Induction Video Production')).toBe('safety-induction-video-production')
  })

  it('handles punctuation and extra spaces', () => {
    expect(slugify('  Special Service!!  ')).toBe('special-service')
  })

  it('handles empty input', () => {
    expect(slugify('')).toBe('')
  })
})
