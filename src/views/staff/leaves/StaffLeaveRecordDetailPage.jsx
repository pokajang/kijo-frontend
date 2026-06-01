import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import {
  DataTableDetailFields,
  DataTableDetailShell,
  DataTableStatusBadge,
} from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import { findRecordById } from '../../../utils/detailPages'
import * as AH from './actionHandlers'

const formatTime = (value) => {
  if (!value) return '-'
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
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
      return 'info'
    default:
      return 'dark'
  }
}

const normalizeLeave = (record) => {
  if (!record) return null
  const staff = `${record.applicant_name || 'Unknown'}${
    record.applicant_code ? ` (${record.applicant_code})` : ''
  }`
  const reviewer = record.reviewer_code
    ? `${record.reviewer_name || 'Reviewer'} (${record.reviewer_code})`
    : '-'
  const approver = record.approver_code
    ? `${record.approver_name || 'Approver'} (${record.approver_code})`
    : '-'

  return {
    ...record,
    staff,
    leave: record.type || '-',
    period: `${record.start_date || '-'} ${formatTime(record.start_time)} to ${
      record.end_date || '-'
    } ${formatTime(record.end_time)}`,
    durationDisplay: `${record.duration_days || 0} days`,
    reviewer,
    approver,
  }
}

const getPastActionLabel = (action) => {
  switch (action) {
    case 'recommend':
      return 'recommended'
    case 'approve':
      return 'approved'
    case 'reject':
      return 'rejected'
    default:
      return `${action}ed`
  }
}

const getWorkflowActionColor = (action) => {
  if (action === 'approve') return 'success'
  if (action === 'reject') return 'danger'
  return 'info'
}

const StaffLeaveRecordDetailPage = () => {
  const { leaveId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/staff/leaves'
  const [record, setRecord] = useState(() => normalizeLeave(location.state?.record))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [actionModal, setActionModal] = useState({ visible: false, action: '', label: '' })
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const records = await AH.getAllLeaves()
      const found = findRecordById(records, leaveId)
      setRecord(normalizeLeave(found))
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

  const openActionModal = (action) => {
    const label = action[0].toUpperCase() + action.slice(1)
    setRemarks(label)
    setActionModal({ visible: true, action, label })
  }

  const closeActionModal = () => {
    if (submitting) return
    setActionModal({ visible: false, action: '', label: '' })
    setRemarks('')
  }

  const submitAction = async () => {
    if (!actionModal.action) return
    setSubmitting(true)
    try {
      await AH.leaveAction(leaveId, actionModal.action, remarks)
      setActionModal({ visible: false, action: '', label: '' })
      setRemarks('')
      dialog.alert(`Leave successfully ${getPastActionLabel(actionModal.action)}.`)
      await loadRecord()
    } catch (err) {
      dialog.alert(err?.message || `Failed to ${actionModal.action}.`)
    } finally {
      setSubmitting(false)
    }
  }

  const actions = useMemo(() => {
    const isPending = record?.status === 'Pending'
    const hasReviewed = Boolean(record?.reviewed_by)
    return [
      {
        key: 'recommend',
        label: 'Recommend',
        buttonColor: 'info',
        disabled: !isPending || hasReviewed,
        onClick: () => openActionModal('recommend'),
      },
      {
        key: 'approve',
        label: 'Approve',
        buttonColor: 'success',
        disabled: !isPending || !hasReviewed,
        onClick: () => openActionModal('approve'),
      },
      {
        key: 'reject',
        label: 'Reject',
        danger: true,
        disabled: !isPending,
        onClick: () => openActionModal('reject'),
      },
    ]
  }, [record])

  return (
    <>
      <DataTableDetailShell
        title="Staff Leave Details"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={record}
        actions={actions}
        emptyMessage="Leave record not found."
      >
        <DataTableDetailFields
          fields={[
            { key: 'staff', label: 'Staff', value: record?.staff },
            { key: 'leave', label: 'Leave Type', value: record?.leave },
            { key: 'applied', label: 'Applied At', value: record?.applied_at },
            { key: 'period', label: 'Period', value: record?.period },
            { key: 'duration', label: 'Duration', value: record?.durationDisplay },
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
            { key: 'reviewer', label: 'Reviewer', value: record?.reviewer },
            { key: 'reviewedAt', label: 'Reviewed At', value: record?.reviewed_at || '-' },
            {
              key: 'reviewedStatus',
              label: 'Reviewed Status',
              value: record?.reviewed_status || '-',
            },
            {
              key: 'reviewedRemarks',
              label: 'Reviewed Remarks',
              value: record?.reviewed_remarks || '-',
              xs: 12,
            },
            { key: 'approver', label: 'Approver', value: record?.approver },
            { key: 'approvedAt', label: 'Approved At', value: record?.approved_at || '-' },
            {
              key: 'approvedStatus',
              label: 'Approved Status',
              value: record?.approved_status || '-',
            },
            {
              key: 'approvedRemarks',
              label: 'Approved Remarks',
              value: record?.approved_remarks || '-',
              xs: 12,
            },
          ]}
        />
      </DataTableDetailShell>

      <CModal
        visible={actionModal.visible}
        onClose={closeActionModal}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>{actionModal.label} Leave</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">
            Confirm to {actionModal.label.toLowerCase()} this leave and provide remarks.
          </p>
          <CFormTextarea
            rows={4}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Enter remarks"
            disabled={submitting}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeActionModal}
            disabled={submitting}
          >
            Cancel
          </CButton>
          <CButton
            color={getWorkflowActionColor(actionModal.action)}
            size="sm"
            onClick={submitAction}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : actionModal.label || 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default StaffLeaveRecordDetailPage
