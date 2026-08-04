import React from 'react'
import PropTypes from 'prop-types'
import DebtorUpdatePaymentModal from '../../debtors/DebtorUpdatePaymentModal'

const MarkPaidModal = ({ visible, onClose, invoice, onConfirmed, onReverse }) => {
  const [submitting, setSubmitting] = React.useState(false)

  if (!invoice) return null

  const debtor = {
    sourceType: 'invoice',
    sourceId: invoice.rawId ?? invoice.raw?.id,
    invoiceRef: invoice.id ?? invoice.raw?.invoice_ref_no,
    client: invoice.requestor?.company?.name ?? invoice.raw?.client_name,
    grandTotal: Number(invoice.grandTotal ?? invoice.raw?.grand_total ?? 0),
    paidTotal: Number(invoice.raw?.paid_amount ?? 0),
    outstandingAmount: Number(
      invoice.raw?.outstanding_amount ??
        Math.max(
          0,
          Number(invoice.grandTotal ?? invoice.raw?.grand_total ?? 0) -
            Number(invoice.raw?.paid_amount ?? 0),
        ),
    ),
    paymentStatus: invoice.status,
  }

  const handleConfirm = async (payment) => {
    setSubmitting(true)
    try {
      return await onConfirmed(invoice, payment)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReverse = async (payment) => {
    if (!onReverse) return false
    setSubmitting(true)
    try {
      return await onReverse(payment)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DebtorUpdatePaymentModal
      visible={visible}
      debtor={debtor}
      submitting={submitting}
      onClose={onClose}
      onConfirm={handleConfirm}
      onReverse={handleReverse}
    />
  )
}

MarkPaidModal.propTypes = {
  invoice: PropTypes.object,
  onClose: PropTypes.func,
  onConfirmed: PropTypes.func.isRequired,
  onReverse: PropTypes.func,
  visible: PropTypes.bool,
}

export default MarkPaidModal
