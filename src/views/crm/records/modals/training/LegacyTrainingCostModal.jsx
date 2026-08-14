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

const LegacyTrainingCostModal = ({
  visible,
  mode = 'legacy',
  record,
  onCancel,
  onEdit,
  onGenerate,
}) => {
  const requiresCurrentCost = mode === 'cost-required'

  return (
    <CModal
      alignment="center"
      backdrop="static"
      visible={visible}
      onClose={onCancel}
      aria-labelledby="legacy-training-cost-title"
    >
      <CModalHeader>
        <CModalTitle id="legacy-training-cost-title">
          {requiresCurrentCost
            ? 'Estimated internal cost required'
            : 'Estimated internal cost isn’t recorded'}
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
            ? 'Edit the quotation and add an estimated cost before generating its PDF.'
            : 'You can generate the PDF using the legacy policy, or edit the quotation to add an estimated cost and move it to the current approval rules.'}
        </p>
        {record?.quoteRefNo ? (
          <p className="small text-body-secondary mb-0">Quotation: {record.quoteRefNo}</p>
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

export default LegacyTrainingCostModal
