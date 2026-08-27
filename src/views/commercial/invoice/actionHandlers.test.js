import { beforeEach, describe, expect, it, vi } from 'vitest'

import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import {
  fetchAllInvoices,
  handleDelete,
  handleMarkPaidConfirmed,
  handlePaymentReversal,
} from './actionHandlers'

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
    prompt: vi.fn(),
  },
}))
vi.mock('../../../components/toast/toastService', () => ({ showToast: vi.fn() }))

describe('invoice receivable action handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'success' }),
    })
  })

  it('records invoice payments through the shared receivable endpoint', async () => {
    const refresh = vi.fn()
    const close = vi.fn()
    const payment = {
      payment_type: 'partial',
      amount: '125.50',
      payment_date: '2026-08-04',
      request_token: 'bc0dd385-cf78-426c-8f3f-1b01df48f1ee',
    }

    await expect(handleMarkPaidConfirmed({ rawId: 12 }, payment, refresh, close)).resolves.toBe(
      true,
    )

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('receivables/invoice/12/payments'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payment) }),
    )
    expect(refresh).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledWith(false)
    expect(showToast).toHaveBeenCalledWith('Payment updated.')
  })

  it('requires a reversal reason and submits it to the ledger endpoint', async () => {
    dialog.prompt.mockResolvedValue('Wrong bank transaction')
    const refresh = vi.fn()

    await expect(handlePaymentReversal({ id: 44 }, refresh)).resolves.toBe(true)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('receivable-payments/44/reverse'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Wrong bank transaction' }),
      }),
    )
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('requires and sends a structured invoice deletion reason', async () => {
    dialog.confirm.mockResolvedValue(true)
    dialog.prompt.mockResolvedValue('Duplicate invoice')
    const refresh = vi.fn()

    await handleDelete({ id: 'INV-001' }, refresh)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('invoices'),
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          invoice_ref_no: 'INV-001',
          reason: 'Duplicate invoice',
        }),
      }),
    )
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('keeps equipment quotation and item remarks in the detail-page model', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'success',
        invoices: [
          {
            id: 12,
            invoice_ref_no: 'INV-012',
            invoice_date: '2026-08-04',
            service_type: 'Equipment Supply',
            amount: 100,
            grand_total: 100,
            quotation_remarks: 'Deliver all items together.',
            breakdown: [
              {
                item_description: 'Gas detector',
                description: 'Full catalogue description.',
                item_remarks: 'Matte navy-blue enclosure.',
                quantity: 1,
                unit_price: 100,
                subtotal: 100,
              },
            ],
          },
        ],
      }),
    })
    const setInvoices = vi.fn()

    await fetchAllInvoices(setInvoices, vi.fn())

    expect(setInvoices).toHaveBeenCalledWith([
      expect.objectContaining({
        quotationRemarks: 'Deliver all items together.',
        isEquipment: true,
        breakdown: [expect.objectContaining({ item_remarks: 'Matte navy-blue enclosure.' })],
      }),
    ])
  })
})
