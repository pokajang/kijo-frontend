import React from 'react'
import PropTypes from 'prop-types'
import {
  CBadge,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import VendorPaymentWorkflowTimeline from './VendorPaymentWorkflowTimeline'
import { getVendorPaymentWorkflowSummary } from './vendorPaymentWorkflow'

const VendorPaymentWorkflowDialog = ({ payment = {}, visible = false, onClose }) => {
  const summary = getVendorPaymentWorkflowSummary(payment)
  const paymentReference = payment.id || payment.payment_id
  const vendorName = payment.vendor || payment.vendor_name || 'Vendor payment'

  return (
    <CModal
      className="vendor-payment-workflow-dialog"
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      scrollable
    >
      <CModalHeader closeButton>
        <div>
          <CModalTitle>Payment workflow</CModalTitle>
          <div className="vendor-payment-workflow-dialog__subtitle">
            {vendorName}
            {paymentReference ? ` · Request #${paymentReference}` : ''}
          </div>
        </div>
      </CModalHeader>
      <CModalBody>
        <div className="vendor-payment-workflow-summary">
          <div>
            <div className="vendor-payment-workflow-summary__label">Current stage</div>
            <div className="vendor-payment-workflow-summary__value">{summary.primary}</div>
          </div>
          <div className="vendor-payment-workflow-summary__progress">
            <CBadge color={summary.currentStage ? 'primary' : 'secondary'} shape="rounded-pill">
              {summary.progress}
            </CBadge>
          </div>
        </div>

        <VendorPaymentWorkflowTimeline payment={payment} stages={summary.stages} />
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

VendorPaymentWorkflowDialog.propTypes = {
  payment: PropTypes.object,
  visible: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
}

export default VendorPaymentWorkflowDialog
