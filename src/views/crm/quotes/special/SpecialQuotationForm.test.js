import { describe, expect, it } from 'vitest'

import { mergeSpecialQuoteDraft } from './SpecialQuotationForm'

describe('SpecialQuotationForm legacy draft compatibility', () => {
  it('adds the new cost field when resuming a pre-feature draft', () => {
    const resumed = mergeSpecialQuoteDraft(
      { estimatedTotalCost: '', attachProposal: true },
      { serviceTitle: 'Legacy draft', attachProposal: false },
    )

    expect(resumed).toEqual({
      estimatedTotalCost: '',
      attachProposal: false,
      serviceTitle: 'Legacy draft',
    })
  })

  it('normalizes a persisted cost without discarding other draft values', () => {
    const resumed = mergeSpecialQuoteDraft(
      { estimatedTotalCost: '' },
      { estimatedTotalCost: '125.50', generalRemarks: 'Resume me' },
    )

    expect(resumed.estimatedTotalCost).toBe(125.5)
    expect(resumed.generalRemarks).toBe('Resume me')
  })
})
