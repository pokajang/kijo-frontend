import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../auth/AuthProvider'
import dialog from '../../../../components/dialog/dialogService'
import { endpointsByService } from '../services/recordsActions'
import {
  canRecordTabRequestNegotiation,
  getRecordDetailPath,
  getRecordListPath,
  getQuoteServiceFromRecordTab,
  isAggregateRecordTab,
  recordTabOptions,
} from '../config/recordTabs'
import { recordTablesByTab } from '../config/recordTables'
import { getMessage, isSuccess, postJsonCompat } from '../services/compatApi'
import {
  buildRecordEmailDraft,
  openRecordEmail,
  openRecordQuotationPdf,
  shareRecordQuotationPdf,
  sendRecordEmailDraft,
} from '../utils/recordEmail'
import { isQuoteOwnedByUser } from '../utils/recordOwnership'
import { createWorkflowModalBindings, useRecordsActionBuilder } from './useRecordsActionContext'
import { useAllTabRecordActions } from './useAllTabRecordActions'
import { useRecordsFetch } from './useRecordsFetch'
import { useRecordsModalWorkflow } from './useRecordsModalWorkflow'
import { useRecordsTabRouting } from './useRecordsTabRouting'
import { quoteApiUrl } from '../../quotes/quoteApi'
import { dispatchAppNotificationsChanged } from '../../../../notifications/appNotificationEvents'

const toNavigationStateValue = (value, seen = new WeakSet()) => {
  if (value == null) return value

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'function' || valueType === 'symbol') return undefined
  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) {
    return value
      .map((item) => toNavigationStateValue(item, seen))
      .filter((item) => item !== undefined)
  }

  if (valueType === 'object') {
    if (seen.has(value)) return undefined
    seen.add(value)

    return Object.entries(value).reduce((acc, [key, item]) => {
      if (key.startsWith('__')) return acc

      const safeValue = toNavigationStateValue(item, seen)
      if (safeValue !== undefined) {
        acc[key] = safeValue
      }
      return acc
    }, {})
  }

  return undefined
}

export const useRecordsController = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUserName = user?.full_name || user?.name || ''
  const currentUserEmail = user?.email || ''
  const { activeTab, handleTabChange } = useRecordsTabRouting()
  const isAggregateTab = isAggregateRecordTab(activeTab)
  const [emailConfirmRecord, setEmailConfirmRecord] = useState(null)
  const [emailDraftSubject, setEmailDraftSubject] = useState('')
  const [emailDraftBody, setEmailDraftBody] = useState('')
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [emailSendError, setEmailSendError] = useState('')
  const [negotiationRecord, setNegotiationRecord] = useState(null)
  const [negotiationForm, setNegotiationForm] = useState({
    requestedDiscountAmount: '',
    requestedFinalTotal: '',
    reason: '',
    remarks: '',
  })
  const [isNegotiationSubmitting, setIsNegotiationSubmitting] = useState(false)
  const { quotes, setQuotes, quotesLoading, fetchQuotes } = useRecordsFetch(activeTab)
  const scopedQuotes = useMemo(
    () =>
      activeTab === 'my-tab' ? quotes.filter((quote) => isQuoteOwnedByUser(quote, user)) : quotes,
    [activeTab, quotes, user],
  )
  const EmptyTableState = () => <p>No records to display.</p>
  const ActiveTableComponent = recordTablesByTab[activeTab] || EmptyTableState
  const {
    modalState,
    dispatchModal,
    ViewModal,
    FailModal,
    SuccessModal,
    FollowUpModalComponent,
    isFailModalSubmitting,
    setIsFailModalSubmitting,
    isSuccessModalSubmitting,
    setIsSuccessModalSubmitting,
    isFollowUpModalSubmitting,
    setIsFollowUpModalSubmitting,
    isSyncingClientDetails,
    setIsSyncingClientDetails,
    openViewModal,
    closeViewModal,
    openFailModal,
    closeFailModal,
    setFailReason,
    openSuccessModal,
    closeSuccessModal,
    setSuccessReason,
    setSuccessDate,
    setSuccessDescription,
    setSuccessLoa,
    openFollowUpModal,
  } = useRecordsModalWorkflow(activeTab)

  const notifyKicked = useCallback(
    (to) => {
      if (to === 'Awarded') {
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

      dialog.alert(
        `${to} quotation kicked to the bottom of the table. Find it there or use the search bar!`,
        { title: 'Quotation Updated' },
      )
    },
    [navigate],
  )

  const navigateToRecordDetails = (record) => {
    const recordId = record?.id
    if (!recordId) return
    const targetServiceTab = record?.serviceTab || (!isAggregateTab ? activeTab : null)
    if (!targetServiceTab) return
    const navigationRecord = toNavigationStateValue({
      ...record,
      serviceTab: targetServiceTab,
    })
    navigate(getRecordDetailPath(targetServiceTab, recordId), {
      state: {
        record: navigationRecord,
        returnTo: getRecordListPath(activeTab),
      },
    })
  }

  const handleFollowUpSubmit = async () => {
    const followUpServiceKey = isAggregateTab ? modalState.followUp.quote?.serviceTab : activeTab

    if (!modalState.followUp.quote?.id) {
      dialog.alert('Quotation record is missing.')
      return
    }

    if (!followUpServiceKey) {
      dialog.alert('Service type not identified for this quotation.')
      return
    }

    const urls = endpointsByService[followUpServiceKey] || {}
    if (!urls.followUp) {
      dialog.alert('Follow-up is not available for this service type.')
      return
    }

    setIsFollowUpModalSubmitting(true)
    try {
      const result = await postJsonCompat(urls.followUp, {
        quote_id: modalState.followUp.quote.id,
        id: modalState.followUp.quote.id,
        remarks: modalState.followUp.remarks,
        follow_up_date: modalState.followUp.date,
      })
      if (!isSuccess(result)) throw new Error(getMessage(result, 'Failed to add follow-up.'))

      dialog.alert('Follow-up added successfully')
      dispatchModal({ type: 'CLOSE_FOLLOWUP' })
      await fetchQuotes()
    } catch (err) {
      console.error('Add follow-up error:', err)
      dialog.alert(err.message || 'Failed to add follow-up. Please try again.')
    } finally {
      setIsFollowUpModalSubmitting(false)
    }
  }

  const defaultModalBindings = useMemo(
    () =>
      createWorkflowModalBindings({
        closeFailModal,
        setFailReason,
        openFailModal,
        closeSuccessModal,
        setSuccessReason,
        setSuccessDate,
        setSuccessDescription,
        setSuccessLoa,
        openSuccessModal,
        closeViewModal,
        openViewModal,
      }),
    [
      closeFailModal,
      closeSuccessModal,
      closeViewModal,
      openFailModal,
      openSuccessModal,
      openViewModal,
      setFailReason,
      setSuccessDate,
      setSuccessDescription,
      setSuccessLoa,
      setSuccessReason,
    ],
  )

  const modalStateBindings = useMemo(
    () =>
      createWorkflowModalBindings({
        closeFailModal,
        setFailReason,
        openFailModal,
        closeSuccessModal,
        setSuccessReason,
        setSuccessDate,
        setSuccessDescription,
        setSuccessLoa,
        openSuccessModal,
        closeViewModal,
        openViewModal,
        getFailServiceKey: () => modalState.fail.serviceKey,
        getSuccessServiceKey: () => modalState.success.serviceKey,
        getSuccessActionType: () => modalState.success.actionType,
      }),
    [
      closeFailModal,
      closeSuccessModal,
      closeViewModal,
      modalState.fail.serviceKey,
      modalState.success.actionType,
      modalState.success.serviceKey,
      openFailModal,
      openSuccessModal,
      openViewModal,
      setFailReason,
      setSuccessDate,
      setSuccessDescription,
      setSuccessLoa,
      setSuccessReason,
    ],
  )

  const buildHandlers = useRecordsActionBuilder({
    fetchQuotes,
    setQuotes,
    navigate,
    onRowMoved: notifyKicked,
    modalBindings: defaultModalBindings,
  })

  const buildStateAwareHandlers = useRecordsActionBuilder({
    fetchQuotes,
    setQuotes,
    navigate,
    onRowMoved: notifyKicked,
    modalBindings: modalStateBindings,
  })

  const handlers = useMemo(() => {
    return buildHandlers(activeTab)
  }, [activeTab, buildHandlers])

  const {
    handleDelete,
    handleChangeToFail,
    handleUnAward,
    handleEdit,
    handleRevise,
    handleGeneratePdf,
    handleSyncClientDetails: handleSyncClientDetailsDirect,
  } = handlers
  const {
    runByRecordService,
    handleAllChangeToFail,
    handleAllChangeToSuccess,
    handleAllReAward,
    handleAllSyncClientDetails,
  } = useAllTabRecordActions({
    buildHandlers,
    openFailModal,
    setFailReason,
    openSuccessModal,
    isSyncingClientDetails,
    setIsSyncingClientDetails,
  })

  const handleChangeToSuccessWithDetails = (recordId) => {
    openSuccessModal({
      serviceKey: activeTab,
      recordId,
      actionType: 'award',
    })
  }

  const handleReAwardWithDetails = (recordId) => {
    openSuccessModal({
      serviceKey: activeTab,
      recordId,
      actionType: 're-award',
    })
  }

  const handleFailConfirm = async () => {
    const serviceKey = isAggregateTab ? modalState.fail.serviceKey : activeTab
    if (!serviceKey || !endpointsByService[serviceKey]) {
      dialog.alert('Fail endpoint not configured for this service.')
      return
    }
    setIsFailModalSubmitting(true)
    try {
      await buildStateAwareHandlers(serviceKey).handleSubmitFail(
        modalState.fail.reason,
        modalState.fail.recordId,
      )
      closeFailModal()
    } finally {
      setIsFailModalSubmitting(false)
    }
  }

  const handleSuccessConfirm = async () => {
    const serviceKey = modalState.success.serviceKey || (!isAggregateTab ? activeTab : null)
    if (!serviceKey || !endpointsByService[serviceKey]) {
      dialog.alert('Award endpoint not configured for this service.')
      return
    }
    if (!modalState.success.recordId) {
      dialog.alert('Quotation record is missing.')
      return
    }

    setIsSuccessModalSubmitting(true)
    try {
      const serviceHandlers = buildStateAwareHandlers(serviceKey)
      const payload = {
        successReason: modalState.success.reason,
        description: modalState.success.description,
        awardDate: modalState.success.awardDate,
        clientLoaRefNo: modalState.success.clientLoaRefNo,
        selectedRecordIdForSuccess: modalState.success.recordId,
      }

      const ok =
        modalState.success.actionType === 're-award'
          ? await serviceHandlers.confirmReAward(payload)
          : await serviceHandlers.confirmSuccess(payload)

      if (ok) {
        closeSuccessModal()
      }
    } finally {
      setIsSuccessModalSubmitting(false)
    }
  }

  const openNegotiationModal = (record) => {
    const serviceTab = record?.serviceTab || (!isAggregateTab ? activeTab : '')
    if (!canRecordTabRequestNegotiation(serviceTab)) {
      dialog.alert('Negotiation is only available for locked-rate Training and Manpower quotes.')
      return
    }
    setNegotiationRecord(record)
    setNegotiationForm({
      requestedDiscountAmount: '',
      requestedFinalTotal: '',
      reason: '',
      remarks: '',
    })
  }

  const closeNegotiationModal = () => {
    if (isNegotiationSubmitting) return
    setNegotiationRecord(null)
  }

  const handleNegotiationSubmit = async () => {
    const serviceTab = negotiationRecord?.serviceTab || (!isAggregateTab ? activeTab : '')
    if (!canRecordTabRequestNegotiation(serviceTab)) {
      dialog.alert('Negotiation is only available for locked-rate Training and Manpower quotes.')
      return
    }
    const service = getQuoteServiceFromRecordTab(serviceTab)
    const quoteId = negotiationRecord?.id
    if (!service || !quoteId) {
      dialog.alert('Quotation service could not be identified.')
      return
    }

    const currentAmount = Number(negotiationRecord?.amount ?? negotiationRecord?.quote_value ?? 0)
    const requestedDiscount = Number(negotiationForm.requestedDiscountAmount || 0)
    const requestedFinalTotal = Number(negotiationForm.requestedFinalTotal || 0)
    const hasDiscount = requestedDiscount > 0
    const hasFinalTotal = requestedFinalTotal > 0
    if (hasDiscount === hasFinalTotal) {
      dialog.alert('Enter either requested discount or requested final total.')
      return
    }
    if (hasDiscount && requestedDiscount > currentAmount) {
      dialog.alert('Requested discount cannot exceed the current quote amount.')
      return
    }
    if (hasFinalTotal && requestedFinalTotal >= currentAmount) {
      dialog.alert('Requested final total must be lower than the current quote amount.')
      return
    }

    setIsNegotiationSubmitting(true)
    try {
      const response = await fetch(
        quoteApiUrl(
          `quote-records/${encodeURIComponent(service)}/${encodeURIComponent(quoteId)}/negotiate`,
        ),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            requested_discount_amount: hasDiscount ? requestedDiscount : null,
            requested_final_total: hasFinalTotal ? requestedFinalTotal : null,
            client_negotiation_reason: negotiationForm.reason.trim(),
            requester_remarks: negotiationForm.remarks?.trim() || null,
          }),
        },
      )
      const result = await response.json()
      if (!response.ok && !isSuccess(result)) {
        throw new Error(getMessage(result, 'Failed to submit negotiation request.'))
      }
      window.dispatchEvent(new Event('quote-price-exceptions:changed'))
      dispatchAppNotificationsChanged()
      dialog.alert('Negotiation request submitted for approval.')
      setNegotiationRecord(null)
    } catch (error) {
      dialog.alert(error?.message || 'Failed to submit negotiation request.')
    } finally {
      setIsNegotiationSubmitting(false)
    }
  }

  const tableProps = {
    records: scopedQuotes,
    loading: quotesLoading,
    activeTab,
    onOpen: isAggregateTab
      ? (record) => {
          const targetTab = record?.serviceTab || null
          if (!targetTab) return
          navigate(getRecordListPath(targetTab), { replace: true })
        }
      : undefined,
    onView: navigateToRecordDetails,
    onEdit: isAggregateTab
      ? (record) => runByRecordService(record, 'handleEdit', record)
      : handleEdit,
    onRevise: isAggregateTab
      ? (record) => runByRecordService(record, 'handleRevise', record)
      : handleRevise,
    onNegotiate: openNegotiationModal,
    onDelete: isAggregateTab
      ? (record) => runByRecordService(record, 'handleDelete', record?.id)
      : handleDelete,
    onChangeToFail: isAggregateTab ? handleAllChangeToFail : handleChangeToFail,
    onChangeToSuccess: isAggregateTab ? handleAllChangeToSuccess : handleChangeToSuccessWithDetails,
    onGenerate: isAggregateTab
      ? (record) => runByRecordService(record, 'handleGeneratePdf', record)
      : handleGeneratePdf,
    onReAward: isAggregateTab ? handleAllReAward : handleReAwardWithDetails,
    onUnAward: isAggregateTab
      ? (record) => runByRecordService(record, 'handleUnAward', record?.id)
      : handleUnAward,
    onSyncClientDetails: isAggregateTab
      ? (record) => handleAllSyncClientDetails(record)
      : (record) => {
          if (isSyncingClientDetails) return
          setIsSyncingClientDetails(true)
          Promise.resolve(handleSyncClientDetailsDirect(record)).finally(() =>
            setIsSyncingClientDetails(false),
          )
        },
    onFollowUp: (record) => {
      const serviceKey = record?.serviceTab || null
      openFollowUpModal({ quote: record, serviceKey })
    },
    onEmail: (record) => {
      const draft = buildRecordEmailDraft(record, {
        replyToName: currentUserName,
        replyToEmail: currentUserEmail,
      })
      setEmailSendError('')
      setEmailDraftSubject(draft?.subject || '')
      setEmailDraftBody(draft?.body || '')
      setEmailConfirmRecord(record)
    },
    onSharePdf: async (record) => {
      try {
        const result = await shareRecordQuotationPdf(record)
        if (result?.cancelled) return
      } catch (error) {
        dialog.alert(error?.message || 'Unable to share the quotation PDF.')
      }
    },
  }

  return {
    currentUserName,
    currentUserEmail,
    activeTab,
    handleTabChange,
    recordTabOptions,
    ActiveTableComponent,
    tableProps,
    ViewModal,
    FailModal,
    SuccessModal,
    FollowUpModalComponent,
    negotiationRecord,
    negotiationForm,
    setNegotiationFormValue: (key, value) =>
      setNegotiationForm((prev) => ({
        ...prev,
        [key]: value,
      })),
    closeNegotiationModal,
    handleNegotiationSubmit,
    isNegotiationSubmitting,
    modalState,
    dispatchModal,
    handleFailConfirm,
    handleSuccessConfirm,
    handleFollowUpSubmit,
    emailConfirmRecord,
    setEmailConfirmRecord: (value) => {
      setEmailSendError('')
      setEmailConfirmRecord(value)
    },
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
    emailSendError,
    handleEmailPreviewPdf: () => {
      if (!emailConfirmRecord) return
      openRecordQuotationPdf(emailConfirmRecord)
    },
    handleEmailOpenGmailDraft: () => {
      if (!emailConfirmRecord) return
      openRecordEmail(emailConfirmRecord, {
        subject: emailDraftSubject,
        body: emailDraftBody,
        replyToName: currentUserName,
        replyToEmail: currentUserEmail,
      })
    },
    handleEmailConfirm: async () => {
      if (!emailConfirmRecord || isEmailSending) return
      setIsEmailSending(true)
      setEmailSendError('')
      try {
        const result = await sendRecordEmailDraft(emailConfirmRecord, {
          subject: emailDraftSubject,
          body: emailDraftBody,
        })
        dialog.alert(result?.message || 'Quotation email sent successfully.')
        setEmailConfirmRecord(null)
      } catch (error) {
        setEmailSendError(error?.message || 'System email sending failed.')
      } finally {
        setIsEmailSending(false)
      }
    },
    isEmailSending,
    isFailModalSubmitting,
    isSuccessModalSubmitting,
    isFollowUpModalSubmitting,
  }
}
