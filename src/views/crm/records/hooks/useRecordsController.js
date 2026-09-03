import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../auth/AuthProvider'
import dialog from '../../../../components/dialog/dialogService'
import { showToast } from '../../../../components/toast/toastService'
import { endpointsByService } from '../services/recordsActions'
import {
  canRecordTabRequestNegotiation,
  getRecordDetailPath,
  getRecordListPath,
  getQuoteServiceFromRecordTab,
  isAggregateRecordTab,
  recordTabOptions as baseRecordTabOptions,
} from '../config/recordTabs'
import { recordTablesByTab } from '../config/recordTables'
import { getMessage, isSuccess, postJsonCompat } from '../services/compatApi'
import {
  enrichApprovalReviewMetadata,
  needsApprovalReviewMetadataHydration,
} from '../utils/approvalReviewMetadata'
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
import { useSpecialRecordCategories } from './useSpecialRecordCategories'
import {
  buildRecordNavigationTabs,
  getDefaultSpecialCategoryId,
  matchesSpecialCategory,
} from '../utils/specialRecordCategories'
import { quoteApiUrl } from '../../quotes/quoteApi'
import { fetchQuoteApprovals } from '../services/quoteApprovalService'
import { dispatchAppNotificationsChanged } from '../../../../notifications/appNotificationEvents'
import {
  buildRecordMovedToastMessage,
  RECORD_ACTION_TOAST_MESSAGES,
} from '../utils/recordActionToastMessages'
import { getCurrentReturnTo } from '../../../../utils/navigation/returnTo'

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

const pickFirst = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = String(source?.[key] ?? '').trim()
    if (value.length) return value
  }
  return ''
}

const normalizeLookupValue = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
const uniqueLookupValues = (values = []) => {
  const seen = new Set()
  return values
    .map((value) => normalizeLookupValue(value))
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}

const buildQuoteLookupKey = (service = '', quoteId = '') =>
  `${normalizeServiceKey(service)}:${String(quoteId || '').trim()}`

const quoteServiceToRecordTab = {
  training: 'training-tab',
  ih: 'ih-tab',
  manpower: 'manpower-tab',
  equipment: 'equipment-tab',
  special: 'special-tab',
}

const normalizeServiceKey = (service = '') => {
  const normalized = String(service || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')

  const aliases = {
    'industrial-hygiene': 'ih',
    industrialhygiene: 'ih',
    'manpower-supply': 'manpower',
    manpowersupply: 'manpower',
    'equipment-supply': 'equipment',
    equipmentsupply: 'equipment',
  }

  return aliases[normalized] || normalized
}

const getRecordTabFromQuoteService = (service = '') =>
  quoteServiceToRecordTab[normalizeServiceKey(service)] || null

const buildQuoteLookupByServiceAndIdFromRows = (
  rows = [],
  activeTab = '',
  isAggregateTab = false,
) => {
  const map = new Map()
  rows.forEach((quote) => {
    const serviceTab = quote?.serviceTab || (!isAggregateTab ? activeTab : '')
    const service = getQuoteServiceFromRecordTab(serviceTab)
    const serviceCandidates = service ? [service, ''] : ['']
    const quoteIdCandidates = uniqueLookupValues([quote?.id, quote?.quote_id, quote?.quoteId])
    const quoteRefCandidates = getQuoteReferenceValuesFromRecord(quote)

    serviceCandidates.forEach((serviceValue) => {
      quoteIdCandidates.forEach((quoteId) => {
        if (quoteId) {
          map.set(buildQuoteLookupKey(serviceValue, quoteId), quote)
        }
      })
      quoteRefCandidates.forEach((quoteRef) => {
        if (quoteRef) {
          map.set(buildQuoteLookupKey(serviceValue, quoteRef), quote)
        }
      })
    })
  })
  return map
}

const mergeQuoteRows = (rows = []) => {
  const uniqueByKey = new Map()
  rows.forEach((quote) => {
    const serviceTab = quote?.serviceTab || ''
    const quoteId = quote?.id
    if (serviceTab && quoteId != null) {
      uniqueByKey.set(`${serviceTab}:${String(quoteId)}`, quote)
      return
    }
    if (quoteId != null) uniqueByKey.set(`:${String(quoteId)}`, quote)
    else if (quote?.quotation_id != null) uniqueByKey.set(`:${String(quote.quotation_id)}`, quote)
    else if (quote?.quote_ref_no != null) uniqueByKey.set(`:${String(quote.quote_ref_no)}`, quote)
  })
  return [...uniqueByKey.values()]
}

const getQuoteReferenceValuesFromRecord = (quote = {}) =>
  uniqueLookupValues([
    pickFirst(quote, [
      'quote_ref_no',
      'quotationId',
      'quoteNo',
      'quote_no',
      'quotation_no',
      'quotationNo',
    ]),
    pickFirst(quote, [
      'quote_ref',
      'quoteRefNo',
      'quoteRef',
      'quoteNumber',
      'quote_number',
      'quotationNumber',
    ]),
    pickFirst(quote, ['reference', 'refNo', 'ref_no', 'quotation_ref_no']),
  ]).filter(Boolean)

const getQuoteReferenceFromRecord = (quote = {}) =>
  getQuoteReferenceValuesFromRecord(quote)[0] || ''

const isLooseMatch = (haystackCandidates = [], needleCandidates = []) => {
  if (!haystackCandidates.length || !needleCandidates.length) return false

  const haystack = haystackCandidates.map((value) => normalizeLookupValue(value))
  const needle = new Set(needleCandidates.map((value) => normalizeLookupValue(value)))

  return haystack.some((value) => needle.has(value))
}

const matchQuoteRecordToApproval = (record = {}, approval = {}) => {
  const quoteIdCandidates = getApprovalQuoteIdCandidates(approval)
  const quoteRefCandidates = getApprovalQuoteRefCandidates(approval)
  if (!quoteIdCandidates.length && !quoteRefCandidates.length) return false

  const recordIds = uniqueLookupValues([
    record?.id,
    record?.quote_id,
    record?.quoteId,
    record?.quotation_id,
  ])
  const recordRefs = getQuoteReferenceValuesFromRecord(record)
  if (isLooseMatch(recordIds, quoteIdCandidates) || isLooseMatch(recordRefs, quoteRefCandidates)) {
    return true
  }
  return false
}

const getApprovalQuoteIdCandidates = (approval = {}) =>
  uniqueLookupValues([approval?.quote_id, approval?.quoteId, approval?.quotation_id])

const getApprovalQuoteRefCandidates = (approval = {}) =>
  uniqueLookupValues([
    approval?.quote_ref_no,
    approval?.quote_ref,
    approval?.quoteRefNo,
    approval?.quoteRef,
    approval?.quoteNumber,
    approval?.quote_number,
    approval?.quotationId,
    approval?.quotation_number,
    approval?.quotationNumber,
    approval?.ref_no,
    approval?.refNo,
    approval?.quotation_id,
    approval?.quoteNo,
    approval?.quote_no,
    approval?.quotation_no,
    approval?.quotationNo,
  ])

export const useRecordsController = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const currentUser = user
  const currentUserName = user?.full_name || user?.name || ''
  const currentUserEmail = user?.email || ''
  const { activeTab, activeCategoryId, activeNavigationTab, handleTabChange } =
    useRecordsTabRouting()
  const {
    categories: specialCategoryFacets,
    isLoading: specialCategoriesLoading,
    error: specialCategoriesError,
    reload: reloadSpecialCategories,
  } = useSpecialRecordCategories()
  const recordTabOptions = useMemo(
    () => buildRecordNavigationTabs(baseRecordTabOptions, specialCategoryFacets),
    [specialCategoryFacets],
  )
  const defaultSpecialCategoryId = useMemo(
    () => getDefaultSpecialCategoryId(specialCategoryFacets),
    [specialCategoryFacets],
  )
  const isAggregateTab = isAggregateRecordTab(activeTab)
  const [emailConfirmRecord, setEmailConfirmRecord] = useState(null)
  const [emailDraftSubject, setEmailDraftSubject] = useState('')
  const [emailDraftBody, setEmailDraftBody] = useState('')
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [emailSendError, setEmailSendError] = useState('')
  const [tableFilterContextByTab, setTableFilterContextByTab] = useState({})
  const [negotiationRecord, setNegotiationRecord] = useState(null)
  const [negotiationForm, setNegotiationForm] = useState({
    requestedDiscountAmount: '',
    requestedFinalTotal: '',
    reason: '',
    remarks: '',
  })
  const [isNegotiationSubmitting, setIsNegotiationSubmitting] = useState(false)
  const [approvalItems, setApprovalItems] = useState([])
  const [approvalStatusUnavailable, setApprovalStatusUnavailable] = useState(true)
  const [approvalRecord, setApprovalRecord] = useState(null)
  const [approvalQueue, setApprovalQueue] = useState([])
  const [approvalQueueIndex, setApprovalQueueIndex] = useState(0)
  const [approvalDecisionNotice, setApprovalDecisionNotice] = useState(null)
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [isApprovalSubmitting, setIsApprovalSubmitting] = useState(false)
  const [isApprovalReviewLoading, setIsApprovalReviewLoading] = useState(false)
  const [legacyPdfPrompt, setLegacyPdfPrompt] = useState(null)
  const [pdfPreviewRequest, setPdfPreviewRequest] = useState(null)
  const approvalReviewSessionRef = useRef(0)
  const { quotes, setQuotes, quotesLoading, fetchQuotes } = useRecordsFetch(activeTab)
  const quoteLookupByServiceAndIdRef = useRef(new Map())
  const refreshQuotesInPlace = useCallback(
    async (tabKey = activeTab) => {
      const nextQuotes = await fetchQuotes(tabKey, { showLoader: false })
      if (tabKey === 'special-tab' || isAggregateRecordTab(tabKey)) {
        await reloadSpecialCategories()
      }
      return nextQuotes
    },
    [activeTab, fetchQuotes, reloadSpecialCategories],
  )
  const quoteLookupByServiceAndId = useMemo(() => {
    return buildQuoteLookupByServiceAndIdFromRows(quotes, activeTab, isAggregateTab)
  }, [activeTab, isAggregateTab, quotes])

  useEffect(() => {
    quoteLookupByServiceAndIdRef.current = quoteLookupByServiceAndId
  }, [quoteLookupByServiceAndId])

  const findQuoteForApproval = useCallback(
    (approval = {}, fallbackRows = null) => {
      const lookupSource = quoteLookupByServiceAndIdRef.current
      const fallbackQuoteRows =
        Array.isArray(fallbackRows) && fallbackRows.length ? fallbackRows : quotes

      const serviceCandidates = (approval?.service ? [approval.service, ''] : ['']).map(
        normalizeServiceKey,
      )
      const quoteIdCandidates = getApprovalQuoteIdCandidates(approval)
      const quoteRefCandidates = getApprovalQuoteRefCandidates(approval)

      for (const candidateService of serviceCandidates) {
        for (const quoteId of quoteIdCandidates) {
          const quote = lookupSource.get(buildQuoteLookupKey(candidateService, quoteId))
          if (quote) return quote
        }

        for (const quoteRef of quoteRefCandidates) {
          const quote = lookupSource.get(buildQuoteLookupKey(candidateService, quoteRef))
          if (quote) return quote
        }
      }

      const matchingQuotes = fallbackQuoteRows.filter((quote) =>
        matchQuoteRecordToApproval(quote, approval),
      )
      if (matchingQuotes.length <= 1) return matchingQuotes[0] || null

      const approvalService = normalizeServiceKey(approval?.service)
      const serviceMatches = matchingQuotes.filter(
        (quote) =>
          normalizeServiceKey(getQuoteServiceFromRecordTab(quote?.serviceTab || '')) ===
          approvalService,
      )
      return serviceMatches.length === 1 ? serviceMatches[0] : null
    },
    [quotes],
  )
  const enrichApprovalRecord = useCallback(
    (approval, fallbackRows = null) =>
      enrichApprovalReviewMetadata(approval, findQuoteForApproval(approval, fallbackRows)),
    [findQuoteForApproval],
  )
  const refreshApprovals = useCallback(async () => {
    setApprovalStatusUnavailable(true)
    try {
      const approvals = await fetchQuoteApprovals()
      setApprovalItems(approvals)
      setApprovalStatusUnavailable(false)
      return approvals
    } catch (error) {
      console.error('Failed to load quotation approvals:', error)
      return []
    }
  }, [])
  const openLegacyPdfPrompt = useCallback((prompt) => setLegacyPdfPrompt(prompt), [])
  const openPdfPreview = useCallback((request) => setPdfPreviewRequest(request), [])
  const closePdfPreview = useCallback(() => setPdfPreviewRequest(null), [])
  const refreshApprovalState = useCallback(
    async () => Promise.all([refreshApprovals(), refreshQuotesInPlace()]),
    [refreshApprovals, refreshQuotesInPlace],
  )
  const closeLegacyPdfPrompt = useCallback(() => setLegacyPdfPrompt(null), [])
  const handleLegacyPdfGenerate = useCallback(() => {
    const generate = legacyPdfPrompt?.onGenerate
    setLegacyPdfPrompt(null)
    generate?.()
  }, [legacyPdfPrompt])
  const handleLegacyPdfEdit = useCallback(() => {
    const edit = legacyPdfPrompt?.onEdit
    setLegacyPdfPrompt(null)
    edit?.()
  }, [legacyPdfPrompt])

  useEffect(() => {
    refreshApprovals()
  }, [activeTab, refreshApprovals])

  const scopedQuotes = useMemo(() => {
    const approvalByQuote = new Map(
      approvalItems.flatMap((approval) => {
        const serviceCandidates = approval?.service ? [approval.service, ''] : ['']
        const quoteIdCandidates = getApprovalQuoteIdCandidates(approval)
        const quoteRefCandidates = getApprovalQuoteRefCandidates(approval)
        const keys = []

        serviceCandidates.forEach((service) => {
          quoteIdCandidates.forEach((quoteId) =>
            keys.push([buildQuoteLookupKey(service, quoteId), approval]),
          )
          quoteRefCandidates.forEach((quoteRef) =>
            keys.push([buildQuoteLookupKey(service, quoteRef), approval]),
          )
        })

        return keys
      }),
    )
    const enriched = quotes.map((quote) => {
      const serviceTab = quote?.serviceTab || (!isAggregateTab ? activeTab : '')
      const service = getQuoteServiceFromRecordTab(serviceTab)
      const approval =
        approvalByQuote.get(buildQuoteLookupKey(service, quote?.id)) ||
        approvalByQuote.get(buildQuoteLookupKey(service, getQuoteReferenceFromRecord(quote))) ||
        approvalByQuote.get(buildQuoteLookupKey('', quote?.id)) ||
        approvalByQuote.get(buildQuoteLookupKey('', getQuoteReferenceFromRecord(quote)))
      return {
        ...quote,
        approval: approval ? enrichApprovalRecord(approval) : null,
        approvalStatusUnavailable,
      }
    })
    const owned =
      activeTab === 'my-tab'
        ? enriched.filter((quote) => isQuoteOwnedByUser(quote, user))
        : enriched
    const categoryScoped =
      activeTab === 'special-tab'
        ? owned.filter((quote) =>
            matchesSpecialCategory(quote, activeCategoryId, defaultSpecialCategoryId),
          )
        : owned
    const approvalScope = new URLSearchParams(location.search).get('approval_scope')
    return approvalScope === 'mine'
      ? categoryScoped.filter(
          (quote) => quote.approval?.status === 'pending' && quote.approval?.can_decide,
        )
      : categoryScoped
  }, [
    activeTab,
    activeCategoryId,
    approvalItems,
    approvalStatusUnavailable,
    enrichApprovalRecord,
    isAggregateTab,
    location.search,
    quotes,
    defaultSpecialCategoryId,
    user,
  ])

  useEffect(() => {
    if (
      activeCategoryId &&
      !specialCategoriesLoading &&
      !specialCategoriesError &&
      !specialCategoryFacets.some(
        (category) => Number(category.categoryId) === Number(activeCategoryId),
      )
    ) {
      handleTabChange('special-tab')
    }
  }, [
    activeCategoryId,
    handleTabChange,
    specialCategoriesError,
    specialCategoriesLoading,
    specialCategoryFacets,
  ])

  const pendingApprovals = useMemo(
    () =>
      approvalItems
        .filter((item) => item.status === 'pending' && item.can_decide)
        .map((approval) => enrichApprovalRecord(approval)),
    [approvalItems, enrichApprovalRecord],
  )

  const normalizeApprovalQueue = useCallback(
    (items, fallbackApproval) => {
      const queueItems = Array.isArray(items) && items.length ? items : [fallbackApproval]
      const deduped = new Map()

      queueItems.forEach((item) => {
        const approval = item?.approval || item
        if (!approval?.id) return
        deduped.set(String(approval.id), enrichApprovalRecord(approval))
      })

      return [...deduped.values()]
    },
    [enrichApprovalRecord],
  )

  const hydrateApprovalMetadataForQueue = useCallback(
    async (items = []) => {
      const queue = Array.isArray(items) ? items : []
      if (queue.length === 0 || !queue.some((item) => needsApprovalReviewMetadataHydration(item))) {
        return queue
      }

      const tabs = [
        ...new Set(
          queue.map((item) => getRecordTabFromQuoteService(item?.service)).filter(Boolean),
        ),
      ]

      const loadTabs = tabs.length ? tabs : ['all-tab']
      const loadedRows = []
      for (const tabKey of loadTabs) {
        const rows = await refreshQuotesInPlace(tabKey).catch((error) => {
          console.error('Failed to refresh quote data for approval review.', error)
          return []
        })
        if (Array.isArray(rows)) {
          loadedRows.push(...rows)
        }
      }
      const hydratedRows = mergeQuoteRows(loadedRows.length ? loadedRows : quotes)

      return queue.map((item) => enrichApprovalRecord(item, hydratedRows))
    },
    [enrichApprovalRecord, refreshQuotesInPlace, quotes],
  )

  const buildPendingApprovalLookup = useCallback((approvals = []) => {
    return new Map(
      approvals
        .filter(
          (item) =>
            String(item?.status || '').toLowerCase() === 'pending' &&
            Boolean(item?.can_decide) &&
            item?.id != null,
        )
        .map((item) => [String(item.id), item]),
    )
  }, [])

  const findQueuedApproval = useCallback(
    (queue, currentIndex, latestApprovals = approvalItems, direction = 1) => {
      if (!Array.isArray(queue) || queue.length === 0) return null
      const normalizedCurrentIndex = Number(currentIndex)
      if (!Number.isFinite(normalizedCurrentIndex)) return null

      const directionStep = direction >= 0 ? 1 : -1
      const pendingLookup = buildPendingApprovalLookup(latestApprovals)
      for (
        let index = normalizedCurrentIndex + directionStep;
        index >= 0 && index < queue.length;
        index += directionStep
      ) {
        const queuedApproval = queue[index]
        if (!queuedApproval?.id) continue
        const nextApproval = pendingLookup.get(String(queuedApproval.id))
        if (nextApproval) {
          return { index, approval: nextApproval }
        }
      }

      return null
    },
    [approvalItems, buildPendingApprovalLookup],
  )

  const resolveQueueTarget = useCallback(
    (queue, targetIndex, latestApprovals = approvalItems) => {
      if (!Array.isArray(queue) || queue.length === 0) return null

      const normalizedTargetIndex = Number(targetIndex)
      if (!Number.isInteger(normalizedTargetIndex) || normalizedTargetIndex < 0) return null
      if (normalizedTargetIndex >= queue.length) return null

      const queuedApproval = queue[normalizedTargetIndex]
      if (!queuedApproval?.id) return null
      const approvalLookup = buildPendingApprovalLookup(latestApprovals)
      const latestApproval = approvalLookup.get(String(queuedApproval.id))
      if (latestApproval) return latestApproval

      return queuedApproval
    },
    [approvalItems, buildPendingApprovalLookup],
  )

  const closeApprovalSession = useCallback(() => {
    setApprovalQueue([])
    setApprovalQueueIndex(0)
    setApprovalRecord(null)
    setApprovalDecisionNotice(null)
    setIsApprovalReviewLoading(false)
    approvalReviewSessionRef.current += 1
    const searchParams = new URLSearchParams(location.search)
    if (searchParams.has('approvalId')) {
      searchParams.delete('approvalId')
      const search = searchParams.toString()
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : '',
        },
        { replace: true },
      )
    }
  }, [location.pathname, location.search, navigate])

  const openQueueItem = useCallback(
    (index, latestApprovals = approvalItems) => {
      const targetIndex = Number(index)
      if (!Number.isInteger(targetIndex)) return false

      const targetApproval = resolveQueueTarget(approvalQueue, targetIndex, latestApprovals)
      if (!targetApproval) return false

      const queuedApproval = approvalQueue[targetIndex]
      const approvalRecordSource = queuedApproval?.id
        ? queuedApproval
        : targetApproval.approval || targetApproval

      setApprovalDecisionNotice(null)
      setApprovalQueueIndex(targetIndex)
      setApprovalRecord(enrichApprovalRecord(approvalRecordSource))
      return true
    },
    [approvalItems, approvalQueue, enrichApprovalRecord, resolveQueueTarget],
  )

  const canNavigateNextQueuedApproval = useMemo(
    () => Boolean(findQueuedApproval(approvalQueue, approvalQueueIndex, approvalItems, 1)),
    [approvalQueue, approvalItems, approvalQueueIndex, findQueuedApproval],
  )
  const canNavigatePreviousQueuedApproval = useMemo(
    () => Boolean(findQueuedApproval(approvalQueue, approvalQueueIndex, approvalItems, -1)),
    [approvalQueue, approvalItems, approvalQueueIndex, findQueuedApproval],
  )

  const approvalQueueList = useMemo(
    () =>
      approvalQueue.map((item, index) => ({
        id: item?.id,
        index,
        quoteRefNo:
          pickFirst(item, [
            'quote_ref_no',
            'quoteRefNo',
            'quoteRef',
            'quoteNumber',
            'quote_number',
            'quotationNumber',
            'quotation_number',
            'quotationId',
            'quoteNo',
            'quote_no',
            'quotation_no',
            'quotationNo',
            'reference',
            'refNo',
            'ref_no',
          ]) || (item?.quote_id != null ? `Quote #${item.quote_id}` : `#${index + 1}`),
        quoteTitle: pickFirst(item, [
          'quote_title',
          'quotation_title',
          'quoteTitle',
          'title',
          'quote_name',
          'name',
        ]),
        quoteDate: pickFirst(item, [
          'quote_date',
          'quotation_date',
          'quoteDate',
          'date',
          'dateCreated',
          'createdAt',
          'created_at',
          'date_created',
          'updated_at',
        ]),
        clientName: pickFirst(item, [
          'client_name',
          'clientName',
          'fullName',
          'customerName',
          'customer_name',
          'company_name',
          'companyName',
        ]),
      })),
    [approvalQueue],
  )

  const handleQueueNext = useCallback(() => {
    if (!canNavigateNextQueuedApproval || isApprovalSubmitting) return

    const nextQueuedApproval = findQueuedApproval(
      approvalQueue,
      approvalQueueIndex,
      approvalItems,
      1,
    )

    if (nextQueuedApproval) {
      setApprovalDecisionNotice(null)
      setApprovalQueueIndex(nextQueuedApproval.index)
      const approvalRecordSource =
        approvalQueue[nextQueuedApproval.index] || nextQueuedApproval.approval
      setApprovalRecord(enrichApprovalRecord(approvalRecordSource || nextQueuedApproval))
      return
    }

    closeApprovalSession()
  }, [
    approvalItems,
    approvalQueue,
    approvalQueueIndex,
    canNavigateNextQueuedApproval,
    closeApprovalSession,
    findQueuedApproval,
    enrichApprovalRecord,
    isApprovalSubmitting,
  ])

  const handleQueuePrevious = useCallback(() => {
    if (!canNavigatePreviousQueuedApproval || isApprovalSubmitting) return

    const previousQueuedApproval = findQueuedApproval(
      approvalQueue,
      approvalQueueIndex,
      approvalItems,
      -1,
    )

    if (previousQueuedApproval) {
      setApprovalDecisionNotice(null)
      setApprovalQueueIndex(previousQueuedApproval.index)
      const approvalRecordSource =
        approvalQueue[previousQueuedApproval.index] || previousQueuedApproval.approval
      setApprovalRecord(enrichApprovalRecord(approvalRecordSource || previousQueuedApproval))
      return
    }

    closeApprovalSession()
  }, [
    approvalItems,
    approvalQueue,
    approvalQueueIndex,
    canNavigatePreviousQueuedApproval,
    closeApprovalSession,
    findQueuedApproval,
    enrichApprovalRecord,
    isApprovalSubmitting,
  ])

  const handleQueueSkip = useCallback(async () => {
    if (!canNavigateNextQueuedApproval || isApprovalSubmitting) return
    handleQueueNext()
  }, [canNavigateNextQueuedApproval, handleQueueNext, isApprovalSubmitting])

  const handleQueueJump = useCallback(
    (selectedValue) => {
      if (isApprovalSubmitting) return

      const value = Number(selectedValue)
      if (!Number.isInteger(value)) return
      openQueueItem(value, approvalItems)
    },
    [approvalItems, isApprovalSubmitting, openQueueItem],
  )

  const openApprovalReview = useCallback(
    async (value, options = {}) => {
      const reviewSession = approvalReviewSessionRef.current + 1
      approvalReviewSessionRef.current = reviewSession

      const sourceApproval = value?.approval || value
      if (!sourceApproval || typeof sourceApproval !== 'object') return

      const approval = enrichApprovalRecord(sourceApproval, quotes)
      if (!approval?.id) {
        setIsApprovalReviewLoading(false)
        return
      }

      const queue = normalizeApprovalQueue(
        options.queue || options.approvalQueue || [approval],
        approval,
      )
      const selectedIndex = queue.findIndex((item) => String(item.id) === String(approval.id))
      const normalizedIndex = selectedIndex >= 0 ? selectedIndex : 0
      const needsHydration = queue.some((item) => needsApprovalReviewMetadataHydration(item))
      setIsApprovalReviewLoading(needsHydration)

      if (approvalReviewSessionRef.current !== reviewSession) {
        setIsApprovalReviewLoading(false)
        return
      }
      setApprovalRemarks('')
      setApprovalDecisionNotice(null)
      setApprovalQueue(queue)
      setApprovalQueueIndex(normalizedIndex)
      setApprovalRecord(enrichApprovalRecord(queue[normalizedIndex] || approval))

      if (!needsHydration) {
        setIsApprovalReviewLoading(false)
        return
      }

      try {
        const hydratedQueue = await hydrateApprovalMetadataForQueue(queue)
        if (approvalReviewSessionRef.current !== reviewSession) return
        setApprovalQueue(hydratedQueue)
        setApprovalRecord(
          enrichApprovalRecord(
            hydratedQueue[typeof normalizedIndex === 'number' ? normalizedIndex : 0] || approval,
          ),
        )
      } finally {
        if (approvalReviewSessionRef.current !== reviewSession) return
        setIsApprovalReviewLoading(false)
      }
    },
    [enrichApprovalRecord, normalizeApprovalQueue, hydrateApprovalMetadataForQueue, quotes],
  )

  useEffect(() => {
    const handleReview = (event) => openApprovalReview(event.detail)
    window.addEventListener('quote-approval:review', handleReview)
    return () => window.removeEventListener('quote-approval:review', handleReview)
  }, [openApprovalReview])

  useEffect(() => {
    const approvalId = Number(new URLSearchParams(location.search).get('approvalId') || 0)
    if (approvalId <= 0 || approvalRecord?.id === approvalId) return
    const approval = approvalItems.find((item) => Number(item.id) === approvalId)
    if (approval?.status === 'pending' && approval.can_decide) openApprovalReview(approval)
  }, [approvalItems, approvalRecord?.id, location.search, openApprovalReview])

  const currentApprovalSource = approvalQueue[approvalQueueIndex] || approvalRecord
  const currentApprovalRecord = currentApprovalSource
    ? enrichApprovalRecord(currentApprovalSource)
    : null

  const handleApprovalDecision = async (decision) => {
    if (!currentApprovalRecord?.id || isApprovalSubmitting) return
    if (decision === 'reject' && !approvalRemarks.trim()) {
      dialog.alert('Please provide remarks when rejecting a quotation.')
      return
    }
    setIsApprovalSubmitting(true)
    try {
      const response = await fetch(
        quoteApiUrl(`quote-approvals/${encodeURIComponent(currentApprovalRecord.id)}/${decision}`),
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remarks: approvalRemarks.trim() || null }),
        },
      )
      const result = await response.json()
      if (!response.ok || !isSuccess(result)) {
        if (response.status === 409 && String(result?.code || '') === 'QUOTE_APPROVAL_STALE') {
          setApprovalDecisionNotice({
            severity: 'warning',
            title: 'Approval request is outdated',
            message: getMessage(
              result,
              `Approval request #${currentApprovalRecord.id} is no longer current.`,
            ),
          })
          return
        }
        throw new Error(getMessage(result, `Failed to ${decision} quotation.`))
      }
      setApprovalDecisionNotice(null)
      showToast(result.message || `Quotation ${decision === 'approve' ? 'approved' : 'rejected'}.`)
      setApprovalRemarks('')
      const [updatedApprovals] = await Promise.all([refreshApprovals(), refreshQuotesInPlace()])
      const nextQueuedApproval = findQueuedApproval(
        approvalQueue,
        approvalQueueIndex,
        updatedApprovals,
        1,
      )

      if (nextQueuedApproval) {
        setApprovalQueue(approvalQueue)
        openQueueItem(nextQueuedApproval.index, updatedApprovals)
      } else {
        closeApprovalSession()
      }
      dispatchAppNotificationsChanged()
    } catch (error) {
      dialog.alert(error?.message || `Failed to ${decision} quotation.`)
    } finally {
      setIsApprovalSubmitting(false)
    }
  }
  const EmptyTableState = () => <p>No records to display.</p>
  const ActiveTableComponent = recordTablesByTab[activeTab] || EmptyTableState
  const {
    modalState,
    dispatchModal,
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

  const handleFilterContextChange = useCallback(
    (context = {}) => {
      setTableFilterContextByTab((prev) => {
        const prevContext = prev[activeTab]
        const nextContext = {
          activeFilterCount: Number(context.activeFilterCount || 0),
          activeChips: Array.isArray(context.activeChips) ? context.activeChips : [],
          statusFilter: context.statusFilter || 'all',
          searchInput: context.searchInput || '',
        }

        if (JSON.stringify(prevContext) === JSON.stringify(nextContext)) return prev
        return {
          ...prev,
          [activeTab]: nextContext,
        }
      })
    },
    [activeTab],
  )

  const handleActionSuccess = useCallback(
    ({ status, message } = {}) => {
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

      showToast(
        message ||
          (status ? buildRecordMovedToastMessage(status, tableFilterContextByTab[activeTab]) : ''),
      )
    },
    [activeTab, navigate, tableFilterContextByTab],
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
        returnTo: getCurrentReturnTo(location),
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
      const quoteId = modalState.followUp.quote.id
      const result = await postJsonCompat(urls.followUp(quoteId), {
        quote_id: quoteId,
        id: quoteId,
        remarks: modalState.followUp.remarks,
        follow_up_date: modalState.followUp.date,
      })
      if (!isSuccess(result)) throw new Error(getMessage(result, 'Failed to add follow-up.'))

      showToast(RECORD_ACTION_TOAST_MESSAGES.followUpAdded)
      dispatchModal({ type: 'CLOSE_FOLLOWUP' })
      await refreshQuotesInPlace()
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
      }),
    [
      closeFailModal,
      closeSuccessModal,
      openFailModal,
      openSuccessModal,
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
        getFailServiceKey: () => modalState.fail.serviceKey,
        getSuccessServiceKey: () => modalState.success.serviceKey,
        getSuccessActionType: () => modalState.success.actionType,
      }),
    [
      closeFailModal,
      closeSuccessModal,
      modalState.fail.serviceKey,
      modalState.success.actionType,
      modalState.success.serviceKey,
      openFailModal,
      openSuccessModal,
      setFailReason,
      setSuccessDate,
      setSuccessDescription,
      setSuccessLoa,
      setSuccessReason,
    ],
  )

  const buildHandlers = useRecordsActionBuilder({
    fetchQuotes: refreshQuotesInPlace,
    setQuotes,
    navigate,
    onActionSuccess: handleActionSuccess,
    refreshAfterLocalDelete: true,
    modalBindings: defaultModalBindings,
    getReturnTo: () => getCurrentReturnTo(location),
    onLegacyPdfPrompt: openLegacyPdfPrompt,
    onApprovalStateChanged: refreshApprovalState,
    onOpenPdfPreview: openPdfPreview,
  })

  const buildStateAwareHandlers = useRecordsActionBuilder({
    fetchQuotes: refreshQuotesInPlace,
    setQuotes,
    navigate,
    onActionSuccess: handleActionSuccess,
    refreshAfterLocalDelete: true,
    modalBindings: modalStateBindings,
    getReturnTo: () => getCurrentReturnTo(location),
    onLegacyPdfPrompt: openLegacyPdfPrompt,
    onApprovalStateChanged: refreshApprovalState,
    onOpenPdfPreview: openPdfPreview,
  })

  const handlers = useMemo(() => {
    return buildHandlers(activeTab)
  }, [activeTab, buildHandlers])

  const successRecord = useMemo(() => {
    const recordId = modalState.success.recordId
    if (!recordId) return null

    const serviceKey = modalState.success.serviceKey || (!isAggregateTab ? activeTab : null)
    return (
      quotes.find(
        (quote) =>
          String(quote?.id) === String(recordId) &&
          (!serviceKey || !quote?.serviceTab || quote.serviceTab === serviceKey),
      ) || null
    )
  }, [
    activeTab,
    isAggregateTab,
    modalState.success.recordId,
    modalState.success.serviceKey,
    quotes,
  ])

  const {
    handleDelete,
    handleChangeToFail,
    handleUnAward,
    handleEdit,
    handleRevise,
    handleGeneratePdf,
    handleGenerateWord,
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

  const handleSuccessConfirm = async (projectCollaborators = [], projectValueAdjustment = {}) => {
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
        projectCollaborators,
        projectValueAdjustment,
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
      showToast(RECORD_ACTION_TOAST_MESSAGES.negotiationSubmitted)
      setNegotiationRecord(null)
      await refreshQuotesInPlace()
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
    onFilterContextChange: handleFilterContextChange,
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
    onGenerate: (record, format = 'pdf') => {
      const handlerName = format === 'word' ? 'handleGenerateWord' : 'handleGeneratePdf'
      if (isAggregateTab) return runByRecordService(record, handlerName, record)
      return format === 'word' ? handleGenerateWord?.(record) : handleGeneratePdf(record)
    },
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
    currentUser,
    activeTab,
    activeCategoryId,
    activeNavigationTab,
    handleTabChange,
    recordTabOptions,
    ActiveTableComponent,
    tableProps,
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
    pendingApprovals,
    approvalRecord: currentApprovalRecord,
    approvalQueueIndex,
    approvalQueueSize: approvalQueue.length,
    isApprovalReviewLoading,
    approvalRemarks,
    setApprovalRemarks,
    openApprovalReview,
    closeApprovalReview: () => {
      if (!isApprovalSubmitting) {
        closeApprovalSession()
      }
    },
    handleApprovalDecision,
    openQueueItem,
    handleQueueNext,
    handleQueuePrevious,
    handleQueueSkip,
    handleQueueJump,
    canNavigateNextQueuedApproval,
    canNavigatePreviousQueuedApproval,
    approvalQueueList,
    approvalDecisionNotice,
    isApprovalSubmitting,
    modalState,
    successRecord,
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
        showToast(result?.message || RECORD_ACTION_TOAST_MESSAGES.quotationEmailSent)
        setEmailConfirmRecord(null)
        await refreshQuotesInPlace()
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
    legacyPdfPrompt,
    closeLegacyPdfPrompt,
    handleLegacyPdfGenerate,
    handleLegacyPdfEdit,
    pdfPreviewRequest,
    closePdfPreview,
  }
}
