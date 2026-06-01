import { useCallback, useEffect, useRef, useState } from 'react'
import {
  askKnowledgeAssistant,
  clearKnowledgeAssistantThread,
  createKnowledgeAssistantThread,
  getKnowledgeAssistantThread,
  submitKnowledgeAssistantFeedback,
} from '../knowledgeApi'
import { assistantMessagesAreNearLatest } from './assistantMessageUtils'

const messagesFromAssistantResponse = (json) => {
  const messages = Array.isArray(json.messages) ? json.messages : []
  const suggestedQueries = Array.isArray(json.answer?.suggested_queries)
    ? Array.from(
        new Set(
          json.answer.suggested_queries
            .filter((query) => typeof query === 'string' && query.trim() !== '')
            .map((query) => query.trim()),
        ),
      )
    : []
  const routeRefs = Array.isArray(json.answer?.route_refs) ? json.answer.route_refs : []
  const clarificationOptions = Array.isArray(json.answer?.clarification_options)
    ? json.answer.clarification_options.filter((option) => option && typeof option === 'object')
    : []
  const aiStatus =
    typeof json.answer?.ai_status === 'string' && json.answer.ai_status.trim() !== ''
      ? json.answer.ai_status.trim()
      : ''
  const degradedReason =
    typeof json.answer?.degraded_reason === 'string' && json.answer.degraded_reason.trim() !== ''
      ? json.answer.degraded_reason.trim()
      : ''

  if (
    suggestedQueries.length === 0 &&
    routeRefs.length === 0 &&
    clarificationOptions.length === 0 &&
    aiStatus === '' &&
    degradedReason === ''
  ) {
    return messages
  }

  const lastAssistantIndex = messages.map((message) => message.role).lastIndexOf('assistant')
  if (lastAssistantIndex < 0) return messages

  return messages.map((message, index) => {
    if (index !== lastAssistantIndex) return message

    return {
      ...message,
      ...(suggestedQueries.length > 0 ? { suggested_queries: suggestedQueries } : {}),
      ...(routeRefs.length > 0 ? { route_refs: routeRefs } : {}),
      ...(clarificationOptions.length > 0 ? { clarification_options: clarificationOptions } : {}),
      ...(aiStatus !== '' ? { ai_status: aiStatus } : {}),
      ...(degradedReason !== '' ? { degraded_reason: degradedReason } : {}),
    }
  })
}

const useKnowledgeAssistantChat = ({
  currentRoute = '',
  isAskMode = false,
  isOpen = false,
} = {}) => {
  const [assistantQuestion, setAssistantQuestion] = useState('')
  const [assistantMessages, setAssistantMessages] = useState([])
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantSending, setAssistantSending] = useState(false)
  const [assistantClearing, setAssistantClearing] = useState(false)
  const [assistantError, setAssistantError] = useState('')
  const [assistantModel, setAssistantModel] = useState('')
  const [assistantThreads, setAssistantThreads] = useState([])
  const [activeAssistantThreadId, setActiveAssistantThreadId] = useState(null)
  const [assistantView, setAssistantView] = useState('chat')
  const [deleteConfirmThreadId, setDeleteConfirmThreadId] = useState(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [selectedAssistantThreadIds, setSelectedAssistantThreadIds] = useState([])
  const [feedbackMessageId, setFeedbackMessageId] = useState(null)
  const [feedbackReasons, setFeedbackReasons] = useState([])
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackSubmittingId, setFeedbackSubmittingId] = useState(null)
  const [feedbackSubmittedIds, setFeedbackSubmittedIds] = useState([])
  const [feedbackError, setFeedbackError] = useState('')
  const [showAssistantScrollLatest, setShowAssistantScrollLatest] = useState(false)
  const assistantMessagesRef = useRef(null)
  const assistantComposerRef = useRef(null)
  const shouldStickToLatestRef = useRef(false)

  const hasAssistantHistory = assistantMessages.length > 0
  const hasAssistantThreads = assistantThreads.length > 0
  const activeAssistantThread = assistantThreads.find(
    (thread) => thread.id === activeAssistantThreadId,
  )
  const currentChatTitle = activeAssistantThread?.title || 'New chat'

  useEffect(() => {
    setDeleteConfirmThreadId(null)
    setBulkDeleteConfirm(false)
    setFeedbackMessageId(null)
    setFeedbackError('')
  }, [assistantView])

  useEffect(() => {
    const availableIds = new Set(assistantThreads.map((thread) => Number(thread.id)))
    setSelectedAssistantThreadIds((current) =>
      current.filter((threadId) => availableIds.has(Number(threadId))),
    )
  }, [assistantThreads])

  const updateAssistantScrollLatestVisibility = useCallback(() => {
    const element = assistantMessagesRef.current
    if (!element) {
      setShowAssistantScrollLatest(false)
      return
    }

    setShowAssistantScrollLatest(!assistantMessagesAreNearLatest(element))
  }, [])

  const scrollAssistantMessagesToLatest = ({ behavior = 'smooth' } = {}) => {
    const element = assistantMessagesRef.current
    if (!element) return

    if (typeof element.scrollTo === 'function') {
      element.scrollTo({ top: element.scrollHeight, behavior })
    } else {
      element.scrollTop = element.scrollHeight
    }
    setShowAssistantScrollLatest(false)
  }

  const markStickToLatestIfNear = () => {
    const element = assistantMessagesRef.current
    if (!element) return
    shouldStickToLatestRef.current =
      shouldStickToLatestRef.current || assistantMessagesAreNearLatest(element)
  }

  useEffect(() => {
    if (assistantView !== 'chat') {
      setShowAssistantScrollLatest(false)
      return undefined
    }

    const frame = window.requestAnimationFrame(() => {
      if (shouldStickToLatestRef.current) {
        shouldStickToLatestRef.current = false
        scrollAssistantMessagesToLatest({ behavior: 'auto' })
        return
      }
      updateAssistantScrollLatestVisibility()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [
    assistantMessages.length,
    assistantSending,
    assistantView,
    updateAssistantScrollLatestVisibility,
  ])

  const applyAssistantThreadResponse = useCallback((json) => {
    markStickToLatestIfNear()
    setAssistantMessages(messagesFromAssistantResponse(json))
    setAssistantThreads(Array.isArray(json.threads) ? json.threads : [])
    setActiveAssistantThreadId(json.thread?.id ?? null)
    setAssistantModel((current) =>
      typeof json.assistant?.model === 'string' ? json.assistant.model : current,
    )
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const controller = new AbortController()
    setAssistantLoading(true)
    setAssistantError('')
    getKnowledgeAssistantThread({ signal: controller.signal })
      .then((json) => {
        setAssistantMessages(messagesFromAssistantResponse(json))
        setAssistantThreads(Array.isArray(json.threads) ? json.threads : [])
        setActiveAssistantThreadId(json.thread?.id ?? null)
        setAssistantModel(typeof json.assistant?.model === 'string' ? json.assistant.model : '')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setAssistantError(err.message || 'Failed to load assistant chat.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAssistantLoading(false)
      })

    return () => controller.abort()
  }, [isOpen])

  const openAssistantThread = async (threadId) => {
    if (assistantLoading || assistantSending || assistantClearing) return

    setAssistantLoading(true)
    setAssistantError('')
    setFeedbackMessageId(null)
    setFeedbackError('')
    setBulkDeleteConfirm(false)
    try {
      const json = await getKnowledgeAssistantThread({ threadId })
      applyAssistantThreadResponse(json)
      setAssistantView('chat')
    } catch (err) {
      setAssistantError(err.message || 'Failed to load assistant chat.')
    } finally {
      setAssistantLoading(false)
    }
  }

  const startNewAssistantChat = async () => {
    if (assistantLoading || assistantSending || assistantClearing) return

    if (
      assistantMessages.length === 0 &&
      (!activeAssistantThreadId || Number(activeAssistantThread?.message_count || 0) === 0)
    ) {
      setAssistantQuestion('')
      setAssistantView('chat')
      return
    }

    setAssistantLoading(true)
    setAssistantError('')
    setFeedbackMessageId(null)
    setFeedbackError('')
    setDeleteConfirmThreadId(null)
    try {
      const json = await createKnowledgeAssistantThread()
      applyAssistantThreadResponse(json)
      setAssistantQuestion('')
      setAssistantView('chat')
    } catch (err) {
      setAssistantError(err.message || 'Failed to create assistant chat.')
    } finally {
      setAssistantLoading(false)
    }
  }

  const askAssistantQuestion = async (questionText) => {
    if (!isAskMode) return

    const question = questionText.trim()
    if (!question || assistantSending || assistantLoading || assistantClearing) return

    setAssistantQuestion('')
    setAssistantSending(true)
    setAssistantError('')
    setFeedbackMessageId(null)
    setFeedbackError('')
    setDeleteConfirmThreadId(null)
    setBulkDeleteConfirm(false)
    markStickToLatestIfNear()
    setAssistantMessages((prev) => [
      ...prev,
      { id: `pending-${Date.now()}`, role: 'user', content: question, sources: [] },
    ])

    try {
      const json = await askKnowledgeAssistant({
        question,
        currentRoute,
        threadId: activeAssistantThreadId,
      })
      applyAssistantThreadResponse(json)
    } catch (err) {
      setAssistantError(err.message || 'Failed to ask Learn kijo.')
    } finally {
      setAssistantSending(false)
    }
  }

  const submitAssistantQuestion = async (event) => {
    event.preventDefault()
    askAssistantQuestion(assistantQuestion)
  }

  const handleAssistantComposerKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()
    submitAssistantQuestion(event)
  }

  const useClarificationOption = (option) => {
    const label = String(option?.label || '').trim()
    if (!label || assistantSending || assistantLoading || assistantClearing) return
    setAssistantQuestion(`Use ${label} for this follow-up`)
    window.requestAnimationFrame(() => assistantComposerRef.current?.focus())
  }

  const toggleAssistantThreadSelection = (threadId) => {
    if (assistantLoading || assistantSending || assistantClearing) return

    const normalizedThreadId = Number(threadId)
    setDeleteConfirmThreadId(null)
    setBulkDeleteConfirm(false)
    setSelectedAssistantThreadIds((current) =>
      current.includes(normalizedThreadId)
        ? current.filter((id) => id !== normalizedThreadId)
        : [...current, normalizedThreadId],
    )
  }

  const selectAllAssistantThreads = () => {
    if (assistantLoading || assistantSending || assistantClearing) return

    setDeleteConfirmThreadId(null)
    setBulkDeleteConfirm(false)
    const threadIds = assistantThreads.map((thread) => Number(thread.id)).filter((id) => id > 0)
    setSelectedAssistantThreadIds((current) =>
      current.length === threadIds.length ? [] : threadIds,
    )
  }

  const clearAssistantThreadSelection = () => {
    setSelectedAssistantThreadIds([])
    setBulkDeleteConfirm(false)
  }

  const deleteSelectedAssistantThreads = async () => {
    if (assistantLoading || assistantSending || assistantClearing) return

    const threadIds = selectedAssistantThreadIds
      .map((threadId) => Number(threadId))
      .filter((threadId) => threadId > 0)
    if (threadIds.length === 0) return

    if (!bulkDeleteConfirm) {
      setDeleteConfirmThreadId(null)
      setBulkDeleteConfirm(true)
      return
    }

    setAssistantError('')
    setFeedbackMessageId(null)
    setFeedbackError('')
    setAssistantClearing(true)
    try {
      let latestJson = null
      for (const threadId of threadIds) {
        latestJson = await clearKnowledgeAssistantThread({ threadId })
      }

      if (latestJson) {
        const deletedActiveThread = threadIds.includes(Number(activeAssistantThreadId))
        if (deletedActiveThread) {
          applyAssistantThreadResponse(latestJson)
        } else {
          setAssistantThreads(Array.isArray(latestJson.threads) ? latestJson.threads : [])
          setAssistantModel((current) =>
            typeof latestJson.assistant?.model === 'string' ? latestJson.assistant.model : current,
          )
        }
      }

      setSelectedAssistantThreadIds([])
      setBulkDeleteConfirm(false)
      setDeleteConfirmThreadId(null)
    } catch (err) {
      setAssistantError(err.message || 'Failed to delete selected assistant chats.')
    } finally {
      setAssistantClearing(false)
    }
  }

  const deleteAssistantThread = async (threadId) => {
    if (assistantLoading || assistantSending || assistantClearing) return

    if (deleteConfirmThreadId !== threadId) {
      setDeleteConfirmThreadId(threadId)
      setBulkDeleteConfirm(false)
      return
    }

    setAssistantError('')
    setFeedbackMessageId(null)
    setFeedbackError('')
    setAssistantClearing(true)
    try {
      const json = await clearKnowledgeAssistantThread({ threadId })
      if (threadId === activeAssistantThreadId) {
        applyAssistantThreadResponse(json)
      } else {
        setAssistantThreads(Array.isArray(json.threads) ? json.threads : [])
        setAssistantModel((current) =>
          typeof json.assistant?.model === 'string' ? json.assistant.model : current,
        )
      }
      setDeleteConfirmThreadId(null)
      setSelectedAssistantThreadIds((current) => current.filter((id) => id !== Number(threadId)))
    } catch (err) {
      setAssistantError(err.message || 'Failed to delete assistant chat.')
    } finally {
      setAssistantClearing(false)
    }
  }

  const toggleFeedbackReason = (reason) => {
    setFeedbackReasons((current) =>
      current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason],
    )
  }

  const submitAssistantFeedback = async (message, rating) => {
    if (feedbackSubmittingId) return

    setFeedbackSubmittingId(message.id)
    setFeedbackError('')
    try {
      const result = await submitKnowledgeAssistantFeedback({
        messageId: message.id,
        rating,
        reasons: rating === 'bad' ? feedbackReasons : [],
        note: rating === 'bad' ? feedbackNote : '',
        currentRoute: currentRoute || '/',
      })
      if (result?.status !== 'success') {
        throw new Error(result?.message || 'Failed to send feedback.')
      }
      setFeedbackSubmittedIds((ids) => (ids.includes(message.id) ? ids : [...ids, message.id]))
      setFeedbackMessageId(null)
      setFeedbackReasons([])
      setFeedbackNote('')
    } catch (err) {
      setFeedbackError(err.message || 'Failed to send feedback.')
    } finally {
      setFeedbackSubmittingId(null)
    }
  }

  const openFeedbackForm = (messageId) => {
    setFeedbackMessageId(messageId)
    setFeedbackReasons([])
    setFeedbackNote('')
    setFeedbackError('')
  }

  const cancelFeedback = () => {
    setFeedbackMessageId(null)
    setFeedbackReasons([])
    setFeedbackNote('')
    setFeedbackError('')
  }

  return {
    activeAssistantThreadId,
    assistantClearing,
    assistantError,
    assistantLoading,
    assistantMessages,
    assistantMessagesRef,
    assistantComposerRef,
    assistantModel,
    assistantQuestion,
    assistantSending,
    assistantThreads,
    assistantView,
    bulkDeleteConfirm,
    cancelFeedback,
    clearAssistantThreadSelection,
    currentChatTitle,
    deleteAssistantThread,
    deleteSelectedAssistantThreads,
    deleteConfirmThreadId,
    feedbackError,
    feedbackMessageId,
    feedbackNote,
    feedbackReasons,
    feedbackSubmittedIds,
    feedbackSubmittingId,
    handleAssistantComposerKeyDown,
    hasAssistantHistory,
    hasAssistantThreads,
    openAssistantThread,
    openFeedbackForm,
    scrollAssistantMessagesToLatest,
    selectAllAssistantThreads,
    selectedAssistantThreadIds,
    setAssistantQuestion,
    setAssistantView,
    setDeleteConfirmThreadId,
    setFeedbackNote,
    showAssistantScrollLatest,
    startNewAssistantChat,
    submitAssistantFeedback,
    submitAssistantQuestion,
    toggleFeedbackReason,
    toggleAssistantThreadSelection,
    updateAssistantScrollLatestVisibility,
    useClarificationOption,
    askAssistantQuestion,
  }
}

export default useKnowledgeAssistantChat
