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
} from '../../components/datatable'
import dialog from '../../components/dialog/dialogService'
import { findRecordById } from '../../utils/detailPages'
import AdminFixModal, { RESOLUTION_TRACK_OPTIONS, STATUS_OPTIONS } from './AdminFixModal'
import {
  deleteFeedback,
  fetchAllFeedbacks,
  fetchSessionInfo,
  updateFeedback,
} from './actionHandlers'
import { useAuth } from '../../auth/AuthProvider'
import { showToast } from '../../components/toast/toastService'

const normalize = (value) => (value ?? '').toString().trim().toLowerCase()

const getStatusTone = (status) => {
  const normalized = normalize(status)
  if (normalized === 'fixed completed') return 'success'
  if (normalized === 'pending' || normalized === 'fixed pending pushed') return 'warning'
  if (normalized === 'resolved') return 'secondary'
  return 'info'
}

const getResolutionTrackTone = (track) => {
  const normalized = normalize(track)
  if (normalized === '30-day fix') return 'primary'
  if (normalized === 'needs triage') return 'warning'
  if (normalized === 'rejected') return 'danger'
  if (normalized === 'not actionable') return 'secondary'
  return 'info'
}

const getTodayISO = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const normalizeAdminStatus = (status) => {
  if (!status) return STATUS_OPTIONS[0]
  const match = STATUS_OPTIONS.find(
    (option) => option.toLowerCase() === status.toString().trim().toLowerCase(),
  )
  return match || STATUS_OPTIONS[0]
}

const normalizeResolutionTrack = (track) => {
  if (!track) return RESOLUTION_TRACK_OPTIONS[0]
  const match = RESOLUTION_TRACK_OPTIONS.find(
    (option) => option.toLowerCase() === track.toString().trim().toLowerCase(),
  )
  return match || RESOLUTION_TRACK_OPTIONS[0]
}

const FeedbackDetailPage = () => {
  const { feedbackId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const returnTo = location.state?.returnTo || '/support/feedback'
  const [feedback, setFeedback] = useState(location.state?.record || null)
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentStaffId, setCurrentStaffId] = useState(null)
  const [fixModalVisible, setFixModalVisible] = useState(false)
  const [fixData, setFixData] = useState({
    id: null,
    status: '',
    resolution_track: '',
    action_date: '',
    remarks: '',
  })
  const [editVisible, setEditVisible] = useState(false)
  const [editMessage, setEditMessage] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const isOwnerFeedback = useCallback(
    (record) => {
      const ownerId = Number(record?.reported_by_id)
      const myId = Number(currentStaffId)
      return Number.isFinite(ownerId) && Number.isFinite(myId) && ownerId === myId
    },
    [currentStaffId],
  )

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ isAdmin: admin, staffId }, records] = await Promise.all([
        fetchSessionInfo(user),
        fetchAllFeedbacks(),
      ])
      setIsAdmin(admin)
      setCurrentStaffId(staffId)
      const found = findRecordById(records, feedbackId)
      setFeedback(found)
      if (!found) setError('Feedback record not found.')
    } catch (err) {
      setError(err?.message || 'Unable to load feedback details.')
    } finally {
      setLoading(false)
    }
  }, [feedbackId, user])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  const openFixModal = useCallback(() => {
    if (!isAdmin) {
      dialog.alert('Only admins can update fix details.')
      return
    }
    setFixData({
      id: feedback.id,
      status: normalizeAdminStatus(feedback.status),
      resolution_track: normalizeResolutionTrack(feedback.resolution_track),
      action_date: feedback.action_date || getTodayISO(),
      remarks: feedback.remarks || '',
    })
    setFixModalVisible(true)
  }, [feedback, isAdmin])

  const saveFixModal = async () => {
    const result = await updateFeedback(fixData)
    if (result.status === 'success') {
      setFixModalVisible(false)
      await loadFeedback()
      showToast('Feedback fix details updated.')
      return
    }
    dialog.alert('Failed to update: ' + result.message)
  }

  const openEditModal = useCallback(() => {
    if (!isAdmin && !isOwnerFeedback(feedback)) {
      dialog.alert('You can only edit your own feedback.')
      return
    }
    setEditMessage(feedback?.feedback || '')
    setEditVisible(true)
  }, [feedback, isAdmin, isOwnerFeedback])

  const saveEdit = async () => {
    const trimmed = editMessage.trim()
    if (!trimmed) {
      dialog.alert('Please describe the issue before submitting.')
      return
    }
    setEditSubmitting(true)
    try {
      const result = await updateFeedback({ id: feedbackId, feedback: trimmed })
      if (result.status === 'success') {
        setEditVisible(false)
        await loadFeedback()
        showToast('Feedback updated.')
      } else {
        dialog.alert(result.message || 'Failed to update feedback.')
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  const removeFeedback = useCallback(async () => {
    if (!isAdmin && !isOwnerFeedback(feedback)) {
      dialog.alert('You can only delete your own feedback.')
      return
    }
    if (
      !(await dialog.confirm('Delete this feedback? This action cannot be undone.', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    const result = await deleteFeedback(feedbackId)
    if (result.status === 'success') {
      showToast('Feedback deleted.')
      navigate(returnTo)
      return
    }
    dialog.alert('Failed to delete: ' + result.message)
  }, [feedback, feedbackId, isAdmin, isOwnerFeedback, navigate, returnTo])

  const actions = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        disabled: !isAdmin && !isOwnerFeedback(feedback),
        onClick: openEditModal,
      },
      { key: 'update-fix', label: 'Update Fix', hidden: !isAdmin, onClick: openFixModal },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        disabled: !isAdmin && !isOwnerFeedback(feedback),
        onClick: removeFeedback,
      },
    ],
    [feedback, isAdmin, isOwnerFeedback, openEditModal, openFixModal, removeFeedback],
  )

  return (
    <>
      <DataTableDetailShell
        title="Feedback Details"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={error}
        record={feedback}
        actions={actions}
        emptyMessage="Feedback record not found."
      >
        <DataTableDetailFields
          fields={[
            { key: 'feedback', label: 'Feedback', value: feedback?.feedback || '-', xs: 12 },
            { key: 'reporter', label: 'Reported By', value: feedback?.reported_by || '-' },
            { key: 'reported', label: 'Date Reported', value: feedback?.date_reported || '-' },
            {
              key: 'status',
              label: 'Status',
              value: (
                <DataTableStatusBadge tone={getStatusTone(feedback?.status)}>
                  {feedback?.status || '-'}
                </DataTableStatusBadge>
              ),
            },
            {
              key: 'resolutionTrack',
              label: 'Resolution Track',
              value: (
                <DataTableStatusBadge tone={getResolutionTrackTone(feedback?.resolution_track)}>
                  {feedback?.resolution_track || 'Needs Triage'}
                </DataTableStatusBadge>
              ),
            },
            { key: 'actionDate', label: 'Action Date', value: feedback?.action_date || '-' },
            { key: 'remarks', label: 'Remarks', value: feedback?.remarks || '-', xs: 12 },
          ]}
        />
      </DataTableDetailShell>

      <AdminFixModal
        visible={fixModalVisible}
        data={fixData}
        onClose={() => setFixModalVisible(false)}
        onChangeField={(field, value) => setFixData((prev) => ({ ...prev, [field]: value }))}
        onSave={saveFixModal}
      />

      <CModal visible={editVisible} onClose={() => setEditVisible(false)} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Submit Support Ticket</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormTextarea
            rows={4}
            placeholder="Enter your feedback here..."
            value={editMessage}
            onChange={(event) => setEditMessage(event.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setEditVisible(false)}
            disabled={editSubmitting}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={saveEdit} disabled={editSubmitting}>
            {editSubmitting ? 'Submitting...' : 'Submit'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FeedbackDetailPage
