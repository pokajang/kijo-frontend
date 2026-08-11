import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CCol, CRow, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilHistory, cilList } from '@coreui/icons'
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
import ProjectSalesCreditTable from './components/ProjectSalesCreditTable'
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

const tabs = [
  { key: 'sales', label: 'Sales by project & salesperson' },
  { key: 'claims', label: 'Claims & history' },
  { key: 'timeline', label: 'Touchpoint timeline' },
  { key: 'payments', label: 'Invoices & payments' },
  { key: 'quotes', label: 'Quotations' },
]

const RelatedHistoryPanel = ({ type, companyId, onOpen }) => (
  <div className="first-touch-related-history">
    <span className="first-touch-related-history__icon" aria-hidden="true">
      <CIcon icon={type === 'payments' ? cilHistory : cilList} size="xl" />
    </span>
    <h2 className="h5 mt-3">
      {type === 'payments' ? 'Invoices and payments' : 'Quotation history'}
    </h2>
    <p className="text-muted">
      Open the client commercial history to review the complete underlying records and payment
      details.
    </p>
    <CButton color="primary" variant="outline" onClick={() => onOpen(companyId)}>
      Open current commercial history
      <CIcon icon={cilArrowRight} className="ms-2" aria-hidden="true" />
    </CButton>
  </div>
)

const ClientFirstTouchDetailPage = () => {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : 'sales'
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
  const tabRefs = useRef({})
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
  const unassignedProjects = useMemo(
    () => (record?.projects || []).filter((project) => !project.salesOwner).length,
    [record?.projects],
  )
  const firstTouchActions = getFirstTouchActionAvailability(record, record?.permissions)
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

  const openCommercialHistory = () => navigate(`/client/roi/${record.companyId}?period=all`)

  const activateTab = (tabKey, focus = false) => {
    setSearchParams({ tab: tabKey }, { replace: true })
    if (focus) requestAnimationFrame(() => tabRefs.current[tabKey]?.focus())
  }

  const handleTabKeyDown = (event, tabIndex) => {
    let nextIndex = tabIndex
    if (event.key === 'ArrowRight') nextIndex = (tabIndex + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (tabIndex - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return

    event.preventDefault()
    activateTab(tabs[nextIndex].key, true)
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
                {canReviewConflicts && hasOpenFirstTouchConflict(record) ? (
                  <CButton
                    size="sm"
                    color="warning"
                    variant="outline"
                    onClick={() => {
                      activateTab('claims')
                      setConflictReviewVisible(true)
                    }}
                  >
                    Review Conflict
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
            <CCardBody>
              {statsVisible ? <StatsStrip items={contributionStats} /> : null}
              <CAlert color="info" className="mb-0">
                These all-time client totals provide commercial context only. Sales credit remains
                with the salesperson assigned to each project or job.
              </CAlert>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-3 mb-3">
        <CCol xs={12}>
          <ClientOriginPanel
            firstTouch={record.firstTouch}
            onSubmit={() => setClaimMode(record.firstTouch ? 'competing' : 'create')}
            onViewEvidence={() => setEvidenceVisible(true)}
            onEdit={firstTouchActions.canEdit ? () => setClaimMode('edit') : undefined}
            onDispute={firstTouchActions.canDispute ? () => setClaimMode('dispute') : undefined}
          />
        </CCol>
      </CRow>

      {pendingClarification ? (
        <CAlert
          color="warning"
          className="d-flex align-items-center justify-content-between gap-3 flex-wrap"
        >
          <div>
            <strong>Clarification requested.</strong> {pendingClarification.requestNote}
          </div>
          <CButton color="warning" size="sm" onClick={() => setClarificationVisible(true)}>
            Provide Clarification
          </CButton>
        </CAlert>
      ) : null}

      {unassignedProjects > 0 ? (
        <CAlert color="warning" className="d-flex align-items-start gap-2">
          <div>
            <strong>{unassignedProjects} project requires sales-credit assignment.</strong> Its
            value remains in the client contribution total but is not credited to first-touch staff
            or any salesperson.
          </div>
        </CAlert>
      ) : null}

      <CCard className="mb-4 first-touch-detail-tabs-card">
        <div className="first-touch-detail-tabs" role="tablist" aria-label="Client origin details">
          {tabs.map((tab, tabIndex) => (
            <button
              key={tab.key}
              id={`first-touch-tab-${tab.key}`}
              type="button"
              className={`first-touch-detail-tab ${activeTab === tab.key ? 'is-active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`first-touch-panel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              ref={(node) => {
                tabRefs.current[tab.key] = node
              }}
              onClick={() => activateTab(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, tabIndex)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <CCardBody
          id={`first-touch-panel-${activeTab}`}
          className="first-touch-tab-panel"
          role="tabpanel"
          aria-labelledby={`first-touch-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'sales' ? (
            <ProjectSalesCreditTable
              projects={record.projects}
              onOpenProject={(project) => navigate(`/project/manage/${project.id}`)}
            />
          ) : null}
          {activeTab === 'claims' ? <FirstTouchClaimsHistory record={record} /> : null}
          {activeTab === 'timeline' ? (
            <FirstTouchTimeline firstTouch={record.firstTouch} entries={record.timeline} />
          ) : null}
          {activeTab === 'payments' ? (
            <RelatedHistoryPanel
              type="payments"
              companyId={record.companyId}
              onOpen={openCommercialHistory}
            />
          ) : null}
          {activeTab === 'quotes' ? (
            <RelatedHistoryPanel
              type="quotes"
              companyId={record.companyId}
              onOpen={openCommercialHistory}
            />
          ) : null}
        </CCardBody>
      </CCard>

      <div className="first-touch-credit-boundary mb-4" role="note">
        <span>First touch establishes documented client origin</span>
        <CIcon icon={cilArrowRight} aria-hidden="true" />
        <span>Each project retains its own salesperson credit</span>
      </div>

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
