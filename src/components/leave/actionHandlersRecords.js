import { useCallback, useState } from 'react'
import dialog from '../dialog/dialogService'
import { dispatchAppNotificationsChanged } from '../../notifications/appNotificationEvents'

const fetchLeaveJson = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || 'Request failed'}`)
  }

  let result
  try {
    result = await res.json()
  } catch {
    throw new Error('Invalid JSON response')
  }

  if (result.status !== 'success') {
    throw new Error(result.message || 'Request failed')
  }

  return result
}

const formatStaffIdentity = (name, code, fallback) => {
  if (name && code) return `${name} (${code})`
  return name || code || fallback || ''
}

export const useLeaveRecordHandlers = () => {
  const [leaveRecords, setLeaveRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [recordsError, setRecordsError] = useState('')

  const fetchLeaveRecords = useCallback(async ({ signal } = {}) => {
    try {
      setLoadingRecords(true)
      setRecordsError('')
      const result = await fetchLeaveJson(`${import.meta.env.VITE_API_BASE}hr/leaves/personal`, {
        method: 'GET',
        signal,
      })

      const mapped = (result.leaves || []).map((row) => ({
        id: row.id,
        leaveType: row.type,
        appliedAt: row.applied_at,
        startDate: row.start_date,
        startTime: row.start_time,
        endDate: row.end_date,
        endTime: row.end_time,
        duration: row.duration_days,
        status: row.status,
        reason: row.reason,
        reviewedStatus: row.reviewed_status,
        reviewedRemarks: row.reviewed_remarks,
        reviewedAt: row.reviewed_at,
        approvedStatus: row.approved_status,
        approvedRemarks: row.approved_remarks,
        approvedAt: row.approved_at,
        cancelledBy: formatStaffIdentity(
          row.canceller_name,
          row.canceller_code,
          row.cancelled_by ?? row.cancelledBy,
        ),
        cancelledAt: row.cancelled_at || row.cancelledAt,
      }))
      setLeaveRecords(mapped)
      return true
    } catch (err) {
      if (signal?.aborted || err?.name === 'AbortError') return false
      console.error('Fetch error:', err)
      setRecordsError(err?.message || 'Could not load leave records.')
      return false
    } finally {
      if (!signal?.aborted) setLoadingRecords(false)
    }
  }, [])

  const handleCancel = useCallback(
    async (leaveId, status) => {
      const isApproved = status === 'Approved'
      if (
        !(await dialog.confirm(
          isApproved
            ? 'Are you sure you want to revoke this approved leave?'
            : 'Are you sure you want to cancel this leave application?',
          {
            confirmText: isApproved ? 'Revoke Leave' : 'Cancel Application',
            confirmColor: 'danger',
          },
        ))
      )
        return

      try {
        await fetchLeaveJson(
          `${import.meta.env.VITE_API_BASE}hr/leaves/${encodeURIComponent(leaveId)}/cancel`,
          {
            method: 'POST',
            body: JSON.stringify({ id: leaveId }),
          },
        )

        dispatchAppNotificationsChanged()
        dialog.alert(
          isApproved ? 'Leave revoked successfully.' : 'Leave application cancelled successfully.',
        )
        fetchLeaveRecords()
      } catch (err) {
        console.error('Cancel error:', err)
        dialog.alert(err?.message || 'Server error. Please try again later.')
      }
    },
    [fetchLeaveRecords],
  )

  const getStatusBadge = (status) => {
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

  return {
    leaveRecords,
    loadingRecords,
    recordsError,
    fetchLeaveRecords,
    handleCancel,
    getStatusBadge,
  }
}
