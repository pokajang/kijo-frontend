import React from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'
import {
  getVendorPaymentNextAction,
  getVendorPaymentStage,
} from '../payment-records/vendorPaymentModel'

const VendorPaymentNextActionPanel = ({ payment, onAction }) => {
  const stage = getVendorPaymentStage(payment)
  const action = getVendorPaymentNextAction(payment)

  return (
    <section
      className="vendor-payment-next-action"
      aria-labelledby="vendor-payment-next-action-title"
    >
      <div>
        <div className="vendor-payment-next-action__eyebrow">Current stage</div>
        <h2 id="vendor-payment-next-action-title">{stage.label}</h2>
        <p>{action?.help || 'No finance action is currently required from you.'}</p>
      </div>
      {action && (
        <CButton size="sm" color="primary" onClick={() => onAction(action.key)}>
          {action.label}
        </CButton>
      )}
    </section>
  )
}

VendorPaymentNextActionPanel.propTypes = {
  onAction: PropTypes.func.isRequired,
  payment: PropTypes.object.isRequired,
}

export default VendorPaymentNextActionPanel
