import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'

import { fetchEquipmentQuotes } from '../services/quoteService'
import { fetchQuoteApprovals } from '../services/quoteApprovalService'
import { useRecordDetailsData } from './useRecordDetailsData'

let locationState = null

vi.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/crm/records/equipment-supply/30',
    search: '',
    hash: '',
    state: locationState,
  }),
  useParams: () => ({ serviceTab: 'equipment-supply', recordId: '30' }),
}))

vi.mock('../services/quoteService', () => ({
  fetchEquipmentQuotes: vi.fn(),
  fetchIHQuotes: vi.fn(),
  fetchManpowerQuotes: vi.fn(),
  fetchSpecialQuotes: vi.fn(),
  fetchTrainingQuotes: vi.fn(),
}))

vi.mock('../services/quoteApprovalService', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, fetchQuoteApprovals: vi.fn() }
})

const quote = {
  id: 30,
  serviceTab: 'equipment-tab',
  status: 'Open',
  estimatedCost: 1_000,
  grandTotal: 150,
}

beforeEach(() => {
  vi.clearAllMocks()
  locationState = null
  fetchEquipmentQuotes.mockResolvedValue([quote])
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useRecordDetailsData approval hydration', () => {
  it('merges the current approval into a directly opened quotation', async () => {
    fetchQuoteApprovals.mockResolvedValue([
      {
        id: 38,
        service: 'equipment',
        quote_id: 30,
        status: 'pending',
        can_issue: false,
      },
    ])

    const { result } = renderHook(() => useRecordDetailsData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.record).toEqual(
      expect.objectContaining({
        id: 30,
        approval: expect.objectContaining({ id: 38, can_issue: false }),
        approvalStatusUnavailable: false,
      }),
    )
  })

  it('keeps the quotation visible but fails issuance closed when approval loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchQuoteApprovals.mockRejectedValue(new Error('Approval API unavailable'))

    const { result } = renderHook(() => useRecordDetailsData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('')
    expect(result.current.record).toEqual(
      expect.objectContaining({
        id: 30,
        approval: null,
        approvalStatusUnavailable: true,
      }),
    )
  })

  it('refreshes approval status instead of trusting stale navigation state', async () => {
    locationState = {
      record: {
        ...quote,
        approval: { id: 38, status: 'pending', can_issue: false },
        approvalStatusUnavailable: false,
      },
    }
    fetchQuoteApprovals.mockResolvedValue([
      {
        id: 38,
        service: 'equipment',
        quote_id: 30,
        status: 'approved',
        can_issue: true,
      },
    ])

    const { result } = renderHook(() => useRecordDetailsData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchQuoteApprovals).toHaveBeenCalledTimes(1)
    expect(result.current.record).toEqual(
      expect.objectContaining({
        id: 30,
        approval: expect.objectContaining({ status: 'approved', can_issue: true }),
        approvalStatusUnavailable: false,
      }),
    )
  })
})
