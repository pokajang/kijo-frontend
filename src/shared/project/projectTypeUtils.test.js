import { describe, expect, it } from 'vitest'

import { isSpecialProjectType, normalizeProjectType } from './projectTypeUtils'

describe('projectTypeUtils', () => {
  it('normalizes project type strings by trimming, lowercasing, and collapsing spaces', () => {
    expect(normalizeProjectType('  Special   Service  ')).toBe('special service')
  })

  it('recognizes both Special labels as the same project family', () => {
    expect(isSpecialProjectType('Special')).toBe(true)
    expect(isSpecialProjectType('Special Service')).toBe(true)
    expect(isSpecialProjectType(' special   service ')).toBe(true)
    expect(isSpecialProjectType('Training')).toBe(false)
  })
})
