import React, { useEffect, useMemo, useState } from 'react'
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
} from '@coreui/react'
import { fetchJson } from '../../dashboard/shared/fetchUtils'
import {
  API_BASE,
  MAX_PROOF_IMAGE_BYTES,
  classificationTypes,
  compressProofImage,
  entrySourceOptions,
  entryTypes,
  entryTypeAllowsEstimatedRm,
  getPipelineEntryValidationError,
  isOtherServiceCategory,
  serviceCategories,
} from './pipelineEntryUtils'

const createFormState = (entry) => ({
  entry_type: entry?.entryType || 'lead',
  entry_date: entry?.entryDate || '',
  source: entry?.sourceValue || entry?.source || '',
  segment_type: entry?.segmentTypeValue || '',
  service_category: entry?.serviceCategoryValue || '',
  custom_service_category: entry?.customServiceCategoryValue || '',
  estimated_rm:
    entry?.estimatedRm === null || entry?.estimatedRm === undefined
      ? ''
      : String(entry.estimatedRm),
  prospect_name: entry?.prospectNameValue || entry?.prospectName || '',
  notes: entry?.notes || '',
  photoFile: null,
  photoInputKey: Date.now(),
})

const PipelineEntryEditModal = ({ visible, entry, onClose, onSaved }) => {
  const [form, setForm] = useState(() => createFormState(entry))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [proofCompressing, setProofCompressing] = useState(false)

  useEffect(() => {
    if (visible) {
      setForm(createFormState(entry))
      setError('')
      setSaving(false)
      setProofCompressing(false)
    }
  }, [entry, visible])

  const showEstimatedRm = entryTypeAllowsEstimatedRm(form.entry_type)
  const sourceOptions = useMemo(() => entrySourceOptions.map((source) => source.value), [])

  const updateForm = (updates) => {
    setForm((current) => ({
      ...current,
      ...updates,
      ...(Object.prototype.hasOwnProperty.call(updates, 'entry_type') &&
      !entryTypeAllowsEstimatedRm(updates.entry_type)
        ? { estimated_rm: '' }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(updates, 'service_category') &&
      !isOtherServiceCategory(updates.service_category)
        ? { custom_service_category: '' }
        : {}),
    }))
  }

  const handleProofFileChange = async (file) => {
    if (!file) {
      updateForm({ photoFile: null, photoInputKey: Date.now() })
      return
    }

    setError('')
    setProofCompressing(true)

    try {
      const compressedFile = await compressProofImage(file)
      if (compressedFile.size > MAX_PROOF_IMAGE_BYTES) {
        setError('Screenshot proof must be 500KB or less.')
        updateForm({ photoFile: null, photoInputKey: Date.now() })
        return
      }
      updateForm({ photoFile: compressedFile })
    } catch (err) {
      setError('Unable to process screenshot proof.')
      updateForm({ photoFile: null, photoInputKey: Date.now() })
    } finally {
      setProofCompressing(false)
    }
  }

  const saveEntry = async () => {
    if (!entry?.id) return
    if (proofCompressing) {
      setError('Please wait for screenshot proof processing to finish.')
      return
    }
    const validationError = getPipelineEntryValidationError(form, { prospectLabel: 'Prospect' })
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('entry_type', form.entry_type)
      formData.append('entry_date', form.entry_date)
      formData.append('source', form.source.trim())
      formData.append('segment_type', form.segment_type || '')
      formData.append('service_category', form.service_category || '')
      formData.append('custom_service_category', form.custom_service_category.trim())
      formData.append(
        'estimated_rm',
        showEstimatedRm && form.estimated_rm !== '' ? form.estimated_rm : '',
      )
      formData.append('prospect_name', form.prospect_name.trim())
      formData.append('notes', form.notes.trim())
      if (form.photoFile) {
        formData.append('photos[0]', form.photoFile)
      }

      const response = await fetchJson(
        `${API_BASE}stats/monitoring-manual-pipeline-entry/${entry.id}`,
        {
          method: 'POST',
          body: formData,
        },
      )

      if (response?.status !== 'success') {
        throw new Error(response?.message || 'Unable to update pipeline entry.')
      }

      onSaved?.(response.entry)
    } catch (err) {
      setError(err?.message || 'Unable to update pipeline entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={saving ? undefined : onClose} alignment="center" size="lg">
      <CModalHeader>
        <CModalTitle>Edit Pipeline Entry</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}
        <CRow className="g-3">
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="pipeline-edit-type">Type</CFormLabel>
            <CFormSelect
              id="pipeline-edit-type"
              value={form.entry_type}
              onChange={(event) => updateForm({ entry_type: event.target.value })}
            >
              {entryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="pipeline-edit-date">Date</CFormLabel>
            <CFormInput
              id="pipeline-edit-date"
              type="date"
              value={form.entry_date}
              onChange={(event) => updateForm({ entry_date: event.target.value })}
            />
          </CCol>
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="pipeline-edit-source">Source</CFormLabel>
            <CFormSelect
              id="pipeline-edit-source"
              value={form.source}
              onChange={(event) => updateForm({ source: event.target.value })}
            >
              <option value="">Select source</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="pipeline-edit-classification">Classification</CFormLabel>
            <CFormSelect
              id="pipeline-edit-classification"
              value={form.segment_type}
              onChange={(event) => updateForm({ segment_type: event.target.value })}
            >
              {classificationTypes.map((classification) => (
                <option key={classification.value || 'none'} value={classification.value}>
                  {classification.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="pipeline-edit-service">Service</CFormLabel>
            <CFormSelect
              id="pipeline-edit-service"
              value={form.service_category}
              onChange={(event) => updateForm({ service_category: event.target.value })}
            >
              {serviceCategories.map((service) => (
                <option key={service.value || 'none'} value={service.value}>
                  {service.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          {isOtherServiceCategory(form.service_category) && (
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="pipeline-edit-custom-service">
                Specify Service Category
              </CFormLabel>
              <CFormInput
                id="pipeline-edit-custom-service"
                value={form.custom_service_category}
                maxLength={191}
                required
                placeholder="Example: Environmental Monitoring"
                onChange={(event) => updateForm({ custom_service_category: event.target.value })}
              />
            </CCol>
          )}
          {showEstimatedRm && (
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="pipeline-edit-estimated-rm">Estimated RM</CFormLabel>
              <CFormInput
                id="pipeline-edit-estimated-rm"
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_rm}
                placeholder="0.00"
                onChange={(event) => updateForm({ estimated_rm: event.target.value })}
              />
            </CCol>
          )}
          <CCol xs={12}>
            <CFormLabel htmlFor="pipeline-edit-prospect">Prospect</CFormLabel>
            <CFormInput
              id="pipeline-edit-prospect"
              value={form.prospect_name}
              onChange={(event) => updateForm({ prospect_name: event.target.value })}
            />
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor="pipeline-edit-notes">Notes</CFormLabel>
            <CFormTextarea
              id="pipeline-edit-notes"
              rows={4}
              value={form.notes}
              onChange={(event) => updateForm({ notes: event.target.value })}
            />
          </CCol>
          <CCol xs={12}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CFormLabel htmlFor="pipeline-edit-proof" className="mb-0">
                Replace Screenshot Proof
              </CFormLabel>
              {(proofCompressing || form.photoFile?.name) && (
                <span className="text-muted">
                  {proofCompressing ? 'Processing screenshot...' : form.photoFile.name}
                </span>
              )}
            </div>
            <CFormInput
              id="pipeline-edit-proof"
              key={form.photoInputKey}
              className="mt-2"
              type="file"
              accept="image/*"
              disabled={proofCompressing}
              onChange={(event) => handleProofFileChange(event.target.files?.[0] || null)}
            />
            {entry?.photoUrl && (
              <div className="text-muted mt-1">Leave empty to keep the current screenshot.</div>
            )}
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" disabled={saving} onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          disabled={saving || proofCompressing}
          onClick={saveEntry}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default PipelineEntryEditModal
