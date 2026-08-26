import { describe, expect, it } from 'vitest'
import {
  createDraftPayload,
  formatMileageMeta,
  getClaimAttachments,
  isCompleteClaim,
  mapClaimItems,
  stateFromDraft,
  stateFromRecord,
} from './otherClaimModel'

describe('otherClaimModel', () => {
  it('retains a legacy attachment when an empty attachment array is also present', () => {
    const attachment = { name: 'receipt.pdf', dataUrl: 'data:application/pdf;base64,AA==' }
    const attachments = getClaimAttachments({ attachments: [], attachment })

    expect(attachments).toEqual([attachment])
    expect(
      mapClaimItems(
        [{ id: 'travel-1', description: 'Client visit', amount: 12, attachments: [], attachment }],
        'Expense',
      )[0].attachments,
    ).toEqual([attachment])
  })

  it('keeps legacy mileage records backward compatible as return trips', () => {
    const state = stateFromRecord({
      claimMonthValue: '2026-07',
      claims: [
        {
          id: 1,
          type: 'Mileage',
          date: '2026-07-02',
          description: 'Legacy route',
          km: 12,
          amount: 14.4,
          startLocation: 'Office',
          endLocation: 'Site',
        },
      ],
    })

    expect(state.mileageItems[0].tripMode).toBe('return')
    expect(formatMileageMeta(state.mileageItems[0])).toBe('12 KM one-way / 24 KM return')
  })

  it('round-trips travel fields through draft and API mappings', () => {
    const travelItem = {
      id: 'travel-1',
      date: '2026-07-02',
      description: 'Site inspection',
      amount: 7.2,
      km: 12,
      startLocation: 'Office',
      endLocation: 'Site',
      tripMode: 'one_way',
      travelGroupId: 'group-1',
      source: 'manual-allocation',
      sourceLabel: 'Project Alpha',
    }
    const draft = createDraftPayload({
      formData: { claimMonth: '2026-07', mileageRate: '0.60' },
      allowanceItems: [],
      expenseItems: [],
      mileageItems: [travelItem],
      medicalItems: [],
    })
    const restored = stateFromDraft(draft)
    const apiClaim = mapClaimItems(restored.mileageItems, 'Mileage')[0]

    expect(draft.schemaVersion).toBe(5)
    expect(apiClaim).toMatchObject({
      tripMode: 'one_way',
      travelGroupId: 'group-1',
      sourceLabel: 'Project Alpha',
      meta: '12 KM one-way',
    })
  })

  it('keeps a zero-distance mileage draft incomplete while allowing an expense-only trip', () => {
    const travelAnchor = {
      id: 'travel-anchor',
      type: 'Mileage',
      date: '2026-07-22',
      description: 'Client arrival',
      km: 0,
      startLocation: 'Office',
      endLocation: 'Airport',
      travelGroupId: 'travel-group',
    }
    const linkedExpense = {
      id: 'travel-expense',
      type: 'Expense',
      date: '2026-07-22',
      description: 'Taxi: Client arrival',
      amount: 18,
      travelGroupId: 'travel-group',
    }

    expect(isCompleteClaim(travelAnchor)).toBe(false)
    expect(isCompleteClaim(linkedExpense)).toBe(true)
  })
})
