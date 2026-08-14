import React from 'react'
import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

const LegacyQuotationCostModal = ({
  visible,
  mode = 'legacy',
  record,
  onCancel,
  onEdit,
  onGenerate,
}) => {
  const requiresCurrentCost = mode === 'cost-required'
  const reference = record?.quotationId || record?.quoteRefNo || record?.quote_ref_no

  return (
    <CModal
      alignment="center"
      backdrop="static"
      visible={visible}
      onClose={onCancel}
      aria-labelledby="legacy-quotation-cost-title"
    >
      <CModalHeader>
        <CModalTitle id="legacy-quotation-cost-title">
          {requiresCurrentCost
            ? 'Estimated internal cost required'
            : 'Estimated internal cost is not recorded'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CAlert color="info" className="mb-3">
          {requiresCurrentCost
            ? 'This quotation uses the current approval policy but has no estimated internal cost.'
            : 'This quotation was created before estimated-cost tracking. Its customer price is unchanged.'}
        </CAlert>
        <p className="mb-2">
          {requiresCurrentCost
            ? 'Edit the quotation and enter its estimated cost before generating the PDF.'
            : 'You can generate the PDF using the legacy policy, or edit the quotation and move it to the current approval rules.'}
        </p>
        {reference ? (
          <p className="small text-body-secondary mb-0">Quotation: {reference}</p>
        ) : null}
      </CModalBody>
      <CModalFooter className="d-flex flex-wrap gap-2">
        <CButton color="secondary" variant="outline" onClick={onCancel}>
          Cancel
        </CButton>
        <CButton color="secondary" onClick={onEdit}>
          Edit quotation
        </CButton>
        {!requiresCurrentCost && (
          <CButton color="primary" onClick={onGenerate}>
            Generate PDF
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default LegacyQuotationCostModal
