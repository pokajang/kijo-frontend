import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import { DataTableActionButtonGroup } from '../../components/datatable'
import MeetingMinuteCardHeader from './components/MeetingMinuteCardHeader'
import MeetingMinuteViewMode from './components/MeetingMinuteViewMode'
import MeetingMinuteEditMode from './components/MeetingMinuteEditMode'
import dialog from '../../components/dialog/dialogService'
import {
  ADD_FORM_DRAFT_STORAGE_KEY,
  API_BASE,
  DETAILS_SAVED_ALERT_TEXT,
  DETAILS_SAVED_ALERT_TIMEOUT_MS,
  MEETING_TYPE_OPTIONS,
  STEP_DETAILS,
  STEP_NOTES,
} from './utils/meetingConstants'
import {
  createEmptyActionItem,
  getActionStatusColor,
  normalizeActionStatus,
  parseActionItems,
  serializeActionItems,
} from './utils/meetingActionItems'
import { formatDateTime, toDateTimeLocalValue } from './utils/meetingDateUtils'
import {
  isEditorContentEmpty,
  normalizeGuestAttendees,
  sanitizeName,
} from './utils/meetingTextUtils'
import { createInitialForm } from './utils/meetingFormModel'
import {
  buildRecordDraftStorageKey,
  generateMeetingDraftKey,
  readMeetingDraft,
  removeMeetingDraft,
  writeMeetingDraft,
} from './utils/meetingDraftUtils'
import { formatChangedFieldLabels } from './utils/meetingHistoryUtils'
import { hasMeetingVerificationRole, normalizeApprovalStatus } from './utils/meetingApprovalUtils'
import { useAuth } from '../../auth/AuthProvider'
import { getDetailReturnTo } from '../../utils/navigation/returnTo'

export default function MeetingMinuteForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = getDetailReturnTo(location, '/administration/meetings')
  const { user } = useAuth()
  const { id: routeMeetingId } = useParams()
  const searchParams = new URLSearchParams(location.search || '')
  const rawMeetingId = routeMeetingId || searchParams.get('id') || ''
  const parsedMeetingId = Number(rawMeetingId)
  const meetingId = Number.isFinite(parsedMeetingId) && parsedMeetingId > 0 ? parsedMeetingId : 0
  const requestedStep = Number(searchParams.get('step') || STEP_DETAILS)
  const initialStep = requestedStep === STEP_NOTES ? STEP_NOTES : STEP_DETAILS
  const isViewMode =
    location.pathname.includes('/meetings/view') || searchParams.get('view') === '1'
  const isEditRoute = location.pathname.includes('/meetings/edit')
  const requiresExistingRecord = isEditRoute || isViewMode
  const isCreateDraftMode = !isEditRoute && !isViewMode && meetingId <= 0

  const [currentStep, setCurrentStep] = useState(initialStep)
  const [recordId, setRecordId] = useState(meetingId > 0 ? meetingId : 0)
  const [staff, setStaff] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [loadingRecord, setLoadingRecord] = useState(requiresExistingRecord && meetingId > 0)
  const [recordLoadFailed, setRecordLoadFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approvalSubmitting, setApprovalSubmitting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [actionStatusUpdatingKey, setActionStatusUpdatingKey] = useState('')
  const rawSessionRoles = user?.roles
  const sessionRoles = Array.isArray(rawSessionRoles)
    ? rawSessionRoles
    : rawSessionRoles
      ? [rawSessionRoles]
      : []
  const sessionStaffId = Number(user?.staff_id || 0)
  const [alert, setAlert] = useState({ color: 'info', text: '' })
  const [validationErrors, setValidationErrors] = useState({})
  const [draftKey, setDraftKey] = useState('')
  const [completeActionModal, setCompleteActionModal] = useState({
    visible: false,
    items: [],
    selectedKey: '',
    submitting: false,
  })
  const [draftHydrated, setDraftHydrated] = useState(false)
  const submitInFlightRef = useRef(false)
  const [recordMeta, setRecordMeta] = useState({
    attendees: [],
    updatedName: '',
    updatedCode: '',
    createdName: '',
    createdCode: '',
    updatedAt: '',
    createdAt: '',
    recordStatus: 'Complete',
    draftKey: '',
    verificationStatus: 'Pending',
    verifiedName: '',
    verifiedCode: '',
    verifiedAt: '',
    concurredName: '',
    concurredCode: '',
    concurredAt: '',
    history: [],
  })

  const hasPersistedRecord = recordId > 0
  const isDraftRecord = recordMeta.recordStatus === 'Draft'
  const isFormLocked = submitting || isViewMode
  const canManageVerification = hasMeetingVerificationRole(sessionRoles)
  const currentApprovalStatus = normalizeApprovalStatus(recordMeta.verificationStatus)
  const hasBeenVerified =
    currentApprovalStatus === 'Verified' ||
    currentApprovalStatus === 'Concurred' ||
    Boolean(recordMeta.verifiedName) ||
    Boolean(recordMeta.verifiedAt)
  const hasBeenConcurred =
    currentApprovalStatus === 'Concurred' ||
    Boolean(recordMeta.concurredName) ||
    Boolean(recordMeta.concurredAt)
  const canVerifyNow = !hasBeenVerified
  const canUnverifyNow = hasBeenVerified && !hasBeenConcurred
  const verifyButtonAction = canUnverifyNow ? 'unverify' : 'verify'
  const verifyButtonLabel = canUnverifyNow ? 'Unverify' : 'Verify'
  const disableVerifyButton = approvalSubmitting || (!canVerifyNow && !canUnverifyNow)

  const canConcurNow = hasBeenVerified && !hasBeenConcurred
  const canUnconcurNow = hasBeenConcurred
  const concurButtonAction = canUnconcurNow ? 'unconcur' : 'concur'
  const concurButtonLabel = canUnconcurNow ? 'Unconcur' : 'Concur'
  const disableConcurButton = approvalSubmitting || (!canConcurNow && !canUnconcurNow)

  const [form, setForm] = useState(createInitialForm)
  const guestAttendeeLines = normalizeGuestAttendees(form.guestAttendeesText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const fetchStaff = async () => {
    setLoadingStaff(true)
    try {
      const res = await fetch(`${API_BASE}staff/list`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to load staff list.')
      }
      setStaff(Array.isArray(data.staff) ? data.staff : [])
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to load staff list.' })
      setStaff([])
    } finally {
      setLoadingStaff(false)
    }
  }

  const fetchRecord = useCallback(async () => {
    if (!requiresExistingRecord) {
      setLoadingRecord(false)
      return
    }
    if (meetingId <= 0) {
      setRecordLoadFailed(true)
      setAlert({ color: 'danger', text: 'Missing meeting id.' })
      setLoadingRecord(false)
      return
    }

    setLoadingRecord(true)
    setRecordLoadFailed(false)
    try {
      const res = await fetch(`${API_BASE}meetings/${meetingId}?include_history=1`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to load meeting record.')
      }
      const item = (Array.isArray(data.items) ? data.items : [])[0]
      if (!item) {
        throw new Error('Meeting record not found.')
      }
      setRecordMeta({
        attendees: Array.isArray(item?.attendees) ? item.attendees : [],
        updatedName: item?.updated_name || item?.created_name || '',
        updatedCode: item?.updated_code || item?.created_code || '',
        createdName: item?.created_name || '',
        createdCode: item?.created_code || '',
        updatedAt: item?.updated_at || '',
        createdAt: item?.created_at || '',
        recordStatus: item?.record_status || (item?.is_draft ? 'Draft' : 'Complete'),
        draftKey: item?.draft_key || '',
        verificationStatus: normalizeApprovalStatus(item?.verification_status || 'Pending'),
        verifiedName: item?.verified_name || '',
        verifiedCode: item?.verified_code || '',
        verifiedAt: item?.verified_at || '',
        concurredName: item?.concurred_name || '',
        concurredCode: item?.concurred_code || '',
        concurredAt: item?.concurred_at || '',
        history: Array.isArray(item?.history) ? item.history : [],
      })
      const loadedForm = {
        meetingTitle: item?.meeting_title || '',
        meetingType: item?.meeting_type || 'Ad Hoc',
        meetingDateTime: toDateTimeLocalValue(item?.meeting_datetime),
        venue: item?.venue || '',
        guestAttendeesText: item?.guest_attendees_text || '',
        agenda: item?.agenda || '',
        minutesText: item?.minutes_text || '',
        actionItems: parseActionItems(item?.action_items, { includeAssigneeOnly: false }),
        attendeeIds: (item?.attendees || []).map((a) => Number(a.staff_id)).filter(Boolean),
      }
      const loadedDraftKey = item?.draft_key || ''
      const isLoadedDraft = item?.record_status === 'Draft' || item?.is_draft
      const storedDraft = isLoadedDraft
        ? readMeetingDraft(buildRecordDraftStorageKey(meetingId))
        : null
      setDraftKey(storedDraft?.draftKey || loadedDraftKey)
      setForm(storedDraft?.form || loadedForm)
      if (
        storedDraft &&
        (storedDraft.currentStep === STEP_DETAILS || storedDraft.currentStep === STEP_NOTES)
      ) {
        setCurrentStep(storedDraft.currentStep)
      }
    } catch (err) {
      setRecordLoadFailed(true)
      setAlert({ color: 'danger', text: err.message || 'Failed to load meeting record.' })
    } finally {
      setLoadingRecord(false)
    }
  }, [meetingId, requiresExistingRecord])

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  useEffect(() => {
    setCurrentStep(initialStep)
    if (meetingId > 0) {
      setRecordId(meetingId)
    }
  }, [initialStep, meetingId])

  useEffect(() => {
    if (isViewMode) {
      setShowHistory(false)
    }
  }, [isViewMode, meetingId])

  useEffect(() => {
    const toastMessage = location.state?.toast
    if (!toastMessage) return
    setAlert({ color: 'success', text: toastMessage })
    navigate(location.pathname + location.search, {
      replace: true,
      state: location.state?.returnTo ? { returnTo } : {},
    })
  }, [location.pathname, location.search, location.state, navigate, returnTo])

  useEffect(() => {
    if (!isCreateDraftMode) {
      setDraftHydrated(false)
      return
    }

    try {
      const restoredDraft = readMeetingDraft(ADD_FORM_DRAFT_STORAGE_KEY)
      if (restoredDraft) {
        const restoredStep = Number(restoredDraft.currentStep)
        const restoredRecordId = Number(restoredDraft.recordId || 0)

        setForm(restoredDraft.form)
        setDraftKey(restoredDraft.draftKey || generateMeetingDraftKey())
        if (restoredStep === STEP_DETAILS || restoredStep === STEP_NOTES) {
          setCurrentStep(restoredStep)
        }
        if (Number.isFinite(restoredRecordId) && restoredRecordId > 0) {
          setRecordId(restoredRecordId)
        }
      } else {
        setDraftKey(generateMeetingDraftKey())
      }
    } catch {
      // Ignore invalid / corrupted draft payload.
    } finally {
      setDraftHydrated(true)
    }
  }, [isCreateDraftMode])

  useEffect(() => {
    if (!isCreateDraftMode || !draftHydrated) return

    writeMeetingDraft(ADD_FORM_DRAFT_STORAGE_KEY, {
      form,
      currentStep,
      recordId,
      draftKey,
    })
  }, [isCreateDraftMode, draftHydrated, form, currentStep, recordId, draftKey])

  useEffect(() => {
    if (!isEditRoute || isViewMode || !isDraftRecord || recordId <= 0 || loadingRecord) return

    writeMeetingDraft(buildRecordDraftStorageKey(recordId), {
      form,
      currentStep,
      recordId,
      draftKey,
    })
  }, [currentStep, draftKey, form, isDraftRecord, isEditRoute, isViewMode, loadingRecord, recordId])

  useEffect(() => {
    if (alert.text !== DETAILS_SAVED_ALERT_TEXT) return undefined
    const timer = window.setTimeout(() => {
      setAlert((prev) =>
        prev.text === DETAILS_SAVED_ALERT_TEXT ? { color: 'info', text: '' } : prev,
      )
    }, DETAILS_SAVED_ALERT_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [alert.text])

  const handleToggleAttendee = (staffId) => {
    setValidationErrors((prev) => {
      if (!prev.attendeeIds) return prev
      const next = { ...prev }
      delete next.attendeeIds
      return next
    })
    setForm((prev) => {
      const exists = prev.attendeeIds.includes(staffId)
      const attendeeIds = exists
        ? prev.attendeeIds.filter((id) => id !== staffId)
        : [...prev.attendeeIds, staffId]
      return { ...prev, attendeeIds }
    })
  }

  const handleActionItemChange = (index, field, value) => {
    setValidationErrors((prev) => {
      const key = `actionItems.${index}.${field}`
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    setForm((prev) => {
      const items = [...(prev.actionItems || [])]
      if (!items[index]) return prev
      items[index] = { ...items[index], [field]: value }
      return { ...prev, actionItems: items }
    })
  }

  const addActionItem = () => {
    setForm((prev) => ({
      ...prev,
      actionItems: [...(prev.actionItems || []), createEmptyActionItem()],
    }))
  }

  const removeActionItem = (index) => {
    setForm((prev) => ({
      ...prev,
      actionItems: (prev.actionItems || []).filter((_, idx) => idx !== index),
    }))
  }

  const updateFormField = (field, value) => {
    setValidationErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resolvePicLabel = (item) => {
    const inlineName = String(item?.picName || '').trim()
    const inlineCode = String(item?.picCode || '').trim()
    if (inlineName) {
      return `${inlineName}${inlineCode ? ` (${inlineCode})` : ''}`
    }

    const picId = Number(item?.picStaffId || 0)
    if (picId > 0) {
      const matched = staff.find((member) => Number(member.staff_id) === picId)
      if (matched) {
        return `${matched.full_name || '-'} (${matched.name_code || '-'})`
      }
    }

    return '-'
  }

  const canUpdateActionStatus = (item) => {
    const currentStaffId = Number(sessionStaffId || 0)
    const picId = Number(item?.picStaffId || 0)
    const createdBy = Number(item?.createdBy || 0)
    if (currentStaffId > 0 && picId > 0 && picId === currentStaffId) return true
    if (currentStaffId > 0 && createdBy > 0 && createdBy === currentStaffId) return true
    return false
  }

  const handleUpdateActionStatus = async (item, index, nextStatus) => {
    if (!recordId || !isViewMode) return false
    if (!canUpdateActionStatus(item)) {
      setAlert({ color: 'danger', text: 'You are not eligible to update this action item.' })
      return false
    }
    const normalizedStatus = normalizeActionStatus(nextStatus)
    const itemKey = item?.itemId ? String(item.itemId) : `idx-${index}`
    setActionStatusUpdatingKey(itemKey)
    setAlert({ color: 'info', text: '' })

    try {
      const payload = new FormData()
      payload.append('meeting_id', String(recordId))
      payload.append('status', normalizedStatus)
      if (item?.itemId) {
        payload.append('item_id', String(item.itemId))
      } else {
        payload.append('item_index', String(index))
      }

      const res = await fetch(`${API_BASE}meetings/action-items/status`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to update action status.')
      }

      setAlert({ color: 'success', text: data?.message || 'Action status updated.' })
      await fetchRecord()
      return true
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to update action status.' })
      return false
    } finally {
      setActionStatusUpdatingKey('')
    }
  }

  const handleMeetingVerificationAction = async (action) => {
    if (!recordId || !isViewMode || !canManageVerification) return
    if (!['verify', 'concur', 'unverify', 'unconcur'].includes(action)) {
      return
    }
    const actionLabelMap = {
      verify: 'verify',
      concur: 'concur',
      unverify: 'unverify',
      unconcur: 'unconcur',
    }
    const actionLabel = actionLabelMap[action] || action
    const ok = await dialog.confirm(`Are you sure you want to ${actionLabel} this meeting minutes?`)
    if (!ok) return

    const needsReason = action === 'unverify' || action === 'unconcur'
    let reason = ''
    if (needsReason) {
      const prompted = await dialog.prompt(
        `Please provide reason to ${actionLabel} this meeting minutes:`,
      )
      if (prompted === null) return
      reason = String(prompted || '').trim()
      if (!reason) {
        setAlert({ color: 'danger', text: 'Reason is required.' })
        return
      }
    }

    setApprovalSubmitting(true)
    setAlert({ color: 'info', text: '' })
    try {
      const payload = new FormData()
      payload.append('meeting_id', String(recordId))
      payload.append('action', action)
      if (reason) {
        payload.append('reason', reason)
      }

      const res = await fetch(`${API_BASE}meetings/verification`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to update meeting verification.')
      }

      setAlert({ color: 'success', text: data?.message || 'Meeting verification updated.' })
      await fetchRecord()
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to update meeting verification.' })
    } finally {
      setApprovalSubmitting(false)
    }
  }

  const handleExportPdf = () => {
    if (!recordId) return
    const url = `${API_BASE}meetings/${recordId}/pdf`
    window.open(url, '_blank')
  }

  const handleDeleteMeeting = async () => {
    if (!recordId || !isViewMode) return
    if (
      !(await dialog.confirm('Delete this meeting minute record? This action cannot be undone.', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return

    setAlert({ color: 'info', text: '' })
    try {
      const res = await fetch(`${API_BASE}meetings/${recordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to delete meeting record.')
      }

      navigate(returnTo, {
        replace: true,
        state: { toast: 'Meeting minute record deleted successfully.' },
      })
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to delete meeting record.' })
    }
  }

  const hasPendingActionItems = (form.actionItems || []).some(
    (item) => normalizeActionStatus(item?.status || 'Pending') !== 'Done',
  )

  const getEligiblePendingActionItems = () => {
    return (form.actionItems || [])
      .map((item, index) => ({
        key: item?.itemId ? String(item.itemId) : `idx-${index}`,
        item,
        index,
      }))
      .filter(({ item }) => {
        if (normalizeActionStatus(item?.status || 'Pending') === 'Done') return false
        return canUpdateActionStatus(item)
      })
  }

  const openCompleteActionModal = () => {
    const items = getEligiblePendingActionItems()
    setCompleteActionModal({
      visible: true,
      items,
      selectedKey: items[0]?.key || '',
      submitting: false,
    })
  }

  const closeCompleteActionModal = (force = false) => {
    if (completeActionModal.submitting && !force) return
    setCompleteActionModal({
      visible: false,
      items: [],
      selectedKey: '',
      submitting: false,
    })
  }

  const handleCompleteActionModalSubmit = async () => {
    const selected = (completeActionModal.items || []).find(
      (item) => item.key === completeActionModal.selectedKey,
    )
    if (!selected) {
      setAlert({ color: 'danger', text: 'Please select a pending action item.' })
      return
    }

    setCompleteActionModal((prev) => ({ ...prev, submitting: true }))
    const updated = await handleUpdateActionStatus(selected.item, selected.index, 'Done')
    if (updated) {
      closeCompleteActionModal(true)
      return
    }
    setCompleteActionModal((prev) => ({ ...prev, submitting: false }))
  }

  const validateDetails = () => {
    const errs = {}
    if (!sanitizeName(form.meetingTitle)) errs.meetingTitle = 'Meeting title is required.'
    if (!MEETING_TYPE_OPTIONS.includes(form.meetingType))
      errs.meetingType = 'Meeting type is required.'
    if (!form.meetingDateTime) errs.meetingDateTime = 'Meeting date and time is required.'
    if (loadingStaff) errs.attendeeIds = 'Wait for the staff list to finish loading.'
    else if (staff.length === 0) errs.attendeeIds = 'No active staff are available to select.'
    else if (form.attendeeIds.length === 0) errs.attendeeIds = 'Select at least one attendee.'
    return errs
  }

  const validateNotes = () => {
    const errs = validateDetails()
    if (isEditorContentEmpty(form.minutesText)) errs.minutesText = 'Meeting minutes are required.'
    ;(form.actionItems || []).forEach((item, index) => {
      const actionText = String(item?.actionText || '').trim()
      const hasPic = String(item?.picStaffId || '').trim() !== ''
      const hasDueDate = String(item?.dueDate || '').trim() !== ''
      if (!actionText && (hasPic || hasDueDate)) {
        errs[`actionItems.${index}.actionText`] =
          'Action text is required when a PIC or due date is set.'
      }
    })
    return errs
  }
  const firstValidationMessage = (errors) => Object.values(errors || {}).filter(Boolean)[0] || ''
  const focusFirstInvalidField = (errors) => {
    const firstKey = Object.keys(errors || {})[0]
    if (!firstKey) return
    const idMap = {
      meetingTitle: 'meetingTitle',
      meetingType: 'meetingType',
      meetingDateTime: 'meetingDateTime',
      attendeeIds: 'meeting-attendees-panel',
      minutesText: 'meetingMinutesEditor',
    }
    const targetId = firstKey.startsWith('actionItems.')
      ? `action-text-${firstKey.split('.')[1]}`
      : idMap[firstKey]
    window.setTimeout(() => {
      const target = targetId ? document.getElementById(targetId) : null
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      target?.focus?.()
    }, 0)
  }

  const goToStep = (nextStep) => setCurrentStep(nextStep)
  const clearCreateDraft = () => {
    removeMeetingDraft(ADD_FORM_DRAFT_STORAGE_KEY)
  }
  const clearRecordDraft = (id = recordId) => {
    removeMeetingDraft(buildRecordDraftStorageKey(id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isViewMode) return
    if (submitInFlightRef.current) return
    setAlert({ color: 'info', text: '' })
    setValidationErrors({})

    if (isEditRoute && (!hasPersistedRecord || recordLoadFailed)) {
      setAlert({ color: 'danger', text: 'Missing meeting id.' })
      return
    }

    const formStage = currentStep === STEP_DETAILS ? 'details' : 'notes'
    const errors = currentStep === STEP_DETAILS ? validateDetails() : validateNotes()

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setAlert({ color: 'danger', text: firstValidationMessage(errors) })
      focusFirstInvalidField(errors)
      return
    }
    if (formStage === 'notes' && !hasPersistedRecord) {
      setAlert({ color: 'danger', text: 'Please save meeting details before saving minutes.' })
      return
    }

    submitInFlightRef.current = true
    setSubmitting(true)
    try {
      const payload = new FormData()
      if (hasPersistedRecord) payload.append('id', String(recordId))
      payload.append('meeting_title', sanitizeName(form.meetingTitle))
      payload.append('meeting_type', form.meetingType)
      payload.append('meeting_datetime', form.meetingDateTime)
      payload.append('venue', form.venue.trim())
      payload.append('guest_attendees_text', normalizeGuestAttendees(form.guestAttendeesText))
      payload.append('agenda', form.agenda.trim())
      payload.append('minutes_text', form.minutesText.trim())
      payload.append('action_items', serializeActionItems(form.actionItems, staff))
      payload.append('attendee_ids', JSON.stringify(form.attendeeIds))
      payload.append('form_stage', formStage)
      if (draftKey) payload.append('draft_key', draftKey)

      const endpoint = hasPersistedRecord
        ? `${API_BASE}meetings/${recordId}`
        : `${API_BASE}meetings`
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to save meeting minutes.')
      }

      if (currentStep === STEP_DETAILS) {
        const savedId = Number(data?.id || recordId)
        if (savedId <= 0) {
          throw new Error('Meeting details were saved but record id is missing.')
        }
        setRecordId(savedId)
        setAlert({ color: 'success', text: DETAILS_SAVED_ALERT_TEXT })
        writeMeetingDraft(buildRecordDraftStorageKey(savedId), {
          form,
          currentStep: STEP_NOTES,
          recordId: savedId,
          draftKey,
        })
        clearCreateDraft()
        navigate(`/administration/meetings/edit/${savedId}?step=${STEP_NOTES}`, {
          replace: true,
          state: { toast: DETAILS_SAVED_ALERT_TEXT, returnTo },
        })
        return
      }

      if (!isEditRoute) {
        clearCreateDraft()
      }
      clearRecordDraft(recordId)
      navigate(returnTo, {
        replace: true,
        state: {
          toast: isEditRoute
            ? 'Meeting minutes updated successfully.'
            : 'Meeting minutes saved successfully.',
        },
      })
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to save meeting minutes.' })
    } finally {
      setSubmitting(false)
      submitInFlightRef.current = false
    }
  }

  const handleSaveDraft = async () => {
    if (isViewMode) return
    const errors = validateDetails()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setAlert({ color: 'danger', text: firstValidationMessage(errors) })
      focusFirstInvalidField(errors)
      return
    }

    writeMeetingDraft(
      recordId > 0 ? buildRecordDraftStorageKey(recordId) : ADD_FORM_DRAFT_STORAGE_KEY,
      {
        form,
        currentStep,
        recordId,
        draftKey,
      },
    )
    if (recordId <= 0) {
      setAlert({ color: 'success', text: 'Meeting draft saved locally.' })
      return
    }

    setSubmitting(true)
    try {
      const payload = new FormData()
      payload.append('id', String(recordId))
      payload.append('meeting_title', sanitizeName(form.meetingTitle))
      payload.append('meeting_type', form.meetingType)
      payload.append('meeting_datetime', form.meetingDateTime)
      payload.append('venue', form.venue.trim())
      payload.append('guest_attendees_text', normalizeGuestAttendees(form.guestAttendeesText))
      payload.append('agenda', form.agenda.trim())
      payload.append('minutes_text', '')
      payload.append('action_items', '')
      payload.append('attendee_ids', JSON.stringify(form.attendeeIds))
      payload.append('form_stage', 'details')
      if (draftKey) payload.append('draft_key', draftKey)

      const res = await fetch(`${API_BASE}meetings/${recordId}`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to save meeting draft.')
      }
      setAlert({ color: 'success', text: data?.message || 'Meeting draft saved.' })
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to save meeting draft.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDiscardDraft = async () => {
    if (
      !(await dialog.confirm('Discard this meeting draft? This action cannot be undone.', {
        confirmText: 'Discard',
        confirmColor: 'danger',
      }))
    )
      return
    clearCreateDraft()
    clearRecordDraft(recordId)
    if (recordId <= 0) {
      navigate(returnTo)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}meetings/${recordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to discard meeting draft.')
      }
      navigate(returnTo, {
        replace: true,
        state: { toast: data?.message || 'Meeting draft discarded successfully.' },
      })
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to discard meeting draft.' })
    } finally {
      setSubmitting(false)
    }
  }

  const detailActions = isDraftRecord
    ? [
        {
          key: 'continue-draft',
          label: 'Continue Draft',
          buttonColor: 'primary',
          onClick: () =>
            navigate(`/administration/meetings/edit/${recordId}?step=${STEP_NOTES}`, {
              state: { returnTo },
            }),
        },
        {
          key: 'discard-draft',
          label: 'Discard Draft',
          danger: true,
          onClick: handleDiscardDraft,
        },
      ]
    : [
        {
          key: 'export-pdf',
          label: 'Export PDF',
          buttonColor: 'primary',
          onClick: handleExportPdf,
        },
        {
          key: 'edit',
          label: 'Edit',
          buttonColor: 'secondary',
          onClick: () =>
            navigate(`/administration/meetings/edit/${recordId}`, {
              state: { returnTo },
            }),
        },
        {
          key: 'add-action',
          label: 'Add Action',
          buttonColor: 'primary',
          onClick: () =>
            navigate(`/administration/meetings/edit/${recordId}?step=${STEP_NOTES}`, {
              state: { returnTo },
            }),
        },
        {
          key: 'complete-action',
          label: 'Complete Action',
          buttonColor: 'success',
          disabled: Boolean(actionStatusUpdatingKey) || !hasPendingActionItems,
          onClick: openCompleteActionModal,
        },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          onClick: handleDeleteMeeting,
        },
      ]

  return (
    <CRow>
      <CCol xs={12} className="meeting-mobile-edge-col">
        <CCard className="mb-4 meeting-mobile-edge-card">
          <MeetingMinuteCardHeader
            isViewMode={isViewMode}
            isEditRoute={isEditRoute}
            onBack={() => navigate(returnTo)}
          />
          <CCardBody>
            {alert.text && (
              <CAlert
                color={alert.color}
                dismissible
                onClose={() => setAlert({ color: 'info', text: '' })}
                className="mb-3"
              >
                {alert.text}
              </CAlert>
            )}

            {!isViewMode && (isCreateDraftMode || isDraftRecord) && (
              <CAlert color="warning" className="d-flex align-items-center gap-2 mb-3">
                <CBadge color="warning" textColor="dark">
                  Draft
                </CBadge>
                <span>Meeting minutes are not finalized until you save the notes.</span>
              </CAlert>
            )}

            {loadingRecord ? (
              <div className="py-4 text-center">
                <CSpinner /> Loading...
              </div>
            ) : isViewMode ? (
              <MeetingMinuteViewMode
                form={form}
                recordMeta={recordMeta}
                guestAttendeeLines={guestAttendeeLines}
                canManageVerification={canManageVerification && !isDraftRecord}
                verifyButtonAction={verifyButtonAction}
                verifyButtonLabel={verifyButtonLabel}
                disableVerifyButton={disableVerifyButton}
                concurButtonAction={concurButtonAction}
                concurButtonLabel={concurButtonLabel}
                disableConcurButton={disableConcurButton}
                onMeetingVerificationAction={handleMeetingVerificationAction}
                normalizeActionStatus={normalizeActionStatus}
                getActionStatusColor={getActionStatusColor}
                actionStatusUpdatingKey={actionStatusUpdatingKey}
                resolvePicLabel={resolvePicLabel}
                formatDateTime={formatDateTime}
                onUpdateActionStatus={handleUpdateActionStatus}
                canUpdateActionStatus={canUpdateActionStatus}
                onEditActionItems={() =>
                  navigate(`/administration/meetings/edit/${recordId}?step=${STEP_NOTES}`)
                }
                showHistory={showHistory}
                onToggleHistory={setShowHistory}
                formatChangedFieldLabels={formatChangedFieldLabels}
              />
            ) : (
              <MeetingMinuteEditMode
                currentStep={currentStep}
                stepDetails={STEP_DETAILS}
                stepNotes={STEP_NOTES}
                hasPersistedRecord={hasPersistedRecord}
                submitting={submitting}
                isViewMode={isViewMode}
                isEditRoute={isEditRoute}
                form={form}
                validationErrors={validationErrors}
                isFormLocked={isFormLocked}
                loadingStaff={loadingStaff}
                staff={staff}
                sessionStaffId={sessionStaffId}
                isDraftRecord={isDraftRecord}
                meetingTypeOptions={MEETING_TYPE_OPTIONS}
                onSubmit={handleSubmit}
                onGoToStep={goToStep}
                onCancel={() => navigate(returnTo)}
                onSaveDraft={handleSaveDraft}
                onDiscardDraft={handleDiscardDraft}
                onChangeField={updateFormField}
                onToggleAttendee={handleToggleAttendee}
                onAddActionItem={addActionItem}
                onActionItemChange={handleActionItemChange}
                onRemoveActionItem={removeActionItem}
              />
            )}
          </CCardBody>
          {isViewMode && !loadingRecord && !recordLoadFailed && recordId > 0 ? (
            <>
              <CCardHeader>
                <strong>Actions</strong>
              </CCardHeader>
              <CCardBody>
                <DataTableActionButtonGroup actions={detailActions} />
              </CCardBody>
            </>
          ) : null}
        </CCard>
        <CModal
          visible={completeActionModal.visible}
          onClose={() => closeCompleteActionModal()}
          alignment="center"
        >
          <CModalHeader>
            <CModalTitle>Complete Action Item</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {(completeActionModal.items || []).length === 0 ? (
              <div className="text-muted">
                You are not eligible to complete pending actions for this meeting.
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <small className="text-muted d-block">Meeting</small>
                  <div className="fw-semibold">{form.meetingTitle || '-'}</div>
                </div>
                <CFormSelect
                  value={completeActionModal.selectedKey}
                  onChange={(event) =>
                    setCompleteActionModal((prev) => ({
                      ...prev,
                      selectedKey: event.target.value,
                    }))
                  }
                  disabled={completeActionModal.submitting}
                >
                  {(completeActionModal.items || []).map(({ key, item }) => (
                    <option key={key} value={key}>
                      {item.actionText || '-'}
                    </option>
                  ))}
                </CFormSelect>
              </>
            )}
          </CModalBody>
          <CModalFooter>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => closeCompleteActionModal()}
              disabled={completeActionModal.submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCompleteActionModalSubmit}
              disabled={
                completeActionModal.submitting || (completeActionModal.items || []).length === 0
              }
            >
              {completeActionModal.submitting ? 'Completing...' : 'Mark Done'}
            </button>
          </CModalFooter>
        </CModal>
      </CCol>
    </CRow>
  )
}
