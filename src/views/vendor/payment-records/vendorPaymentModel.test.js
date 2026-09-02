import { describe, expect, it } from 'vitest'
import {
  getVendorPaymentBalance,
  getVendorPaymentNextAction,
  getVendorPaymentStage,
} from './vendorPaymentModel'

describe('vendorPaymentModel', () => {
  it('distinguishes an approved request requiring a voucher from one awaiting settlement', () => {
    expect(getVendorPaymentStage({ status: 'Approved' }).label).toBe('Approved — Voucher Required')
    expect(getVendorPaymentStage({ status: 'Approved', voucher: { id: 8 } }).label).toBe(
      'Approved — Awaiting Payment',
    )
    expect(getVendorPaymentStage({ status: 'Approved', voucher_issued: true }).label).toBe(
      'Approved — Awaiting Payment',
    )
  })

  it('uses backend permissions to choose the single primary next action', () => {
    expect(
      getVendorPaymentNextAction({
        status: 'Approved',
        permissions: { can_generate_voucher: true },
      }),
    ).toMatchObject({ key: 'generate-voucher', label: 'Generate Payment Voucher' })

    expect(
      getVendorPaymentNextAction({
        status: 'Approved',
        voucher: { id: 8 },
        permissions: { can_record_payment: true },
      }),
    ).toMatchObject({ key: 'record-payment', label: 'Record Payment' })
  })

  it('calculates the remaining balance without exposing a negative amount', () => {
    expect(getVendorPaymentBalance({ amount: 100, paid_amount: 35.25 })).toEqual({
      approved: 100,
      paid: 35.25,
      remaining: 64.75,
    })
    expect(getVendorPaymentBalance({ amount: 100, paid_amount: 110 }).remaining).toBe(0)
  })
})
