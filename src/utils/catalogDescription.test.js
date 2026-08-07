import { describe, expect, it } from 'vitest'

import { compactCatalogDescription } from './catalogDescription'

describe('compactCatalogDescription', () => {
  it('normalizes pasted bullets and line endings while preserving numbering', () => {
    expect(
      compactCatalogDescription(
        'Personal Air Sampling Pump\r\nIncludes:\r\n• pump\r\n◦ charging dock\r\n3) filter holder',
      ),
    ).toBe('Personal Air Sampling Pump; Includes: pump; charging dock; 3) filter holder')
  })

  it('collapses whitespace and ignores blank lines', () => {
    expect(compactCatalogDescription('  Portable   detector \n\n Part No: 123 ')).toBe(
      'Portable detector; Part No: 123',
    )
  })
})
