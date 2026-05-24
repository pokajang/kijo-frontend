import React from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import {
  getDefaultDisclaimerText,
  getDefaultReportTitle,
  normalizeAssessmentTier,
} from '../../legalComplianceTemplateUtils'

const formatHistoryDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TemplateDetailModals = ({
  isSaving,
  isEditDetailsModalVisible,
  closeEditDetailsModal,
  updateTemplateDetails,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editTier,
  setEditTier,
  editReportTitle,
  setEditReportTitle,
  editDisclaimerText,
  setEditDisclaimerText,
  isGroupNameModalVisible,
  closeGroupNameModal,
  saveGroupName,
  editingGroupIndex,
  groupName,
  setGroupName,
  pendingNavigation,
  setPendingNavigation,
  getLeaveWarning,
  isDirty,
  discardAndContinueNavigation,
  saveAndContinueNavigation,
  stayAndPublish,
  isPublishModalVisible,
  setIsPublishModalVisible,
  publishValidationErrors,
  setPublishValidationErrors,
  publishModalError,
  setPublishModalError,
  publishChangeNote,
  setPublishChangeNote,
  template,
  publishTemplate,
  isMetadataModalVisible,
  setIsMetadataModalVisible,
  deleteGroupIndex,
  setDeleteGroupIndex,
  groups,
  removeGroup,
}) => (
  <>
    <CModal visible={isEditDetailsModalVisible} onClose={closeEditDetailsModal} alignment="center">
      <form onSubmit={updateTemplateDetails}>
        <CModalHeader closeButton={!isSaving}>
          <CModalTitle>Edit Template Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel>Template Name</CFormLabel>
              <CFormInput
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Enter template name"
                disabled={isSaving}
                autoFocus
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Description</CFormLabel>
              <CFormInput
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Enter template description"
                disabled={isSaving}
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Assessment Tier</CFormLabel>
              <CFormSelect
                value={editTier}
                onChange={(event) => {
                  const nextTier = normalizeAssessmentTier(event.target.value)
                  const previousDefaultTitle = getDefaultReportTitle(editName.trim(), editTier)
                  setEditTier(nextTier)
                  setEditReportTitle((current) =>
                    !current.trim() || current.trim() === previousDefaultTitle
                      ? getDefaultReportTitle(editName.trim(), nextTier)
                      : current,
                  )
                  setEditDisclaimerText(getDefaultDisclaimerText(nextTier))
                }}
                disabled={isSaving}
              >
                <option value="free">Free Assessment</option>
                <option value="paid">Paid Assessment</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Report Title</CFormLabel>
              <CFormInput
                value={editReportTitle}
                onChange={(event) => setEditReportTitle(event.target.value)}
                placeholder={getDefaultReportTitle(editName.trim(), editTier)}
                disabled={isSaving}
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Disclaimer Text</CFormLabel>
              <CFormTextarea
                rows={4}
                value={editDisclaimerText}
                onChange={(event) => setEditDisclaimerText(event.target.value)}
                placeholder={getDefaultDisclaimerText(editTier)}
                disabled={isSaving}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeEditDetailsModal}
            disabled={isSaving}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" type="submit" disabled={isSaving}>
            Save
          </CButton>
        </CModalFooter>
      </form>
    </CModal>

    <CModal visible={isGroupNameModalVisible} onClose={closeGroupNameModal} alignment="center">
      <form onSubmit={saveGroupName}>
        <CModalHeader closeButton={!isSaving}>
          <CModalTitle>
            {editingGroupIndex === null ? 'Add Legislation' : 'Edit Legislation Name'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel>Legislation Name</CFormLabel>
          <CFormInput
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Occupational Safety and Health Act 1994"
            disabled={isSaving}
            autoFocus
            required
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeGroupNameModal}
            disabled={isSaving}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" type="submit" disabled={isSaving || !groupName.trim()}>
            Save
          </CButton>
        </CModalFooter>
      </form>
    </CModal>

    <CModal
      visible={Boolean(pendingNavigation)}
      onClose={() => setPendingNavigation(null)}
      alignment="center"
    >
      <CModalHeader closeButton={!isSaving}>
        <CModalTitle>{getLeaveWarning().title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{getLeaveWarning().body}</CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => setPendingNavigation(null)}
          disabled={isSaving}
        >
          Continue Editing
        </CButton>
        {isDirty && (
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={discardAndContinueNavigation}
            disabled={isSaving}
          >
            Leave Without Saving
          </CButton>
        )}
        <CButton
          color="secondary"
          size="sm"
          onClick={isDirty ? saveAndContinueNavigation : discardAndContinueNavigation}
          disabled={isSaving}
        >
          {isSaving
            ? 'Saving...'
            : isDirty
              ? pendingNavigation?.type === 'templates'
                ? 'Save Template Draft and Leave'
                : 'Save Template Draft and Continue'
              : 'Back to Templates'}
        </CButton>
        {pendingNavigation?.type === 'templates' && (
          <CButton color="primary" size="sm" onClick={stayAndPublish} disabled={isSaving}>
            Stay and Publish Template
          </CButton>
        )}
      </CModalFooter>
    </CModal>

    <CModal
      visible={isPublishModalVisible}
      onClose={() => {
        setIsPublishModalVisible(false)
        setPublishValidationErrors([])
        setPublishModalError('')
        setPublishChangeNote('')
      }}
      alignment="center"
    >
      <CModalHeader closeButton={!isSaving}>
        <CModalTitle>Publish Template</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {publishModalError ? (
          <CAlert color="danger" className="mb-0">
            {publishModalError}
          </CAlert>
        ) : publishValidationErrors.length > 0 ? (
          <>
            <p className="mb-2">Fix these items before publishing:</p>
            <ul className="mb-0">
              {publishValidationErrors.map((validationError) => (
                <li key={validationError}>{validationError}</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mb-3">
              Confirm publish this assessment template: <strong>{template?.name}</strong>?
            </p>
            <CFormLabel>What changed in this version</CFormLabel>
            <CFormTextarea
              rows={3}
              value={publishChangeNote}
              onChange={(event) => setPublishChangeNote(event.target.value)}
              placeholder="Summarise what changed in this version"
              disabled={isSaving}
            />
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsPublishModalVisible(false)
            setPublishValidationErrors([])
            setPublishModalError('')
            setPublishChangeNote('')
          }}
          disabled={isSaving}
        >
          {publishValidationErrors.length > 0 || publishModalError ? 'Close' : 'Cancel'}
        </CButton>
        {publishValidationErrors.length === 0 && !publishModalError && (
          <CButton color="primary" size="sm" onClick={publishTemplate} disabled={isSaving}>
            {isSaving ? 'Publishing...' : 'Confirm'}
          </CButton>
        )}
      </CModalFooter>
    </CModal>

    <CModal
      visible={isMetadataModalVisible}
      onClose={() => setIsMetadataModalVisible(false)}
      size="lg"
      alignment="center"
    >
      <CModalHeader>
        <CModalTitle>Change History</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {(template?.versions || []).length === 0 ? (
          <div className="text-body-secondary">No publish history yet.</div>
        ) : (
          // datatable-exempt: layout table for compact modal history
          <CTable responsive hover className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Version</CTableHeaderCell>
                <CTableHeaderCell scope="col">Changed By</CTableHeaderCell>
                <CTableHeaderCell scope="col">Published At</CTableHeaderCell>
                <CTableHeaderCell scope="col">What Changed</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {template.versions.map((version) => (
                <CTableRow key={version.id || version.version_number}>
                  <CTableDataCell>v{version.version_number}</CTableDataCell>
                  <CTableDataCell>{version.changed_by || '-'}</CTableDataCell>
                  <CTableDataCell>{formatHistoryDate(version.published_at)}</CTableDataCell>
                  <CTableDataCell>{version.change_note || '-'}</CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => setIsMetadataModalVisible(false)}
        >
          Close
        </CButton>
      </CModalFooter>
    </CModal>

    <CModal
      visible={deleteGroupIndex !== null}
      onClose={() => setDeleteGroupIndex(null)}
      alignment="center"
    >
      <CModalHeader closeButton={!isSaving}>
        <CModalTitle>Delete Legislation</CModalTitle>
      </CModalHeader>
      <CModalBody>
        Delete <strong>{groups[deleteGroupIndex]?.title || 'this legislation'}</strong> and all of
        its clauses?
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => setDeleteGroupIndex(null)}
          disabled={isSaving}
        >
          Cancel
        </CButton>
        <CButton
          color="danger"
          size="sm"
          onClick={() => removeGroup(deleteGroupIndex)}
          disabled={isSaving}
        >
          Delete
        </CButton>
      </CModalFooter>
    </CModal>
  </>
)

export default TemplateDetailModals
