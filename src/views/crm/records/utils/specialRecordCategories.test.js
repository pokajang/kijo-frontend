import { describe, expect, it } from 'vitest'
import {
  buildRecordNavigationTabs,
  getSpecialCategoryIdFromTabKey,
  getSpecialRecordServiceLabel,
  matchesRecordServiceFilter,
  matchesSpecialCategory,
  normalizeSpecialCategoryFacets,
} from './specialRecordCategories'

const baseTabs = [
  { key: 'all-tab', label: 'All' },
  { key: 'special-tab', label: 'Special Service' },
]

describe('special quotation record categories', () => {
  it('builds custom navigation only for quote-backed categories', () => {
    const tabs = buildRecordNavigationTabs(baseTabs, [
      { categoryId: 1, name: 'Special Service', code: 'SPECIAL', quoteCount: 3, isSystem: true },
      { categoryId: 2, name: 'Environment', code: 'ENV', quoteCount: 2 },
      { categoryId: 3, name: 'Engineering', code: 'ENG', quoteCount: 0 },
    ])

    expect(tabs.map((tab) => tab.label)).toEqual(['All', 'Special Service', 'Environment'])
    expect(getSpecialCategoryIdFromTabKey(tabs[2].key)).toBe(2)
  })

  it('retains inactive historical categories when they have quotations', () => {
    expect(
      normalizeSpecialCategoryFacets([
        { categoryId: 7, name: 'Legacy', code: 'LEG', quoteCount: 1, isActive: false },
      ]),
    ).toEqual([
      {
        categoryId: 7,
        name: 'Legacy',
        code: 'LEG',
        quoteCount: 1,
        isSystem: false,
        isActive: false,
        displayOrder: 0,
      },
    ])
  })

  it('separates default Special Service records from custom category records', () => {
    const defaultRecord = { serviceTab: 'special-tab', formData: { categoryCode: 'SPECIAL' } }
    const environmentRecord = {
      serviceTab: 'special-tab',
      formData: { categoryId: 12, categoryName: 'Environment', categoryCode: 'ENV' },
    }

    expect(matchesSpecialCategory(defaultRecord, null)).toBe(true)
    expect(matchesSpecialCategory(environmentRecord, null)).toBe(false)
    expect(matchesSpecialCategory(environmentRecord, 12)).toBe(true)
    expect(matchesRecordServiceFilter(environmentRecord, 'special-category:12')).toBe(true)
    expect(matchesRecordServiceFilter(environmentRecord, 'special-tab')).toBe(false)
    expect(getSpecialRecordServiceLabel(environmentRecord)).toBe('Environment')
  })
})
