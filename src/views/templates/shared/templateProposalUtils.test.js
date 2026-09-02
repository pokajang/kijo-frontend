import { describe, expect, it } from 'vitest'
import { getPopulatedCategoryOptions } from './templateProposalUtils'

describe('getPopulatedCategoryOptions', () => {
  it('returns unique populated categories in case-insensitive alphabetical order', () => {
    const rows = [
      { categoryName: 'zebra Services' },
      { categoryName: 'Environment' },
      { categoryName: 'airport Services' },
      { categoryName: 'Environment' },
      { categoryName: '' },
      {},
    ]

    expect(getPopulatedCategoryOptions(rows)).toEqual([
      'airport Services',
      'Environment',
      'zebra Services',
    ])
  })
})
