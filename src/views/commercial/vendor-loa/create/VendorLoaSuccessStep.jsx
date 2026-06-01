import React from 'react'
import { CButton, CCardBody, CCardFooter } from '@coreui/react'

const VendorLoaSuccessStep = ({
  origin = 'project',
  selectedVendor,
  onGenerateLoa,
  onReturnToList,
  onManageProject,
}) => (
  <>
    <CCardBody>
      <h5>Vendor LOA Created</h5>
      <p className="text-body-secondary mb-0">
        Vendor LOA details for {selectedVendor?.vendor_name || 'the selected vendor'} have been
        saved.
      </p>
    </CCardBody>
    <CCardFooter className="d-flex justify-content-end gap-2 flex-wrap">
      {origin === 'vendor-loa-list' ? (
        <CButton color="secondary" size="sm" variant="outline" onClick={onReturnToList}>
          Return to Vendor LOA List
        </CButton>
      ) : null}
      <CButton color="secondary" size="sm" variant="outline" onClick={onManageProject}>
        Manage Project
      </CButton>
      <CButton color="primary" size="sm" onClick={onGenerateLoa}>
        Generate LOA
      </CButton>
    </CCardFooter>
  </>
)

export default VendorLoaSuccessStep
