import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from '../../../components/forms/ThemedSelect'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'
import LoadingImage from '../../../components/LoadingImage'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { fetchJson } from '../../dashboard/shared/fetchUtils'
import PipelineEntriesShell from './PipelineEntriesShell'
import {
  API_BASE,
  MAX_PROOF_IMAGE_BYTES,
  classificationLabel,
  classificationTypes,
  compressProofImage,
  createBlankEntryRow,
  entrySourceOptions,
  entryTypes,
  entryTypeAllowsEstimatedRm,
  formatDate,
  getPipelineEntryValidationError,
  normalizeBulkRow,
  serviceCategories,
  serviceCategoryLabel,
  typeBadgeClass,
  typeLabel,
} from './pipelineEntryUtils'

const sourceSelectStyles = {
  container: (base) => ({ ...base, width: '100%' }),
  menuPortal: (base) => ({ ...base, zIndex: 2000 }),
  control: (base) => ({ ...base, height: 38, minHeight: 38 }),
  valueContainer: (base) => ({ ...base, height: 36, padding: '0 8px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  singleValue: (base) => ({
    ...base,
    maxWidth: 'calc(100% - 8px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  placeholder: (base) => ({
    ...base,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  indicatorsContainer: (base) => ({ ...base, height: 36, minHeight: 36 }),
}

const bulkDraftStorageKey = 'marketing.pipeline-entries.bulk-add-draft.v1'
const maxBulkSaveRows = 100

const getStorage = () => {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage || null
  } catch (err) {
    return null
  }
}

const serializeBulkRow = (row) => ({
  rowId: row.rowId || '',
  entry_type: row.entry_type || 'lead',
  entry_date: row.entry_date || '',
  source: row.source || '',
  segment_type: row.segment_type || '',
  service_category: row.service_category || '',
  estimated_rm: row.estimated_rm === null || row.estimated_rm === undefined ? '' : row.estimated_rm,
  prospect_name: row.prospect_name || '',
  notes: row.notes || '',
})

const sanitizeBulkRow = (row, fallback = createBlankEntryRow()) => ({
  ...fallback,
  rowId: typeof row?.rowId === 'string' && row.rowId ? row.rowId : fallback.rowId,
  entry_type: typeof row?.entry_type === 'string' ? row.entry_type : fallback.entry_type,
  entry_date: typeof row?.entry_date === 'string' ? row.entry_date : fallback.entry_date,
  source: typeof row?.source === 'string' ? row.source : fallback.source,
  segment_type: typeof row?.segment_type === 'string' ? row.segment_type : '',
  service_category: typeof row?.service_category === 'string' ? row.service_category : '',
  estimated_rm: entryTypeAllowsEstimatedRm(row?.entry_type)
    ? row?.estimated_rm === null || row?.estimated_rm === undefined
      ? ''
      : String(row.estimated_rm)
    : '',
  prospect_name: typeof row?.prospect_name === 'string' ? row.prospect_name : '',
  notes: typeof row?.notes === 'string' ? row.notes : '',
  photoFile: null,
  photoPreviewUrl: null,
  photoInputKey: Date.now(),
})

const readStoredBulkDraft = () => {
  const storage = getStorage()
  if (!storage) return null

  try {
    const storedValue = storage.getItem(bulkDraftStorageKey)
    if (!storedValue) return null

    const stored = JSON.parse(storedValue)
    return {
      draft: sanitizeBulkRow(stored?.draft),
      batchRows: Array.isArray(stored?.batchRows)
        ? stored.batchRows
            .map((row) => sanitizeBulkRow(row))
            .filter((row) => row.prospect_name.trim() !== '')
        : [],
    }
  } catch (err) {
    storage.removeItem(bulkDraftStorageKey)
    return null
  }
}

const writeStoredBulkDraft = (draft, batchRows) => {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(
      bulkDraftStorageKey,
      JSON.stringify({
        draft: serializeBulkRow(draft),
        batchRows: batchRows.map(serializeBulkRow),
      }),
    )
  } catch (err) {
    // Draft recovery is best effort; the page remains usable without storage.
  }
}

const clearStoredBulkDraft = () => {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(bulkDraftStorageKey)
}

const createNextDraft = (currentDraft) => ({
  ...createBlankEntryRow(),
  entry_type: currentDraft.entry_type,
  entry_date: currentDraft.entry_date,
  source: currentDraft.source,
  segment_type: currentDraft.segment_type,
  service_category: currentDraft.service_category,
  estimated_rm: entryTypeAllowsEstimatedRm(currentDraft.entry_type)
    ? currentDraft.estimated_rm
    : '',
})

const PipelineEntriesBulkAdd = () => {
  const navigate = useNavigate()
  const [initialBulkDraft] = useState(() => readStoredBulkDraft())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [proofCompressing, setProofCompressing] = useState(false)
  const [draft, setDraft] = useState(() => initialBulkDraft?.draft || createBlankEntryRow())
  const [batchRows, setBatchRows] = useState(() => initialBulkDraft?.batchRows || [])

  const draftHasProspect = draft.prospect_name.trim() !== ''
  const hasUnsavedDraft =
    draftHasProspect ||
    draft.notes.trim() !== '' ||
    String(draft.estimated_rm ?? '').trim() !== '' ||
    Boolean(draft.segment_type) ||
    Boolean(draft.service_category) ||
    Boolean(draft.photoFile) ||
    batchRows.length > 0
  const readyBulkRows = batchRows.length
  const selectedSourceOption =
    entrySourceOptions.find((source) => source.value === draft.source) || null
  const showEstimatedRm = entryTypeAllowsEstimatedRm(draft.entry_type)

  useEffect(() => {
    if (hasUnsavedDraft) {
      writeStoredBulkDraft(draft, batchRows)
    } else {
      clearStoredBulkDraft()
    }
  }, [batchRows, draft, hasUnsavedDraft])

  useEffect(() => {
    if (!hasUnsavedDraft) return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedDraft])

  const updateDraft = (updates) => {
    setDraft((current) => ({
      ...current,
      ...updates,
      ...(Object.prototype.hasOwnProperty.call(updates, 'entry_type') &&
      !entryTypeAllowsEstimatedRm(updates.entry_type)
        ? { estimated_rm: '' }
        : {}),
    }))
  }

  const clearDraft = () => {
    setDraft((current) => createNextDraft(current))
    setError('')
  }

  const addDraftToBatch = () => {
    const normalizedDraft = normalizeBulkRow(draft)
    const validationError = getPipelineEntryValidationError(normalizedDraft, {
      prospectLabel: 'Company or prospect',
    })
    if (validationError) {
      setError(validationError)
      return
    }

    const stagedDraft = {
      ...normalizedDraft,
      photoPreviewUrl: normalizedDraft.photoFile
        ? URL.createObjectURL(normalizedDraft.photoFile)
        : null,
    }

    setBatchRows((current) => [...current, stagedDraft])
    setDraft((current) => createNextDraft(current))
    setError('')
  }

  const removeBatchRow = (indexToRemove) => {
    setBatchRows((current) => {
      current[indexToRemove]?.photoPreviewUrl &&
        URL.revokeObjectURL(current[indexToRemove].photoPreviewUrl)

      return current.filter((_, index) => index !== indexToRemove)
    })
  }

  const handleProofFileChange = async (file) => {
    if (!file) {
      updateDraft({ photoFile: null, photoInputKey: Date.now() })
      return
    }

    setError('')
    setProofCompressing(true)

    try {
      const compressedFile = await compressProofImage(file)
      if (compressedFile.size > MAX_PROOF_IMAGE_BYTES) {
        setError('Screenshot proof must be 500KB or less.')
        updateDraft({ photoFile: null, photoInputKey: Date.now() })
        return
      }
      updateDraft({ photoFile: compressedFile })
    } catch (err) {
      setError('Unable to process screenshot proof.')
      updateDraft({ photoFile: null, photoInputKey: Date.now() })
    } finally {
      setProofCompressing(false)
    }
  }

  const getRowsForSave = () =>
    batchRows.map(normalizeBulkRow).filter((row) => row.prospect_name !== '')

  const saveBulkEntries = async () => {
    if (proofCompressing) {
      setError('Please wait for screenshot proof processing to finish.')
      return
    }

    const validRows = getRowsForSave()
    if (validRows.length === 0) {
      setError('Add at least one entry to batch before saving.')
      return
    }
    const validationError = validRows
      .map((row) => getPipelineEntryValidationError(row, { prospectLabel: 'Company or prospect' }))
      .find(Boolean)
    if (validationError) {
      setError(validationError)
      return
    }
    if (validRows.length > maxBulkSaveRows) {
      setError(`Save up to ${maxBulkSaveRows} entries at a time.`)
      return
    }

    setSaving(true)
    setError('')
    setSavedCount(0)

    try {
      const firstRow = validRows[0]
      const formData = new FormData()
      formData.append('entry_type', firstRow.entry_type)
      formData.append('entry_date', firstRow.entry_date)
      formData.append('source', firstRow.source)
      formData.append('segment_type', firstRow.segment_type || '')
      formData.append(
        'entries',
        JSON.stringify(
          validRows.map((row) => ({
            entry_type: row.entry_type,
            entry_date: row.entry_date,
            source: row.source,
            prospect_name: row.prospect_name,
            notes: row.notes,
            segment_type: row.segment_type || '',
            service_category: row.service_category || '',
            estimated_rm:
              entryTypeAllowsEstimatedRm(row.entry_type) && row.estimated_rm !== ''
                ? row.estimated_rm
                : null,
          })),
        ),
      )
      validRows.forEach((row, index) => {
        if (row.photoFile) {
          formData.append(`photos[${index}]`, row.photoFile)
        }
      })

      const response = await fetchJson(`${API_BASE}stats/monitoring-manual-pipeline-entry`, {
        method: 'POST',
        body: formData,
      })

      if (response?.status !== 'success') {
        throw new Error(response?.message || 'Unable to save pipeline entries.')
      }

      batchRows.forEach((row) => {
        if (row.photoPreviewUrl) {
          URL.revokeObjectURL(row.photoPreviewUrl)
        }
      })
      clearStoredBulkDraft()
      setBatchRows([])
      setDraft(createBlankEntryRow())
      setSavedCount(Number(response.inserted || validRows.length))
      setShowSavedModal(true)
    } catch (err) {
      setError(err?.message || 'Unable to save pipeline entries.')
    } finally {
      setSaving(false)
    }
  }

  const navigateWithUnsavedCheck = (path) => {
    if (
      hasUnsavedDraft &&
      !window.confirm('Discard unsaved pipeline entries and leave this page?')
    ) {
      return
    }

    navigate(path)
  }

  return (
    <PipelineEntriesShell>
      {error && (
        <CAlert color="danger" className="mb-3">
          {error}
        </CAlert>
      )}

      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <strong>Bulk Add</strong>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={saving}
            onClick={() => navigateWithUnsavedCheck('/pipeline/entries')}
          >
            Back to Records
          </CButton>
        </CCardHeader>
        <CCardBody>
          <div className="d-grid gap-3">
            <div>
              <CRow className="g-3 align-items-end">
                <CCol xs={12} md={4} xl>
                  <CFormSelect
                    label="Type"
                    value={draft.entry_type}
                    onChange={(event) => updateDraft({ entry_type: event.target.value })}
                  >
                    {entryTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={4} xl>
                  <CFormInput
                    type="date"
                    label="Date"
                    value={draft.entry_date}
                    onChange={(event) => updateDraft({ entry_date: event.target.value })}
                  />
                </CCol>
                <CCol xs={12} md={4} xl>
                  <label className="form-label" htmlFor="bulk-pipeline-entry-source">
                    Source
                  </label>
                  <Select
                    inputId="bulk-pipeline-entry-source"
                    classNamePrefix="react-select"
                    options={entrySourceOptions}
                    value={selectedSourceOption}
                    placeholder="Select Source..."
                    isClearable
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                    menuPosition="fixed"
                    styles={sourceSelectStyles}
                    onChange={(option) => updateDraft({ source: option?.value || '' })}
                  />
                </CCol>
                <CCol xs={12} md={4} xl>
                  <CFormSelect
                    label="Classification"
                    value={draft.segment_type}
                    onChange={(event) => updateDraft({ segment_type: event.target.value })}
                  >
                    {classificationTypes.map((classification) => (
                      <option key={classification.value || 'none'} value={classification.value}>
                        {classification.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={4} xl>
                  <CFormSelect
                    label="Service"
                    value={draft.service_category}
                    onChange={(event) => updateDraft({ service_category: event.target.value })}
                  >
                    {serviceCategories.map((service) => (
                      <option key={service.value || 'none'} value={service.value}>
                        {service.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                {showEstimatedRm && (
                  <CCol xs={12} md={4} xl>
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      label="Estimated RM"
                      value={draft.estimated_rm}
                      placeholder="0.00"
                      onChange={(event) => updateDraft({ estimated_rm: event.target.value })}
                    />
                  </CCol>
                )}
                <CCol xs={12} md={4} xl={4}>
                  <CFormInput
                    label="Company / Prospect"
                    value={draft.prospect_name}
                    placeholder="Example: ABC Manufacturing Sdn Bhd"
                    onChange={(event) => updateDraft({ prospect_name: event.target.value })}
                  />
                </CCol>
                <CCol xs={12} md={5} xl={5}>
                  <CFormInput
                    label="Notes"
                    value={draft.notes}
                    placeholder="Optional context, requested service, or next action"
                    onChange={(event) => updateDraft({ notes: event.target.value })}
                  />
                </CCol>
                <CCol xs={12} md={3} xl={3}>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <label className="form-label" htmlFor={`proof-${draft.rowId}`}>
                      Screenshot Proof (Optional)
                    </label>
                    {(proofCompressing || draft.photoFile?.name) && (
                      <span className="text-muted mb-2">
                        {proofCompressing ? 'Processing screenshot...' : draft.photoFile.name}
                      </span>
                    )}
                  </div>
                  <CFormInput
                    id={`proof-${draft.rowId}`}
                    key={draft.photoInputKey}
                    type="file"
                    accept="image/*"
                    disabled={proofCompressing}
                    onChange={(event) => handleProofFileChange(event.target.files?.[0] || null)}
                  />
                  <div className="text-muted mt-1">
                    Proof files are not restored after refresh; reattach before saving.
                  </div>
                </CCol>
                <CCol xs={12}>
                  <div className="d-flex justify-content-end gap-2 flex-wrap">
                    <CButton size="sm" color="secondary" variant="outline" onClick={clearDraft}>
                      Clear
                    </CButton>
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={addDraftToBatch}
                      disabled={!draftHasProspect || proofCompressing}
                    >
                      <CIcon icon={cilPlus} className="me-1" />
                      Add to Batch
                    </CButton>
                  </div>
                </CCol>
              </CRow>
            </div>

            <div>
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                <strong>Batch Review</strong>
                <span className="text-muted">{readyBulkRows} ready</span>
              </div>
              {batchRows.length === 0 ? (
                <div className="rounded-4 app-surface-panel text-muted px-3 py-3">
                  No batch entries yet. Fill the row above, then add it to the batch.
                </div>
              ) : (
                <CRow className="g-2">
                  {batchRows.map((entry, index) => (
                    <CCol
                      xs={12}
                      lg={6}
                      key={`${entry.prospect_name}-${entry.entry_date}-${index}`}
                    >
                      <div className="h-100 rounded-4 border app-surface-panel p-3">
                        <div className="d-flex align-items-start justify-content-between gap-3">
                          <div className="min-w-0">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span className="fw-semibold">
                                {index + 1}. {entry.prospect_name}
                              </span>
                              <CBadge className={typeBadgeClass(entry.entry_type)}>
                                {typeLabel(entry.entry_type)}
                              </CBadge>
                            </div>
                            <div className="text-muted">
                              {formatDate(entry.entry_date)} | {entry.source || '-'}
                            </div>
                            <div className="text-muted">
                              Classification: {classificationLabel(entry.segment_type)}
                            </div>
                            <div className="text-muted">
                              Service: {serviceCategoryLabel(entry.service_category)} | RM:{' '}
                              {entry.estimated_rm === '' || entry.estimated_rm === null
                                ? '-'
                                : Number(entry.estimated_rm || 0).toLocaleString()}
                            </div>
                            {entry.notes && (
                              <div className="text-muted text-truncate">{entry.notes}</div>
                            )}
                          </div>
                          <CButton
                            size="sm"
                            color="danger"
                            variant="ghost"
                            className="px-2 flex-shrink-0"
                            aria-label={`Remove ${entry.prospect_name}`}
                            onClick={() => removeBatchRow(index)}
                          >
                            <CIcon icon={cilTrash} size="sm" />
                          </CButton>
                        </div>
                        {entry.photoFile && (
                          <div className="mt-2 d-flex align-items-center gap-2">
                            <LoadingImage
                              src={entry.photoPreviewUrl}
                              alt={`Screenshot proof for ${entry.prospect_name}`}
                              className="rounded border app-proof-image"
                              style={{ width: 72, height: 48, objectFit: 'cover' }}
                              placeholderStyle={{ width: 72, minHeight: 48, height: 48 }}
                            />
                            <span className="text-muted text-truncate">{entry.photoFile.name}</span>
                          </div>
                        )}
                      </div>
                    </CCol>
                  ))}
                </CRow>
              )}
            </div>

            <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">
              <span className="text-muted me-1">{readyBulkRows} ready</span>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                disabled={saving}
                onClick={() => navigateWithUnsavedCheck('/pipeline/entries')}
              >
                Cancel
              </CButton>
              <CButton
                size="sm"
                color="primary"
                onClick={saveBulkEntries}
                disabled={saving || proofCompressing || readyBulkRows === 0}
              >
                {saving ? 'Saving...' : 'Save Entries'}
              </CButton>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CModal alignment="center" visible={showSavedModal} onClose={() => setShowSavedModal(false)}>
        <CModalHeader>
          <CModalTitle>Entries Saved</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {savedCount} pipeline {savedCount === 1 ? 'entry has' : 'entries have'} been saved.
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setShowSavedModal(false)}
          >
            Add More
          </CButton>
          <CButton
            color="primary"
            size="sm"
            onClick={() =>
              navigate('/pipeline/entries', {
                state: { pipelineMessage: `${savedCount} pipeline entries saved.` },
              })
            }
          >
            View Records
          </CButton>
        </CModalFooter>
      </CModal>
    </PipelineEntriesShell>
  )
}

export default PipelineEntriesBulkAdd
