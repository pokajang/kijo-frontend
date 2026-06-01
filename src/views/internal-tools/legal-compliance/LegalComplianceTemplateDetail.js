import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
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
  publishLegalComplianceTemplate,
  updateLegalComplianceTemplateDraft,
} from './api/legalComplianceApi'
import TemplateContentView from './components/TemplateContentView'
import TemplateDetailHeader from './components/template-detail/TemplateDetailHeader'
import TemplateDetailModals from './components/template-detail/TemplateDetailModals'
import TemplateGroupList from './components/template-detail/TemplateGroupList'
import { insertItem, moveItem } from './utils/reorder'

import {
  areTemplateContentsEqual,
  buildDraftPayload,
  createTemplateSlug,
  defaultGroup,
  emptyContent,
  getDefaultDisclaimerText,
  getDefaultReportTitle,
  getGroupRouteKey,
  getTemplateRouteKey,
  normalizeAssessmentTier,
  resolveTemplateIdFromRouteKey,
  validateTemplateForPublish,
} from './legalComplianceTemplateUtils'

const LegalComplianceTemplateDetail = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { templateId: templateRouteKey } = useParams()
  const [searchParams] = useSearchParams()
  const [template, setTemplate] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveState, setSaveState] = useState('loaded')
  const [isEditDetailsModalVisible, setIsEditDetailsModalVisible] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTier, setEditTier] = useState('free')
  const [editReportTitle, setEditReportTitle] = useState('')
  const [editDisclaimerText, setEditDisclaimerText] = useState('')
  const [isGroupNameModalVisible, setIsGroupNameModalVisible] = useState(false)
  const [isPublishModalVisible, setIsPublishModalVisible] = useState(false)
  const [isMetadataModalVisible, setIsMetadataModalVisible] = useState(false)
  const [publishChangeNote, setPublishChangeNote] = useState('')
  const [publishValidationErrors, setPublishValidationErrors] = useState([])
  const [publishModalError, setPublishModalError] = useState('')
  const [deleteGroupIndex, setDeleteGroupIndex] = useState(null)
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false)
  const [renameName, setRenameName] = useState('')
  const [isDuplicateModalVisible, setIsDuplicateModalVisible] = useState(false)
  const [duplicateName, setDuplicateName] = useState('')
  const [isDeleteTemplateModalVisible, setIsDeleteTemplateModalVisible] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [editingGroupIndex, setEditingGroupIndex] = useState(null)
  const [newGroupInsertIndex, setNewGroupInsertIndex] = useState(null)
  const [isRearrangingGroups, setIsRearrangingGroups] = useState(false)
  const isOpeningGroupRef = useRef(false)

  const draftContent = useMemo(
    () => template?.draft_content || emptyContent(template?.name),
    [template],
  )
  const groups = draftContent.groups || []
  const templatesPath = '/internal-tools/legal-compliance/templates'
  const isEditMode = searchParams.get('mode') === 'edit'
  const readContent =
    !isEditMode && template?.active_content ? template.active_content : draftContent
  const readGroups = readContent.groups || []
  const isNeverPublished = Boolean(template && !template.active_content)
  const hasUnpublishedDraftChanges = Boolean(
    template?.active_content && !areTemplateContentsEqual(draftContent, template.active_content),
  )
  const shouldShowPublishNotice = isEditMode && isDirty

  const getTemplateReadPath = (sourceTemplate = template, sourceName = template?.name) =>
    `/internal-tools/legal-compliance/templates/${getTemplateRouteKey(sourceTemplate, sourceName)}`

  const normalizeTemplateReturnPath = (returnTo) => {
    if (typeof returnTo !== 'string' || !returnTo.startsWith(templatesPath)) return null

    const returnUrl = new URL(returnTo, window.location.origin)
    if (!returnUrl.pathname.startsWith(templatesPath)) return null
    returnUrl.searchParams.delete('mode')

    return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`
  }

  const getTemplateReturnPath = () => {
    return normalizeTemplateReturnPath(location.state?.returnTo) || getTemplateReadPath()
  }

  const loadTemplate = useCallback(async () => {
    if (!templateRouteKey) return
    setIsLoading(true)
    setError('')
    try {
      const templateId = await resolveTemplateIdFromRouteKey(templateRouteKey)
      const payload = await getLegalComplianceTemplate(templateId)
      setTemplate(payload.template)
      setIsDirty(false)
      setSaveState('loaded')
      setIsEditDetailsModalVisible(false)
      setIsGroupNameModalVisible(false)
      setIsPublishModalVisible(false)
      setIsMetadataModalVisible(false)
      setPublishChangeNote('')
      setPublishValidationErrors([])
      setPublishModalError('')
      setDeleteGroupIndex(null)
      setPendingNavigation(null)
      setNewGroupInsertIndex(null)
      setIsRearrangingGroups(false)
    } catch (loadError) {
      setError(loadError.message || 'Could not load template.')
    } finally {
      setIsLoading(false)
    }
  }, [templateRouteKey])

  useEffect(() => {
    setTemplate(null)
    loadTemplate()
  }, [loadTemplate])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!isDirty) return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const updateTemplate = (updates) => {
    const nextName = updates.name ?? template?.name ?? ''
    const nextDescription = updates.description ?? template?.description ?? ''
    const nextTier = normalizeAssessmentTier(updates.assessment_tier ?? template?.assessment_tier)
    const nextReportTitle = updates.report_title ?? template?.report_title ?? ''
    const nextDisclaimerText = updates.disclaimer_text ?? template?.disclaimer_text ?? ''
    const hasChanges =
      nextName !== (template?.name ?? '') ||
      nextDescription !== (template?.description ?? '') ||
      nextTier !== normalizeAssessmentTier(template?.assessment_tier) ||
      nextReportTitle !== (template?.report_title ?? '') ||
      nextDisclaimerText !== (template?.disclaimer_text ?? '')

    if (!hasChanges) return

    setIsDirty(true)
    setSaveState('dirty')
    setTemplate((current) => ({
      ...current,
      ...updates,
      assessment_tier: nextTier,
      report_title: nextReportTitle,
      disclaimer_text: nextDisclaimerText,
      draft_content: {
        ...(current?.draft_content || emptyContent(current?.name)),
        title: updates.name ?? current?.name ?? '',
        description: updates.description ?? current?.description ?? '',
        assessment_tier: nextTier,
        report_title: nextReportTitle,
        disclaimer_text: nextDisclaimerText,
      },
    }))
  }

  const updateContent = (updater) => {
    setTemplate((current) => {
      const currentContent = current?.draft_content || emptyContent(current?.name)
      const nextContent = updater(currentContent)

      if (nextContent === currentContent) return current

      setIsDirty(true)
      setSaveState('dirty')
      return {
        ...current,
        draft_content: nextContent,
      }
    })
  }

  const openEditDetailsModal = () => {
    if (!template) return
    setEditName(template.name || '')
    setEditDescription(template.description || '')
    setEditTier(normalizeAssessmentTier(template.assessment_tier))
    setEditReportTitle(
      template.report_title || getDefaultReportTitle(template.name, template.assessment_tier),
    )
    setEditDisclaimerText(
      template.disclaimer_text || getDefaultDisclaimerText(template.assessment_tier),
    )
    setIsEditDetailsModalVisible(true)
  }

  const closeEditDetailsModal = () => {
    setIsEditDetailsModalVisible(false)
    setEditName('')
    setEditDescription('')
    setEditTier('free')
    setEditReportTitle('')
    setEditDisclaimerText('')
  }

  const openRenameModal = () => {
    if (!template || isSaving) return
    setRenameName(template.name || '')
    setError('')
    setMessage('')
    setIsRenameModalVisible(true)
  }

  const closeRenameModal = () => {
    if (isSaving) return
    setIsRenameModalVisible(false)
    setRenameName('')
  }

  const renameTemplate = async (event) => {
    event.preventDefault()
    if (!template || isSaving) return

    const name = renameName.trim()
    if (!name) {
      setError('Template name is required.')
      return
    }

    const nextTemplate = {
      ...template,
      name,
    }
    const nextDraftContent = {
      ...draftContent,
      title: name,
      description: template.description || '',
      assessment_tier: normalizeAssessmentTier(template.assessment_tier),
      report_title: template.report_title || getDefaultReportTitle(name, template.assessment_tier),
      disclaimer_text:
        template.disclaimer_text || getDefaultDisclaimerText(template.assessment_tier),
    }

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = await updateLegalComplianceTemplateDraft(
        template.id,
        buildDraftPayload(nextTemplate, nextDraftContent),
      )
      setTemplate((current) => ({
        ...current,
        name,
        draft_content: nextDraftContent,
        updated_at: payload?.data?.updated_at || current?.updated_at,
      }))
      setIsDirty(false)
      setSaveState('draft_saved')
      setIsRenameModalVisible(false)
      setRenameName('')
      setMessage(payload.message || 'Template renamed.')
    } catch (renameError) {
      setError(renameError.message || 'Could not rename template.')
    } finally {
      setIsSaving(false)
    }
  }

  const openDuplicateModal = () => {
    if (!template || isSaving) return
    setDuplicateName(`${template.name} Copy`)
    setError('')
    setMessage('')
    setIsDuplicateModalVisible(true)
  }

  const closeDuplicateModal = () => {
    if (isSaving) return
    setIsDuplicateModalVisible(false)
    setDuplicateName('')
  }

  const duplicateTemplate = async (event) => {
    event.preventDefault()
    if (!template || isSaving) return

    const name = duplicateName.trim()
    if (!name) {
      setError('Template name is required.')
      return
    }

    const assessmentTier = normalizeAssessmentTier(template.assessment_tier)
    const reportTitle = template.report_title || getDefaultReportTitle(name, assessmentTier)
    const disclaimerText = template.disclaimer_text || getDefaultDisclaimerText(assessmentTier)

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = await createLegalComplianceTemplate({
        name,
        description: template.description || '',
        assessment_tier: assessmentTier,
        report_title: reportTitle,
        disclaimer_text: disclaimerText,
        is_default: false,
        draft_content: {
          ...draftContent,
          title: name,
          description: template.description || '',
          assessment_tier: assessmentTier,
          report_title: reportTitle,
          disclaimer_text: disclaimerText,
        },
      })
      setIsDuplicateModalVisible(false)
      setDuplicateName('')
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

  const openDeleteTemplateModal = () => {
    if (!template || isSaving || template.is_default) return
    setError('')
    setMessage('')
    setIsDeleteTemplateModalVisible(true)
  }

  const closeDeleteTemplateModal = () => {
    if (isSaving) return
    setIsDeleteTemplateModalVisible(false)
  }

  const deleteTemplate = async () => {
    if (!template || isSaving || template.is_default) return

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await deleteLegalComplianceTemplate(template.id)
      setIsDeleteTemplateModalVisible(false)
      navigate('/internal-tools/legal-compliance/templates')
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete template.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateTemplateDetails = (event) => {
    event.preventDefault()
    updateTemplate({
      name: editName.trim() || 'Untitled Template',
      description: editDescription.trim(),
      assessment_tier: normalizeAssessmentTier(editTier),
      report_title:
        editReportTitle.trim() ||
        getDefaultReportTitle(editName.trim() || 'Untitled Template', editTier),
      disclaimer_text: editDisclaimerText.trim() || getDefaultDisclaimerText(editTier),
    })
    closeEditDetailsModal()
  }

  const openAddGroupModal = (insertIndex = groups.length) => {
    setEditingGroupIndex(null)
    setNewGroupInsertIndex(insertIndex)
    setIsRearrangingGroups(false)
    setGroupName('')
    setIsGroupNameModalVisible(true)
  }

  const openEditGroupModal = (groupIndex) => {
    setEditingGroupIndex(groupIndex)
    setNewGroupInsertIndex(null)
    setGroupName(groups[groupIndex]?.title || '')
    setIsGroupNameModalVisible(true)
  }

  const closeGroupNameModal = () => {
    setIsGroupNameModalVisible(false)
    setGroupName('')
    setEditingGroupIndex(null)
    setNewGroupInsertIndex(null)
  }

  const saveGroupName = (event) => {
    event.preventDefault()
    const nextTitle = groupName.trim()

    updateContent((content) => {
      const currentGroups = content.groups || []

      if (editingGroupIndex === null) {
        return {
          ...content,
          groups: insertItem(
            currentGroups,
            {
              ...defaultGroup(),
              title: nextTitle,
            },
            newGroupInsertIndex ?? currentGroups.length,
          ),
        }
      }

      if ((currentGroups[editingGroupIndex]?.title || '') === nextTitle) {
        return content
      }

      return {
        ...content,
        groups: currentGroups.map((group, index) =>
          index === editingGroupIndex
            ? {
                ...group,
                title: nextTitle,
              }
            : group,
        ),
      }
    })

    closeGroupNameModal()
  }

  const saveDraft = async ({ silent = false } = {}) => {
    if (!template) return { ok: false, error: 'Template is not loaded.' }
    if (!silent) {
      setIsSaving(true)
      setError('')
      setMessage('')
    }
    try {
      const payload = await updateLegalComplianceTemplateDraft(
        template.id,
        buildDraftPayload(template, draftContent),
      )
      setIsDirty(false)
      setSaveState('draft_saved')
      setTemplate((current) => ({
        ...current,
        updated_at: payload?.data?.updated_at || current?.updated_at,
      }))
      if (!silent) {
        setMessage(payload.message || 'Template draft saved.')
        const nextRouteKey = getTemplateRouteKey(template, template.name)
        if (templateRouteKey !== nextRouteKey) {
          navigate(
            `/internal-tools/legal-compliance/templates/${nextRouteKey}${isEditMode ? '?mode=edit' : ''}`,
            { replace: true },
          )
        }
      }
      return { ok: true }
    } catch (saveError) {
      const nextError = saveError.message || 'Could not save template draft.'
      setError(nextError)
      return { ok: false, error: nextError }
    } finally {
      if (!silent) {
        setIsSaving(false)
      }
    }
  }

  const publishTemplate = async () => {
    if (!template) return
    const validationErrors = validateTemplateForPublish(template, draftContent)
    setPublishModalError('')
    if (validationErrors.length > 0) {
      setPublishValidationErrors(validationErrors)
      setIsPublishModalVisible(true)
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const saveResult = await saveDraft({ silent: true })
      if (!saveResult.ok) {
        setPublishModalError(
          saveResult.error ||
            'Could not save the latest draft before publishing. Reload and try again.',
        )
        return
      }
      await publishLegalComplianceTemplate(template.id, {
        change_note: publishChangeNote.trim(),
      })
      setSaveState('loaded')
      setIsPublishModalVisible(false)
      setPublishChangeNote('')
      setPublishValidationErrors([])
      setPublishModalError('')
      navigate(getTemplateReturnPath(), { replace: true })
    } catch (publishError) {
      const nextError = publishError.message || 'Could not publish template.'
      setError(nextError)
      setPublishModalError(nextError)
    } finally {
      setIsSaving(false)
    }
  }

  const removeGroup = (groupIndex) => {
    updateContent((content) => ({
      ...content,
      groups: (content.groups || []).filter((_, index) => index !== groupIndex),
    }))
    setDeleteGroupIndex(null)
  }

  const moveGroup = (fromIndex, toIndex) => {
    updateContent((content) => {
      const currentGroups = content.groups || []
      const nextGroups = moveItem(currentGroups, fromIndex, toIndex)
      if (nextGroups === currentGroups) return content
      return {
        ...content,
        groups: nextGroups,
      }
    })
  }

  const openPublishModal = () => {
    setPublishValidationErrors(validateTemplateForPublish(template, draftContent))
    setPublishModalError('')
    setIsPublishModalVisible(true)
  }

  const runNavigation = (navigation) => {
    if (!navigation) return

    if (navigation.type === 'templates') {
      navigate(templatesPath)
      return
    }

    if (navigation.type === 'edit') {
      navigate(
        `/internal-tools/legal-compliance/templates/${getTemplateRouteKey(template, template.name)}?mode=edit`,
        { state: { returnTo: getTemplateReadPath() } },
      )
      return
    }

    if (navigation.type === 'group') {
      const group = groups[navigation.groupIndex]
      const groupRouteKey = getGroupRouteKey(group, `legislation-${navigation.groupIndex + 1}`)
      navigate(
        `/internal-tools/legal-compliance/templates/${getTemplateRouteKey(template, template.name)}/groups/${encodeURIComponent(groupRouteKey)}`,
        { state: { returnTo: getTemplateReturnPath() } },
      )
    }
  }

  const requestNavigation = (navigation) => {
    if (
      isDirty ||
      (navigation?.type === 'templates' &&
        isEditMode &&
        (isNeverPublished || hasUnpublishedDraftChanges))
    ) {
      setPendingNavigation(navigation)
      return
    }

    runNavigation(navigation)
  }

  const saveAndContinueNavigation = async () => {
    const navigation = pendingNavigation
    const saveResult = await saveDraft()
    if (!saveResult.ok) return

    setPendingNavigation(null)
    runNavigation(navigation)
  }

  const discardAndContinueNavigation = () => {
    const navigation = pendingNavigation
    setPendingNavigation(null)
    runNavigation(navigation)
  }

  const openGroupEditor = async (groupIndex) => {
    if (!template?.id || isSaving || isOpeningGroupRef.current) return

    isOpeningGroupRef.current = true
    try {
      if (isDirty) {
        setIsSaving(true)
        try {
          const saveResult = await saveDraft({ silent: true })
          if (!saveResult.ok) return
        } finally {
          setIsSaving(false)
        }
      }

      runNavigation({ type: 'group', groupIndex })
    } finally {
      isOpeningGroupRef.current = false
    }
  }

  const handleGroupCardKeyDown = (event, groupIndex) => {
    if (isRearrangingGroups) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openGroupEditor(groupIndex)
  }

  const getTemplateStatusText = () => {
    if (!template) return ''
    if (isDirty || saveState === 'dirty') return 'Unsaved changes'
    if (isNeverPublished) {
      return 'Not published yet. Publish to use this template for assessments.'
    }
    if (hasUnpublishedDraftChanges) {
      return 'Draft changes not published. Publish to update the assessment template.'
    }
    return ''
  }

  const getPublishNoticeMessage = () => {
    if (!shouldShowPublishNotice) return ''
    if (isNeverPublished) {
      return 'This template is still a draft. Click Publish Template to make it available when starting a new assessment.'
    }
    if (hasUnpublishedDraftChanges || isDirty) {
      return 'You have draft changes that are not published yet. New assessments will keep using the last published version until you publish.'
    }
    return ''
  }

  const getLeaveWarning = () => {
    if (isDirty) {
      return {
        title: 'Unsaved Draft Changes',
        body: isNeverPublished
          ? 'This template has unsaved draft changes and is not published yet. Saving keeps the draft, but it still cannot be used for assessments until you publish it.'
          : 'This template has unsaved draft changes. Saving keeps the draft, but new assessments will keep using the last published version until you publish.',
      }
    }

    if (isNeverPublished) {
      return {
        title: 'Template Not Published',
        body: 'This template is saved as a draft, but it cannot be used for assessments until it is published.',
      }
    }

    return {
      title: 'Draft Changes Not Published',
      body: 'Your latest draft changes are not published yet. New assessments will continue using the last published version.',
    }
  }

  const stayAndPublish = () => {
    setPendingNavigation(null)
    openPublishModal()
  }

  const renderReadMode = () => {
    return <TemplateContentView groups={readGroups} useCardHeaders />
  }

  const renderStatusMessages = () => (
    <>
      {error && <CAlert color="danger">{error}</CAlert>}
      {message && <div className="small text-success mb-3">{message}</div>}
      {shouldShowPublishNotice && <CAlert color="warning">{getPublishNoticeMessage()}</CAlert>}
    </>
  )

  const renderTemplateActions = () => {
    if (!template) return null

    return (
      <>
        <CCardHeader>
          <strong>Actions</strong>
        </CCardHeader>
        <CCardBody>
          <div className="d-flex flex-wrap gap-2">
            <CButton
              color="primary"
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(
                  `/internal-tools/legal-compliance/templates/${getTemplateRouteKey(template, template.name)}?mode=edit`,
                  { state: { returnTo: getTemplateReadPath() } },
                )
              }
              disabled={isSaving}
            >
              Edit Template
            </CButton>
            <CButton
              color="secondary"
              size="sm"
              variant="outline"
              onClick={openRenameModal}
              disabled={isSaving}
            >
              Rename
            </CButton>
            <CButton
              color="secondary"
              size="sm"
              variant="outline"
              onClick={openDuplicateModal}
              disabled={isSaving}
            >
              Duplicate
            </CButton>
            <CButton
              color="danger"
              size="sm"
              variant="outline"
              onClick={openDeleteTemplateModal}
              disabled={isSaving || Boolean(template.is_default)}
              title={template.is_default ? 'Default template cannot be deleted.' : undefined}
            >
              Delete
            </CButton>
          </div>
        </CCardBody>
      </>
    )
  }

  if (isLoading && !template) {
    return <DataTableLoadingState message="Loading template..." />
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <TemplateDetailHeader
            template={template}
            isEditMode={isEditMode}
            groupCount={readGroups.length}
            isSaving={isSaving}
            statusText={getTemplateStatusText()}
            onEditDetails={openEditDetailsModal}
            onBack={() => requestNavigation({ type: 'templates' })}
          />
          {!isEditMode ? (
            <>
              {(error || message || shouldShowPublishNotice) && (
                <CCardBody>{renderStatusMessages()}</CCardBody>
              )}
              {template && renderReadMode()}
            </>
          ) : (
            <CCardBody>
              {renderStatusMessages()}
              {template && (
                <>
                  {groups.length === 0 ? (
                    <div className="border rounded p-3">
                      <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                        <div>
                          <strong>No legislation added yet.</strong>
                          <div className="text-body-secondary">
                            Add legislation to start building this template.
                          </div>
                        </div>
                        <CButton
                          color="primary"
                          size="sm"
                          onClick={() => openAddGroupModal(0)}
                          disabled={isSaving}
                        >
                          Add Legislation
                        </CButton>
                      </div>
                    </div>
                  ) : (
                    <TemplateGroupList
                      groups={groups}
                      isSaving={isSaving}
                      isRearranging={isRearrangingGroups}
                      onOpenGroup={openGroupEditor}
                      onGroupKeyDown={handleGroupCardKeyDown}
                      onEditGroup={openEditGroupModal}
                      onDeleteGroup={setDeleteGroupIndex}
                      onInsertGroup={openAddGroupModal}
                      onMoveGroup={moveGroup}
                    />
                  )}

                  <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mt-3">
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMetadataModalVisible(true)}
                      disabled={isSaving}
                    >
                      Change History
                    </CButton>
                    <div className="d-flex justify-content-end gap-2 flex-wrap">
                      {groups.length > 1 && (
                        <CButton
                          color="secondary"
                          variant={isRearrangingGroups ? undefined : 'outline'}
                          size="sm"
                          onClick={() => setIsRearrangingGroups((current) => !current)}
                          disabled={isSaving}
                        >
                          {isRearrangingGroups ? 'Done' : 'Rearrange'}
                        </CButton>
                      )}
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={() => openAddGroupModal(groups.length)}
                        disabled={isSaving}
                      >
                        Add Legislation
                      </CButton>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="d-flex justify-content-end gap-2 flex-wrap">
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        onClick={() => saveDraft()}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Template Draft'}
                      </CButton>
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={openPublishModal}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Publishing...' : 'Publish Template'}
                      </CButton>
                    </div>
                  </div>
                </>
              )}
            </CCardBody>
          )}
          {renderTemplateActions()}
        </CCard>
      </CCol>

      <TemplateDetailModals
        isSaving={isSaving}
        isEditDetailsModalVisible={isEditDetailsModalVisible}
        closeEditDetailsModal={closeEditDetailsModal}
        updateTemplateDetails={updateTemplateDetails}
        editName={editName}
        setEditName={setEditName}
        editDescription={editDescription}
        setEditDescription={setEditDescription}
        editTier={editTier}
        setEditTier={setEditTier}
        editReportTitle={editReportTitle}
        setEditReportTitle={setEditReportTitle}
        editDisclaimerText={editDisclaimerText}
        setEditDisclaimerText={setEditDisclaimerText}
        isGroupNameModalVisible={isGroupNameModalVisible}
        closeGroupNameModal={closeGroupNameModal}
        saveGroupName={saveGroupName}
        editingGroupIndex={editingGroupIndex}
        groupName={groupName}
        setGroupName={setGroupName}
        pendingNavigation={pendingNavigation}
        setPendingNavigation={setPendingNavigation}
        getLeaveWarning={getLeaveWarning}
        isDirty={isDirty}
        discardAndContinueNavigation={discardAndContinueNavigation}
        saveAndContinueNavigation={saveAndContinueNavigation}
        stayAndPublish={stayAndPublish}
        isPublishModalVisible={isPublishModalVisible}
        setIsPublishModalVisible={setIsPublishModalVisible}
        publishValidationErrors={publishValidationErrors}
        setPublishValidationErrors={setPublishValidationErrors}
        publishModalError={publishModalError}
        setPublishModalError={setPublishModalError}
        publishChangeNote={publishChangeNote}
        setPublishChangeNote={setPublishChangeNote}
        template={template}
        publishTemplate={publishTemplate}
        isMetadataModalVisible={isMetadataModalVisible}
        setIsMetadataModalVisible={setIsMetadataModalVisible}
        deleteGroupIndex={deleteGroupIndex}
        setDeleteGroupIndex={setDeleteGroupIndex}
        groups={groups}
        removeGroup={removeGroup}
      />

      <CModal visible={isRenameModalVisible} onClose={closeRenameModal} alignment="center">
        <form onSubmit={renameTemplate}>
          <CModalHeader closeButton={!isSaving}>
            <CModalTitle>Rename Template</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CFormLabel>Template Name</CFormLabel>
            <CFormInput
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

      <CModal visible={isDuplicateModalVisible} onClose={closeDuplicateModal} alignment="center">
        <form onSubmit={duplicateTemplate}>
          <CModalHeader closeButton={!isSaving}>
            <CModalTitle>Duplicate Template</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CFormLabel>Template Name</CFormLabel>
            <CFormInput
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

      <CModal
        visible={isDeleteTemplateModalVisible}
        onClose={closeDeleteTemplateModal}
        alignment="center"
      >
        <CModalHeader closeButton={!isSaving}>
          <CModalTitle>Delete Template</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Delete <strong>{template?.name}</strong>?
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeDeleteTemplateModal}
            disabled={isSaving}
          >
            Cancel
          </CButton>
          <CButton color="danger" size="sm" onClick={deleteTemplate} disabled={isSaving}>
            {isSaving ? 'Deleting...' : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default LegalComplianceTemplateDetail
