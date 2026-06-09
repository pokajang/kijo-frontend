import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailFields, DataTableDetailShell, DataTableStatusBadge } from '../datatable'
import dialog from '../dialog/dialogService'
import { fetchJson, findRecordById, getArrayFromPayload } from '../../utils/detailPages'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { dispatchAppNotificationsChanged } from '../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE

const mapPersonalLeave = (row) => {
  if (!row) return null
  return {
    id: row.id,
    leaveType: row.type || row.leaveType,
    appliedAt: row.applied_at || row.appliedAt,
    startDate: row.start_date || row.startDate,
    startTime: row.start_time || row.startTime,
    endDate: row.end_date || row.endDate,
    endTime: row.end_time || row.endTime,
    duration: row.duration_days || row.duration,
    status: row.status,
    reason: row.reason,
    reviewedStatus: row.reviewed_status || row.reviewedStatus,
    reviewedRemarks: row.reviewed_remarks || row.reviewedRemarks,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    approvedStatus: row.approved_status || row.approvedStatus,
    approvedRemarks: row.approved_remarks || row.approvedRemarks,
    approvedAt: row.approved_at || row.approvedAt,
  }
}

const getStatusTone = (status) => {
  switch (status) {
    case 'Pending':
      return 'warning'
    case 'Approved':
      return 'success'
    case 'Rejected':
      return 'danger'
    case 'Cancelled':
      return 'secondary'
    default:
      return 'dark'
  }
}

const LeaveRecordDetailPage = () => {
  const { leaveId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/my/leaves'
  const [record, setRecord] = useState(() => mapPersonalLeave(location.state?.record))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const { consumeEntity } = useAppNotifications()

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchJson(`${API_BASE}hr/leaves/personal`)
      const records = getArrayFromPayload(data, ['leaves', 'data']).map(mapPersonalLeave)
      const found = findRecordById(records, leaveId)
      setRecord(found)
      if (!found) setError('Leave record not found.')
    } catch (err) {
      setError(err?.message || 'Unable to load leave details.')
    } finally {
      setLoading(false)
    }
  }, [leaveId])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  useEffect(() => {
    Promise.allSettled([
      consumeEntity({
        moduleKey: 'my.leaves',
        entityType: 'leave_application',
        entityId: leaveId,
      }),
      consumeEntity({
        moduleKey: 'staff.leaves',
        entityType: 'leave_application',
        entityId: leaveId,
        routePrefix: '/my/leaves',
      }),
    ]).catch(() => {})
  }, [consumeEntity, leaveId])

  const cancelLeave = useCallback(async () => {
    const isApproved = record?.status === 'Approved'
    const actionLabel = isApproved ? 'revoke this approved leave' : 'cancel this leave application'
    if (
      !(await dialog.confirm(`Are you sure you want to ${actionLabel}?`, {
        confirmText: isApproved ? 'Revoke Leave' : 'Cancel Application',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const data = await fetchJson(`${API_BASE}hr/leaves/${encodeURIComponent(leaveId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ id: leaveId }),
      })
      if (data.status !== 'success') throw new Error(data.message || 'Unable to cancel leave')
      dispatchAppNotificationsChanged()
      dialog.alert(
        isApproved ? 'Leave revoked successfully.' : 'Leave application cancelled successfully.',
      )
      await loadRecord()
    } catch (err) {
      dialog.alert(err?.message || 'Server error. Please try again later.')
    }
  }, [leaveId, loadRecord, record?.status])

  const actions = useMemo(() => {
    if (!['Pending', 'Approved'].includes(record?.status)) return []

    return [
      {
        key: 'cancel',
        label: record?.status === 'Approved' ? 'Revoke Leave' : 'Cancel',
        danger: record?.status === 'Approved',
        onClick: cancelLeave,
      },
    ]
  }, [cancelLeave, record?.status])

  return (
    <DataTableDetailShell
      title="Leave Record Details"
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={record}
      actions={actions}
      emptyMessage="Leave record not found."
    >
      <DataTableDetailFields
        fields={[
          { key: 'type', label: 'Leave Type', value: record?.leaveType },
          { key: 'applied', label: 'Applied At', value: record?.appliedAt },
          {
            key: 'start',
            label: 'Start',
            value: `${record?.startDate || '-'} ${record?.startTime || ''}`,
          },
          { key: 'end', label: 'End', value: `${record?.endDate || '-'} ${record?.endTime || ''}` },
          { key: 'duration', label: 'Duration', value: `${record?.duration || 0} days` },
          {
            key: 'status',
            label: 'Status',
            value: (
              <DataTableStatusBadge tone={getStatusTone(record?.status)}>
                {record?.status || '-'}
              </DataTableStatusBadge>
            ),
          },
          { key: 'reason', label: 'Reason', value: record?.reason || '-', xs: 12 },
          { key: 'reviewedStatus', label: 'Reviewed Status', value: record?.reviewedStatus || '-' },
          { key: 'reviewedAt', label: 'Reviewed At', value: record?.reviewedAt || '-' },
          {
            key: 'reviewedRemarks',
            label: 'Reviewed Remarks',
            value: record?.reviewedRemarks || '-',
            xs: 12,
          },
          { key: 'approvedStatus', label: 'Approved Status', value: record?.approvedStatus || '-' },
          { key: 'approvedAt', label: 'Approved At', value: record?.approvedAt || '-' },
          {
            key: 'approvedRemarks',
            label: 'Approved Remarks',
            value: record?.approvedRemarks || '-',
            xs: 12,
          },
        ]}
      />
    </DataTableDetailShell>
  )
}

export default LeaveRecordDetailPage
