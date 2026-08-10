import { describe, expect, it } from 'vitest'

import { getQuoteIssuanceState } from './recordApproval'

const equipmentRecord = {
  serviceTab: 'equipment-tab',
  estimatedCost: 100,
  grandTotal: 150,
}

describe('getQuoteIssuanceState', () => {
  it('blocks a quotation with a pending approval', () => {
    expect(
      getQuoteIssuanceState({
        ...equipmentRecord,
        approval: { can_issue: false, status: 'pending', required_step: 'bd' },
      }),
    ).toEqual({ blocked: true, message: 'BD approval is pending.' })
  })

  it('allows an approved quotation even when its price remains in a guarded zone', () => {
    expect(
      getQuoteIssuanceState({
        ...equipmentRecord,
        estimatedCost: 1_000,
        approval: { can_issue: true, status: 'approved' },
      }),
    ).toEqual({ blocked: false, message: '' })
  })

  it('blocks legacy quotations whose missing estimate would create an approval on issuance', () => {
    expect(
      getQuoteIssuanceState({ ...equipmentRecord, estimatedCost: null, formData: {} }),
    ).toEqual({
      blocked: true,
      message: 'Estimated cost is missing, so approval must be completed before issuing the quote.',
    })
  })

  it('allows a green quotation without an approval record', () => {
    expect(getQuoteIssuanceState(equipmentRecord)).toEqual({ blocked: false, message: '' })
  })

  it('fails closed when approval status cannot be verified', () => {
    expect(getQuoteIssuanceState({ ...equipmentRecord, approvalStatusUnavailable: true })).toEqual({
      blocked: true,
      message: 'Approval status could not be verified. Refresh the quotation before issuing it.',
    })
  })
})
