import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { formatMoney } from '../../../utils/formatters/numberFormatters'
import {
  generateVendorPaymentVoucher,
  newVendorPaymentRequestKey,
} from '../payment-records/vendorPaymentApi'

const GeneratePaymentVoucherDialog = ({ visible, payment, onClose, onGenerated }) => {
  const [submitting, setSubmitting] = useState(false)
  const submitInFlightRef = useRef(false)
  const [error, setError] = useState('')
  const [requestKey, setRequestKey] = useState(() =>
    newVendorPaymentRequestKey('vendor-payment-voucher'),
  )

  useEffect(() => {
    if (!visible) return
    setError('')
    setRequestKey(newVendorPaymentRequestKey('vendor-payment-voucher'))
  }, [payment?.id, visible])

  const handleGenerate = async () => {
    if (submitting || submitInFlightRef.current) return

    submitInFlightRef.current = true
    setSubmitting(true)
    setError('')
    try {
      const result = await generateVendorPaymentVoucher(payment, requestKey)
      await onGenerated?.(result?.data)
    } catch (requestError) {
      setError(requestError?.message || 'Unable to generate the payment voucher.')
    } finally {
      submitInFlightRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={submitting ? undefined : onClose}
      backdrop="static"
      scrollable
      aria-labelledby="generate-payment-voucher-title"
    >
      <CModalHeader>
        <CModalTitle id="generate-payment-voucher-title">Generate Payment Voucher</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-body-secondary">
          This creates the internal authorization document. It does not record the bank transfer or
          mark this request as paid.
        </p>
        {error && (
          <CAlert color="danger" role="alert">
            {error}
          </CAlert>
        )}
        <dl className="vendor-payment-confirmation-grid mb-0">
          <div>
            <dt>Payment to</dt>
            <dd>{payment?.vendor_name || '-'}</dd>
          </div>
          <div>
            <dt>Approved amount</dt>
            <dd>{formatMoney(payment?.amount)}</dd>
          </div>
          <div>
            <dt>Project / context</dt>
            <dd>{payment?.project_name || payment?.payment_context || '-'}</dd>
          </div>
          <div>
            <dt>Proposed method</dt>
            <dd>{payment?.method || '-'}</dd>
          </div>
          <div className="vendor-payment-confirmation-grid__wide">
            <dt>Purpose</dt>
            <dd>{payment?.remarks || '-'}</dd>
          </div>
        </dl>
      </CModalBody>
      <CModalFooter>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </CButton>
        <CButton size="sm" color="primary" onClick={handleGenerate} disabled={submitting}>
          {submitting ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Generating…
            </>
          ) : (
            'Generate Voucher'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

GeneratePaymentVoucherDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  onGenerated: PropTypes.func,
  payment: PropTypes.object,
  visible: PropTypes.bool,
}

export default GeneratePaymentVoucherDialog
