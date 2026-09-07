import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CBadge, CButton, CFormLabel } from '@coreui/react'
import { getMyEntitlementHistory, getMyEntitlements } from './actionHandlers'
import { useLeaveRecordHandlers } from './actionHandlersRecords'
import LeaveRecordTable from './LeaveRecordTable'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { getPeriodRangePreset, getPeriodRangeScopeLabel } from '../filters'
import {
  buildLeaveBalanceSummary,
  getDefaultLeaveType,
  getLeaveTypeOptions,
} from './leaveBalanceSummary'
import { getCurrentReturnTo } from '../../utils/navigation/returnTo'
import { DataTableOptionMenu } from '../datatable'

const currentYear = new Date().getFullYear()

const getAssignmentHistoryBadgeColor = (eventType = '') => {
  if (eventType === 'Deleted') return 'danger'
  if (eventType === 'Updated') return 'info'
  return 'success'
}

const LeaveRecord = ({ onScopeLabelChange, statsVisible = true, controlsVisible = true }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [entitlements, setEntitlements] = useState([])
  const [loadingEntitlements, setLoadingEntitlements] = useState(false)
  const [entitlementsError, setEntitlementsError] = useState('')
  const [assignmentHistory, setAssignmentHistory] = useState([])
  const [assignmentHistoryVisible, setAssignmentHistoryVisible] = useState(false)
  const [assignmentHistoryLoaded, setAssignmentHistoryLoaded] = useState(false)
  const [loadingAssignmentHistory, setLoadingAssignmentHistory] = useState(false)
  const [assignmentHistoryError, setAssignmentHistoryError] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [selectedLeaveType, setSelectedLeaveType] = useState('')
  const {
    leaveRecords,
    loadingRecords,
    recordsError,
    fetchLeaveRecords,
    handleCancel,
    getStatusBadge,
  } = useLeaveRecordHandlers()
  const { consumeRouteGroup } = useAppNotifications()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const loadRecordsAndConsumeNotifications = async () => {
      const recordsLoaded = await fetchLeaveRecords({ signal: controller.signal })
      if (cancelled || !recordsLoaded) return

      consumeRouteGroup({
        routePrefix: '/my/leaves',
        moduleKeys: ['my.leaves', 'staff.leaves'],
      }).catch(() => {})
    }

    loadRecordsAndConsumeNotifications()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [consumeRouteGroup, fetchLeaveRecords])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const fetchEntitlements = async () => {
      try {
        setLoadingEntitlements(true)
        setEntitlementsError('')
        const items = await getMyEntitlements({ signal: controller.signal })
        if (!cancelled) setEntitlements(items)
      } catch (err) {
        if (controller.signal.aborted) return
        console.error(err)
        if (!cancelled) setEntitlementsError(err?.message || 'Could not load leave balances.')
      } finally {
        if (!cancelled) setLoadingEntitlements(false)
      }
    }

    fetchEntitlements()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!assignmentHistoryVisible || assignmentHistoryLoaded) return undefined
    let cancelled = false
    const controller = new AbortController()

    const fetchAssignmentHistory = async () => {
      try {
        setLoadingAssignmentHistory(true)
        setAssignmentHistoryError('')
        const items = await getMyEntitlementHistory({ signal: controller.signal })
        if (!cancelled) {
          setAssignmentHistory(items)
          setAssignmentHistoryLoaded(true)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error(err)
        if (!cancelled) {
          setAssignmentHistoryError(err?.message || 'Could not load assignment history.')
          setAssignmentHistoryLoaded(true)
        }
      } finally {
        if (!cancelled) setLoadingAssignmentHistory(false)
      }
    }

    fetchAssignmentHistory()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [assignmentHistoryLoaded, assignmentHistoryVisible])

  const leaveTypeOptions = useMemo(() => getLeaveTypeOptions(entitlements), [entitlements])
  const effectiveLeaveType = selectedLeaveType || getDefaultLeaveType(entitlements)
  const balanceSummary = useMemo(
    () => buildLeaveBalanceSummary(entitlements, currentYear, effectiveLeaveType),
    [effectiveLeaveType, entitlements],
  )
  const scopeLabel = useMemo(
    () => (periodRange ? getPeriodRangeScopeLabel(periodRange) : ''),
    [periodRange],
  )

  useEffect(() => {
    if (typeof onScopeLabelChange !== 'function') return undefined
    onScopeLabelChange(scopeLabel)
    return () => onScopeLabelChange('')
  }, [onScopeLabelChange, scopeLabel])

  return (
    <>
      {recordsError && (
        <CAlert color="danger" className="mb-3" role="alert">
          {recordsError}
        </CAlert>
      )}
      {entitlementsError && (
        <CAlert color="warning" className="mb-3" role="alert">
          {entitlementsError}
        </CAlert>
      )}
      {assignmentHistoryError && assignmentHistoryVisible && (
        <CAlert color="warning" className="mb-3" role="alert">
          {assignmentHistoryError}
        </CAlert>
      )}

      {statsVisible && (
        <div className="leave-record-balance-section mb-3">
          <h2 className="leave-record-section-heading">Leave balance</h2>
          <div className="leave-record-balance-toolbar">
            <div className="leave-record-balance-context">
              <CFormLabel htmlFor="leave-record-balance-type" className="mb-0">
                Balance
              </CFormLabel>
              <DataTableOptionMenu
                id="leave-record-balance-type"
                className="leave-record-balance-type-select"
                value={effectiveLeaveType}
                options={leaveTypeOptions}
                onChange={setSelectedLeaveType}
                ariaLabel="Leave balance type"
                placeholder={loadingEntitlements ? 'Loading...' : 'No leave types'}
                disabled={loadingEntitlements || leaveTypeOptions.length === 0}
              />
            </div>
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              size="sm"
              className="leave-assignment-history-toggle"
              aria-label={
                assignmentHistoryVisible ? 'Hide Assignment History' : 'Assignment History'
              }
              aria-expanded={assignmentHistoryVisible}
              aria-controls="leave-assignment-history-panel"
              onClick={() => setAssignmentHistoryVisible((visible) => !visible)}
            >
              {assignmentHistoryVisible ? 'Hide history' : 'History'}
            </CButton>
          </div>
          <div
            className="leave-balance-grid leave-record-balance-grid"
            aria-busy={loadingEntitlements ? 'true' : undefined}
            aria-live="polite"
          >
            {balanceSummary.map((card) => (
              <div key={card.key} className="leave-balance-card leave-record-balance-card">
                <div className="leave-balance-card-title">{card.title}</div>
                <CBadge color="secondary" className="leave-balance-card-badge">
                  {card.badge}
                </CBadge>
                <div className="leave-record-balance-metrics">
                  {card.metrics.map((metric) => (
                    <div key={metric.key} className="leave-record-balance-metric">
                      <div className="leave-record-balance-metric-value">
                        {loadingEntitlements ? '...' : metric.value}
                      </div>
                      <div className="leave-record-balance-metric-label">{metric.label}</div>
                    </div>
                  ))}
                </div>
                {card.remarks && (
                  <div className="leave-balance-card-remarks">Remarks: {card.remarks}</div>
                )}
              </div>
            ))}
          </div>
          {assignmentHistoryVisible && (
            <div id="leave-assignment-history-panel" className="leave-assignment-history-panel">
              {loadingAssignmentHistory ? (
                <div className="small text-muted" role="status">
                  Loading assignment history...
                </div>
              ) : assignmentHistory.length === 0 ? (
                <div className="leave-balance-empty text-muted">
                  No leave assignment history found.
                </div>
              ) : (
                <div className="leave-assignment-history-list">
                  {assignmentHistory.map((item) => (
                    <div key={item.id} className="leave-assignment-history-item">
                      <div className="leave-assignment-history-item-head">
                        <CBadge color={getAssignmentHistoryBadgeColor(item.event_type)}>
                          {item.event_type || 'Assigned'}
                        </CBadge>
                        <span className="leave-assignment-history-title">
                          {item.leave_type || '-'} {item.year ? `- ${item.year}` : ''}
                        </span>
                      </div>
                      <div className="leave-assignment-history-meta">
                        {item.days ? `${item.days} days` : ''}
                        {item.created_at ? `${item.days ? ' | ' : ''}${item.created_at}` : ''}
                        {item.assigned_by ? ` | By ${item.assigned_by}` : ''}
                      </div>
                      {item.description && (
                        <div className="leave-assignment-history-description">
                          {item.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <section className="leave-records-section" aria-label="Leave records">
        <h2 className="leave-record-section-heading d-md-none">Leave records</h2>
        <LeaveRecordTable
          controlsVisible={controlsVisible}
          leaveRecords={leaveRecords}
          periodRange={periodRange}
          onPeriodRangeChange={setPeriodRange}
          loading={loadingRecords}
          handleCancel={handleCancel}
          getStatusBadge={getStatusBadge}
          onView={(record) =>
            navigate(`/my/leaves/records/${record.id}`, {
              state: { record, returnTo: getCurrentReturnTo(location) },
            })
          }
        />
      </section>
    </>
  )
}

export default LeaveRecord
