// src/views/feedback/FeedbackPage.jsx

import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CButton,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import FeedbackTable from './FeedbackTable'
import AdminFixModal, { RESOLUTION_TRACK_OPTIONS, STATUS_OPTIONS } from './AdminFixModal'
import FeedbackSlaSummary from './FeedbackSlaSummary'
import {
  fetchSessionInfo,
  fetchAllFeedbacks,
  updateFeedback,
  deleteFeedback,
} from './actionHandlers'
import dialog from '../../components/dialog/dialogService'
import ModuleNavStrip from '../../components/navigation/ModuleNavStrip'
import { supportModuleTabs } from '../../components/navigation/moduleNavConfigs'
import { useAuth } from '../../auth/AuthProvider'
import { showToast } from '../../components/toast/toastService'
import { getCurrentReturnTo } from '../../utils/navigation/returnTo'
import useFeedbackSlaMetrics from './useFeedbackSlaMetrics'

const FeedbackPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, status: authStatus } = useAuth()
  const [allFeedbacks, setAllFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentStaffId, setCurrentStaffId] = useState(null)

  const [modalVisible, setModalVisible] = useState(false)
  const [modalData, setModalData] = useState({
    id: null,
    status: '',
    resolution_track: '',
    action_date: '',
    remarks: '',
  })
  const [userEditVisible, setUserEditVisible] = useState(false)
  const [userEditFeedbackId, setUserEditFeedbackId] = useState(null)
  const [userEditMessage, setUserEditMessage] = useState('')
  const [userEditSubmitting, setUserEditSubmitting] = useState(false)

  const currentYear = new Date().getFullYear()
  const {
    rows: slaRows,
    loading: slaLoading,
    error: slaError,
    targetPercent: slaTargetPercent,
    refresh: refreshSlaMetrics,
  } = useFeedbackSlaMetrics({
    year: currentYear,
    enabled: authStatus === 'authenticated',
  })
  const userStaffId = user?.staff_id || ''
  const userRolesKey = Array.isArray(user?.roles) ? [...user.roles].sort().join('|') : ''
  const sessionUser = useMemo(
    () =>
      userStaffId
        ? {
            staff_id: userStaffId,
            roles: userRolesKey ? userRolesKey.split('|') : [],
          }
        : null,
    [userRolesKey, userStaffId],
  )

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined
    let active = true

    async function load() {
      setLoading(true)
      try {
        const { isAdmin, staffId } = await fetchSessionInfo(sessionUser)
        if (!active) return

        setIsAdmin(isAdmin)
        setCurrentStaffId(staffId)

        const feedbacks = await fetchAllFeedbacks()
        if (!active) return

        setAllFeedbacks(feedbacks)
      } catch (err) {
        if (active) {
          dialog.alert('Unable to load feedback records right now.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [authStatus, sessionUser])

  const isOwnerFeedback = (fb) => {
    const ownerId = Number(fb?.reported_by_id)
    const myId = Number(currentStaffId)
    return Number.isFinite(ownerId) && Number.isFinite(myId) && ownerId === myId
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
      (opt) => opt.toLowerCase() === status.toString().trim().toLowerCase(),
    )
    return match || STATUS_OPTIONS[0]
  }

  const normalizeResolutionTrack = (track) => {
    if (!track) return RESOLUTION_TRACK_OPTIONS[0]
    const match = RESOLUTION_TRACK_OPTIONS.find(
      (opt) => opt.toLowerCase() === track.toString().trim().toLowerCase(),
    )
    return match || RESOLUTION_TRACK_OPTIONS[0]
  }

  const handleOpenModal = (fb) => {
    setModalData({
      id: fb.id,
      status: normalizeAdminStatus(fb.status),
      resolution_track: normalizeResolutionTrack(fb.resolution_track),
      action_date: fb.action_date || getTodayISO(),
      remarks: fb.remarks || '',
    })
    setModalVisible(true)
  }

  const handleCloseModal = () => {
    setModalVisible(false)
    setModalData({ id: null, status: '', resolution_track: '', action_date: '', remarks: '' })
  }

  const handleChangeField = (field, value) => {
    setModalData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveModal = async () => {
    const result = await updateFeedback(modalData)
    if (result.status === 'success') {
      setAllFeedbacks((prev) =>
        prev.map((fb) => (fb.id === modalData.id ? { ...fb, ...modalData } : fb)),
      )
      showToast('Feedback fix details updated.')
      handleCloseModal()
      refreshSlaMetrics()
    } else {
      dialog.alert('Failed to update: ' + result.message)
    }
  }

  const openUserEditModal = (fb) => {
    setUserEditFeedbackId(fb.id)
    setUserEditMessage(fb.feedback || '')
    setUserEditVisible(true)
  }

  const closeUserEditModal = () => {
    setUserEditVisible(false)
    setUserEditFeedbackId(null)
    setUserEditMessage('')
  }

  const handleUserEditSubmit = async () => {
    const trimmed = userEditMessage.trim()
    if (!trimmed) {
      dialog.alert('Please describe the issue before submitting.')
      return
    }

    if (!userEditFeedbackId) {
      dialog.alert('Invalid feedback record.')
      return
    }

    setUserEditSubmitting(true)
    try {
      const result = await updateFeedback({
        id: userEditFeedbackId,
        feedback: trimmed,
      })

      if (result.status === 'success') {
        setAllFeedbacks((prev) =>
          prev.map((item) =>
            item.id === userEditFeedbackId ? { ...item, feedback: trimmed } : item,
          ),
        )
        showToast('Feedback updated.')
        closeUserEditModal()
      } else {
        dialog.alert(result.message || 'Failed to update feedback.')
      }
    } catch (err) {
      dialog.alert('Unable to submit feedback right now.')
    } finally {
      setUserEditSubmitting(false)
    }
  }

  const handleEditComplaint = (fb) => {
    if (!isAdmin && !isOwnerFeedback(fb)) {
      dialog.alert('You can only edit your own feedback.')
      return
    }

    openUserEditModal(fb)
  }

  const handleUpdateFix = (fb) => {
    if (!isAdmin) {
      dialog.alert('Only admins can update fix details.')
      return
    }

    handleOpenModal(fb)
  }

  const handleDeleteFeedback = async (fb) => {
    if (!isAdmin && !isOwnerFeedback(fb)) {
      dialog.alert('You can only delete your own feedback.')
      return
    }

    const confirmed = await dialog.confirm('Delete this feedback? This action cannot be undone.', {
      confirmText: 'Delete',
      confirmColor: 'danger',
    })
    if (!confirmed) return

    const result = await deleteFeedback(fb.id)
    if (result.status === 'success') {
      setAllFeedbacks((prev) => prev.filter((item) => item.id !== fb.id))
      showToast('Feedback deleted.')
      refreshSlaMetrics()
    } else {
      dialog.alert('Failed to delete: ' + result.message)
    }
  }

  return (
    <>
      <ModuleNavStrip
        tabs={supportModuleTabs}
        activeTab="feedback-records"
        ariaLabel="Support sections"
      />

      <FeedbackSlaSummary
        rows={slaRows}
        loading={slaLoading}
        error={slaError}
        year={currentYear}
        targetPercent={slaTargetPercent}
      />

      <FeedbackTable
        allFeedbacks={allFeedbacks}
        loading={loading}
        isAdmin={isAdmin}
        currentStaffId={currentStaffId}
        onEditFeedback={handleEditComplaint}
        onUpdateFix={handleUpdateFix}
        onDeleteFeedback={handleDeleteFeedback}
        onViewFeedback={(feedback) =>
          navigate(`/support/feedback/${feedback.id}`, {
            state: { record: feedback, returnTo: getCurrentReturnTo(location) },
          })
        }
      />

      <AdminFixModal
        visible={modalVisible}
        data={modalData}
        onClose={handleCloseModal}
        onChangeField={handleChangeField}
        onSave={handleSaveModal}
      />

      <CModal visible={userEditVisible} onClose={closeUserEditModal} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Submit Support Ticket</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="text-muted small">
            Describe the issue you are facing or the improvement you would like to request.
          </p>
          <CFormTextarea
            rows={4}
            placeholder="Enter your feedback here..."
            value={userEditMessage}
            onChange={(e) => setUserEditMessage(e.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeUserEditModal}
            disabled={userEditSubmitting}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            onClick={handleUserEditSubmit}
            disabled={userEditSubmitting}
          >
            {userEditSubmitting ? 'Submitting...' : 'Submit'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FeedbackPage
