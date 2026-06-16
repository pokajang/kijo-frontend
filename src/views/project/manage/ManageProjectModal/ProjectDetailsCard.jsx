import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel, CFormInput, CButton } from '@coreui/react'
import { DataTableStatusBadge } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import { showToast } from '../../../../components/toast/toastService'
import { reloadProjectPoNumber, updateProjectDetails } from '../projectApi'
import { formatProjectDate } from '../projectDetailFormatters'
import { getProjectStatusTone } from '../projectStatus'
import ProjectValueUpdateModal from './ProjectValueUpdateModal'

const quoteServiceFromProject = (project = {}) => {
  const quoteType = String(project.quote_type || project.quoteType || '')
    .trim()
    .toLowerCase()
  if (quoteType) return quoteType

  const projectType = String(project.project_type || project.projectType || '').toLowerCase()
  if (projectType.includes('training')) return 'training'
  if (projectType.includes('industrial') || projectType.includes('hygiene')) return 'ih'
  if (projectType.includes('manpower') || projectType.includes('man power')) return 'manpower'
  if (projectType.includes('equipment')) return 'equipment'
  if (projectType.includes('special')) return 'special'
  return ''
}

const ProjectDetailsCard = ({ project, onSave, onValueUpdated }) => {
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ ...project })
  const [isDirty, setIsDirty] = useState(false)
  const [isReloadingPo, setIsReloadingPo] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showValueModal, setShowValueModal] = useState(false)

  useEffect(() => {
    setDraft({ ...project }) // reset draft when project changes externally
    setIsDirty(false)
    setIsEditing(false)
    setIsSaving(false)
    setShowValueModal(false)
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
  const quoteService = quoteServiceFromProject(project)
  const canOpenSourceQuotation = Boolean(project?.quote_id && quoteService)

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
        showToast('PO/LOA number reloaded.')
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
        showToast('Project details updated.')
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
          <div className="d-flex gap-2 flex-wrap justify-content-end">
            {canOpenSourceQuotation ? (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    `/crm/quotes?service=${quoteService}&edit=true&quoteId=${project.quote_id}`,
                    {
                      state: { returnTo: `/project/manage/${project.id}` },
                    },
                  )
                }
              >
                Open Source Quotation
              </CButton>
            ) : null}
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              onClick={() => setShowValueModal(true)}
            >
              Update Current Value
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </CButton>
          </div>
        )}
      </CCardHeader>
      <CCardBody className={!isEditing ? 'project-detail-compact-body' : undefined}>
        <CRow className={!isEditing ? 'project-detail-compact-grid' : 'g-3'}>
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
              <p className="form-control-plaintext">{formatProjectDate(project.award_date)}</p>
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
              <p className="form-control-plaintext">
                {formatProjectDate(project.service_start_date)}
              </p>
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
              <p className="form-control-plaintext">
                {formatProjectDate(project.service_end_date)}
              </p>
            )}
          </CCol>

          <CCol md={4} className="project-detail-kv">
            <CFormLabel htmlFor="status">Project Status</CFormLabel>
            <p className="form-control-plaintext">
              <DataTableStatusBadge tone={getProjectStatusTone(project)}>
                {project.status || '-'}
              </DataTableStatusBadge>
            </p>
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
            <CCol xs={12} className="d-flex justify-content-end gap-2 flex-wrap">
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </CButton>
              <CButton
                color="primary"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </CButton>
            </CCol>
          )}
        </CRow>
      </CCardBody>
      <ProjectValueUpdateModal
        visible={showValueModal}
        project={project}
        onClose={() => setShowValueModal(false)}
        onUpdated={(updated) => {
          if (onValueUpdated) {
            onValueUpdated(updated)
          } else {
            onSave?.(updated)
          }
        }}
      />
    </>
  )
}

ProjectDetailsCard.propTypes = {
  project: PropTypes.object,
  onSave: PropTypes.func,
  onValueUpdated: PropTypes.func,
}

export default ProjectDetailsCard
