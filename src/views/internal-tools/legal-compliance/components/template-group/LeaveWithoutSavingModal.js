import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const LeaveWithoutSavingModal = ({
  visible,
  isSaving,
  hasUnsavedClauseForm,
  isDirty,
  onClose,
  onDiscard,
  onSaveAndLeave,
}) => (
  <CModal visible={visible} onClose={onClose} alignment="center">
    <CModalHeader closeButton={!isSaving}>
      <CModalTitle>Leave Without Saving?</CModalTitle>
    </CModalHeader>
    <CModalBody>
      {hasUnsavedClauseForm
        ? 'The active clause has unsaved changes. Save or cancel it before leaving, or discard those changes now.'
        : 'This legal group has unsaved draft changes. Save the draft before leaving, or discard those changes now.'}
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
        Stay
      </CButton>
      {isDirty && !hasUnsavedClauseForm && (
        <CButton color="secondary" size="sm" onClick={onSaveAndLeave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Template Draft and Leave'}
        </CButton>
      )}
      <CButton color="danger" variant="outline" size="sm" onClick={onDiscard} disabled={isSaving}>
        Discard Changes
      </CButton>
    </CModalFooter>
  </CModal>
)

export default LeaveWithoutSavingModal
