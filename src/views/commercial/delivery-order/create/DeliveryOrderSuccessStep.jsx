import React from 'react'
import { CButton, CCardBody, CCardFooter } from '@coreui/react'

const DeliveryOrderSuccessStep = ({
  result,
  onReturnToList,
  onManageProject,
  onViewDeliveryOrder,
}) => (
  <>
    <CCardBody>
      <h5>Delivery Order Created</h5>
      <p className="text-body-secondary mb-0">
        Delivery order {result?.do_number || result?.do_id || ''} has been created.
      </p>
    </CCardBody>
    <CCardFooter className="d-flex justify-content-end gap-2 flex-wrap">
      <CButton color="secondary" size="sm" variant="outline" onClick={onReturnToList}>
        Return to Delivery Order List
      </CButton>
      <CButton color="secondary" size="sm" variant="outline" onClick={onManageProject}>
        Manage Project
      </CButton>
      {result?.do_id ? (
        <CButton color="primary" size="sm" onClick={onViewDeliveryOrder}>
          View Delivery Order
        </CButton>
      ) : null}
    </CCardFooter>
  </>
)

export default DeliveryOrderSuccessStep
