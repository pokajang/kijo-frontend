import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCol,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHistory, cilList, cilNotes } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../auth/AuthProvider'
import { DataTableLoadingState } from '../../components/datatable'
import { extractRolesFromSession, hasAnyAllowedRole } from '../../utils/roles'
import dialog from '../../components/dialog/dialogService'
import HandbookAcknowledgementForm from './components/HandbookAcknowledgementForm'
import HandbookContent from './components/HandbookContent'
import { discardHandbookDraft, getCurrentHandbook, publishHandbookDraft } from './api/handbookApi'
import defaultHandbookContent from './data/defaultHandbookContent.json'

const fallbackHandbookVersion = 'V2 - 2024-01-05'
const signatureRecordRoles = ['System Admin', 'HR', 'Manager']

const normalizeContent = (content) => ({
  title: content?.title || defaultHandbookContent.title,
  chapters: Array.isArray(content?.chapters) ? content.chapters : defaultHandbookContent.chapters,
})

const Handbook = () => {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [serverLoaded, setServerLoaded] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const [serverCanManage, setServerCanManage] = useState(null)
  const [currentVersion, setCurrentVersion] = useState({
    id: null,
    version_label: fallbackHandbookVersion,
    content: defaultHandbookContent,
  })
  const [currentSignature, setCurrentSignature] = useState({
    signed: false,
    signed_at: null,
    full_name: null,
  })
  const [currentDraft, setCurrentDraft] = useState(null)
  const [contentMode, setContentMode] = useState('official')
  const [draftActionLoading, setDraftActionLoading] = useState(false)
  const currentVersionIdRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRoles = extractRolesFromSession({ user })
  const canViewByRole = hasAnyAllowedRole(userRoles, signatureRecordRoles)
  const canManageHandbook = serverCanManage === true || (serverCanManage === null && canViewByRole)
  const canInteractWithServerVersion = serverLoaded && !isStale && Boolean(currentVersion.id)
  const canEditHandbook = canManageHandbook && canInteractWithServerVersion
  const hasActiveDraftContent = Boolean(currentDraft?.content)
  const isDraftMode = canEditHandbook && hasActiveDraftContent && contentMode === 'draft'

  const applyHandbookPayload = useCallback((json, { detectStale = false, force = false } = {}) => {
    const nextVersionId = Number(json.data?.id || 0)
    const currentVersionId = Number(currentVersionIdRef.current || 0)

    if (
      detectStale &&
      !force &&
      currentVersionId > 0 &&
      nextVersionId > 0 &&
      currentVersionId !== nextVersionId
    ) {
      setIsStale(true)
      return
    }

    setCurrentVersion({
      ...json.data,
      content: normalizeContent(json.data.content),
    })
    setCurrentSignature({
      signed: json.current_signature?.signed === true,
      signed_at: json.current_signature?.signed_at || null,
      full_name: json.current_signature?.full_name || null,
    })
    setCurrentDraft(json.draft || null)
    setServerCanManage(json.can_manage === true)
    setServerLoaded(true)
    setIsStale(false)
    currentVersionIdRef.current = nextVersionId || null
  }, [])

  const loadCurrentHandbook = useCallback(
    async ({ signal, detectStale = false, force = false, showLoading = true } = {}) => {
      if (showLoading) {
        setLoading(true)
      }
      setLoadError(null)

      try {
        const json = await getCurrentHandbook({ signal })

        if (json.success && json.data) {
          applyHandbookPayload(json, { detectStale, force })
        } else {
          setLoadError(json.message)
          setServerLoaded(false)
          setServerCanManage(null)
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }

        setLoadError(
          'Unable to load the latest handbook version. Showing local copy as read-only reference.',
        )
        setServerLoaded(false)
        setServerCanManage(null)
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [applyHandbookPayload],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadCurrentHandbook({ signal: controller.signal })

    return () => controller.abort()
  }, [loadCurrentHandbook])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return
      }

      loadCurrentHandbook({ detectStale: true, showLoading: false })
    }

    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    return () => {
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [loadCurrentHandbook])

  useEffect(() => {
    if (!canEditHandbook || !hasActiveDraftContent) {
      setContentMode('official')
      return
    }

    setContentMode('draft')
  }, [canEditHandbook, currentDraft?.id, hasActiveDraftContent])

  const handlePublished = (version) => {
    if (version) {
      setCurrentVersion({
        ...version,
        content: normalizeContent(version.content),
      })
      setCurrentDraft(null)
      setCurrentSignature({
        signed: false,
        signed_at: null,
        full_name: null,
      })
    }
  }

  const handleDraftSaved = (draft) => {
    setCurrentDraft(draft || null)
    setContentMode(draft ? 'draft' : 'official')
  }

  const handleStaleVersion = (message) => {
    setIsStale(true)
    dialog.alert(message || 'The handbook changed. Reload before continuing.')
  }

  const refreshNow = () => loadCurrentHandbook({ force: true })

  const formatDraftUpdatedAt = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
  }

  const handlePublishDraft = async () => {
    if (!currentDraft || draftActionLoading) {
      return
    }

    const changeSummary = await dialog.prompt('Summarize this handbook update before publishing.', {
      title: 'Publish Handbook Draft',
      multiline: true,
      required: true,
      defaultValue: 'Published handbook draft updates.',
      confirmText: 'Publish Draft',
    })

    if (changeSummary === null) {
      return
    }

    const trimmedSummary = changeSummary.trim()
    if (!trimmedSummary) {
      dialog.alert('Publish summary is required.')
      return
    }

    setDraftActionLoading(true)
    try {
      const json = await publishHandbookDraft({ changeSummary: trimmedSummary })
      if (json.success) {
        dialog.alert(json.message || 'Handbook draft published.')
        handlePublished(json.data)
        await loadCurrentHandbook({ force: true, showLoading: false })
      } else {
        dialog.alert(json.message || 'Failed to publish handbook draft.')
      }
    } catch (err) {
      console.error(err)
      dialog.alert('An unexpected error occurred.')
    } finally {
      setDraftActionLoading(false)
    }
  }

  const handleDiscardDraft = async () => {
    if (!currentDraft || draftActionLoading) {
      return
    }

    const confirmed = await dialog.confirm(
      'Discard the shared active handbook draft changes for all handbook owners?',
      {
        confirmText: 'Discard',
        confirmColor: 'danger',
      },
    )
    if (!confirmed) {
      return
    }

    setDraftActionLoading(true)
    try {
      const json = await discardHandbookDraft()
      if (json.success) {
        dialog.alert(json.message || 'Handbook draft discarded.')
        await loadCurrentHandbook({ force: true, showLoading: false })
      } else {
        dialog.alert(json.message || 'Failed to discard handbook draft.')
      }
    } catch (err) {
      console.error(err)
      dialog.alert('An unexpected error occurred.')
    } finally {
      setDraftActionLoading(false)
    }
  }

  const handleSigned = async (signature = {}) => {
    setCurrentSignature({
      signed: true,
      signed_at: signature.signed_at || new Date().toISOString(),
      full_name: signature.full_name || null,
    })
    await loadCurrentHandbook({ force: true, showLoading: false })
  }

  const handbookContent = normalizeContent(
    isDraftMode ? currentDraft.content : currentVersion.content,
  )
  const signingDisabledMessage = !serverLoaded
    ? 'The current handbook could not be verified. Signing is disabled until the server copy loads.'
    : isStale
      ? 'This handbook page is stale. Reload before signing.'
      : ''

  return (
    <>
      <CRow className="justify-content-center align-items-center mb-4">
        <CCol xs="auto" className="text-center">
          <span
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
              fontWeight: 'bold',
            }}
          >
            AMIOSH Employee Handbook
          </span>
          <br />
          <div className="mt-2 d-inline-flex align-items-center" style={{ gap: '0.5rem' }}>
            <CBadge
              color="primary"
              className="d-flex align-items-center"
              style={{ height: '2rem' }}
            >
              {currentVersion.version_label || fallbackHandbookVersion}
            </CBadge>
            {canEditHandbook && currentDraft && (
              <CBadge
                color="warning"
                className="d-flex align-items-center"
                style={{ height: '2rem' }}
              >
                Draft: {currentDraft.changes_count || 0} edit
                {(currentDraft.changes_count || 0) === 1 ? '' : 's'}
              </CBadge>
            )}
            {canEditHandbook && currentDraft && (
              <CButton
                color="primary"
                size="sm"
                className="d-flex align-items-center"
                style={{ height: '2rem' }}
                onClick={handlePublishDraft}
                disabled={draftActionLoading}
              >
                Publish Draft
              </CButton>
            )}
            {canEditHandbook && currentDraft && (
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                className="d-flex align-items-center"
                style={{ height: '2rem' }}
                onClick={handleDiscardDraft}
                disabled={draftActionLoading}
              >
                Discard Draft
              </CButton>
            )}
            {canManageHandbook && (
              <CDropdown>
                <CDropdownToggle
                  color="info"
                  variant="outline"
                  size="sm"
                  className="d-flex align-items-center"
                  style={{ height: '2rem' }}
                >
                  Manage
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem onClick={() => navigate('/handbook/signatures')}>
                    <CIcon icon={cilNotes} className="me-2" />
                    Signatures
                  </CDropdownItem>
                  <CDropdownItem onClick={() => navigate('/handbook/change-log')}>
                    <CIcon icon={cilHistory} className="me-2" />
                    Change Log
                  </CDropdownItem>
                  <CDropdownDivider />
                  <CDropdownItem onClick={() => navigate('/handbook/versions')}>
                    <CIcon icon={cilList} className="me-2" />
                    Version History
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            )}
          </div>
        </CCol>
      </CRow>

      {loading && <DataTableLoadingState message="Loading handbook..." />}
      {loadError && <CAlert color="warning">{loadError}</CAlert>}
      {isStale && (
        <CAlert
          color="warning"
          className="d-flex align-items-center justify-content-between gap-2 flex-wrap"
        >
          <span>
            The handbook changed while this page was open. Reload before signing or editing.
          </span>
          <CButton color="warning" variant="outline" size="sm" onClick={refreshNow}>
            Reload Handbook
          </CButton>
        </CAlert>
      )}
      {!serverLoaded && !loading && (
        <CAlert color="info">
          This local handbook copy is shown for reference only. Signing and owner edits are disabled
          until the server copy loads.
        </CAlert>
      )}
      {canEditHandbook && currentDraft && (
        <CAlert color="warning" className="handbook-draft-banner">
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div>
              <strong>{isDraftMode ? 'Draft Preview' : 'Official Version'}</strong>
              <div className="small">
                Draft is based on {currentVersion.version_label || fallbackHandbookVersion}. Staff
                still see the official version until the draft is published.
              </div>
              <div className="small text-muted">
                {currentDraft.changes_count || 0} pending edit
                {(currentDraft.changes_count || 0) === 1 ? '' : 's'}
                {' | '}Last updated by {currentDraft.updated_by_name_code || 'N/A'} at{' '}
                {formatDraftUpdatedAt(currentDraft.updated_at)}
              </div>
            </div>
            <CButtonGroup size="sm" role="group" aria-label="Handbook content mode">
              <CButton
                color="secondary"
                variant={contentMode === 'official' ? undefined : 'outline'}
                onClick={() => setContentMode('official')}
              >
                Official
              </CButton>
              <CButton
                color="warning"
                variant={contentMode === 'draft' ? undefined : 'outline'}
                onClick={() => setContentMode('draft')}
              >
                Draft
              </CButton>
            </CButtonGroup>
          </div>
        </CAlert>
      )}

      <HandbookContent
        content={handbookContent}
        canManage={canEditHandbook && (!currentDraft || isDraftMode)}
        baseVersionId={currentVersion.id}
        onDraftSaved={handleDraftSaved}
        onStaleVersion={handleStaleVersion}
      />

      <HandbookAcknowledgementForm
        signature={currentSignature}
        version={currentVersion}
        canSign={canInteractWithServerVersion}
        disabledMessage={signingDisabledMessage}
        onSigned={handleSigned}
      />
    </>
  )
}

export default Handbook
