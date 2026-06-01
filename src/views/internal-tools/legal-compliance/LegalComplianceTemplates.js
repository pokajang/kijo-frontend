import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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
import { DataTableLoadingState } from '../../../components/datatable'
import {
  createLegalComplianceTemplate,
  deleteLegalComplianceTemplate,
  getLegalComplianceTemplate,
  listLegalComplianceTemplates,
  updateLegalComplianceTemplateDraft,
} from './api/legalComplianceApi'

import {
  createTemplateSlug,
  emptyContent,
  getDefaultDisclaimerText,
  getDefaultReportTitle,
  getTemplateRouteKey,
  normalizeAssessmentTier,
} from './legalComplianceTemplateUtils'
import LegalComplianceTemplateGrid from './LegalComplianceTemplateGrid'

const LegalComplianceTemplates = () => {
  const navigate = useNavigate()
  const templatesPath = '/internal-tools/legal-compliance/templates'
  const [templates, setTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [duplicateSource, setDuplicateSource] = useState(null)
  const [duplicateName, setDuplicateName] = useState('')
  const [renameSource, setRenameSource] = useState(null)
  const [renameName, setRenameName] = useState('')
  const [deleteSource, setDeleteSource] = useState(null)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTier, setCreateTier] = useState('free')
  const [createReportTitle, setCreateReportTitle] = useState('')
  const [createDisclaimerText, setCreateDisclaimerText] = useState('')

  const loadTemplates = async () => {
    setIsLoading(true)
    setError('')
    try {
      const payload = await listLegalComplianceTemplates()
      setTemplates(Array.isArray(payload.templates) ? payload.templates : [])
    } catch (loadError) {
      setError(loadError.message || 'Could not load templates.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [message])

  const openCreateModal = () => {
    if (isSaving) return
    setIsCreateModalVisible(true)
    setCreateName('')
    setCreateDescription('')
    setCreateTier('free')
    setCreateReportTitle('')
    setCreateDisclaimerText(getDefaultDisclaimerText('free'))
    setError('')
    setMessage('')
  }

  const closeCreateModal = () => {
    if (isSaving) return
    setIsCreateModalVisible(false)
    setCreateName('')
    setCreateDescription('')
    setCreateTier('free')
    setCreateReportTitle('')
    setCreateDisclaimerText('')
  }

  const createTemplate = async (event) => {
    event.preventDefault()
    if (isSaving) return

    const name = createName.trim()
    const description = createDescription.trim()
    const assessmentTier = normalizeAssessmentTier(createTier)
    const reportTitle = createReportTitle.trim() || getDefaultReportTitle(name, assessmentTier)
    const disclaimerText = createDisclaimerText.trim() || getDefaultDisclaimerText(assessmentTier)
    if (!name) {
      setError('Template name is required.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = await createLegalComplianceTemplate({
        name,
        description,
        assessment_tier: assessmentTier,
        report_title: reportTitle,
        disclaimer_text: disclaimerText,
        is_default: templates.length === 0,
        draft_content: {
          ...emptyContent(name),
          description,
          assessment_tier: assessmentTier,
          report_title: reportTitle,
          disclaimer_text: disclaimerText,
        },
      })
      setIsCreateModalVisible(false)
      setCreateName('')
      setCreateDescription('')
      setCreateTier('free')
      setCreateReportTitle('')
      setCreateDisclaimerText('')
      navigate(
        `/internal-tools/legal-compliance/templates/${payload?.data?.slug || createTemplateSlug(name)}?mode=edit`,
        { state: { returnTo: templatesPath } },
      )
    } catch (createError) {
      setError(createError.message || 'Could not create template.')
    } finally {
      setIsSaving(false)
    }
  }

  const openDuplicateModal = (template) => {
    setDuplicateSource(template)
    setDuplicateName(`${template.name} Copy`)
    setError('')
    setMessage('')
  }

  const closeDuplicateModal = () => {
    if (isSaving) return
    setDuplicateSource(null)
    setDuplicateName('')
  }

  const duplicateTemplate = async (event) => {
    event.preventDefault()
    if (!duplicateSource || isSaving) return

    const name = duplicateName.trim()
    if (!name) {
      setError('Template name is required.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const sourcePayload = await getLegalComplianceTemplate(duplicateSource.id)
      const sourceTemplate = sourcePayload.template
      const sourceContent = sourceTemplate?.draft_content || emptyContent(sourceTemplate?.name)
      const assessmentTier = normalizeAssessmentTier(sourceTemplate?.assessment_tier)
      const reportTitle =
        sourceTemplate?.report_title || getDefaultReportTitle(name, assessmentTier)
      const disclaimerText =
        sourceTemplate?.disclaimer_text || getDefaultDisclaimerText(assessmentTier)
      const payload = await createLegalComplianceTemplate({
        name,
        description: sourceTemplate?.description || '',
        assessment_tier: assessmentTier,
        report_title: reportTitle,
        disclaimer_text: disclaimerText,
        is_default: false,
        draft_content: {
          ...sourceContent,
          title: name,
          description: sourceTemplate?.description || '',
          assessment_tier: assessmentTier,
          report_title: reportTitle,
          disclaimer_text: disclaimerText,
        },
      })

      setDuplicateSource(null)
      setDuplicateName('')
      setMessage(payload.message || 'Template duplicated.')
      navigate(
        `/internal-tools/legal-compliance/templates/${payload?.data?.slug || createTemplateSlug(name)}?mode=edit`,
        { state: { returnTo: templatesPath } },
      )
    } catch (duplicateError) {
      setError(duplicateError.message || 'Could not duplicate template.')
    } finally {
      setIsSaving(false)
    }
  }

  const openRenameModal = (template) => {
    setRenameSource(template)
    setRenameName(template.name)
    setError('')
    setMessage('')
  }

  const closeRenameModal = () => {
    if (isSaving) return
    setRenameSource(null)
    setRenameName('')
  }

  const renameTemplate = async (event) => {
    event.preventDefault()
    if (!renameSource || isSaving) return

    const name = renameName.trim()
    if (!name) {
      setError('Template name is required.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const sourcePayload = await getLegalComplianceTemplate(renameSource.id)
      const sourceTemplate = sourcePayload.template
      const sourceContent = sourceTemplate?.draft_content || emptyContent(sourceTemplate?.name)
      const assessmentTier = normalizeAssessmentTier(sourceTemplate?.assessment_tier)
      const payload = await updateLegalComplianceTemplateDraft(renameSource.id, {
        name,
        description: sourceTemplate?.description || '',
        assessment_tier: assessmentTier,
        report_title: sourceTemplate?.report_title || getDefaultReportTitle(name, assessmentTier),
        disclaimer_text:
          sourceTemplate?.disclaimer_text || getDefaultDisclaimerText(assessmentTier),
        is_default: Boolean(sourceTemplate?.is_default),
        draft_content: {
          ...sourceContent,
          title: name,
          description: sourceTemplate?.description || '',
          assessment_tier: assessmentTier,
          report_title: sourceTemplate?.report_title || getDefaultReportTitle(name, assessmentTier),
          disclaimer_text:
            sourceTemplate?.disclaimer_text || getDefaultDisclaimerText(assessmentTier),
        },
      })

      setRenameSource(null)
      setRenameName('')
      setMessage(payload.message || 'Template renamed.')
      await loadTemplates()
    } catch (renameError) {
      setError(renameError.message || 'Could not rename template.')
    } finally {
      setIsSaving(false)
    }
  }

  const openDeleteModal = (template) => {
    setDeleteSource(template)
    setError('')
    setMessage('')
  }

  const closeDeleteModal = () => {
    if (isSaving) return
    setDeleteSource(null)
  }

  const deleteTemplate = async () => {
    if (!deleteSource || isSaving) return

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await deleteLegalComplianceTemplate(deleteSource.id)
      setDeleteSource(null)
      await loadTemplates()
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete template.')
    } finally {
      setIsSaving(false)
    }
  }

  const getTemplateActions = (template) => [
    {
      label: 'Edit Template',
      onClick: () =>
        navigate(
          `/internal-tools/legal-compliance/templates/${getTemplateRouteKey(template)}?mode=edit`,
          { state: { returnTo: templatesPath } },
        ),
    },
    {
      label: 'Rename',
      onClick: openRenameModal,
    },
    {
      label: 'Duplicate',
      onClick: openDuplicateModal,
    },
    {
      label: 'Delete',
      className: 'text-danger',
      disabled: Boolean(template.is_default),
      title: template.is_default ? 'Default template cannot be deleted.' : undefined,
      onClick: openDeleteModal,
    },
  ]

  const openTemplate = (template) => {
    navigate(`/internal-tools/legal-compliance/templates/${getTemplateRouteKey(template)}`)
  }

  return (
    <>
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <strong>Legal Compliance Templates</strong>
              <div className="d-flex gap-2 flex-wrap">
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/internal-tools')}
                  disabled={isSaving}
                >
                  Back
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {error && <CAlert color="danger">{error}</CAlert>}
              {message && <div className="small text-success mb-3">{message}</div>}

              {isLoading ? (
                <DataTableLoadingState message="Loading templates..." />
              ) : (
                <LegalComplianceTemplateGrid
                  templates={templates}
                  onTemplateClick={openTemplate}
                  getTemplateActions={getTemplateActions}
                  showCreateCard
                  onCreate={openCreateModal}
                  isCreateDisabled={isSaving}
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={isCreateModalVisible} onClose={closeCreateModal} alignment="center">
        <form onSubmit={createTemplate}>
          <CModalHeader closeButton={!isSaving}>
            <CModalTitle>New Template</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="g-3">
              <CCol xs={12}>
                <CFormLabel htmlFor="legal-template-create-name">Template Name</CFormLabel>
                <CFormInput
                  id="legal-template-create-name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Enter template name"
                  disabled={isSaving}
                  autoFocus
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="legal-template-create-description">Description</CFormLabel>
                <CFormInput
                  id="legal-template-create-description"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  placeholder="Enter template description"
                  disabled={isSaving}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="legal-template-create-tier">Assessment Tier</CFormLabel>
                <CFormSelect
                  id="legal-template-create-tier"
                  value={createTier}
                  onChange={(event) => {
                    const nextTier = normalizeAssessmentTier(event.target.value)
                    const previousDefaultTitle = getDefaultReportTitle(
                      createName.trim(),
                      createTier,
                    )
                    setCreateTier(nextTier)
                    setCreateReportTitle((current) =>
                      !current.trim() || current.trim() === previousDefaultTitle
                        ? getDefaultReportTitle(createName.trim(), nextTier)
                        : current,
                    )
                    setCreateDisclaimerText(getDefaultDisclaimerText(nextTier))
                  }}
                  disabled={isSaving}
                >
                  <option value="free">Free Assessment</option>
                  <option value="paid">Paid Assessment</option>
                </CFormSelect>
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="legal-template-create-report-title">Report Title</CFormLabel>
                <CFormInput
                  id="legal-template-create-report-title"
                  value={createReportTitle}
                  onChange={(event) => setCreateReportTitle(event.target.value)}
                  placeholder={getDefaultReportTitle(createName.trim(), createTier)}
                  disabled={isSaving}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="legal-template-create-disclaimer">Disclaimer Text</CFormLabel>
                <CFormTextarea
                  id="legal-template-create-disclaimer"
                  rows={4}
                  value={createDisclaimerText}
                  onChange={(event) => setCreateDisclaimerText(event.target.value)}
                  placeholder={getDefaultDisclaimerText(createTier)}
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
              onClick={closeCreateModal}
              disabled={isSaving}
            >
              Cancel
            </CButton>
            <CButton color="primary" size="sm" type="submit" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create'}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      <CModal visible={Boolean(duplicateSource)} onClose={closeDuplicateModal} alignment="center">
        <form onSubmit={duplicateTemplate}>
          <CModalHeader closeButton={!isSaving}>
            <CModalTitle>Duplicate Template</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CFormLabel htmlFor="legal-template-duplicate-name">Template Name</CFormLabel>
            <CFormInput
              id="legal-template-duplicate-name"
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
              placeholder="Enter duplicated template name"
              disabled={isSaving}
              autoFocus
            />
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={closeDuplicateModal}
              disabled={isSaving}
            >
              Cancel
            </CButton>
            <CButton color="primary" size="sm" type="submit" disabled={isSaving}>
              {isSaving ? 'Duplicating...' : 'Duplicate'}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      <CModal visible={Boolean(renameSource)} onClose={closeRenameModal} alignment="center">
        <form onSubmit={renameTemplate}>
          <CModalHeader closeButton={!isSaving}>
            <CModalTitle>Rename Template</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CFormLabel htmlFor="legal-template-rename-name">Template Name</CFormLabel>
            <CFormInput
              id="legal-template-rename-name"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              placeholder="Enter template name"
              disabled={isSaving}
              autoFocus
            />
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={closeRenameModal}
              disabled={isSaving}
            >
              Cancel
            </CButton>
            <CButton color="primary" size="sm" type="submit" disabled={isSaving}>
              {isSaving ? 'Renaming...' : 'Rename'}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      <CModal visible={Boolean(deleteSource)} onClose={closeDeleteModal} alignment="center">
        <CModalHeader closeButton={!isSaving}>
          <CModalTitle>Delete Template</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Delete <strong>{deleteSource?.name}</strong>?
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeDeleteModal}
            disabled={isSaving}
          >
            Cancel
          </CButton>
          <CButton color="danger" size="sm" onClick={deleteTemplate} disabled={isSaving}>
            {isSaving ? 'Deleting...' : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default LegalComplianceTemplates
