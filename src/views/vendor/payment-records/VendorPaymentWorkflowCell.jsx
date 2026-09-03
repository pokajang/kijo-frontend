import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'
import VendorPaymentWorkflowDialog from './VendorPaymentWorkflowDialog'
import { getVendorPaymentWorkflowSummary } from './vendorPaymentWorkflow'

const VendorPaymentWorkflowCell = ({ payment, actions = [] }) => {
  const [dialogVisible, setDialogVisible] = useState(false)
  const summary = getVendorPaymentWorkflowSummary(payment)

  const stopRowOpen = (event) => event.stopPropagation()
  const openDialog = (event) => {
    event.stopPropagation()
    setDialogVisible(true)
  }

  return (
    <div
      className="vendor-payment-workflow-cell"
      data-payment-id={payment.id || payment.payment_id || undefined}
    >
      <div className="vendor-payment-workflow-cell__summary">
        <div className="vendor-payment-workflow-cell__primary" title={summary.primary}>
          {summary.primary}
        </div>
        <div className="vendor-payment-workflow-cell__secondary">{summary.progress}</div>
        {summary.stages.length > 0 && (
          <CButton
            color="link"
            size="sm"
            className="vendor-payment-workflow-cell__view"
            data-no-row-open="true"
            aria-haspopup="dialog"
            onMouseDown={stopRowOpen}
            onClick={openDialog}
          >
            View flow
          </CButton>
        )}
      </div>

      {actions.length > 0 && (
        <div className="vendor-payment-workflow-cell__actions">
          {actions.map((action) => (
            <CButton
              key={action.key}
              color={action.color}
              size="sm"
              variant="outline"
              className="py-0 px-2"
              data-no-row-open="true"
              disabled={action.disabled}
              onMouseDown={stopRowOpen}
              onClick={(event) => {
                event.stopPropagation()
                action.onClick()
              }}
            >
              {action.label}
            </CButton>
          ))}
        </div>
      )}

      <VendorPaymentWorkflowDialog
        payment={payment}
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
      />
    </div>
  )
}

VendorPaymentWorkflowCell.propTypes = {
  payment: PropTypes.object.isRequired,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.string,
      disabled: PropTypes.bool,
      onClick: PropTypes.func.isRequired,
    }),
  ),
}

export default VendorPaymentWorkflowCell
