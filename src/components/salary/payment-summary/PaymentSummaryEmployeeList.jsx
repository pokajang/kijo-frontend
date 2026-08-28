import React, { useState } from 'react'
import { CBadge } from '@coreui/react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatMoney } from '../salaryCalculations'
import PaymentSummaryEmployeeDetails from './PaymentSummaryEmployeeDetails'
import { hasPaymentAmount } from './paymentSummaryViewModel'

const PaymentSummaryEmployeeList = ({ employees, status, resolveAttachmentUrl }) => {
  const [expandedKey, setExpandedKey] = useState(null)

  return (
    <section className="payment-summary-employees" aria-label="Employee payouts">
      {employees.map((employee) => {
        const expanded = expandedKey === employee.key
        const detailsId = `payment-summary-details-${safeId(employee.key)}`
        return (
          <article className="payment-summary-employee" key={employee.key}>
            <div className="payment-summary-employee__summary">
              <button
                type="button"
                className="payment-summary-employee__trigger"
                aria-expanded={expanded}
                aria-controls={detailsId}
                aria-label={`${expanded ? 'Hide' : 'View'} payment details for ${employee.staffName}`}
                onClick={() => setExpandedKey(expanded ? null : employee.key)}
              />
              <div className="payment-summary-employee__identity">
                <h2>{employee.staffName}</h2>
                {employee.staffCode && <span>{employee.staffCode}</span>}
              </div>
              <EmployeeMetric label="Net salary" value={employee.totals.netSalary} />
              <EmployeeMetric
                label="Other claims"
                value={employee.totals.otherClaims}
                hidden={!hasPaymentAmount(employee.totals.otherClaims)}
              />
              <div className="payment-summary-employee__transfer">
                <span>Transfer amount</span>
                <strong>{formatMoney(employee.totals.transferAmount)}</strong>
              </div>
              <CBadge color="success" className="payment-summary-employee__status">
                {status === 'Paid' ? 'Paid' : 'Approved'}
              </CBadge>
              <span className="payment-summary-employee__toggle" aria-hidden="true">
                <span>{expanded ? 'Hide details' : 'View details'}</span>
                {expanded ? (
                  <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
                ) : (
                  <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
                )}
              </span>
            </div>
            {expanded && (
              <div id={detailsId} className="payment-summary-employee__details">
                <PaymentSummaryEmployeeDetails
                  employee={employee}
                  resolveAttachmentUrl={resolveAttachmentUrl}
                />
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}

const EmployeeMetric = ({ label, value, hidden = false }) => (
  <div className={`payment-summary-employee__metric${hidden ? ' is-empty' : ''}`}>
    {!hidden && (
      <>
        <span>{label}</span>
        <strong>{formatMoney(value)}</strong>
      </>
    )}
  </div>
)

const safeId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '-')

export default PaymentSummaryEmployeeList
