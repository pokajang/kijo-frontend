import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CCollapse, CCol, CRow, CSpinner } from '@coreui/react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../auth/AuthProvider'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../../components/datatable'
import { StatsStrip } from '../../../../components/stats'
import { useDataTableStatsVisibility } from '../../../../hooks/datatable'
import ClientModuleNavStrip from '../components/ClientModuleNavStrip'
import ClientOriginPanel from './components/ClientOriginPanel'
import FirstTouchClaimModal from './components/FirstTouchClaimModal'
import FirstTouchClarificationModal from './components/FirstTouchClarificationModal'
import FirstTouchClaimsHistory from './components/FirstTouchClaimsHistory'
import FirstTouchConflictResolutionModal from './components/FirstTouchConflictResolutionModal'
import { FirstTouchEvidenceGalleryModal } from './components/FirstTouchEvidencePreview'
import FirstTouchTimeline from './components/FirstTouchTimeline'
import { getFirstTouchActionAvailability } from './clientFirstTouchActionPolicy'
import {
  getClientFirstTouch,
  listFirstTouchInquiryOptions,
  listFirstTouchStaffOptions,
  resolveClientFirstTouchConflict,
  respondClientFirstTouchClarification,
  submitClientFirstTouchClaim,
  submitClientFirstTouchDispute,
  updateClientFirstTouchClaim,
} from './clientFirstTouchApi'
import { useAppNotifications } from '../../../../notifications/AppNotificationProvider'
import { hasOpenFirstTouchConflict } from './clientFirstTouchState'
import { formatCompactContributionMoney, formatFirstTouchDate } from './clientFirstTouchUtils'
import { hasFirstTouchEvidenceHistory } from './firstTouchEvidenceHistory'

const ClientFirstTouchDetailPage = () => {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [record, setRecord] = useState(null)
  const [staffOptions, setStaffOptions] = useState([])
  const [inquiryOptions, setInquiryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [claimMode, setClaimMode] = useState(null)
  const [evidenceVisible, setEvidenceVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [conflictReviewVisible, setConflictReviewVisible] = useState(false)
  const [clarificationVisible, setClarificationVisible] = useState(false)
  const [evidenceHistoryVisible, setEvidenceHistoryVisible] = useState(false)
  const { user } = useAuth()
  const { consumeEntity } = useAppNotifications()
  const sessionStaffId = Number(user?.staff_id || 0)
  const sessionRoles = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles : [user?.roles || user?.role]
    return roles
      .map((role) =>
        String(role || '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean)
  }, [user?.role, user?.roles])
  const canReviewConflicts = Boolean(record?.permissions?.canReviewConflict)
  const { statsVisible, toggleStatsVisible } = useDataTableStatsVisibility(
    'client.first-touch.detail',
  )

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [nextRecord, nextStaffOptions, nextInquiryOptions] = await Promise.all([
        getClientFirstTouch(companyId),
        listFirstTouchStaffOptions(),
        listFirstTouchInquiryOptions(companyId),
      ])
      setRecord(nextRecord)
      setStaffOptions(nextStaffOptions)
      setInquiryOptions(nextInquiryOptions)
    } catch (error) {
      setLoadError(error?.message || 'Unable to load this client first-touch record.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const pendingClarification = useMemo(() => {
    const requestedId = Number(searchParams.get('clarification') || 0)
    const pending =
      requestedId > 0
        ? (record?.clarifications || []).find(
            (item) => item.id === requestedId && item.status === 'pending',
          )
        : (record?.clarifications || []).find(
            (item) => item.status === 'pending' && item.requestedFromStaffId === sessionStaffId,
          )
    if (!pending) return null
    const isSystemAdmin = sessionRoles.includes('system admin')
    return pending.requestedFromStaffId === sessionStaffId || isSystemAdmin ? pending : null
  }, [record?.clarifications, searchParams, sessionRoles, sessionStaffId])

  useEffect(() => {
    if (!record) return
    const requestedConflictId = Number(searchParams.get('reviewConflict') || 0)
    if (
      requestedConflictId > 0 &&
      requestedConflictId === Number(record.conflict?.id || 0) &&
      canReviewConflicts
    ) {
      setConflictReviewVisible(true)
      consumeEntity({
        moduleKey: 'client.first-touch',
        entityType: 'client_first_touch_conflict',
        entityId: requestedConflictId,
      }).catch(() => {})
    }
    if (pendingClarification) {
      setClarificationVisible(true)
      consumeEntity({
        moduleKey: 'client.first-touch',
        entityType: 'client_first_touch_clarification',
        entityId: pendingClarification.id,
      }).catch(() => {})
    }
    if (record.conflict?.status === 'resolved' && record.conflict?.id) {
      consumeEntity({
        moduleKey: 'client.first-touch.activity',
        entityType: 'client_first_touch_conflict',
        entityId: record.conflict.id,
      }).catch(() => {})
    }
  }, [canReviewConflicts, consumeEntity, pendingClarification, record, searchParams])

  const returnTo = location.state?.returnTo || '/client/first-touch'
  const firstTouchActions = getFirstTouchActionAvailability(record, record?.permissions)
  const hasEvidenceHistory = hasFirstTouchEvidenceHistory(record)
  const contributionStats = useMemo(
    () => [
      {
        key: 'collected',
        label: 'Collected Sales',
        value: formatCompactContributionMoney(record?.contribution?.collected),
        sublabel: 'All-time receipts',
        tone: 'success',
      },
      {
        key: 'awarded',
        label: 'Awarded Value',
        value: formatCompactContributionMoney(record?.contribution?.awarded),
        sublabel: 'All-time awarded work',
        tone: 'info',
      },
      {
        key: 'invoiced',
        label: 'Invoiced Total',
        value: formatCompactContributionMoney(record?.contribution?.invoiced),
        sublabel: 'All-time invoiced value',
        tone: 'secondary',
      },
      {
        key: 'gross-profit',
        label: 'Gross Profit',
        value: formatCompactContributionMoney(record?.contribution?.grossProfit),
        sublabel: `As of ${formatFirstTouchDate(record?.contribution?.asOf)}`,
        tone: 'primary',
      },
    ],
    [record?.contribution],
  )

  const updateRecord = (nextRecord, messageText) => {
    setRecord(nextRecord)
    setMessage(messageText)
  }

  const submitClaim = async (firstTouch) => {
    if (claimMode === 'dispute') {
      const nextRecord = await submitClientFirstTouchDispute(record.companyId, firstTouch)
      updateRecord(
        nextRecord,
        'Dispute submitted. The current claim remains visible during independent review.',
      )
      setClaimMode(null)
      return
    }

    const nextRecord =
      claimMode === 'edit'
        ? await updateClientFirstTouchClaim(record.companyId, record.firstTouch.id, firstTouch)
        : await submitClientFirstTouchClaim(record.companyId, firstTouch)
    updateRecord(
      nextRecord,
      claimMode === 'edit'
        ? 'Current evidence updated. The previous version remains in claim history.'
        : record.firstTouch
          ? 'Competing evidence submitted. The current claim is now contested.'
          : 'First touch recorded as current. No routine approval is required.',
    )
    setClaimMode(null)
  }

  const clearActionParameter = (key) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const resolveConflict = async (decision, note, selectedClaimId, metadata = {}) => {
    const nextRecord = await resolveClientFirstTouchConflict(record.conflict.id, {
      decision,
      note,
      selectedClaimId,
      clarificationRecipientStaffId: metadata.clarificationRecipientStaffId,
    })
    setRecord(nextRecord)
    setConflictReviewVisible(false)
    clearActionParameter('reviewConflict')
    setMessage(
      decision === 'clarification_requested'
        ? 'Clarification requested from the selected evidence submitter.'
        : 'First-touch conflict resolved and affected submitters notified.',
    )
  }

  const submitClarification = async (response) => {
    const nextRecord = await respondClientFirstTouchClarification(
      pendingClarification.conflictId,
      pendingClarification.id,
      response,
    )
    setRecord(nextRecord)
    setClarificationVisible(false)
    clearActionParameter('clarification')
    setMessage('Clarification submitted. The independent reviewers have been notified.')
  }

  if (loading || !record) {
    return (
      <>
        <ClientModuleNavStrip hideOnNestedRoute={false} />
        <CCard className="mb-4">
          <CCardBody className="d-flex align-items-center gap-2" role="status">
            {loading ? <CSpinner size="sm" aria-hidden="true" /> : null}
            {loading ? 'Loading client first-touch record…' : loadError}
            {!loading && loadError ? (
              <CButton color="danger" variant="outline" size="sm" onClick={loadRecord}>
                Retry
              </CButton>
            ) : null}
          </CCardBody>
        </CCard>
      </>
    )
  }

  return (
    <>
      <ClientModuleNavStrip hideOnNestedRoute={false} />
      {message ? (
        <CAlert color="success" dismissible onClose={() => setMessage('')}>
          {message}
        </CAlert>
      ) : null}

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <DataTableCardHeader
              title={
                <span>
                  Client First Touch <span className="text-muted ms-2">{record.companyName}</span>
                </span>
              }
              scopeLabel="All time"
            >
              <div className="d-flex gap-2 align-items-center">
                <DataTableStatsToggle visible={statsVisible} onToggle={toggleStatsVisible} />
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate(`/client/manage/${record.companyId}`)}
                >
                  View Client Details
                </CButton>
                {firstTouchActions.canSubmit ? (
                  <CButton
                    size="sm"
                    color="primary"
                    onClick={() => setClaimMode(record.firstTouch ? 'competing' : 'create')}
                  >
                    + Submit Evidence
                  </CButton>
                ) : null}
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate(returnTo)}
                >
                  Back
                </CButton>
              </div>
            </DataTableCardHeader>
            <CCardBody>{statsVisible ? <StatsStrip items={contributionStats} /> : null}</CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-3 mb-3">
        <CCol xs={12}>
          <ClientOriginPanel
            firstTouch={record.firstTouch}
            record={record}
            onViewEvidence={() => setEvidenceVisible(true)}
            onEdit={firstTouchActions.canEdit ? () => setClaimMode('edit') : undefined}
            onDispute={firstTouchActions.canDispute ? () => setClaimMode('dispute') : undefined}
            onReviewConflict={
              canReviewConflicts && hasOpenFirstTouchConflict(record)
                ? () => setConflictReviewVisible(true)
                : undefined
            }
            isClarificationRecipient={Boolean(pendingClarification)}
          />
        </CCol>
      </CRow>

      {pendingClarification ? (
        <CAlert
          color="warning"
          className="d-flex align-items-center justify-content-between gap-3 flex-wrap"
        >
          <div>
            <strong>Clarification needed from you.</strong> {pendingClarification.requestNote}
          </div>
          <CButton color="warning" size="sm" onClick={() => setClarificationVisible(true)}>
            Provide Clarification
          </CButton>
        </CAlert>
      ) : null}

      <CCard className="mb-3">
        <DataTableCardHeader title="Relationship timeline" />
        <CCardBody className="p-0">
          <FirstTouchTimeline firstTouch={record.firstTouch} entries={record.timeline} />
        </CCardBody>
      </CCard>

      {hasEvidenceHistory ? (
        <CCard className="mb-4">
          <CCardBody>
            <CButton
              color="secondary"
              variant="ghost"
              className="px-0"
              aria-expanded={evidenceHistoryVisible}
              aria-controls="client-first-touch-evidence-history"
              onClick={() => setEvidenceHistoryVisible((visible) => !visible)}
            >
              {evidenceHistoryVisible ? 'Hide evidence history' : 'View evidence history'}
            </CButton>
            <CCollapse id="client-first-touch-evidence-history" visible={evidenceHistoryVisible}>
              <div className="pt-3">
                <FirstTouchClaimsHistory record={record} />
              </div>
            </CCollapse>
          </CCardBody>
        </CCard>
      ) : null}

      <FirstTouchClaimModal
        visible={Boolean(claimMode)}
        companyName={record.companyName}
        companyId={record.companyId}
        existingFirstTouch={record.firstTouch}
        mode={claimMode}
        conflictOpen={hasOpenFirstTouchConflict(record)}
        staffOptions={staffOptions}
        inquiryOptions={inquiryOptions}
        onClose={() => setClaimMode(null)}
        onSubmit={submitClaim}
      />
      <FirstTouchEvidenceGalleryModal
        visible={evidenceVisible}
        proofs={record.firstTouch?.proofs || []}
        onEdit={
          firstTouchActions.canEdit
            ? () => {
                setEvidenceVisible(false)
                setClaimMode('edit')
              }
            : undefined
        }
        onClose={() => setEvidenceVisible(false)}
      />
      <FirstTouchConflictResolutionModal
        visible={conflictReviewVisible}
        record={record}
        onClose={() => {
          setConflictReviewVisible(false)
          clearActionParameter('reviewConflict')
        }}
        onResolve={resolveConflict}
      />
      <FirstTouchClarificationModal
        visible={clarificationVisible}
        clarification={pendingClarification}
        onClose={() => {
          setClarificationVisible(false)
          clearActionParameter('clarification')
        }}
        onSubmit={submitClarification}
      />
    </>
  )
}

export default ClientFirstTouchDetailPage
