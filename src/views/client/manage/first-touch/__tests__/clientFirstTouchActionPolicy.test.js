import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getClientFirstTouchRowActions } from '../clientFirstTouchActionPolicy'

const handlers = {
  onSubmit: vi.fn(),
  onDispute: vi.fn(),
  onReviewConflict: vi.fn(),
}

const record = (hasFirstTouch = true) => ({
  companyId: 399,
  companyName: 'Example Client',
  firstTouch: hasFirstTouch ? { id: 1001, status: 'current', proofCount: 1 } : null,
})

const labelsFor = (hasFirstTouch, permissions) =>
  getClientFirstTouchRowActions(record(hasFirstTouch), { ...handlers, permissions }).map(
    (action) => action.label,
  )

describe('clientFirstTouchActionPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers only evidence submission for an undocumented client', () => {
    expect(labelsFor(false)).toEqual(['Submit Evidence'])
  })

  it('offers the three agreed evidence actions for a documented client', () => {
    expect(labelsFor(true)).toEqual(['Submit Evidence', 'Edit Evidence', 'Dispute Evidence'])
  })

  it('honours evidence permissions independently', () => {
    expect(
      labelsFor(true, {
        canSubmitEvidence: false,
        canEditEvidence: true,
        canDisputeEvidence: false,
      }),
    ).toEqual(['Edit Evidence'])
  })

  it('uses server-provided record permissions by default', () => {
    const restrictedRecord = {
      ...record(true),
      permissions: {
        canSubmitEvidence: true,
        canEditEvidence: false,
        canDisputeEvidence: true,
      },
    }

    expect(
      getClientFirstTouchRowActions(restrictedRecord, handlers).map((action) => action.label),
    ).toEqual(['Submit Evidence', 'Dispute Evidence'])
  })

  it('offers conflict review only to an authorized reviewer', () => {
    const contestedRecord = {
      ...record(true),
      firstTouch: { ...record(true).firstTouch, status: 'contested' },
      conflict: { id: 42, status: 'open' },
      permissions: { canReviewConflict: true },
    }

    const actions = getClientFirstTouchRowActions(contestedRecord, handlers)

    expect(actions.map((item) => item.label)).toEqual(['Review Conflict', 'Submit Evidence'])
    actions.find((item) => item.key === 'review-conflict').onClick()
    expect(handlers.onReviewConflict).toHaveBeenCalledWith(contestedRecord)
  })

  it('routes each action through its handler with the correct context', () => {
    const currentRecord = record(true)
    const actions = getClientFirstTouchRowActions(currentRecord, handlers)

    actions.find((item) => item.key === 'submit-evidence').onClick()
    actions.find((item) => item.key === 'edit-evidence').onClick()
    actions.find((item) => item.key === 'dispute-evidence').onClick()

    expect(handlers.onSubmit).toHaveBeenNthCalledWith(1, currentRecord, 'competing')
    expect(handlers.onSubmit).toHaveBeenNthCalledWith(2, currentRecord, 'edit')
    expect(handlers.onDispute).toHaveBeenCalledWith(currentRecord)
  })
})
