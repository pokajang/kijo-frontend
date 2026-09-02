import React from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'

const formatIssuedAt = (value) => {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-MY')
}

const VendorPaymentVoucherPanel = ({ payment, onPreview, onPreviewPaid }) => {
  const voucher = payment?.voucher
  const isVoid = voucher?.document_state === 'void'

  return (
    <section
      className="vendor-payment-document-panel"
      aria-labelledby="payment-voucher-panel-title"
    >
      <div className="vendor-payment-document-panel__header">
        <div>
          <h2 id="payment-voucher-panel-title">Payment Voucher</h2>
          <p>Internal authorization document generated from the approved request.</p>
        </div>
        {voucher && (
          <span className={`badge text-bg-${isVoid ? 'danger' : 'primary'}`}>
            {isVoid ? 'Voided' : 'Authorization issued'}
          </span>
        )}
      </div>
      {!voucher ? (
        <div className="vendor-payment-document-panel__empty">
          No voucher has been generated for this request.
        </div>
      ) : (
        <div className="vendor-payment-document-panel__content">
          <div className="vendor-payment-document-panel__details">
            <dl>
              <div>
                <dt>Voucher number</dt>
                <dd>{voucher.voucher_number}</dd>
              </div>
              <div>
                <dt>Issued</dt>
                <dd>{formatIssuedAt(voucher.issued_at)}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{voucher.document_version || 1}</dd>
              </div>
              {isVoid && (
                <div>
                  <dt>Voided</dt>
                  <dd>{formatIssuedAt(voucher.voided_at)}</dd>
                </div>
              )}
            </dl>
            {isVoid && (
              <div className="alert alert-danger py-2 mt-3 mb-0" role="status">
                <strong>Not authorized for payment.</strong>
                <div className="small mt-1">
                  {voucher.void_reason || 'The payment request was cancelled.'}
                </div>
              </div>
            )}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton
              size="sm"
              color={isVoid ? 'danger' : 'primary'}
              variant="outline"
              onClick={onPreview}
            >
              {isVoid ? 'View Voided Voucher' : 'View Approved Voucher'}
            </CButton>
            {!isVoid && voucher.paid_pdf_url && (
              <CButton size="sm" color="success" variant="outline" onClick={onPreviewPaid}>
                View Paid Voucher
              </CButton>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

VendorPaymentVoucherPanel.propTypes = {
  onPreview: PropTypes.func.isRequired,
  onPreviewPaid: PropTypes.func.isRequired,
  payment: PropTypes.object,
}

export default VendorPaymentVoucherPanel
