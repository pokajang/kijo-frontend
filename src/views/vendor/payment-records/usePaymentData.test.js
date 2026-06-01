import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPaymentsForPeriod } from './usePaymentData'

const detailPageMocks = vi.hoisted(() => ({
  fetchJson: vi.fn(),
  fetchAllPagedRecords: vi.fn(),
}))

vi.mock('../../../utils/detailPages', () => ({
  fetchJson: detailPageMocks.fetchJson,
  fetchAllPagedRecords: detailPageMocks.fetchAllPagedRecords,
}))

describe('usePaymentData period loading', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('omits year for all-time and delegates to the all-pages loader', async () => {
    detailPageMocks.fetchJson.mockResolvedValue({
      status: 'success',
      staff: { roles: ['Manager'] },
    })
    detailPageMocks.fetchAllPagedRecords.mockResolvedValue([{ payment_id: 1 }, { payment_id: 2 }])

    await expect(
      loadPaymentsForPeriod('https://example.test/', {
        preset: 'all',
        startDate: '',
        endDate: '',
      }),
    ).resolves.toEqual({
      staffRoles: ['Manager'],
      payments: [{ payment_id: 1 }, { payment_id: 2 }],
    })
    expect(detailPageMocks.fetchJson).toHaveBeenCalledWith(
      expect.stringContaining('vendor-payments?per_page=1'),
    )
    expect(detailPageMocks.fetchJson.mock.calls[0][0]).not.toContain('year=')
    expect(detailPageMocks.fetchAllPagedRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('vendor-payments'),
        params: {},
        dataKeys: ['history', 'data'],
        perPage: 100,
      }),
    )
  })
})
