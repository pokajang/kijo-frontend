import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CBadge, CButton, CFormLabel, CFormSelect } from '@coreui/react'
import { getMyEntitlementHistory, getMyEntitlements } from './actionHandlers'
import { useLeaveRecordHandlers } from './actionHandlersRecords'
import LeaveRecordTable from './LeaveRecordTable'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { getPeriodRangePreset, getPeriodRangeScopeLabel } from '../filters'
import {
  allLeaveTypesValue,
  buildLeaveBalanceSummary,
  getDefaultLeaveType,
  getLeaveTypeOptions,
} from './leaveBalanceSummary'
import { getCurrentReturnTo } from '../../utils/navigation/returnTo'

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

    const loadRecordsAndConsumeNotifications = async () => {
      const recordsLoaded = await fetchLeaveRecords()
      if (cancelled || !recordsLoaded) return

      consumeRouteGroup({
        routePrefix: '/my/leaves',
        moduleKeys: ['my.leaves', 'staff.leaves'],
      }).catch(() => {})
    }

    loadRecordsAndConsumeNotifications()

    return () => {
      cancelled = true
    }
  }, [consumeRouteGroup, fetchLeaveRecords])

  useEffect(() => {
    let cancelled = false

    const fetchEntitlements = async () => {
      try {
        setLoadingEntitlements(true)
        setEntitlementsError('')
        const items = await getMyEntitlements()
        if (!cancelled) setEntitlements(items)
      } catch (err) {
        console.error(err)
        if (!cancelled) setEntitlementsError(err?.message || 'Could not load leave balances.')
      } finally {
        if (!cancelled) setLoadingEntitlements(false)
      }
    }

    fetchEntitlements()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!assignmentHistoryVisible || assignmentHistoryLoaded) return undefined
    let cancelled = false

    const fetchAssignmentHistory = async () => {
      try {
        setLoadingAssignmentHistory(true)
        setAssignmentHistoryError('')
        const items = await getMyEntitlementHistory()
        if (!cancelled) {
          setAssignmentHistory(items)
          setAssignmentHistoryLoaded(true)
        }
      } catch (err) {
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
        <CAlert color="danger" className="mb-3">
          {recordsError}
        </CAlert>
      )}
      {entitlementsError && (
        <CAlert color="warning" className="mb-3">
          {entitlementsError}
        </CAlert>
      )}
      {assignmentHistoryError && assignmentHistoryVisible && (
        <CAlert color="warning" className="mb-3">
          {assignmentHistoryError}
        </CAlert>
      )}

      {statsVisible && (
        <div className="leave-record-balance-section mb-3">
          <div className="leave-record-balance-toolbar">
            <div className="leave-record-balance-toolbar-head">
              <CFormLabel htmlFor="leave-record-balance-type" className="mb-0">
                Leave Balance
              </CFormLabel>
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => setAssignmentHistoryVisible((visible) => !visible)}
              >
                {assignmentHistoryVisible ? 'Hide Assignment History' : 'Assignment History'}
              </CButton>
            </div>
            <CFormSelect
              id="leave-record-balance-type"
              size="sm"
              className="leave-record-balance-type-select"
              value={effectiveLeaveType}
              onChange={(event) => setSelectedLeaveType(event.target.value)}
              disabled={loadingEntitlements || leaveTypeOptions.length === 0}
            >
              {leaveTypeOptions.length === 0 && (
                <option value={allLeaveTypesValue}>No leave types</option>
              )}
              {leaveTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div
            className="leave-balance-grid leave-record-balance-grid"
            aria-busy={loadingEntitlements ? 'true' : undefined}
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
            <div className="leave-assignment-history-panel">
              {loadingAssignmentHistory ? (
                <div className="small text-muted">Loading assignment history...</div>
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
    </>
  )
}

export default LeaveRecord
