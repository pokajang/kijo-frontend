import React from 'react'
import { formatMoney } from '../salaryCalculations'
import { hasPaymentAmount } from './paymentSummaryViewModel'

const PaymentSummaryBatchOverview = ({ model }) => {
  const { totals, employeeCount, periodLabel } = model

  return (
    <>
      <header className="payment-summary-header">
        <h1 className="payment-summary-title">Payment Summary — {periodLabel}</h1>
      </header>

      <section className="payment-summary-batch" aria-label="Payment batch totals">
        <div className="payment-summary-batch__primary">
          <span>Total payout</span>
          <strong>{formatMoney(totals.totalPayout)}</strong>
        </div>
        <BatchMetric label="Net salaries" value={totals.netSalary} />
        {hasPaymentAmount(totals.otherClaims) && (
          <BatchMetric label="Other claims" value={totals.otherClaims} />
        )}
        <div className="payment-summary-batch__count">
          <strong>{employeeCount}</strong>
          <span>staff</span>
        </div>
      </section>
    </>
  )
}

const BatchMetric = ({ label, value }) => (
  <div className="payment-summary-batch__metric">
    <span>{label}</span>
    <strong>{formatMoney(value)}</strong>
  </div>
)

export default PaymentSummaryBatchOverview
