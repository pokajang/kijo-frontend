import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatAttachmentSize, prepareSalaryAttachment } from './attachmentUtils'
import { calculateMileageAmount, calculateSalarySummary, roundMoney } from './salaryCalculations'
import {
  clearSalaryApplicationDraft,
  readSalaryApplicationDraft,
  writeSalaryApplicationDraft,
} from './salaryApplicationDraftStorage'
import { fetchSalaryProfile, getActiveRecurringAllowances } from './salaryProfileStorage'
import {
  clearSalaryApplicationServerDraft,
  fetchSalaryApplicationDraft,
  findSalaryRecord,
  formatSalaryMonth,
  getSalaryRecords,
  saveSalaryApplicationDraft,
  saveSalaryRecord,
} from './salaryRecordStorage'

const getCurrentSalaryMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7)
const staffMutableStatuses = new Set(['Draft', 'Submitted', 'Prepared', 'Rejected'])
const staffLockedStatuses = new Set(['Checked', 'Approved', 'Paid'])

const normalizeEditableClaim = (claim = {}) => ({
  id: claim.id || buildId(),
  date: claim.date || '',
  description: claim.description || '',
  amount: Number(claim.amount || 0),
  source: claim.source || '',
  sourceLabel: claim.sourceLabel || '',
  km: claim.km,
  startLocation: claim.startLocation || '',
  endLocation: claim.endLocation || '',
  attachment: claim.attachment || null,
})

const serializeDraftAttachment = (attachment) => {
  if (!attachment) return null

  return {
    id: attachment.id,
    name: attachment.name,
    size: attachment.size,
    type: attachment.type,
    url: attachment.url,
    downloadUrl: attachment.downloadUrl,
    dataUrl: attachment.dataUrl,
    originalName: attachment.originalName,
    originalSize: attachment.originalSize,
    compressed: attachment.compressed,
  }
}

const serializeDraftItem = (item) => ({
  id: item.id,
  date: item.date || '',
  description: item.description || '',
  amount: Number(item.amount || 0),
  source: item.source || '',
  sourceLabel: item.sourceLabel || '',
  km: item.km,
  startLocation: item.startLocation || '',
  endLocation: item.endLocation || '',
  attachment: serializeDraftAttachment(item.attachment),
})

const normalizeDraftItems = (items) =>
  Array.isArray(items) ? items.map((item) => normalizeEditableClaim(item)) : []

const createStateFromDraft = (draft = {}, fallbackMonth = getCurrentSalaryMonth()) => ({
  formData: {
    salaryMonth: draft.formData?.salaryMonth || fallbackMonth,
    basicSalary: String(draft.formData?.basicSalary || ''),
    mileageRate: String(draft.formData?.mileageRate || ''),
    ...createEmptyClaimFields(),
    ...(draft.formData || {}),
  },
  allowanceItems: normalizeDraftItems(draft.allowanceItems).filter(
    (item) => item.source !== 'profile',
  ),
  expenseItems: [],
  mileageItems: [],
  medicalItems: [],
})

const createInitialSalaryState = (initialRecord = null, draft = null) => {
  const salaryMonth = getCurrentSalaryMonth()

  if (initialRecord) {
    const claims = Array.isArray(initialRecord.claims) ? initialRecord.claims : []

    return {
      formData: {
        salaryMonth: initialRecord.salaryMonthValue || salaryMonth,
        basicSalary: String(initialRecord.basicSalary || ''),
        mileageRate: '',
        allowanceDate: '',
        allowanceDescription: '',
        allowanceAmount: '',
        allowanceAttachment: null,
        expenseDate: '',
        expenseDescription: '',
        expenseAmount: '',
        expenseAttachment: null,
        medicalDate: '',
        medicalDescription: '',
        medicalAmount: '',
        medicalAttachment: null,
        mileageDate: '',
        startLocation: '',
        endLocation: '',
        mileageKm: '',
        mileageAttachment: null,
      },
      allowanceItems: claims
        .filter((claim) => claim.type === 'Allowance')
        .map((claim) => normalizeEditableClaim(claim)),
      expenseItems: [],
      mileageItems: [],
      medicalItems: [],
    }
  }

  if (draft) {
    return createStateFromDraft(draft, salaryMonth)
  }

  return {
    formData: {
      salaryMonth,
      basicSalary: '',
      mileageRate: '',
      allowanceDate: '',
      allowanceDescription: '',
      allowanceAmount: '',
      allowanceAttachment: null,
      expenseDate: '',
      expenseDescription: '',
      expenseAmount: '',
      expenseAttachment: null,
      medicalDate: '',
      medicalDescription: '',
      medicalAmount: '',
      medicalAttachment: null,
      mileageDate: '',
      startLocation: '',
      endLocation: '',
      mileageKm: '',
      mileageAttachment: null,
    },
    allowanceItems: [],
    expenseItems: [],
    mileageItems: [],
    medicalItems: [],
  }
}

const createEmptyClaimFields = () => ({
  allowanceDate: '',
  allowanceDescription: '',
  allowanceAmount: '',
  allowanceAttachment: null,
  expenseDate: '',
  expenseDescription: '',
  expenseAmount: '',
  expenseAttachment: null,
  medicalDate: '',
  medicalDescription: '',
  medicalAmount: '',
  medicalAttachment: null,
  mileageDate: '',
  startLocation: '',
  endLocation: '',
  mileageKm: '',
  mileageAttachment: null,
})

const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const toPositiveNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

const createAttachmentProcessingState = () => ({
  allowance: false,
  expense: false,
  medical: false,
  mileage: false,
})

const serializeAttachment = (attachment) => {
  if (!attachment) return null

  return {
    id: attachment.id,
    name: attachment.name,
    size: attachment.size,
    type: attachment.type,
    url: attachment.url,
    downloadUrl: attachment.downloadUrl,
    dataUrl: attachment.dataUrl,
    originalName: attachment.originalName,
    originalSize: attachment.originalSize,
    compressed: attachment.compressed,
    file: attachment.file,
  }
}

const createApplicationDraftPayload = ({ formData, allowanceItems }) => ({
  formData: {
    salaryMonth: formData.salaryMonth,
    basicSalary: formData.basicSalary,
    mileageRate: formData.mileageRate,
    allowanceDate: formData.allowanceDate,
    allowanceDescription: formData.allowanceDescription,
    allowanceAmount: formData.allowanceAmount,
    allowanceAttachment: null,
  },
  allowanceItems: allowanceItems
    .filter((item) => item.source !== 'profile')
    .map(serializeDraftItem),
  expenseItems: [],
  mileageItems: [],
  medicalItems: [],
})

const draftHasContent = (draft) => {
  if (!draft) return false

  const hasItems = ['allowanceItems'].some(
    (key) => Array.isArray(draft[key]) && draft[key].length > 0,
  )
  if (hasItems) return true

  const fields = draft.formData || {}
  return [fields.allowanceDate, fields.allowanceDescription, fields.allowanceAmount].some(Boolean)
}

const mapClaimItems = (items = [], type) =>
  items.map((item) => ({
    id: item.id,
    type,
    date: item.date,
    description: item.description,
    amount: item.amount,
    meta: item.km
      ? `${item.km} KM one-way / ${roundMoney(item.km * 2)} KM return`
      : item.sourceLabel || '',
    km: item.km,
    startLocation: item.startLocation,
    endLocation: item.endLocation,
    source: item.source,
    sourceLabel: item.sourceLabel,
    attachment: serializeAttachment(item.attachment),
  }))

const isCompleteDraftClaim = (claim) => {
  if (!claim?.id || !claim?.type || !claim?.description?.trim()) return false
  if (claim.type === 'Mileage') {
    return Boolean(
      claim.date &&
        claim.startLocation?.trim() &&
        claim.endLocation?.trim() &&
        Number(claim.km || 0) > 0,
    )
  }

  return Number(claim.amount || 0) > 0
}

const parseMileageDescription = (description = '') => {
  const [startLocation = '', endLocation = ''] = description.split(' to ')

  return {
    startLocation,
    endLocation,
  }
}

export const useApplySalaryHandlers = ({
  onNotify,
  onSubmitted,
  initialRecord,
  amendmentReason = '',
} = {}) => {
  const initialDraftRef = useRef(null)
  const [initialSalaryState] = useState(() => {
    const salaryMonth = initialRecord?.salaryMonthValue || getCurrentSalaryMonth()
    const draft = initialRecord ? null : readSalaryApplicationDraft({ salaryMonth })
    initialDraftRef.current = draft
    return createInitialSalaryState(initialRecord, draft)
  })
  const [formData, setFormData] = useState(initialSalaryState.formData)
  const [salaryProfile, setSalaryProfile] = useState(null)
  const [salaryRecords, setSalaryRecords] = useState([])
  const [allowanceItems, setAllowanceItems] = useState(initialSalaryState.allowanceItems)
  const [expenseItems, setExpenseItems] = useState(initialSalaryState.expenseItems)
  const [mileageItems, setMileageItems] = useState(initialSalaryState.mileageItems)
  const [medicalItems, setMedicalItems] = useState(initialSalaryState.medicalItems)
  const [editingClaim, setEditingClaim] = useState(null)
  const [activeRecordId, setActiveRecordId] = useState(initialRecord?.id || null)
  const activeRecordVersionRef = useRef(Number(initialRecord?.recordVersion || 0) || null)
  const [attachmentInputVersion, setAttachmentInputVersion] = useState(0)
  const [attachmentProcessing, setAttachmentProcessing] = useState(createAttachmentProcessingState)
  const attachmentProcessingRef = useRef(createAttachmentProcessingState())
  const initialRecordRef = useRef(initialRecord)
  const isInitialDraftRecordRef = useRef(initialRecord?.status === 'Draft')
  const initialSalaryMonthRef = useRef(initialSalaryState.formData.salaryMonth)
  const draftSaveTimerRef = useRef(null)
  const hasSubmittedRef = useRef(false)
  const amendmentReasonRef = useRef(String(amendmentReason || '').trim())
  const hasPersistedDraftRef = useRef(
    Boolean(initialDraftRef.current || isInitialDraftRecordRef.current),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(!initialRecord)
  const [isSwitchingSalaryMonth, setIsSwitchingSalaryMonth] = useState(false)
  const [draftSaveState, setDraftSaveState] = useState(
    initialDraftRef.current ? 'restored' : 'idle',
  )
  const [draftSaveError, setDraftSaveError] = useState('')

  const notify = useCallback(
    (type, message, options = {}) => {
      onNotify?.(type, message, options)
    },
    [onNotify],
  )

  useEffect(() => {
    let isMounted = true

    Promise.all([
      fetchSalaryProfile(),
      getSalaryRecords().catch(() => []),
      initialRecordRef.current
        ? Promise.resolve(null)
        : fetchSalaryApplicationDraft(initialSalaryMonthRef.current).catch(() => null),
    ])
      .then(([profile, records, serverDraft]) => {
        if (!isMounted) return
        const serverDraftPayload = serverDraft?.draftPayload
        const shouldUseServerDraft =
          !initialRecordRef.current &&
          !initialDraftRef.current &&
          serverDraftPayload &&
          typeof serverDraftPayload === 'object' &&
          !Array.isArray(serverDraftPayload)
        const restoredDraftState = shouldUseServerDraft
          ? createStateFromDraft(serverDraftPayload, initialSalaryMonthRef.current)
          : null
        const activeSalaryMonth =
          restoredDraftState?.formData?.salaryMonth || initialSalaryMonthRef.current

        if (serverDraft) {
          hasPersistedDraftRef.current = true
          activeRecordVersionRef.current = Number(serverDraft.recordVersion || 0) || null
          if (shouldUseServerDraft) {
            setDraftSaveState('restored')
          }
        }

        setSalaryProfile(profile)
        setSalaryRecords(records)
        setFormData((prev) => ({
          ...prev,
          ...(restoredDraftState?.formData || {}),
          basicSalary: initialRecordRef.current
            ? prev.basicSalary
            : restoredDraftState?.formData?.basicSalary || profile.basicSalary,
          mileageRate: restoredDraftState?.formData?.mileageRate || profile.defaultMileageRate,
        }))
        if (initialRecordRef.current && !isInitialDraftRecordRef.current) return

        if (restoredDraftState) {
          setExpenseItems(restoredDraftState.expenseItems)
          setMileageItems(restoredDraftState.mileageItems)
          setMedicalItems(restoredDraftState.medicalItems)
        }

        setAllowanceItems((prev) => {
          const manualAllowanceItems = restoredDraftState
            ? restoredDraftState.allowanceItems
            : prev.filter((item) => item.source !== 'profile')

          return [
            ...manualAllowanceItems,
            ...getActiveRecurringAllowances(profile, activeSalaryMonth),
          ]
        })
      })
      .catch((err) => {
        if (!isMounted) return
        notify('error', err?.message || 'Could not load salary settings.', {
          scope: 'validation',
        })
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false)
      })

    return () => {
      isMounted = false
      if (draftSaveTimerRef.current) {
        window.clearTimeout(draftSaveTimerRef.current)
      }
    }
  }, [notify])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === 'salaryMonth') {
      setAllowanceItems((prev) => [
        ...prev.filter((item) => item.source !== 'profile'),
        ...(salaryProfile ? getActiveRecurringAllowances(salaryProfile, value) : []),
      ])
    }
  }

  const resetAttachmentInputs = () => {
    setAttachmentInputVersion((prev) => prev + 1)
  }

  const setAttachmentProcessingForType = (type, isProcessing) => {
    attachmentProcessingRef.current = {
      ...attachmentProcessingRef.current,
      [type]: isProcessing,
    }
    setAttachmentProcessing(attachmentProcessingRef.current)
  }

  const resetAttachmentProcessing = () => {
    attachmentProcessingRef.current = createAttachmentProcessingState()
    setAttachmentProcessing(attachmentProcessingRef.current)
  }

  const applyCleanMonthState = useCallback(
    (salaryMonth) => {
      initialRecordRef.current = null
      isInitialDraftRecordRef.current = false
      setActiveRecordId(null)
      activeRecordVersionRef.current = null
      setFormData({
        salaryMonth,
        basicSalary: salaryProfile?.basicSalary || '',
        mileageRate: salaryProfile?.defaultMileageRate || '',
        ...createEmptyClaimFields(),
      })
      setAllowanceItems(
        salaryProfile ? getActiveRecurringAllowances(salaryProfile, salaryMonth) : [],
      )
      setExpenseItems([])
      setMileageItems([])
      setMedicalItems([])
      setEditingClaim(null)
      resetAttachmentProcessing()
      resetAttachmentInputs()
      hasPersistedDraftRef.current = false
      setDraftSaveError('')
      setDraftSaveState('idle')
    },
    [salaryProfile],
  )

  const applyDraftMonthState = useCallback(
    (salaryMonth, draftState, recordId = null, recordVersion = null) => {
      initialRecordRef.current = null
      isInitialDraftRecordRef.current = Boolean(recordId)
      setActiveRecordId(recordId)
      activeRecordVersionRef.current = Number(recordVersion || 0) || null
      setFormData({
        salaryMonth,
        basicSalary: draftState?.formData?.basicSalary || salaryProfile?.basicSalary || '',
        mileageRate: draftState?.formData?.mileageRate || salaryProfile?.defaultMileageRate || '',
        ...createEmptyClaimFields(),
        ...(draftState?.formData || {}),
      })
      setAllowanceItems([
        ...(draftState?.allowanceItems || []).filter((item) => item.source !== 'profile'),
        ...(salaryProfile ? getActiveRecurringAllowances(salaryProfile, salaryMonth) : []),
      ])
      setExpenseItems(draftState?.expenseItems || [])
      setMileageItems(draftState?.mileageItems || [])
      setMedicalItems(draftState?.medicalItems || [])
      setEditingClaim(null)
      resetAttachmentProcessing()
      resetAttachmentInputs()
      hasPersistedDraftRef.current = true
      setDraftSaveError('')
      setDraftSaveState('restored')
    },
    [salaryProfile],
  )

  const applyRecordMonthState = useCallback(
    (record) => {
      if (!record) return
      const recordState = createInitialSalaryState(record)
      initialRecordRef.current = record
      isInitialDraftRecordRef.current = record.status === 'Draft'
      setActiveRecordId(record.id || null)
      activeRecordVersionRef.current = Number(record.recordVersion || 0) || null
      setFormData({
        ...recordState.formData,
        mileageRate: recordState.formData.mileageRate || salaryProfile?.defaultMileageRate || '',
      })
      setAllowanceItems(recordState.allowanceItems)
      setExpenseItems(recordState.expenseItems)
      setMileageItems(recordState.mileageItems)
      setMedicalItems(recordState.medicalItems)
      setEditingClaim(null)
      resetAttachmentProcessing()
      resetAttachmentInputs()
      hasPersistedDraftRef.current = record.status === 'Draft'
      setDraftSaveError('')
      setDraftSaveState(record.status === 'Draft' ? 'restored' : 'idle')
    },
    [salaryProfile?.defaultMileageRate],
  )

  const loadDraftForSalaryMonth = useCallback(
    async (salaryMonth) => {
      const serverDraft = await fetchSalaryApplicationDraft(salaryMonth).catch(() => null)
      const serverDraftState = serverDraft?.draftPayload
        ? createStateFromDraft(serverDraft.draftPayload, salaryMonth)
        : serverDraft?.status === 'Draft'
          ? createInitialSalaryState(serverDraft)
          : null

      if (serverDraftState) {
        applyDraftMonthState(
          salaryMonth,
          serverDraftState,
          serverDraft?.id || null,
          serverDraft?.recordVersion || null,
        )
        return true
      }

      const localDraft = readSalaryApplicationDraft({ salaryMonth })
      if (localDraft) {
        applyDraftMonthState(salaryMonth, createStateFromDraft(localDraft, salaryMonth), null)
        return true
      }

      return false
    },
    [applyDraftMonthState],
  )

  const handleSalaryMonthSelect = useCallback(
    async (salaryMonth) => {
      if (!salaryMonth || salaryMonth === formData.salaryMonth || isSwitchingSalaryMonth) return
      setIsSwitchingSalaryMonth(true)
      try {
        const monthRecord = salaryRecords.find((record) => record.salaryMonthValue === salaryMonth)
        const monthStatus = monthRecord?.status || ''

        if (monthRecord && staffLockedStatuses.has(monthStatus)) {
          const detailedRecord = monthRecord.id
            ? await findSalaryRecord(monthRecord.id).catch(() => null)
            : null
          applyRecordMonthState(detailedRecord || monthRecord)
          return
        }

        const hasDraft = await loadDraftForSalaryMonth(salaryMonth)
        if (!hasDraft) {
          applyCleanMonthState(salaryMonth)
        }
      } finally {
        setIsSwitchingSalaryMonth(false)
      }
    },
    [
      applyCleanMonthState,
      applyRecordMonthState,
      formData.salaryMonth,
      isSwitchingSalaryMonth,
      loadDraftForSalaryMonth,
      salaryRecords,
    ],
  )

  const resumeSelectedMonthDraft = useCallback(async () => {
    const salaryMonth = formData.salaryMonth || getCurrentSalaryMonth()
    setIsSwitchingSalaryMonth(true)
    try {
      const hasDraft = await loadDraftForSalaryMonth(salaryMonth)
      if (!hasDraft) {
        applyCleanMonthState(salaryMonth)
      }
    } finally {
      setIsSwitchingSalaryMonth(false)
    }
  }, [applyCleanMonthState, formData.salaryMonth, loadDraftForSalaryMonth])

  const editSelectedMonthRecord = useCallback(async () => {
    const monthRecord = salaryRecords.find(
      (record) => record.salaryMonthValue === formData.salaryMonth,
    )
    if (!monthRecord?.id) return
    setIsSwitchingSalaryMonth(true)
    try {
      const detailedRecord = await findSalaryRecord(monthRecord.id)
      applyRecordMonthState(detailedRecord || monthRecord)
    } catch (err) {
      notify('error', err?.message || 'Could not load salary application.', {
        scope: 'validation',
      })
    } finally {
      setIsSwitchingSalaryMonth(false)
    }
  }, [applyRecordMonthState, formData.salaryMonth, notify, salaryRecords])

  const handleAttachmentChange = async (type, file) => {
    const fieldByType = {
      allowance: 'allowanceAttachment',
      expense: 'expenseAttachment',
      medical: 'medicalAttachment',
      mileage: 'mileageAttachment',
    }
    const field = fieldByType[type]
    if (!field) return

    if (!file) {
      setFormData((prev) => ({ ...prev, [field]: null }))
      setAttachmentProcessingForType(type, false)
      return
    }

    setAttachmentProcessingForType(type, true)

    try {
      const attachment = await prepareSalaryAttachment(file)
      setFormData((prev) => ({ ...prev, [field]: attachment }))

      if (attachment.compressed) {
        notify(
          'info',
          `Compressed ${attachment.originalName} from ${formatAttachmentSize(
            attachment.originalSize,
          )} to ${formatAttachmentSize(attachment.size)}.`,
          { scope: 'validation' },
        )
      }
    } catch (err) {
      resetAttachmentInputs()
      notify('warning', err?.message || 'Could not attach that file.', {
        scope: 'validation',
      })
    } finally {
      setAttachmentProcessingForType(type, false)
    }
  }

  const addAllowance = () => {
    if (attachmentProcessingRef.current.allowance) return false

    const amount = toPositiveNumber(formData.allowanceAmount)
    if (!formData.allowanceDate || !formData.allowanceDescription.trim() || !amount) {
      notify('warning', 'Enter allowance date, description, and a valid amount.', {
        scope: 'validation',
      })
      return false
    }

    const nextItem = {
      id: editingClaim?.type === 'allowance' ? editingClaim.id : buildId(),
      date: formData.allowanceDate,
      description: formData.allowanceDescription.trim(),
      amount: roundMoney(amount),
      source: 'manual',
      sourceLabel: 'Manual adjustment',
      attachment: formData.allowanceAttachment,
    }
    setAllowanceItems((prev) =>
      editingClaim?.type === 'allowance'
        ? prev.map((item) => (item.id === editingClaim.id ? nextItem : item))
        : [...prev, nextItem],
    )
    setFormData((prev) => ({
      ...prev,
      allowanceDate: '',
      allowanceDescription: '',
      allowanceAmount: '',
      allowanceAttachment: null,
    }))
    setEditingClaim(null)
    resetAttachmentInputs()
    return true
  }

  const addExpense = () => {
    if (attachmentProcessingRef.current.expense) return false

    const amount = toPositiveNumber(formData.expenseAmount)
    if (!formData.expenseDate || !formData.expenseDescription.trim() || !amount) {
      notify('warning', 'Enter expense date, description, and a valid amount.', {
        scope: 'validation',
      })
      return false
    }
    if (!formData.expenseAttachment) {
      notify('warning', 'Attach the expense receipt before saving.', {
        scope: 'validation',
      })
      return false
    }

    const nextItem = {
      id: editingClaim?.type === 'expense' ? editingClaim.id : buildId(),
      date: formData.expenseDate,
      description: formData.expenseDescription.trim(),
      amount: roundMoney(amount),
      attachment: formData.expenseAttachment,
    }
    setExpenseItems((prev) =>
      editingClaim?.type === 'expense'
        ? prev.map((item) => (item.id === editingClaim.id ? nextItem : item))
        : [...prev, nextItem],
    )
    setFormData((prev) => ({
      ...prev,
      expenseDate: '',
      expenseDescription: '',
      expenseAmount: '',
      expenseAttachment: null,
    }))
    setEditingClaim(null)
    resetAttachmentInputs()
    return true
  }

  const addMedical = () => {
    if (attachmentProcessingRef.current.medical) return false

    const amount = toPositiveNumber(formData.medicalAmount)
    if (!formData.medicalDate || !formData.medicalDescription.trim() || !amount) {
      notify('warning', 'Enter medical date, description, and a valid amount.', {
        scope: 'validation',
      })
      return false
    }
    if (!formData.medicalAttachment) {
      notify('warning', 'Attach the medical receipt before saving.', {
        scope: 'validation',
      })
      return false
    }

    const nextItem = {
      id: editingClaim?.type === 'medical' ? editingClaim.id : buildId(),
      date: formData.medicalDate,
      description: formData.medicalDescription.trim(),
      amount: roundMoney(amount),
      attachment: formData.medicalAttachment,
    }
    setMedicalItems((prev) =>
      editingClaim?.type === 'medical'
        ? prev.map((item) => (item.id === editingClaim.id ? nextItem : item))
        : [...prev, nextItem],
    )
    setFormData((prev) => ({
      ...prev,
      medicalDate: '',
      medicalDescription: '',
      medicalAmount: '',
      medicalAttachment: null,
    }))
    setEditingClaim(null)
    resetAttachmentInputs()
    return true
  }

  const addMileage = () => {
    const km = toPositiveNumber(formData.mileageKm)
    if (
      !formData.mileageDate ||
      !formData.startLocation.trim() ||
      !formData.endLocation.trim() ||
      !km
    ) {
      notify('warning', 'Enter mileage date, route, and valid one-way KM.', {
        scope: 'validation',
      })
      return false
    }

    const startLocation = formData.startLocation.trim()
    const endLocation = formData.endLocation.trim()
    const nextItem = {
      id: editingClaim?.type === 'mileage' ? editingClaim.id : buildId(),
      date: formData.mileageDate,
      description: `${startLocation} to ${endLocation}`,
      startLocation,
      endLocation,
      km: roundMoney(km),
      amount: calculateMileageAmount(km, formData.mileageRate),
      attachment: null,
    }
    setMileageItems((prev) =>
      editingClaim?.type === 'mileage'
        ? prev.map((item) => (item.id === editingClaim.id ? nextItem : item))
        : [...prev, nextItem],
    )
    setFormData((prev) => ({
      ...prev,
      mileageDate: '',
      startLocation: '',
      endLocation: '',
      mileageKm: '',
      mileageAttachment: null,
    }))
    setEditingClaim(null)
    resetAttachmentInputs()
    return true
  }

  const removeClaimItem = (type, id) => {
    const setters = {
      allowance: setAllowanceItems,
      expense: setExpenseItems,
      medical: setMedicalItems,
      mileage: setMileageItems,
    }
    setters[type]?.((prev) => prev.filter((item) => item.id !== id))
    if (editingClaim?.type === type && editingClaim.id === id) {
      setEditingClaim(null)
      setFormData((prev) => ({
        ...prev,
        ...createEmptyClaimFields(),
      }))
      resetAttachmentInputs()
    }
  }

  const startEditClaimItem = (type, id) => {
    const itemsByType = {
      allowance: allowanceItems,
      expense: expenseItems,
      medical: medicalItems,
      mileage: mileageItems,
    }
    const item = itemsByType[type]?.find((claimItem) => claimItem.id === id)
    if (!item || item.source === 'profile') return false

    setEditingClaim({ type, id })
    if (type === 'allowance') {
      setFormData((prev) => ({
        ...prev,
        allowanceDate: item.date || '',
        allowanceDescription: item.description || '',
        allowanceAmount: String(item.amount ?? ''),
        allowanceAttachment: item.attachment || null,
      }))
    } else if (type === 'expense') {
      setFormData((prev) => ({
        ...prev,
        expenseDate: item.date || '',
        expenseDescription: item.description || '',
        expenseAmount: String(item.amount ?? ''),
        expenseAttachment: item.attachment || null,
      }))
    } else if (type === 'medical') {
      setFormData((prev) => ({
        ...prev,
        medicalDate: item.date || '',
        medicalDescription: item.description || '',
        medicalAmount: String(item.amount ?? ''),
        medicalAttachment: item.attachment || null,
      }))
    } else if (type === 'mileage') {
      const locations = parseMileageDescription(item.description)
      setFormData((prev) => ({
        ...prev,
        mileageDate: item.date || '',
        startLocation: item.startLocation || locations.startLocation,
        endLocation: item.endLocation || locations.endLocation,
        mileageKm: String(item.km ?? ''),
        mileageAttachment: null,
      }))
    }
    resetAttachmentInputs()
    return true
  }

  const cancelEditClaim = () => {
    setEditingClaim(null)
    setFormData((prev) => ({
      ...prev,
      ...createEmptyClaimFields(),
    }))
    resetAttachmentProcessing()
    resetAttachmentInputs()
  }

  const summary = useMemo(
    () =>
      calculateSalarySummary({
        basicSalary: formData.basicSalary,
        allowanceItems,
        expenseItems,
        mileageItems,
        medicalItems,
      }),
    [allowanceItems, expenseItems, formData.basicSalary, medicalItems, mileageItems],
  )

  const selectedMonthRecord = useMemo(
    () => salaryRecords.find((record) => record.salaryMonthValue === formData.salaryMonth) || null,
    [formData.salaryMonth, salaryRecords],
  )
  const selectedMonthStatus = selectedMonthRecord?.status || ''
  const isSelectedMonthLocked = staffLockedStatuses.has(selectedMonthStatus)
  const isEditingReviewedMonthWithReason = Boolean(
    activeRecordId &&
      selectedMonthRecord?.id === activeRecordId &&
      ['Checked', 'Approved'].includes(selectedMonthStatus) &&
      amendmentReasonRef.current,
  )
  const requiresExistingRecordEdit = Boolean(
    selectedMonthRecord &&
      selectedMonthStatus !== 'Draft' &&
      staffMutableStatuses.has(selectedMonthStatus) &&
      activeRecordId !== selectedMonthRecord.id,
  )

  useEffect(() => {
    if (
      isLoadingProfile ||
      isSwitchingSalaryMonth ||
      !selectedMonthRecord?.id ||
      !isSelectedMonthLocked ||
      activeRecordId === selectedMonthRecord.id
    ) {
      return undefined
    }

    let isMounted = true
    setIsSwitchingSalaryMonth(true)
    findSalaryRecord(selectedMonthRecord.id)
      .then((record) => {
        if (isMounted) applyRecordMonthState(record || selectedMonthRecord)
      })
      .catch(() => {
        if (isMounted) applyRecordMonthState(selectedMonthRecord)
      })
      .finally(() => {
        if (isMounted) setIsSwitchingSalaryMonth(false)
      })

    return () => {
      isMounted = false
    }
  }, [
    activeRecordId,
    applyRecordMonthState,
    isLoadingProfile,
    isSelectedMonthLocked,
    isSwitchingSalaryMonth,
    selectedMonthRecord,
  ])

  const applicationDraftPayload = useMemo(
    () =>
      createApplicationDraftPayload({
        formData,
        allowanceItems,
        expenseItems,
        mileageItems,
        medicalItems,
      }),
    [allowanceItems, expenseItems, formData, medicalItems, mileageItems],
  )

  const hasApplicationDraftContent = useMemo(
    () => draftHasContent(applicationDraftPayload),
    [applicationDraftPayload],
  )

  useEffect(() => {
    if (
      (initialRecordRef.current && !isInitialDraftRecordRef.current) ||
      hasSubmittedRef.current ||
      isLoadingProfile ||
      isSubmitting ||
      isSwitchingSalaryMonth ||
      (isSelectedMonthLocked && !isEditingReviewedMonthWithReason) ||
      requiresExistingRecordEdit
    )
      return undefined

    const salaryMonth = applicationDraftPayload.formData.salaryMonth || getCurrentSalaryMonth()
    if (draftSaveTimerRef.current) {
      window.clearTimeout(draftSaveTimerRef.current)
    }

    if (!hasApplicationDraftContent) {
      clearSalaryApplicationDraft({ salaryMonth })
      if (hasPersistedDraftRef.current) {
        draftSaveTimerRef.current = window.setTimeout(() => {
          clearSalaryApplicationServerDraft(salaryMonth)
            .then(() => {
              hasPersistedDraftRef.current = false
              setDraftSaveError('')
              setDraftSaveState('idle')
            })
            .catch((error) => {
              setDraftSaveError(error?.message || 'Could not clear the server draft.')
              setDraftSaveState('error')
            })
        }, 800)
      } else {
        setDraftSaveState('idle')
      }
      return () => {
        if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
      }
    }

    writeSalaryApplicationDraft({ salaryMonth, draft: applicationDraftPayload })
    setDraftSaveError('')
    setDraftSaveState('dirty')
    draftSaveTimerRef.current = window.setTimeout(() => {
      setDraftSaveState('saving')
      saveSalaryApplicationDraft({
        salaryMonthValue: salaryMonth,
        recordVersion: activeRecordVersionRef.current,
        basicSalary: summary.basicSalary,
        claims: mapClaimItems(allowanceItems, 'Allowance').filter(isCompleteDraftClaim),
        draftPayload: applicationDraftPayload,
      })
        .then((savedDraft) => {
          activeRecordVersionRef.current = Number(savedDraft?.recordVersion || 0) || null
          hasPersistedDraftRef.current = true
          setDraftSaveError('')
          setDraftSaveState('saved')
        })
        .catch((error) => {
          setDraftSaveError(error?.message || 'Could not sync the draft to the server.')
          setDraftSaveState('error')
        })
    }, 1200)

    return () => {
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
    }
  }, [
    allowanceItems,
    applicationDraftPayload,
    expenseItems,
    hasApplicationDraftContent,
    isLoadingProfile,
    isSubmitting,
    isSelectedMonthLocked,
    isEditingReviewedMonthWithReason,
    isSwitchingSalaryMonth,
    medicalItems,
    mileageItems,
    requiresExistingRecordEdit,
    summary.basicSalary,
  ])

  const medicalBalance = useMemo(() => {
    const yearlyLimit = roundMoney(salaryProfile?.yearlyMedicalClaim || 0)
    const selectedMonth = formData.salaryMonth || getCurrentSalaryMonth()
    const selectedYear = selectedMonth.slice(0, 4)
    const usedThisYear = roundMoney(
      salaryRecords.reduce((total, record) => {
        if (!record?.salaryMonthValue?.startsWith(`${selectedYear}-`)) return total
        if (record.salaryMonthValue === selectedMonth) return total
        if (['Draft', 'Rejected'].includes(record.status)) return total

        return total + Number(record.medicalClaimsTotal || 0)
      }, 0),
    )
    const current = roundMoney(Math.max(0, yearlyLimit - usedThisYear))
    const afterClaim = roundMoney(current - summary.totalMedical)

    return {
      yearlyLimit,
      usedThisYear,
      current,
      afterClaim,
    }
  }, [formData.salaryMonth, salaryProfile?.yearlyMedicalClaim, salaryRecords, summary.totalMedical])

  const resetForm = () => {
    const salaryMonth = getCurrentSalaryMonth()
    const previousSalaryMonth = formData.salaryMonth || salaryMonth
    initialRecordRef.current = null
    isInitialDraftRecordRef.current = false
    hasSubmittedRef.current = false
    clearSalaryApplicationDraft({ salaryMonth: previousSalaryMonth })
    clearSalaryApplicationServerDraft(previousSalaryMonth)
      .then(() => {
        hasPersistedDraftRef.current = false
        setDraftSaveError('')
        setDraftSaveState('idle')
      })
      .catch((error) => {
        setDraftSaveError(error?.message || 'Could not clear the server draft.')
        setDraftSaveState('error')
      })
    setFormData({
      salaryMonth,
      basicSalary: salaryProfile?.basicSalary || '',
      mileageRate: salaryProfile?.defaultMileageRate || '',
      ...createEmptyClaimFields(),
    })
    setAllowanceItems(salaryProfile ? getActiveRecurringAllowances(salaryProfile, salaryMonth) : [])
    setExpenseItems([])
    setMileageItems([])
    setMedicalItems([])
    setEditingClaim(null)
    setActiveRecordId(null)
    activeRecordVersionRef.current = null
    resetAttachmentProcessing()
    resetAttachmentInputs()
  }

  const resetClaimDrafts = () => {
    setFormData((prev) => ({
      ...prev,
      ...createEmptyClaimFields(),
    }))
    setEditingClaim(null)
    resetAttachmentProcessing()
    resetAttachmentInputs()
  }

  const retryDraftSync = async () => {
    if (draftSaveState !== 'error') return

    const salaryMonth = applicationDraftPayload.formData.salaryMonth || getCurrentSalaryMonth()
    setDraftSaveError('')
    setDraftSaveState('saving')
    try {
      const savedDraft = await saveSalaryApplicationDraft({
        salaryMonthValue: salaryMonth,
        recordVersion: activeRecordVersionRef.current,
        basicSalary: summary.basicSalary,
        claims: mapClaimItems(allowanceItems, 'Allowance').filter(isCompleteDraftClaim),
        draftPayload: applicationDraftPayload,
      })
      activeRecordVersionRef.current = Number(savedDraft?.recordVersion || 0) || null
      hasPersistedDraftRef.current = true
      setDraftSaveState('saved')
    } catch (error) {
      setDraftSaveError(error?.message || 'Could not sync the draft to the server.')
      setDraftSaveState('error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!formData.salaryMonth) {
      notify('warning', 'Select a salary month.', { scope: 'validation' })
      return
    }

    if (selectedMonthStatus === 'Paid') {
      notify('warning', 'Paid salary records cannot be changed.', {
        scope: 'validation',
      })
      return
    }

    if (isSelectedMonthLocked && !isEditingReviewedMonthWithReason) {
      notify('warning', 'This salary month is locked after review and cannot be changed.', {
        scope: 'validation',
      })
      return
    }

    if (requiresExistingRecordEdit) {
      notify('warning', 'Edit the existing salary application before submitting this month.', {
        scope: 'validation',
      })
      return
    }

    if (toPositiveNumber(formData.basicSalary) <= 0) {
      notify('warning', 'Enter a valid basic salary.', { scope: 'validation' })
      return
    }

    try {
      setIsSubmitting(true)
      const savedRecord = await saveSalaryRecord({
        id: `salary-${formData.salaryMonth}`,
        salaryMonth: formatSalaryMonth(formData.salaryMonth),
        salaryMonthValue: formData.salaryMonth,
        basicSalary: summary.basicSalary,
        claimsTotal: summary.claimsTotal,
        employeeDeductions: summary.deductions.employeeTotal,
        payableSalary: summary.payableSalary,
        status: 'Submitted',
        claims: mapClaimItems(allowanceItems, 'Allowance'),
        deductions: summary.deductions,
        submittedAt: new Date().toISOString(),
        amendmentReason: amendmentReasonRef.current,
        recordVersion: activeRecordVersionRef.current,
      })
      hasSubmittedRef.current = true
      if (draftSaveTimerRef.current) {
        window.clearTimeout(draftSaveTimerRef.current)
      }
      setSalaryRecords((prev) => {
        const nextRecords = prev.filter(
          (record) =>
            record.id !== savedRecord.id &&
            record.salaryMonthValue !== savedRecord.salaryMonthValue,
        )

        return [savedRecord, ...nextRecords]
      })
      setActiveRecordId(savedRecord.id || null)
      activeRecordVersionRef.current = Number(savedRecord.recordVersion || 0) || null
      await Promise.resolve()
      if (savedRecord.mailStatus === 'digest') {
        notify(
          'success',
          savedRecord.mailMessage ||
            'Salary application was submitted for review. Reviewers will receive the daily pending-work digest when applicable.',
          { scope: 'submission-success' },
        )
      } else if (savedRecord.mailSent === true) {
        notify('success', 'Salary application was submitted for review.', {
          scope: 'submission-success',
        })
      } else {
        notify(
          'warning',
          savedRecord.mailMessage ||
            'Salary application was submitted, but workflow notification delivery could not be confirmed.',
          { scope: 'submission-success' },
        )
      }
      clearSalaryApplicationDraft({ salaryMonth: formData.salaryMonth })
      clearSalaryApplicationServerDraft(formData.salaryMonth).catch(() => {})
      hasPersistedDraftRef.current = false
      setDraftSaveError('')
      setDraftSaveState('idle')
      await onSubmitted?.(savedRecord)
    } catch (err) {
      const message =
        err?.status === 422 && /review|approval|cannot be replaced/i.test(err?.message || '')
          ? 'This salary month is locked after review and cannot be changed.'
          : err?.message || 'Could not submit salary application.'
      notify('error', message, {
        scope: 'submission-error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    formData,
    allowanceItems,
    expenseItems,
    mileageItems,
    medicalItems,
    attachmentInputVersion,
    attachmentProcessing,
    editingClaim,
    summary,
    medicalBalance,
    draftSaveState,
    draftSaveError,
    retryDraftSync,
    isSubmitting,
    isLoadingProfile,
    isSwitchingSalaryMonth,
    selectedMonthRecord,
    isSelectedMonthLocked: isSelectedMonthLocked && !isEditingReviewedMonthWithReason,
    requiresExistingRecordEdit,
    handleChange,
    handleSalaryMonthSelect,
    resumeSelectedMonthDraft,
    editSelectedMonthRecord,
    handleAttachmentChange,
    addAllowance,
    addExpense,
    addMileage,
    addMedical,
    removeClaimItem,
    startEditClaimItem,
    cancelEditClaim,
    resetForm,
    resetClaimDrafts,
    handleSubmit,
  }
}
