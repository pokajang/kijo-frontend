import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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
import AdminFixModal, { RESOLUTION_TRACK_OPTIONS, STATUS_OPTIONS } from './AdminFixModal'
import {
  fetchFeedback,
  postFeedbackComment,
  updateFeedback,
  verifyFeedback,
} from './actionHandlers'
import { showToast } from '../../components/toast/toastService'
import { getDetailReturnTo } from '../../utils/navigation/returnTo'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { dispatchAppNotificationsChanged } from '../../notifications/appNotificationEvents'
import FeedbackActivityTimeline from './FeedbackActivityTimeline'
import { getFeedbackStatusTone, getResolutionTrackTone } from './feedbackWorkflow'

const getTodayISO = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const normalizeOption = (value, options) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return options.find((option) => option.toLowerCase() === normalized) || options[0]
}

const FeedbackDetailPage = () => {
  const { feedbackId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = getDetailReturnTo(location, '/support/feedback')
  const { consumeEntity } = useAppNotifications()
  const [feedback, setFeedback] = useState(location.state?.record || null)
  const [history, setHistory] = useState([])
  const [permissions, setPermissions] = useState({
    can_comment: false,
    can_update_fix: false,
    can_verify: false,
    can_edit: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
  const [commentMessage, setCommentMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const applyDetailPayload = useCallback((payload) => {
    setFeedback(payload?.feedback || null)
    setHistory(Array.isArray(payload?.history) ? payload.history : [])
    setPermissions((current) => ({ ...current, ...(payload?.permissions || {}) }))
  }, [])

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchFeedback(feedbackId)
      applyDetailPayload(payload)
      await consumeEntity({
        moduleKey: 'support.feedback',
        entityType: 'system_feedback',
        entityId: feedbackId,
        routePrefix: '/support/feedback',
      }).catch(() => 0)
    } catch (err) {
      setError(err?.message || 'Unable to load feedback details.')
    } finally {
      setLoading(false)
    }
  }, [applyDetailPayload, consumeEntity, feedbackId])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  const openFixModal = useCallback(() => {
    if (!permissions.can_update_fix || !feedback) return
    setFixData({
      id: feedback.id,
      status: normalizeOption(feedback.status, STATUS_OPTIONS),
      resolution_track: normalizeOption(feedback.resolution_track, RESOLUTION_TRACK_OPTIONS),
      action_date: feedback.action_date || getTodayISO(),
      remarks: feedback.remarks || '',
    })
    setFixModalVisible(true)
  }, [feedback, permissions.can_update_fix])

  const runAction = useCallback(
    async (action, successMessage) => {
      setSubmitting(true)
      try {
        const result = await action()
        if (result?.status !== 'success') {
          throw new Error(result?.message || 'Unable to update feedback.')
        }
        if (result.feedback && result.history) {
          applyDetailPayload(result)
        } else {
          await loadFeedback()
        }
        dispatchAppNotificationsChanged()
        showToast(successMessage)
        return true
      } catch (err) {
        dialog.alert(err?.message || 'Unable to update feedback right now.')
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [applyDetailPayload, loadFeedback],
  )

  const saveFixModal = async () => {
    const saved = await runAction(
      () => updateFeedback(fixData),
      fixData.status === 'Fixed Completed'
        ? 'Fix submitted for reporter verification.'
        : 'Feedback details updated.',
    )
    if (saved) setFixModalVisible(false)
  }

  const saveEdit = async () => {
    const trimmed = editMessage.trim()
    if (!trimmed) {
      dialog.alert('Please describe the issue before submitting.')
      return
    }
    const saved = await runAction(
      () => updateFeedback({ id: feedbackId, feedback: trimmed }),
      'Feedback updated.',
    )
    if (saved) setEditVisible(false)
  }

  const postComment = async () => {
    const trimmed = commentMessage.trim()
    if (!trimmed) {
      dialog.alert('Enter a comment before posting.')
      return
    }
    const saved = await runAction(() => postFeedbackComment(feedbackId, trimmed), 'Comment posted.')
    if (saved) setCommentMessage('')
  }

  const confirmResolved = async () => {
    const confirmed = await dialog.confirm('Confirm that this issue has been rectified?', {
      confirmText: 'Confirm Resolved',
      confirmColor: 'success',
    })
    if (!confirmed) return
    await runAction(() => verifyFeedback(feedbackId, 'confirm'), 'Feedback marked as resolved.')
  }

  const rejectFix = async () => {
    const trimmed = commentMessage.trim()
    if (!trimmed) {
      dialog.alert('Enter a comment explaining why the issue is not fixed.')
      return
    }
    const rejected = await runAction(
      () => verifyFeedback(feedbackId, 'reject', trimmed),
      'Fix rejected and returned to the developer.',
    )
    if (rejected) setCommentMessage('')
  }

  const actions = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        hidden: !permissions.can_edit,
        onClick: () => {
          setEditMessage(feedback?.feedback || '')
          setEditVisible(true)
        },
      },
      {
        key: 'update-fix',
        label: 'Update Fix',
        hidden: !permissions.can_update_fix,
        onClick: openFixModal,
      },
    ],
    [feedback?.feedback, openFixModal, permissions.can_edit, permissions.can_update_fix],
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
                <DataTableStatusBadge tone={getFeedbackStatusTone(feedback?.status)}>
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

      {feedback ? <FeedbackActivityTimeline history={history} loading={loading} /> : null}

      {feedback && permissions.can_comment ? (
        <CCard className="mt-3">
          <CCardHeader>
            <strong>Add Comment</strong>
          </CCardHeader>
          <CCardBody>
            <CFormTextarea
              rows={4}
              placeholder={
                permissions.can_verify
                  ? 'Add a comment, or explain why the fix should be rejected...'
                  : 'Write a comment...'
              }
              value={commentMessage}
              onChange={(event) => setCommentMessage(event.target.value)}
              disabled={submitting}
            />
            <div className="d-flex flex-wrap gap-2 mt-3">
              <CButton color="primary" size="sm" onClick={postComment} disabled={submitting}>
                Post Comment
              </CButton>
              {permissions.can_verify ? (
                <>
                  <CButton
                    color="success"
                    size="sm"
                    onClick={confirmResolved}
                    disabled={submitting}
                  >
                    Confirm Resolved
                  </CButton>
                  <CButton
                    color="danger"
                    variant="outline"
                    size="sm"
                    onClick={rejectFix}
                    disabled={submitting}
                  >
                    Reject Fix
                  </CButton>
                </>
              ) : null}
            </div>
          </CCardBody>
        </CCard>
      ) : null}

      <AdminFixModal
        visible={fixModalVisible}
        data={fixData}
        onClose={() => setFixModalVisible(false)}
        onChangeField={(field, value) => setFixData((current) => ({ ...current, [field]: value }))}
        onSave={saveFixModal}
      />

      <CModal visible={editVisible} onClose={() => setEditVisible(false)} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Edit Feedback</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormTextarea
            rows={4}
            value={editMessage}
            onChange={(event) => setEditMessage(event.target.value)}
            disabled={submitting}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setEditVisible(false)}
            disabled={submitting}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={saveEdit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FeedbackDetailPage
