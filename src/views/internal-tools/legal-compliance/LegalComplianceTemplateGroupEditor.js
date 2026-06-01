import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import {
  getLegalComplianceTemplate,
  updateLegalComplianceTemplateDraft,
} from './api/legalComplianceApi'
import ClauseList from './components/template-group/ClauseList'
import ClauseForm from './components/template-group/ClauseForm'
import LeaveWithoutSavingModal from './components/template-group/LeaveWithoutSavingModal'

import {
  areTemplateContentsEqual,
  buildDraftPayload,
  createTemplateSlug,
  defaultClause,
  emptyContent,
  getTemplateRouteKey,
  resolveTemplateIdFromRouteKey,
} from './legalComplianceTemplateUtils'
import { insertItem, moveItem } from './utils/reorder'

const LegalComplianceTemplateGroupEditor = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { templateId: templateRouteKey, groupKey } = useParams()
  const [template, setTemplate] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveState, setSaveState] = useState('loaded')
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const [activeClauseForm, setActiveClauseForm] = useState(null)
  const [clauseTitle, setClauseTitle] = useState('')
  const [clauseExcerpt, setClauseExcerpt] = useState('')
  const [newClauseInsertIndex, setNewClauseInsertIndex] = useState(null)
  const [isRearrangingClauses, setIsRearrangingClauses] = useState(false)

  const draftContent = useMemo(
    () => template?.draft_content || emptyContent(template?.name),
    [template],
  )
  const groups = draftContent.groups || []
  const isNumericGroupKey = /^\d+$/.test(groupKey || '')
  const decodedGroupKey = decodeURIComponent(groupKey || '')
  const activeGroupIndex = isNumericGroupKey
    ? Number(groupKey)
    : groups.findIndex(
        (group) =>
          group.id === groupKey ||
          group.id === decodedGroupKey ||
          createTemplateSlug(group.title) === groupKey ||
          createTemplateSlug(group.title) === decodedGroupKey,
      )
  const activeGroup = activeGroupIndex >= 0 ? groups[activeGroupIndex] : null
  const templatePathKey = template ? getTemplateRouteKey(template, template.name) : templateRouteKey
  const returnPath = `/internal-tools/legal-compliance/templates/${templatePathKey}?mode=edit`
  const returnNavigationState =
    typeof location.state?.returnTo === 'string'
      ? {
          returnTo: location.state.returnTo,
        }
      : undefined
  const activeClause =
    typeof activeClauseForm === 'number' ? activeGroup?.clauses?.[activeClauseForm] : null
  const hasUnsavedClauseForm =
    activeClauseForm !== null &&
    (activeClauseForm === 'new'
      ? Boolean(clauseTitle.trim() || clauseExcerpt.trim())
      : clauseTitle !== (activeClause?.title || '') ||
        clauseExcerpt !== (activeClause?.excerpt || ''))

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
      setPendingNavigation(null)
      setNewClauseInsertIndex(null)
      setIsRearrangingClauses(false)
    } catch (loadError) {
      setError(loadError.message || 'Could not load template.')
    } finally {
      setIsLoading(false)
    }
  }, [templateRouteKey])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!isDirty && !hasUnsavedClauseForm) return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedClauseForm, isDirty])

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

  const openAddClauseForm = (insertIndex = activeGroup?.clauses?.length || 0) => {
    setActiveClauseForm('new')
    setNewClauseInsertIndex(insertIndex)
    setIsRearrangingClauses(false)
    setClauseTitle('')
    setClauseExcerpt('')
  }

  const openEditClauseForm = (clauseIndex) => {
    const clause = activeGroup?.clauses?.[clauseIndex]
    setActiveClauseForm(clauseIndex)
    setNewClauseInsertIndex(null)
    setClauseTitle(clause?.title || '')
    setClauseExcerpt(clause?.excerpt || '')
  }

  const closeClauseForm = () => {
    setActiveClauseForm(null)
    setNewClauseInsertIndex(null)
    setClauseTitle('')
    setClauseExcerpt('')
  }

  const requestNavigation = (navigation) => {
    if (hasUnsavedClauseForm || (navigation.type === 'back' && isDirty)) {
      setPendingNavigation(navigation)
      return
    }

    if (navigation.type === 'back') {
      navigate(returnPath, { state: returnNavigationState })
      return
    }

    if (navigation.type === 'editClause') {
      openEditClauseForm(navigation.clauseIndex)
    }
  }

  const confirmPendingNavigation = () => {
    const navigation = pendingNavigation
    setPendingNavigation(null)
    closeClauseForm()

    if (navigation?.type === 'back') {
      navigate(returnPath, { state: returnNavigationState })
      return
    }

    if (navigation?.type === 'editClause') {
      openEditClauseForm(navigation.clauseIndex)
    }
  }

  const saveClauseForm = (event) => {
    event.preventDefault()
    const nextClause = {
      ...defaultClause(),
      title: clauseTitle.trim(),
      excerpt: clauseExcerpt.trim(),
    }

    updateContent((content) => ({
      ...content,
      groups: (content.groups || []).map((group, index) => {
        if (index !== activeGroupIndex) return group

        if (activeClauseForm !== 'new') {
          return {
            ...group,
            clauses: (group.clauses || []).map((clause, clauseIndex) =>
              clauseIndex === activeClauseForm
                ? {
                    ...clause,
                    title: nextClause.title,
                    excerpt: nextClause.excerpt,
                  }
                : clause,
            ),
          }
        }

        return {
          ...group,
          clauses: insertItem(
            group.clauses || [],
            nextClause,
            newClauseInsertIndex ?? group.clauses?.length ?? 0,
          ),
        }
      }),
    }))

    closeClauseForm()
  }

  const removeClause = (clauseIndex) => {
    closeClauseForm()
    updateContent((content) => ({
      ...content,
      groups: (content.groups || []).map((group, index) =>
        index === activeGroupIndex
          ? {
              ...group,
              clauses: (group.clauses || []).filter(
                (_, currentIndex) => currentIndex !== clauseIndex,
              ),
            }
          : group,
      ),
    }))
  }

  const moveClause = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    updateContent((content) => {
      let didMove = false
      const nextGroups = (content.groups || []).map((group, index) => {
        if (index !== activeGroupIndex) return group
        const currentClauses = group.clauses || []
        const nextClauses = moveItem(currentClauses, fromIndex, toIndex)
        if (nextClauses === currentClauses) return group
        didMove = true
        return {
          ...group,
          clauses: nextClauses,
        }
      })

      if (!didMove) return content
      return {
        ...content,
        groups: nextGroups,
      }
    })
  }

  const saveDraft = async ({ returnAfterSave = false } = {}) => {
    if (!template) return false
    if (hasUnsavedClauseForm) {
      setError('Save or cancel the active clause before saving the template draft.')
      return false
    }

    setIsSaving(true)
    setError('')
    setMessage('')

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
      setMessage(payload.message || 'Template draft saved.')
      if (returnAfterSave) navigate(returnPath, { state: returnNavigationState })
      return true
    } catch (saveError) {
      setError(saveError.message || 'Could not save template draft.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const returnToGroups = () => requestNavigation({ type: 'back' })

  const handleClauseRowKeyDown = (event, clauseIndex) => {
    if (isRearrangingClauses) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (isSaving) return
    requestNavigation({ type: 'editClause', clauseIndex })
  }

  const getTemplateStatusText = () => {
    if (!template) return ''
    if (isDirty || saveState === 'dirty') return 'Unsaved changes'
    if (saveState === 'draft_saved') return 'Draft saved'
    if (!template.active_content) return 'Draft not published'
    if (!areTemplateContentsEqual(draftContent, template.active_content)) return 'Draft saved'
    return ''
  }

  const renderClauseForm = () => (
    <ClauseForm
      clauseTitle={clauseTitle}
      setClauseTitle={setClauseTitle}
      clauseExcerpt={clauseExcerpt}
      setClauseExcerpt={setClauseExcerpt}
      isSaving={isSaving}
      onSubmit={saveClauseForm}
      onCancel={closeClauseForm}
    />
  )

  if (isLoading && !template) {
    return <DataTableLoadingState message="Loading template group..." />
  }

  if (template && !activeGroup) {
    return (
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
          <strong>Group Not Found</strong>
          <CButton color="secondary" variant="outline" size="sm" onClick={returnToGroups}>
            Back
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CAlert color="warning" className="mb-0">
            This legislation group no longer exists in the selected template.
          </CAlert>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div className="legal-compliance-header-main">
              <div className="legal-compliance-breadcrumb">
                <span
                  className="legal-compliance-breadcrumb-item"
                  title={template?.name || 'Legal compliance template'}
                >
                  {template?.name || 'Legal compliance template'}
                </span>
                <span className="legal-compliance-breadcrumb-separator">/</span>
                <span
                  className="legal-compliance-breadcrumb-item legal-compliance-breadcrumb-item--active"
                  title={activeGroup?.title || 'Legal Group'}
                >
                  {activeGroup?.title || 'Legal Group'}
                </span>
              </div>
              <span className="text-body-secondary">
                {(activeGroup?.clauses || []).length}{' '}
                {(activeGroup?.clauses || []).length === 1 ? 'clause' : 'clauses'}
              </span>
              {template && getTemplateStatusText() && (
                <div className="small text-body-secondary">{getTemplateStatusText()}</div>
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={returnToGroups}
                disabled={isSaving}
              >
                Back
              </CButton>
              <CButton
                color="primary"
                size="sm"
                onClick={() => saveDraft()}
                disabled={isSaving || !template}
              >
                {isSaving ? 'Saving...' : 'Save Template Draft'}
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            {message && <div className="small text-success mb-3">{message}</div>}
            {activeGroup && (
              <>
                {(activeGroup.clauses || []).length === 0 ? (
                  <>
                    {activeClauseForm === 'new' ? (
                      renderClauseForm()
                    ) : (
                      <div className="border rounded p-3">
                        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                          <div>
                            <strong>There are no clauses in this legal group yet.</strong>
                            <div className="text-body-secondary">Start by adding a clause.</div>
                          </div>
                          <CButton
                            color="primary"
                            size="sm"
                            onClick={() => openAddClauseForm(0)}
                            disabled={isSaving}
                          >
                            Add Clause
                          </CButton>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <ClauseList
                      clauses={activeGroup.clauses || []}
                      activeClauseForm={activeClauseForm}
                      newClauseInsertIndex={newClauseInsertIndex}
                      isSaving={isSaving}
                      isRearranging={isRearrangingClauses}
                      renderClauseForm={renderClauseForm}
                      onEditClause={(clauseIndex) =>
                        requestNavigation({ type: 'editClause', clauseIndex })
                      }
                      onClauseKeyDown={handleClauseRowKeyDown}
                      onRemoveClause={removeClause}
                      onInsertClause={openAddClauseForm}
                      onMoveClause={moveClause}
                    />
                    <div className="d-flex justify-content-end gap-2 flex-wrap mt-3">
                      {(activeGroup.clauses || []).length > 1 && (
                        <CButton
                          color="secondary"
                          variant={isRearrangingClauses ? undefined : 'outline'}
                          size="sm"
                          onClick={() => setIsRearrangingClauses((current) => !current)}
                          disabled={isSaving || activeClauseForm !== null}
                        >
                          {isRearrangingClauses ? 'Done' : 'Rearrange'}
                        </CButton>
                      )}
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={() => openAddClauseForm(activeGroup.clauses?.length || 0)}
                        disabled={isSaving || activeClauseForm !== null}
                      >
                        Add Clause
                      </CButton>
                    </div>
                  </>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <LeaveWithoutSavingModal
        visible={Boolean(pendingNavigation)}
        isSaving={isSaving}
        hasUnsavedClauseForm={hasUnsavedClauseForm}
        isDirty={isDirty}
        onClose={() => setPendingNavigation(null)}
        onDiscard={confirmPendingNavigation}
        onSaveAndLeave={() => saveDraft({ returnAfterSave: true })}
      />
    </CRow>
  )
}

export default LegalComplianceTemplateGroupEditor
