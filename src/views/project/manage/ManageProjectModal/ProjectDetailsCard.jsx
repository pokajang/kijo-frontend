import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CButton,
  CBadge,
} from '@coreui/react'
import dialog from '../../../../components/dialog/dialogService'
import { reloadProjectPoNumber, updateProjectDetails } from '../projectApi'

const ProjectDetailsCard = ({ project, onSave }) => {
  const [draft, setDraft] = useState({ ...project })
  const [isDirty, setIsDirty] = useState(false)
  const [isReloadingPo, setIsReloadingPo] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setDraft({ ...project }) // reset draft when project changes externally
    setIsDirty(false)
    setIsEditing(false)
    setIsSaving(false)
  }, [project])

  const handleChange = (e) => {
    const { name, value } = e.target
    setDraft((prev) => ({ ...prev, [name]: value }))
    setIsDirty(true)
  }

  const handleCancel = () => {
    setDraft({ ...project })
    setIsDirty(false)
    setIsEditing(false)
  }

  const canReloadPo = !String(draft.po_loa_number || '').trim() && Boolean(project?.quote_id)

  const handleReloadPoNumber = async () => {
    if (!project?.id) return
    setIsReloadingPo(true)
    try {
      const result = await reloadProjectPoNumber(project.id)
      if (result.status === 'success') {
        setDraft((prev) => ({
          ...prev,
          po_loa_number: result.po_loa_number || '',
        }))
        setIsDirty(false)
        dialog.alert('PO/LOA number reloaded successfully.')
      } else {
        dialog.alert(result.message || 'Failed to reload PO/LOA number.')
      }
    } catch (err) {
      console.error('Reload PO error', err)
      dialog.alert('Server error occurred.')
    } finally {
      setIsReloadingPo(false)
    }
  }

  const handleSave = async () => {
    if (isSaving) return
    if (!(await dialog.confirm('Save changes to project details?'))) return

    try {
      setIsSaving(true)
      const result = await updateProjectDetails(draft)

      if (result.status === 'success') {
        dialog.alert('Project details updated successfully.')
        setIsDirty(false)
        setIsEditing(false)
        onSave?.(draft)
      } else {
        dialog.alert(result.message || 'Failed to update project.')
      }
    } catch (err) {
      console.error('Update error', err)
      dialog.alert('Server error occurred.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <CCardHeader className="rounded-0 d-flex align-items-center justify-content-between">
        <strong>Project Details</strong>
        {!isEditing && (
          <CButton color="primary" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={4} className={!isEditing ? 'project-detail-kv' : undefined}>
            <CFormLabel htmlFor="projectName">Project Name</CFormLabel>
            {isEditing ? (
              <CFormInput
                type="text"
                id="projectName"
                name="project_name"
                value={draft.project_name || ''}
                onChange={handleChange}
              />
            ) : (
              <p className="form-control-plaintext">{project.project_name || '-'}</p>
            )}
          </CCol>

          <CCol md={4} className={!isEditing ? 'project-detail-kv' : undefined}>
            <CFormLabel htmlFor="projectLoaNo">LOA/PO Number</CFormLabel>
            {isEditing ? (
              <CFormInput
                type="text"
                id="projectLoaNo"
                name="po_loa_number"
                value={draft.po_loa_number || ''}
                onChange={handleChange}
              />
            ) : (
              <p className="form-control-plaintext">{project.po_loa_number || '-'}</p>
            )}
            {isEditing && canReloadPo && (
              <div className="mt-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  disabled={isReloadingPo}
                  onClick={handleReloadPoNumber}
                >
                  Reload PO Number
                </CButton>
              </div>
            )}
          </CCol>

          <CCol md={4} className={!isEditing ? 'project-detail-kv' : undefined}>
            <CFormLabel htmlFor="projectType">Type</CFormLabel>
            {isEditing ? (
              <CFormInput
                type="text"
                id="projectType"
                name="project_type"
                value={draft.project_type || ''}
                onChange={handleChange}
              />
            ) : (
              <p className="form-control-plaintext">{project.project_type || '-'}</p>
            )}
          </CCol>

          <CCol md={4} className={!isEditing ? 'project-detail-kv' : undefined}>
            <CFormLabel htmlFor="awardDate">Award Date</CFormLabel>
            {isEditing ? (
              <CFormInput
                type="date"
                id="awardDate"
                name="award_date"
                value={draft.award_date || ''}
                onChange={handleChange}
              />
            ) : (
              <p className="form-control-plaintext">{project.award_date || '-'}</p>
            )}
          </CCol>

          <CCol md={4} className={!isEditing ? 'project-detail-kv' : undefined}>
            <CFormLabel htmlFor="service_start_date">Service Start Date</CFormLabel>
            {isEditing ? (
              <CFormInput
                type="date"
                id="service_start_date"
                name="service_start_date"
                value={draft.service_start_date || ''}
                onChange={handleChange}
              />
            ) : (
              <p className="form-control-plaintext">{project.service_start_date || '-'}</p>
            )}
          </CCol>

          <CCol md={4} className={!isEditing ? 'project-detail-kv' : undefined}>
            <CFormLabel htmlFor="service_end_date">Service End Date</CFormLabel>
            {isEditing ? (
              <CFormInput
                type="date"
                id="service_end_date"
                name="service_end_date"
                value={draft.service_end_date || ''}
                onChange={handleChange}
              />
            ) : (
              <p className="form-control-plaintext">{project.service_end_date || '-'}</p>
            )}
          </CCol>

          <CCol md={4} className="project-detail-kv">
            <CFormLabel htmlFor="status">Project Status</CFormLabel>
            <p className="form-control-plaintext">{project.status || '-'}</p>
          </CCol>

          <CCol md={8}>
            <CFormLabel htmlFor="description">Description</CFormLabel>
            {isEditing ? (
              <CFormInput
                type="text"
                id="description"
                name="description"
                value={draft.description || ''}
                onChange={handleChange}
              />
            ) : (
              <p className="form-control-plaintext">{project.description || '-'}</p>
            )}
          </CCol>
        </CRow>

        <CRow className="mt-2">
          {isEditing && (
            <CCol xs={12} className="g-3">
              <CButton
                color="primary"
                size="sm"
                variant="outline"
                className="me-3"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </CButton>

              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </CButton>
            </CCol>
          )}
        </CRow>
      </CCardBody>
    </>
  )
}

ProjectDetailsCard.propTypes = {
  project: PropTypes.object,
  onSave: PropTypes.func,
}

export default ProjectDetailsCard
