import React, { useMemo } from 'react'
import PaymentSummaryBatchOverview from './PaymentSummaryBatchOverview'
import PaymentSummaryEmployeeList from './PaymentSummaryEmployeeList'
import { paymentSummaryViewModel } from './paymentSummaryViewModel'

const PaymentSummaryDocument = ({ record, showPrivateMetadata = false, resolveAttachmentUrl }) => {
  const model = useMemo(() => paymentSummaryViewModel(record), [record])

  return (
    <article className="payment-summary-document">
      <PaymentSummaryBatchOverview model={model} />
      {showPrivateMetadata && <FinanceMetadata record={record} />}
      <PaymentSummaryEmployeeList
        employees={model.employees}
        status={record.status}
        resolveAttachmentUrl={resolveAttachmentUrl}
      />
      <footer className="payment-summary-footer">
        Prepared by Finance <span aria-hidden="true">·</span> Secure read-only summary
      </footer>
    </article>
  )
}

const FinanceMetadata = ({ record }) => {
  const items = [
    ['Recipient', record.recipientName || 'Configured recipient'],
    ['Link status', record.status],
    ['Viewed', `${record.viewCount || 0} times`],
    [
      record.revocationReason ? 'Revocation reason' : 'Revision remarks',
      record.revocationReason || record.remarks,
    ],
  ].filter(([, value]) => value)

  return (
    <dl className="payment-summary-private-meta">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default PaymentSummaryDocument
