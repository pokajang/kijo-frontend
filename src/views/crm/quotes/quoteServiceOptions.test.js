import { describe, expect, it } from 'vitest'
import {
  buildQuoteServiceOptions,
  parseQuoteServiceOption,
  specialCategoryOptionValue,
} from './quoteServiceOptions'

describe('quoteServiceOptions', () => {
  it('replaces the generic special branch with populated active categories', () => {
    const options = buildQuoteServiceOptions(
      [
        { key: 'training', label: 'Training' },
        { key: 'special', label: 'Special Service' },
      ],
      [
        { id: 1, name: 'Special Service', isActive: true, templateCount: 2 },
        { id: 2, name: 'Environment', isActive: true, templateCount: 1 },
        { id: 3, name: 'Engineering', isActive: true, templateCount: 0 },
        { id: 4, name: 'Inactive', isActive: false, templateCount: 3 },
      ],
    )

    expect(options.map(({ label }) => label)).toEqual([
      'Training',
      'Special Service',
      'Environment',
    ])
    expect(options.some(({ key }) => key === 'special')).toBe(false)
  })

  it('maps a category option back to the existing special quote pipeline', () => {
    expect(parseQuoteServiceOption(specialCategoryOptionValue(12))).toEqual({
      serviceKey: 'special',
      categoryId: 12,
    })
    expect(parseQuoteServiceOption('training')).toEqual({
      serviceKey: 'training',
      categoryId: null,
    })
  })
})
