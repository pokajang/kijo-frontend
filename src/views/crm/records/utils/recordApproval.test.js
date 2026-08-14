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

  it.each(['training-tab', 'equipment-tab', 'manpower-tab'])(
    'allows a grandfathered %s quote to reach the legacy PDF confirmation',
    (serviceTab) => {
      expect(
        getQuoteIssuanceState({
          serviceTab,
          issuanceContext: {
            is_grandfathered: true,
            requires_approval: false,
            estimated_cost_required: false,
          },
        }),
      ).toEqual({ blocked: false, message: '' })
    },
  )

  it('ignores an approval row produced by a superseded policy', () => {
    expect(
      getQuoteIssuanceState({
        serviceTab: 'training-tab',
        approval: {
          can_issue: false,
          status: 'pending',
          required_step: 'bd',
          rule_version: 'traffic-light-220626-v1',
        },
        issuanceContext: {
          is_grandfathered: true,
          requires_approval: false,
          rule_version: 'traffic-light-training-202608-v2',
        },
      }),
    ).toEqual({ blocked: false, message: '' })
  })

  it('blocks a grandfathered quote that still has a genuine approval trigger', () => {
    expect(
      getQuoteIssuanceState({
        serviceTab: 'manpower-tab',
        issuanceContext: {
          is_grandfathered: true,
          requires_approval: true,
          required_step: 'bd',
          reasons: ['The selected manpower rate requires management approval.'],
        },
      }),
    ).toEqual({
      blocked: true,
      message:
        'BD approval is required. The selected manpower rate requires management approval.',
    })
  })

  it('requires editing when a current quote has no estimated cost', () => {
    expect(
      getQuoteIssuanceState({
        serviceTab: 'equipment-tab',
        issuanceContext: { estimated_cost_required: true },
      }),
    ).toEqual({
      blocked: true,
      message: 'Add an estimated total cost before issuing this current-policy quotation.',
    })
  })
})
