import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../auth/AuthProvider'
import dialog from '../../../../components/dialog/dialogService'
import { showToast } from '../../../../components/toast/toastService'
import { getMessage, isSuccess, postJsonCompat } from '../services/compatApi'
import { endpointsByService } from '../services/recordsActions'
import {
  buildRecordDetailStatusToastMessage,
  RECORD_ACTION_TOAST_MESSAGES,
} from '../utils/recordActionToastMessages'
import {
  buildRecordEmailDraft,
  openRecordEmail,
  openRecordQuotationPdf,
  shareRecordQuotationPdf,
  sendRecordEmailDraft,
} from '../utils/recordEmail'
import { createStateModalBindings, useRecordsActionBuilder } from './useRecordsActionContext'

export const useRecordDetailsActions = ({ serviceTab, record, returnTo, loadRecord }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUser = user
  const currentUserName = user?.full_name || user?.name || ''
  const currentUserEmail = user?.email || ''
  const [showFailModal, setShowFailModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const [successReason, setSuccessReason] = useState('')
  const [awardDate, setAwardDate] = useState(null)
  const [description, setDescription] = useState('')
  const [clientLoaRefNo, setClientLoaRefNo] = useState('')
  const [followUpRemarks, setFollowUpRemarks] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [selectedRecordIdForFail, setSelectedRecordIdForFail] = useState(null)
  const [selectedRecordIdForSuccess, setSelectedRecordIdForSuccess] = useState(null)
  const [successActionType, setSuccessActionType] = useState('award')
  const [isFailSubmitting, setIsFailSubmitting] = useState(false)
  const [isSuccessSubmitting, setIsSuccessSubmitting] = useState(false)
  const [isFollowUpSubmitting, setIsFollowUpSubmitting] = useState(false)
  const [isSyncingClient, setIsSyncingClient] = useState(false)
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false)
  const [emailDraftSubject, setEmailDraftSubject] = useState('')
  const [emailDraftBody, setEmailDraftBody] = useState('')
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [emailSendError, setEmailSendError] = useState('')
  const [legacyPdfPrompt, setLegacyPdfPrompt] = useState(null)
  const [pdfPreviewRequest, setPdfPreviewRequest] = useState(null)
  const openLegacyPdfPrompt = useCallback((prompt) => setLegacyPdfPrompt(prompt), [])
  const openPdfPreview = useCallback((request) => setPdfPreviewRequest(request), [])
  const closePdfPreview = useCallback(() => setPdfPreviewRequest(null), [])
  const refreshApprovalState = useCallback(
    async () => loadRecord({ preferState: false, withSpinner: false }),
    [loadRecord],
  )

  const detailModalBindings = useMemo(
    () =>
      createStateModalBindings({
        setShowFailModal,
        setFailureReason,
        setSelectedRecordIdForFail,
        setShowSuccessModal,
        setSuccessReason,
        setAwardDate,
        setDescription,
        setClientLoaRefNo,
        setSelectedRecordIdForSuccess,
      }),
    [],
  )

  const buildHandlers = useRecordsActionBuilder({
    fetchQuotes: async () => {
      await loadRecord({ preferState: false, withSpinner: false })
    },
    setQuotes: () => {
      navigate(returnTo)
    },
    navigate,
    getReturnTo: () => returnTo,
    onActionSuccess: async ({ type, status, message } = {}) => {
      if (type === 'delete') {
        showToast(message || RECORD_ACTION_TOAST_MESSAGES.deleted)
        return
      }
      await loadRecord({ preferState: false, withSpinner: false })
      if (status === 'Awarded') {
        dialog
          .confirm('Quotation awarded successfully. Go to project list?', {
            title: 'Quotation Awarded',
            confirmText: 'Go to project list',
            cancelText: 'Stay here',
          })
          .then((goToList) => {
            if (goToList) navigate('/project/manage')
          })
        return
      }
      showToast(message || (status ? buildRecordDetailStatusToastMessage(status) : ''))
    },
    modalBindings: detailModalBindings,
    onLegacyPdfPrompt: openLegacyPdfPrompt,
    onApprovalStateChanged: refreshApprovalState,
    onOpenPdfPreview: openPdfPreview,
  })

  const handlers = useMemo(() => {
    if (!serviceTab) return null
    return buildHandlers(serviceTab)
  }, [buildHandlers, serviceTab])

  useEffect(() => {
    setShowFailModal(false)
    setShowSuccessModal(false)
    setShowFollowUpModal(false)
    setFailureReason('')
    setSuccessReason('')
    setAwardDate(null)
    setDescription('')
    setClientLoaRefNo('')
    setFollowUpRemarks('')
    setFollowUpDate('')
    setSelectedRecordIdForFail(null)
    setSelectedRecordIdForSuccess(null)
    setSuccessActionType('award')
    setIsFailSubmitting(false)
    setIsSuccessSubmitting(false)
    setIsFollowUpSubmitting(false)
    setIsSyncingClient(false)
    setShowEmailConfirmModal(false)
    setEmailDraftSubject('')
    setEmailDraftBody('')
    setEmailSendError('')
    setLegacyPdfPrompt(null)
    setPdfPreviewRequest(null)
  }, [record?.id, returnTo, serviceTab])

  const openFailModal = () => {
    if (!record?.id) return
    setSelectedRecordIdForFail(record.id)
    setFailureReason('')
    setShowFailModal(true)
  }

  const openSuccessModal = (mode = 'award') => {
    if (!record?.id) return
    setSelectedRecordIdForSuccess(record.id)
    setSuccessReason('')
    setAwardDate(null)
    setDescription('')
    setClientLoaRefNo('')
    setSuccessActionType(mode)
    setShowSuccessModal(true)
  }

  const handleFailConfirm = async () => {
    if (!handlers || !selectedRecordIdForFail) return
    setIsFailSubmitting(true)
    try {
      await handlers.handleSubmitFail(failureReason, selectedRecordIdForFail)
    } finally {
      setIsFailSubmitting(false)
    }
  }

  const handleSuccessConfirm = async (projectCollaborators = [], projectValueAdjustment = {}) => {
    if (!handlers || !selectedRecordIdForSuccess) return
    setIsSuccessSubmitting(true)
    try {
      const payload = {
        successReason,
        description,
        awardDate,
        clientLoaRefNo,
        selectedRecordIdForSuccess,
        projectCollaborators,
        projectValueAdjustment,
      }
      const ok =
        successActionType === 're-award'
          ? await handlers.confirmReAward(payload)
          : await handlers.confirmSuccess(payload)
      if (ok) {
        setShowSuccessModal(false)
      }
    } finally {
      setIsSuccessSubmitting(false)
    }
  }

  const handleFollowUpSubmit = async () => {
    if (!record?.id || !serviceTab) return
    const urls = endpointsByService[serviceTab] || {}
    if (!urls.followUp) return
    setIsFollowUpSubmitting(true)
    try {
      const quoteId = record.id
      const result = await postJsonCompat(urls.followUp(quoteId), {
        quote_id: quoteId,
        id: quoteId,
        remarks: followUpRemarks,
        follow_up_date: followUpDate,
      })
      if (!isSuccess(result)) throw new Error(getMessage(result, 'Failed to add follow-up.'))
      setShowFollowUpModal(false)
      setFollowUpRemarks('')
      setFollowUpDate('')
      await loadRecord({ preferState: false, withSpinner: false })
      showToast(RECORD_ACTION_TOAST_MESSAGES.followUpAdded)
    } catch (err) {
      console.error('Add follow-up error:', err)
      dialog.alert(err?.message || 'Failed to add follow-up. Please try again.')
    } finally {
      setIsFollowUpSubmitting(false)
    }
  }

  const handleChangeToFail = () => {
    openFailModal()
  }

  const handleChangeToSuccess = () => {
    openSuccessModal('award')
  }

  const handleReAward = () => {
    openSuccessModal('re-award')
  }

  const handleFollowUp = () => {
    if (!record?.id) return
    setFollowUpRemarks('')
    setFollowUpDate('')
    setShowFollowUpModal(true)
  }

  const handleUnAward = () => {
    if (!record?.id || !handlers) return
    handlers.handleUnAward(record.id)
  }

  const handleDelete = () => {
    if (!record?.id || !handlers) return
    handlers.handleDelete(record.id)
  }

  const handleSyncClient = async () => {
    if (!record || !handlers || isSyncingClient) return
    setIsSyncingClient(true)
    try {
      await handlers.handleSyncClientDetails(record)
    } finally {
      setIsSyncingClient(false)
    }
  }

  const handleEmail = () => {
    if (!record) return
    const draft = buildRecordEmailDraft(record, {
      replyToName: currentUserName,
      replyToEmail: currentUserEmail,
    })
    setEmailSendError('')
    setEmailDraftSubject(draft?.subject || '')
    setEmailDraftBody(draft?.body || '')
    setShowEmailConfirmModal(true)
  }

  const handleEmailConfirm = async () => {
    if (!record || isEmailSending) return
    setIsEmailSending(true)
    setEmailSendError('')
    try {
      const result = await sendRecordEmailDraft(record, {
        subject: emailDraftSubject,
        body: emailDraftBody,
      })
      showToast(result?.message || RECORD_ACTION_TOAST_MESSAGES.quotationEmailSent)
      setShowEmailConfirmModal(false)
    } catch (error) {
      setEmailSendError(error?.message || 'System email sending failed.')
    } finally {
      setIsEmailSending(false)
    }
  }

  const handleEmailOpenGmailDraft = () => {
    if (!record) return
    openRecordEmail(record, {
      subject: emailDraftSubject,
      body: emailDraftBody,
      replyToName: currentUserName,
      replyToEmail: currentUserEmail,
    })
  }

  const handleEmailPreviewPdf = () => {
    if (!record) return
    openRecordQuotationPdf(record)
  }

  const handleSharePdf = async () => {
    if (!record) return
    try {
      const result = await shareRecordQuotationPdf(record)
      if (result?.cancelled) return
    } catch (error) {
      dialog.alert(error?.message || 'Unable to share the quotation PDF.')
    }
  }

  const closeLegacyPdfPrompt = () => setLegacyPdfPrompt(null)
  const handleLegacyPdfGenerate = () => {
    const generate = legacyPdfPrompt?.onGenerate
    setLegacyPdfPrompt(null)
    generate?.()
  }
  const handleLegacyPdfEdit = () => {
    const edit = legacyPdfPrompt?.onEdit
    setLegacyPdfPrompt(null)
    edit?.()
  }

  return {
    currentUserName,
    currentUserEmail,
    currentUser,
    handlers,
    showFailModal,
    setShowFailModal,
    showSuccessModal,
    setShowSuccessModal,
    showFollowUpModal,
    setShowFollowUpModal,
    failureReason,
    setFailureReason,
    successReason,
    setSuccessReason,
    awardDate,
    setAwardDate,
    description,
    setDescription,
    clientLoaRefNo,
    setClientLoaRefNo,
    followUpRemarks,
    setFollowUpRemarks,
    followUpDate,
    setFollowUpDate,
    successActionType,
    isFailSubmitting,
    isSuccessSubmitting,
    isFollowUpSubmitting,
    isSyncingClient,
    showEmailConfirmModal,
    setShowEmailConfirmModal,
    emailDraftSubject,
    setEmailDraftSubject: (value) => {
      setEmailSendError('')
      setEmailDraftSubject(value)
    },
    emailDraftBody,
    setEmailDraftBody: (value) => {
      setEmailSendError('')
      setEmailDraftBody(value)
    },
    isEmailSending,
    emailSendError,
    handleFailConfirm,
    handleSuccessConfirm,
    handleFollowUpSubmit,
    handleFollowUp,
    handleChangeToFail,
    handleChangeToSuccess,
    handleReAward,
    handleUnAward,
    handleDelete,
    handleSyncClient,
    handleEmail,
    handleEmailPreviewPdf,
    handleEmailOpenGmailDraft,
    handleEmailConfirm,
    handleSharePdf,
    legacyPdfPrompt,
    closeLegacyPdfPrompt,
    handleLegacyPdfGenerate,
    handleLegacyPdfEdit,
    pdfPreviewRequest,
    closePdfPreview,
  }
}
