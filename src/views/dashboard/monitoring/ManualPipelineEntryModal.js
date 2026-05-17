import React, { useEffect, useState } from 'react'
import Select from 'react-select'
import CIcon from '@coreui/icons-react'
import { cilChevronBottom, cilChevronTop, cilPencil, cilTrash } from '@coreui/icons'
import {
  CAlert,
  CButton,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import {
  classificationLabel,
  classificationTypes as manualClassificationTypes,
  entrySourceOptions as manualEntrySourceOptions,
  entryTypes as manualEntryTypes,
  entryTypeAllowsEstimatedRm,
  formatDate as formatManualEntryDate,
  serviceCategories as manualServiceCategories,
  serviceCategoryLabel,
} from '../../marketing/pipeline/pipelineEntryUtils'

const getOptionLabel = (options, value, fallback) =>
  options.find((option) => option.value === value)?.label || fallback || value || '-'

const formatRmValue = (value) =>
  value === '' || value === null || value === undefined ? '-' : Number(value || 0).toLocaleString()

const sourceSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 2000 }),
  control: (base) => ({ ...base, minHeight: 37 }),
  singleValue: (base) => ({ ...base, maxWidth: 'calc(100% - 8px)' }),
}

const ScreenshotProofThumbnail = ({ file, prospectName, onPreview }) => {
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(nextPreviewUrl)

    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [file])

  if (!previewUrl) return null

  return (
    <button
      type="button"
      className="d-inline-flex flex-shrink-0 border-0 bg-transparent p-0"
      title="View screenshot proof"
      onClick={() => onPreview(file, prospectName)}
    >
      <img
        src={previewUrl}
        alt={`Screenshot proof for ${prospectName}`}
        className="rounded border bg-white"
        style={{ width: 132, height: 92, objectFit: 'cover' }}
      />
    </button>
  )
}

const ScreenshotProofPreviewModal = ({ preview, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!preview?.file) {
      setPreviewUrl('')
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(preview.file)
    setPreviewUrl(nextPreviewUrl)

    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [preview])

  return (
    <CModal visible={Boolean(preview)} onClose={onClose} alignment="center" size="xl">
      <CModalHeader>
        <CModalTitle>{preview?.prospectName || 'Screenshot Proof'}</CModalTitle>
      </CModalHeader>
      <CModalBody className="text-center">
        {previewUrl && (
          <img
            src={previewUrl}
            alt={`Screenshot proof for ${preview?.prospectName || 'entry'}`}
            className="img-fluid rounded border bg-white"
            style={{ maxHeight: 'calc(100vh - 190px)', objectFit: 'contain' }}
          />
        )}
      </CModalBody>
    </CModal>
  )
}

const ManualPipelineEntryModal = ({
  visible,
  manualError,
  manualForm,
  manualSaving,
  proofCompressing,
  proofInputKey,
  maxManualEntryDate,
  startDate,
  pendingManualEntryCount,
  editingBatchIndex,
  onAddDraftToBatch,
  onBulkEntries,
  onCancelBatchEdit,
  onClearProofFile,
  onClose,
  onDraftChange,
  onEditBatchRow,
  onFormChange,
  onProofFileChange,
  onRemoveBatchRow,
  onSave,
}) => {
  const [proofPreview, setProofPreview] = useState(null)
  const [expandedBatchRows, setExpandedBatchRows] = useState(() => new Set())
  const selectedManualEntryTypeLabel =
    manualEntryTypes.find((type) => type.value === manualForm.entry_type)?.label || 'Lead'
  const selectedManualClassificationLabel = classificationLabel(manualForm.segment_type)
  const selectedManualSource =
    manualEntrySourceOptions.find((source) => source.value === manualForm.source) || null
  const showEstimatedRm = entryTypeAllowsEstimatedRm(manualForm.entry_type)

  useEffect(() => {
    if (!visible) {
      setExpandedBatchRows(new Set())
      setProofPreview(null)
    }
  }, [visible])

  const toggleExpandedBatchRow = (rowId) => {
    setExpandedBatchRows((current) => {
      const nextExpandedRows = new Set(current)
      if (nextExpandedRows.has(rowId)) {
        nextExpandedRows.delete(rowId)
      } else {
        nextExpandedRows.add(rowId)
      }
      return nextExpandedRows
    })
  }

  return (
    <>
      <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static" size="lg">
        <CModalHeader>
          <CModalTitle>Add Manual Pipeline Entry</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {manualError && (
            <CAlert color="danger" className="py-2">
              {manualError}
            </CAlert>
          )}
          <CForm>
            <div className="row g-3 mb-3">
              <div className="col-6 col-lg-2">
                <CFormSelect
                  label="Entry type"
                  value={manualForm.entry_type}
                  onChange={(event) => onFormChange({ entry_type: event.target.value })}
                >
                  {manualEntryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <div className="col-6 col-lg-4">
                <CFormInput
                  type="date"
                  label="Entry date"
                  value={manualForm.entry_date}
                  min={startDate || undefined}
                  max={maxManualEntryDate || undefined}
                  onChange={(event) => onFormChange({ entry_date: event.target.value })}
                />
              </div>
              <div className="col-6 col-lg-3">
                <label className="form-label" htmlFor="manual-pipeline-entry-source">
                  Source
                </label>
                <Select
                  inputId="manual-pipeline-entry-source"
                  classNamePrefix="react-select"
                  options={manualEntrySourceOptions}
                  value={selectedManualSource}
                  placeholder="Select Source..."
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                  menuPosition="fixed"
                  styles={sourceSelectStyles}
                  onChange={(option) => onFormChange({ source: option?.value || '' })}
                />
              </div>
              <div className="col-6 col-lg-3">
                <CFormSelect
                  label="Classification"
                  value={manualForm.segment_type}
                  onChange={(event) => onFormChange({ segment_type: event.target.value })}
                >
                  {manualClassificationTypes.map((classification) => (
                    <option key={classification.value || 'none'} value={classification.value}>
                      {classification.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
              <div className="fw-semibold">Prospects</div>
              <div className="text-muted">Up to 5 entries per quick add</div>
            </div>

            <div className="rounded border bg-light p-3 monitoring-manual-entry-editor">
              <style>{`
              .monitoring-manual-entry-editor .form-label {
                margin-bottom: 0.35rem;
              }
            `}</style>
              <div className="row g-3">
                <div className="col-md-4">
                  <CFormInput
                    label="Company / prospect"
                    placeholder="Example: ABC Manufacturing Sdn Bhd"
                    maxLength={191}
                    value={manualForm.draft.prospect_name}
                    onChange={(event) => onDraftChange({ prospect_name: event.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <CFormSelect
                    label="Service category"
                    value={manualForm.draft.service_category}
                    onChange={(event) => onDraftChange({ service_category: event.target.value })}
                  >
                    {manualServiceCategories.map((service) => (
                      <option key={service.value || 'none'} value={service.value}>
                        {service.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
                {showEstimatedRm && (
                  <div className="col-md-4">
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      label="Estimated RM"
                      placeholder="0.00"
                      value={manualForm.draft.estimated_rm}
                      onChange={(event) => onDraftChange({ estimated_rm: event.target.value })}
                    />
                  </div>
                )}
                <div className="col-md-8">
                  <CFormTextarea
                    label="Notes"
                    placeholder="Optional context, e.g. referral source, requested service, or next action"
                    rows={2}
                    maxLength={2000}
                    style={{ resize: 'none' }}
                    value={manualForm.draft.notes}
                    onChange={(event) => onDraftChange({ notes: event.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <CFormInput
                    key={proofInputKey}
                    type="file"
                    accept="image/*"
                    label="Screenshot Proof"
                    disabled={proofCompressing}
                    onChange={(event) => onProofFileChange(event.target.files?.[0] || null)}
                  />
                  {proofCompressing && (
                    <div className="text-muted mt-1">Compressing screenshot proof...</div>
                  )}
                  <div className="text-muted mt-1">
                    Proof files are not restored after refresh; reattach before saving.
                  </div>
                  {manualForm.draft.photoFile && (
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <span className="text-muted text-truncate">
                        Selected: {manualForm.draft.photoFile.name}
                      </span>
                      <CButton
                        type="button"
                        size="sm"
                        color="secondary"
                        variant="ghost"
                        className="px-1 py-0"
                        onClick={onClearProofFile}
                      >
                        Clear
                      </CButton>
                    </div>
                  )}
                </div>
                <div className="col-12 d-flex align-items-end justify-content-end gap-2">
                  {editingBatchIndex !== null && (
                    <CButton
                      type="button"
                      size="sm"
                      color="secondary"
                      variant="outline"
                      onClick={onCancelBatchEdit}
                    >
                      Cancel Edit
                    </CButton>
                  )}
                  <CButton
                    type="button"
                    size="sm"
                    color="primary"
                    variant="outline"
                    onClick={onAddDraftToBatch}
                    disabled={
                      proofCompressing ||
                      (editingBatchIndex === null && manualForm.batch.length >= 5) ||
                      !manualForm.source.trim() ||
                      !manualForm.draft.prospect_name.trim()
                    }
                  >
                    {editingBatchIndex === null ? 'Add to Batch' : 'Update Batch'}
                  </CButton>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <div className="fw-semibold">Batch Review</div>
                <div className="text-muted">{pendingManualEntryCount}/5 ready</div>
              </div>
              {manualForm.batch.length === 0 ? (
                <div className="rounded bg-light text-muted px-3 py-2">No batch entries yet.</div>
              ) : (
                <div className="rounded border overflow-hidden">
                  {manualForm.batch.map((entry, index) => {
                    const isEditingRow = index === editingBatchIndex
                    const isExpanded =
                      isEditingRow ||
                      index === manualForm.batch.length - 1 ||
                      expandedBatchRows.has(entry.rowId)
                    const isCollapsed = !isExpanded
                    const canToggle = index < manualForm.batch.length - 1 && !isEditingRow
                    const entryTypeLabel = getOptionLabel(
                      manualEntryTypes,
                      entry.entry_type,
                      selectedManualEntryTypeLabel,
                    )
                    const classification = getOptionLabel(
                      manualClassificationTypes,
                      entry.segment_type,
                      selectedManualClassificationLabel,
                    )
                    const serviceCategory = serviceCategoryLabel(entry.service_category)

                    return (
                      <div
                        key={entry.rowId || `${entry.prospect_name}-${index}`}
                        className={`d-flex align-items-start justify-content-between gap-3 px-3 py-2 border-bottom bg-light ${
                          isEditingRow ? 'border-start border-primary border-3' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-grow-1">
                          <div className="fw-semibold text-truncate">
                            {index + 1}. {entry.prospect_name}{' '}
                            <span className="fw-normal text-muted">
                              | {entryTypeLabel} | {formatManualEntryDate(entry.entry_date)} |{' '}
                              {entry.source || '-'}
                              {isCollapsed
                                ? ` | ${classification} | ${serviceCategory} | RM ${formatRmValue(entry.estimated_rm)}`
                                : ''}
                              {isEditingRow ? ' | Editing' : ''}
                            </span>
                          </div>
                          {!isCollapsed && (
                            <>
                              <div className="text-muted text-truncate">
                                Classification: {classification} | Screenshot Proof:{' '}
                                {entry.photoFile?.name || '-'} | Service: {serviceCategory} | RM:{' '}
                                {formatRmValue(entry.estimated_rm)}
                              </div>
                              <div className="text-muted text-truncate">
                                Notes: {entry.notes || '-'}
                              </div>
                            </>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ScreenshotProofThumbnail
                            file={entry.photoFile}
                            prospectName={entry.prospect_name}
                            onPreview={(file, prospectName) =>
                              setProofPreview({ file, prospectName })
                            }
                          />
                        )}
                        {canToggle && (
                          <CButton
                            size="sm"
                            color="secondary"
                            variant="ghost"
                            className="px-2 flex-shrink-0"
                            title={isCollapsed ? 'Expand batch row' : 'Collapse batch row'}
                            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${entry.prospect_name}`}
                            onClick={() => toggleExpandedBatchRow(entry.rowId)}
                          >
                            <CIcon
                              icon={isCollapsed ? cilChevronBottom : cilChevronTop}
                              size="sm"
                            />
                          </CButton>
                        )}
                        <CButton
                          size="sm"
                          color="primary"
                          variant="ghost"
                          className="px-2 flex-shrink-0"
                          title="Edit batch row"
                          aria-label={`Edit ${entry.prospect_name}`}
                          disabled={manualSaving || proofCompressing}
                          onClick={() => onEditBatchRow(index)}
                        >
                          <CIcon icon={cilPencil} size="sm" />
                        </CButton>
                        <CButton
                          size="sm"
                          color="danger"
                          variant="ghost"
                          className="px-2 flex-shrink-0"
                          title="Remove from batch"
                          aria-label={`Remove ${entry.prospect_name}`}
                          disabled={manualSaving}
                          onClick={() => onRemoveBatchRow(index)}
                        >
                          <CIcon icon={cilTrash} size="sm" />
                        </CButton>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="d-flex align-items-center justify-content-between gap-2 mt-3">
              <CButton
                color="link"
                size="sm"
                className="p-0 text-decoration-none"
                style={{ cursor: 'pointer' }}
                onClick={onBulkEntries}
              >
                Bulk Entries
              </CButton>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={onClose}
            disabled={manualSaving}
          >
            Cancel
          </CButton>
          <CButton
            size="sm"
            color="primary"
            onClick={onSave}
            disabled={
              manualSaving ||
              proofCompressing ||
              editingBatchIndex !== null ||
              !manualForm.source.trim() ||
              pendingManualEntryCount === 0 ||
              pendingManualEntryCount > 5
            }
          >
            {manualSaving ? 'Saving...' : 'Save Entries'}
          </CButton>
        </CModalFooter>
      </CModal>
      <ScreenshotProofPreviewModal preview={proofPreview} onClose={() => setProofPreview(null)} />
    </>
  )
}

export default ManualPipelineEntryModal
