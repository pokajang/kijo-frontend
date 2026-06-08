import React from 'react'
import { CButton, CCardBody, CCardFooter } from '@coreui/react'

const InvoiceSuccessStep = ({ invoice, onReturnToList, onManageProject }) => (
  <>
    <CCardBody>
      <div className="h5 mb-2">Invoice Created</div>
      <div className="text-body-secondary">
        Invoice {invoice?.invoiceRefNo || invoice?.invoiceId || ''} was created successfully.
      </div>
      {invoice?.projectClosed ? (
        <div className="text-body-secondary mt-2">Project status was marked Completed.</div>
      ) : null}
    </CCardBody>
    <CCardFooter className="d-flex justify-content-end gap-2">
      <CButton color="secondary" variant="outline" size="sm" onClick={onReturnToList}>
        Return to Invoice List
      </CButton>
      <CButton color="primary" size="sm" onClick={onManageProject}>
        Manage Project
      </CButton>
    </CCardFooter>
  </>
)

export default InvoiceSuccessStep
