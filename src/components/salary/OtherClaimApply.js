import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CAlert, CButton, CCardBody, CCardHeader, CForm, CSpinner } from '@coreui/react'
import { DataTableLoadingState } from '../datatable'
import { prepareSalaryAttachment } from './attachmentUtils'
import MoneyClaimEditor from './other-claim/editors/MoneyClaimEditor'
import TravelClaimEditor from './other-claim/editors/TravelClaimEditor'
import {
  clearOtherClaimDraft,
  readOtherClaimDraft,
  writeOtherClaimDraft,
} from './otherClaimDraftStorage'
import {
  clearOtherClaimServerDraft,
  fetchOtherClaimDraft,
  formatClaimMonth,
  saveOtherClaimDraft,
  saveOtherClaimRecord,
} from './otherClaimRecordStorage'
import { fetchSalaryProfile } from './salaryProfileStorage'
import { calculateMileageAmount, roundMoney } from './salaryCalculations'
import {
  buildClaimId,
  claimTravelCategory,
  createAttachmentProcessingState,
  createDraftPayload,
  createEmptyClaimFields,
  draftHasContent,
  firstClaimType,
  getClaimAttachments,
  getCurrentClaimMonth,
  isCompleteClaim,
  mapClaimItems,
  otherClaimTypes,
  stateFromDraft,
  stateFromRecord,
  toPositiveNumber,
} from './other-claim/model/otherClaimModel'
import OtherClaimSummary from './other-claim/OtherClaimSummary'
import { listActiveProjectOptions } from '../../views/project/manage/projectApi'

const normalizeProjectOption = (project = {}) => {
  const value = String(
    project.id ??
      project.value ??
      project.projectId ??
      project.project_id ??
      project.projectID ??
      '',
  ).trim()
  const label = String(
    project.projectName ?? project.project_name ?? project.label ?? project.name ?? '',
  ).trim()
  const clientName = String(
    project.clientName ?? project.client_name ?? project.clientNameDisplay ?? '',
  ).trim()

  if (!value || !label) return null

  return {
    value,
    label: clientName ? `${label} (${clientName})` : label,
    projectName: label,
    clientName,
  }
}

// Attachment urls carry the row id and the binary never round-trips, so neither can
// take part in the comparison that decides whether local state actually changed.
const canonicalVolatileKeys = new Set(['url', 'downloadUrl', 'file', 'dataUrl'])

const canonicalComparable = (value) =>
  JSON.stringify(value, (key, nested) => (canonicalVolatileKeys.has(key) ? undefined : nested))

export const mergeCanonicalAttachments = (localAttachments = [], canonicalAttachments = []) => {
  const localList = Array.isArray(localAttachments) ? localAttachments.filter(Boolean) : []
  const canonicalList = Array.isArray(canonicalAttachments)
    ? canonicalAttachments.filter(Boolean)
    : []

  // A partial or stale draft response must never erase locally retained evidence. The next
  // successful sync will replace these local entries with canonical server attachments.
  if (canonicalList.length === 0) return localList

  return canonicalList.map((attachment, index) => {
    const local =
      localList.find(
        (candidate) => candidate?.id && String(candidate.id) === String(attachment.id),
      ) ||
      localList.find((candidate) => candidate?.name && candidate.name === attachment.name) ||
      localList[index]

    // The server never echoes local binary data. Keep it while this form remains open so a
    // just-added attachment can still be previewed and re-uploaded after draft autosave.
    return local?.file
      ? { ...attachment, file: local.file, dataUrl: local.dataUrl || attachment.dataUrl }
      : attachment
  })
}

const mergeCanonicalClaimItems = (items, type, canonicalClaims = []) => {
  const canonicalById = new Map(
    canonicalClaims
      .filter((claim) => claim.type === type && claim.id)
      .map((claim) => [String(claim.id), claim]),
  )
  let changed = false
  const nextItems = items.map((item) => {
    const canonical = canonicalById.get(String(item.id))
    if (!canonical) return item

    const attachments = mergeCanonicalAttachments(
      getClaimAttachments(item),
      getClaimAttachments(canonical),
    )
    const nextItem = {
      ...item,
      ...canonical,
      attachments,
      attachment: attachments[0] || null,
    }
    if (canonicalComparable(item) === canonicalComparable(nextItem)) return item

    changed = true
    return nextItem
  })

  return changed ? nextItems : items
}

// Ids and urls belong to the server: adopting them must never look like a user edit,
// otherwise the response to one save becomes the trigger for the next one.
const serverOwnedDraftKeys = new Set(['url', 'downloadUrl', 'recordItemId', 'meta'])

const draftContentFingerprint = (payload) =>
  JSON.stringify(payload, (key, value) => {
    if (serverOwnedDraftKeys.has(key)) return undefined
    // Claim ids are client-generated strings; a numeric id is an attachment row id.
    if (key === 'id' && typeof value === 'number') return undefined
    if (key === 'dataUrl' && typeof value === 'string') return `bytes:${value.length}`
    return value
  })

const mergeProjectOptionsWithMineFirst = (myProjects = [], allProjects = []) => {
  const mineMap = new Map()
  myProjects
    .map(normalizeProjectOption)
    .filter(Boolean)
    .forEach((project) => {
      mineMap.set(project.value, project)
    })

  const allMap = new Map()
  allProjects
    .map(normalizeProjectOption)
    .filter(Boolean)
    .forEach((project) => {
      allMap.set(project.value, project)
    })

  const merged = []
  const used = new Set()

  mineMap.forEach((project) => {
    merged.push(project)
    used.add(project.value)
  })

  allMap.forEach((project) => {
    if (!used.has(project.value)) {
      merged.push(project)
      used.add(project.value)
    }
  })

  const sorted = [...merged].sort((a, b) => a.label.localeCompare(b.label))

  return sorted.sort((a, b) => {
    const aIsMine = mineMap.has(a.value)
    const bIsMine = mineMap.has(b.value)
    if (aIsMine === bIsMine) return 0
    return aIsMine ? -1 : 1
  })
}

const getProjectOptionByValue = (projectOptions, projectValue) =>
  projectOptions.find((project) => String(project.value) === String(projectValue || ''))

const getMileageChargeToFormState = (
  chargeToLabel,
  projectOptions = [],
  chargeToProjectId = '',
) => {
  const cleanedLabel = String(chargeToLabel || '').trim()
  const savedProjectId = String(chargeToProjectId || '').trim()
  if (savedProjectId) {
    return {
      mileageChargeToMode: 'project',
      mileageChargeToProjectId: savedProjectId,
      mileageChargeTo: '',
    }
  }
  if (!cleanedLabel || cleanedLabel.toLowerCase() === 'company') {
    return {
      mileageChargeToMode: 'company',
      mileageChargeToProjectId: '',
      mileageChargeTo: cleanedLabel || '',
    }
  }

  const selectedProjectOption =
    getProjectOptionByValue(projectOptions, cleanedLabel) ||
    projectOptions.find((project) => project.label === cleanedLabel) ||
    projectOptions.find(
      (project) => project.label && project.label.toLowerCase() === cleanedLabel.toLowerCase(),
    ) ||
    projectOptions.find(
      (project) =>
        project.projectName && project.projectName.toLowerCase() === cleanedLabel.toLowerCase(),
    )

  if (!selectedProjectOption) {
    return {
      mileageChargeToMode: 'company',
      mileageChargeToProjectId: '',
      mileageChargeTo: cleanedLabel,
    }
  }

  return {
    mileageChargeToMode: 'project',
    mileageChargeToProjectId: selectedProjectOption.value,
    mileageChargeTo: '',
  }
}

const buildClaimMonthOptions = (baseDate = new Date()) =>
  [0, 1, 2].map((offset) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    return {
      value,
      label: formatClaimMonth(value),
    }
  })

// The draft is already safe in localStorage on every keystroke, so the server sync can
// wait for a real pause in typing.
const DRAFT_AUTOSAVE_DELAY_MS = 2500

const colorByType = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
}

const OtherClaimApply = ({
  onViewRecords,
  editRecord,
  amendmentReason = '',
  showAdjustments = false,
  resumeClaimType = '',
  resumeClaimMonth = '',
  resumeNotice = '',
  onConfigureMedicalEntitlement,
}) => {
  const normalizedResumeClaimMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(resumeClaimMonth))
    ? String(resumeClaimMonth)
    : ''
  const initialType = resumeClaimType || firstClaimType(editRecord)
  const [isAdjusting, setIsAdjusting] = useState(
    Boolean(editRecord) || showAdjustments || Boolean(resumeClaimType),
  )
  const [activeAdjustmentType, setActiveAdjustmentType] = useState(initialType)
  const [showClaimDraft, setShowClaimDraft] = useState(
    Boolean(editRecord) || Boolean(resumeClaimType),
  )
  const [notice, setNotice] = useState({
    visible: Boolean(resumeNotice),
    message: resumeNotice,
    color: resumeNotice ? 'success' : 'info',
    scope: 'general',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(!editRecord)
  const [salaryProfile, setSalaryProfile] = useState(null)
  const initialDraftSaveStateRef = useRef('idle')
  const [draftSaveState, setDraftSaveState] = useState(() => initialDraftSaveStateRef.current)
  const [draftSaveError, setDraftSaveError] = useState('')
  const [attachmentInputVersion, setAttachmentInputVersion] = useState(0)
  const [attachmentProcessing, setAttachmentProcessing] = useState(createAttachmentProcessingState)
  const attachmentProcessingRef = useRef(attachmentProcessing)
  const draftSaveTimerRef = useRef(null)
  const draftRecordRef = useRef(
    editRecord?.status === 'Draft' && editRecord?.id
      ? { id: editRecord.id, claimMonth: editRecord.claimMonthValue }
      : null,
  )
  const draftSaveRevisionRef = useRef(0)
  const initialRecordRef = useRef(editRecord)
  const amendmentReasonRef = useRef(String(amendmentReason || '').trim())
  const hasPersistedDraftRef = useRef(false)
  const hasSubmittedRef = useRef(false)
  const initialStateRef = useRef(null)
  const submissionErrorRef = useRef(null)

  if (!initialStateRef.current) {
    const claimMonth =
      editRecord?.claimMonthValue || normalizedResumeClaimMonth || getCurrentClaimMonth()
    const localDraft = editRecord ? null : readOtherClaimDraft({ claimMonth })
    if (localDraft) {
      hasPersistedDraftRef.current = true
      initialStateRef.current = stateFromDraft(localDraft, claimMonth)
      initialDraftSaveStateRef.current = 'restored'
    } else {
      initialStateRef.current = editRecord
        ? stateFromRecord(editRecord)
        : stateFromDraft({}, claimMonth)
    }
  }

  const [formData, setFormData] = useState(initialStateRef.current.formData)
  const [allowanceItems, setAllowanceItems] = useState(initialStateRef.current.allowanceItems)
  const [expenseItems, setExpenseItems] = useState(initialStateRef.current.expenseItems)
  const [mileageItems, setMileageItems] = useState(initialStateRef.current.mileageItems)
  const [medicalItems, setMedicalItems] = useState(initialStateRef.current.medicalItems)
  const [editingClaim, setEditingClaim] = useState(null)
  const [activeRecordId, setActiveRecordIdState] = useState(editRecord?.id || null)
  const [projectOptions, setProjectOptions] = useState([])
  const [isProjectOptionsLoading, setIsProjectOptionsLoading] = useState(false)

  const setActiveRecordId = useCallback((recordId) => {
    setActiveRecordIdState(recordId || null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadProjectOptions = async () => {
      setIsProjectOptionsLoading(true)
      const [myProjects, allProjects] = await Promise.all([
        listActiveProjectOptions({ signal: controller.signal, scope: 'mine' }).catch(() => []),
        listActiveProjectOptions({ signal: controller.signal, scope: 'all' }).catch(() => []),
      ])

      if (controller.signal.aborted) return
      setProjectOptions(mergeProjectOptionsWithMineFirst(myProjects, allProjects))
      setIsProjectOptionsLoading(false)
    }

    loadProjectOptions().catch(() => {
      if (!controller.signal.aborted) {
        setProjectOptions([])
        setIsProjectOptionsLoading(false)
      }
    })

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (initialDraftSaveStateRef.current === 'restored') {
      setDraftSaveState('restored')
    }
  }, [])

  useEffect(() => {
    if (isLoading || resumeClaimType !== 'medical') return undefined

    const focusTimer = window.setTimeout(() => {
      document.getElementById('otherMedicalDate')?.focus()
    }, 0)

    return () => window.clearTimeout(focusTimer)
  }, [isLoading, resumeClaimType])

  const showNotice = useCallback((type, message, options = {}) => {
    const normalizedType = colorByType[type] ? type : 'info'
    setNotice({
      visible: true,
      message,
      color: colorByType[normalizedType],
      scope: options.scope || 'general',
    })
  }, [])

  const hideNotice = () => setNotice((prev) => ({ ...prev, visible: false }))

  useEffect(() => {
    let isMounted = true
    Promise.all([
      fetchSalaryProfile(),
      initialRecordRef.current
        ? Promise.resolve(null)
        : fetchOtherClaimDraft(initialStateRef.current.formData.claimMonth).catch(() => null),
    ])
      .then(([profile, serverDraft]) => {
        if (!isMounted) return
        setSalaryProfile(profile)
        if (serverDraft?.id && serverDraft?.claimMonthValue) {
          draftRecordRef.current = {
            id: serverDraft.id,
            claimMonth: serverDraft.claimMonthValue,
          }
        }
        const serverDraftPayload = serverDraft?.draftPayload
        const shouldUseServerDraft =
          !initialRecordRef.current &&
          !hasPersistedDraftRef.current &&
          serverDraftPayload &&
          typeof serverDraftPayload === 'object' &&
          !Array.isArray(serverDraftPayload)
        const restoredState = shouldUseServerDraft
          ? stateFromDraft(serverDraftPayload, initialStateRef.current.formData.claimMonth)
          : null

        if (serverDraft) hasPersistedDraftRef.current = true
        if (restoredState) {
          const canonicalClaims = Array.isArray(serverDraft?.claims) ? serverDraft.claims : []
          setDraftSaveState('restored')
          setFormData(restoredState.formData)
          setAllowanceItems(
            mergeCanonicalClaimItems(restoredState.allowanceItems, 'Allowance', canonicalClaims),
          )
          setExpenseItems(
            mergeCanonicalClaimItems(restoredState.expenseItems, 'Expense', canonicalClaims),
          )
          setMileageItems(
            mergeCanonicalClaimItems(restoredState.mileageItems, 'Mileage', canonicalClaims),
          )
          setMedicalItems(
            mergeCanonicalClaimItems(restoredState.medicalItems, 'Medical', canonicalClaims),
          )
        }
        setFormData((prev) => ({
          ...prev,
          mileageRate: prev.mileageRate || profile.defaultMileageRate || '0.6',
        }))
      })
      .catch((err) => {
        if (isMounted) showNotice('error', err?.message || 'Could not load claim settings.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
    }
  }, [showNotice])

  useEffect(() => {
    if (notice.visible && notice.scope === 'submission-error') {
      submissionErrorRef.current?.focus()
    }
  }, [notice])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    if (name === 'claimMonth') {
      draftRecordRef.current = null
    }
    if (name === 'mileageChargeToMode') {
      setFormData((prev) => ({
        ...prev,
        mileageChargeToMode: value,
        mileageChargeToProjectId: value === 'company' ? '' : prev.mileageChargeToProjectId || '',
        mileageChargeTo: '',
      }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const resetAttachmentInputs = useCallback(() => setAttachmentInputVersion((prev) => prev + 1), [])

  const resetAttachmentProcessing = useCallback(() => {
    const nextState = createAttachmentProcessingState()
    attachmentProcessingRef.current = nextState
    setAttachmentProcessing(nextState)
  }, [])

  const clearEditableClaimState = useCallback(() => {
    setAllowanceItems([])
    setExpenseItems([])
    setMileageItems([])
    setMedicalItems([])
    setEditingClaim(null)
    resetAttachmentProcessing()
    resetAttachmentInputs()
  }, [resetAttachmentInputs, resetAttachmentProcessing])

  const setAttachmentProcessingForType = (type, isProcessing) => {
    attachmentProcessingRef.current = { ...attachmentProcessingRef.current, [type]: isProcessing }
    setAttachmentProcessing(attachmentProcessingRef.current)
  }

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
    } catch (err) {
      resetAttachmentInputs()
      showNotice('warning', err?.message || 'Could not attach that file.')
    } finally {
      setAttachmentProcessingForType(type, false)
    }
  }

  const travelAttachmentPurpose = (category) =>
    ({
      mileage: 'route_proof',
      taxi: 'taxi_receipt',
      toll: 'toll_proof',
      parking: 'parking_receipt',
      other: 'other_travel_proof',
    })[category] || 'other_travel_proof'

  const handleTravelAttachmentChange = async (files) => {
    const selectedFiles = Array.isArray(files) ? files : files ? [files] : []
    if (!selectedFiles.length) return

    setAttachmentProcessingForType('mileage', true)
    try {
      const preparedAttachments = await Promise.all(selectedFiles.map(prepareSalaryAttachment))
      setFormData((prev) => {
        const nextAttachments = [
          ...(Array.isArray(prev.travelAttachments) ? prev.travelAttachments : []),
          ...preparedAttachments.map((attachment) => ({
            ...attachment,
            clientId: buildClaimId(),
            purpose: travelAttachmentPurpose(prev.travelCategory),
          })),
        ]
        return {
          ...prev,
          travelAttachments: nextAttachments,
          mileageAttachment: nextAttachments[0] || null,
        }
      })
    } catch (err) {
      resetAttachmentInputs()
      showNotice('warning', err?.message || 'Could not attach that file.')
    } finally {
      setAttachmentProcessingForType('mileage', false)
    }
  }

  const removeTravelAttachment = useCallback(
    (index) => {
      setFormData((prev) => {
        const nextAttachments = (prev.travelAttachments || []).filter(
          (_, attachmentIndex) => attachmentIndex !== index,
        )
        return {
          ...prev,
          travelAttachments: nextAttachments,
          mileageAttachment: nextAttachments[0] || null,
        }
      })
      resetAttachmentInputs()
    },
    [resetAttachmentInputs],
  )

  const resetClaimDrafts = () => {
    setFormData((prev) => ({ ...prev, ...createEmptyClaimFields() }))
    setEditingClaim(null)
    resetAttachmentProcessing()
    resetAttachmentInputs()
  }

  const addAllowance = () => {
    if (attachmentProcessingRef.current.allowance) return false
    const amount = toPositiveNumber(formData.allowanceAmount)
    if (!formData.allowanceDate || !formData.allowanceDescription.trim() || !amount) {
      showNotice('warning', 'Enter allowance date, description, and a valid amount.')
      return false
    }
    const nextItem = {
      id: editingClaim?.type === 'allowance' ? editingClaim.id : buildClaimId(),
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
      showNotice('warning', 'Enter expense date, description, and a valid amount.')
      return false
    }
    if (!formData.expenseAttachment) {
      showNotice('warning', 'Attach the expense receipt before saving.')
      return false
    }
    const nextItem = {
      id: editingClaim?.type === 'expense' ? editingClaim.id : buildClaimId(),
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
    if (salaryProfile && Number(salaryProfile.yearlyMedicalClaim || 0) <= 0) {
      showNotice(
        'warning',
        'No annual medical entitlement is configured. Use Set Medical Entitlement before saving this medical claim.',
      )
      return false
    }
    const amount = toPositiveNumber(formData.medicalAmount)
    if (!formData.medicalDate || !formData.medicalDescription.trim() || !amount) {
      showNotice('warning', 'Enter medical date, description, and a valid amount.')
      return false
    }
    if (!formData.medicalAttachment) {
      showNotice('warning', 'Attach the medical receipt before saving.')
      return false
    }
    const nextItem = {
      id: editingClaim?.type === 'medical' ? editingClaim.id : buildClaimId(),
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

  const addTravelClaim = () => {
    if (attachmentProcessingRef.current.mileage) return false

    const category = formData.travelCategory || 'mileage'
    const km = toPositiveNumber(formData.mileageKm)
    const amount = toPositiveNumber(formData.travelExpenseAmount)
    const purpose = formData.mileagePurpose.trim()
    const startLocation = formData.startLocation.trim()
    const endLocation = formData.endLocation.trim()
    const locationDetail = formData.travelLocationDetail.trim()
    const expenseType = formData.travelExpenseType.trim()
    const attachments = Array.isArray(formData.travelAttachments) ? formData.travelAttachments : []
    const chargeToMode = formData.mileageChargeToMode || 'company'
    const selectedProjectOption =
      chargeToMode === 'project'
        ? getProjectOptionByValue(projectOptions, formData.mileageChargeToProjectId)
        : null
    const chargeTo = chargeToMode === 'project' ? selectedProjectOption?.label || '' : 'Company'
    const targetItemType = category === 'mileage' ? 'mileage' : 'expense'
    const editingMileageItem =
      editingClaim?.type === 'mileage'
        ? mileageItems.find((item) => item.id === editingClaim.id)
        : null
    const editingExpenseItem =
      editingClaim?.type === 'expense'
        ? expenseItems.find((item) => item.id === editingClaim.id)
        : null

    if (
      chargeToMode === 'project' &&
      (!formData.mileageChargeToProjectId || !selectedProjectOption)
    ) {
      showNotice('warning', 'Select a project before saving this travel claim.')
      return false
    }
    if (!formData.mileageDate || !purpose) {
      showNotice('warning', 'Enter the travel date and business purpose.')
      return false
    }

    const requiresEvidence = category !== 'mileage'
    if (requiresEvidence && !attachments.length) {
      showNotice('warning', 'Attach the required travel supporting evidence before saving.')
      return false
    }

    if (category === 'mileage' && (!startLocation || !endLocation || !km)) {
      showNotice('warning', 'Enter the route and a valid distance for the mileage claim.')
      return false
    }
    if (category === 'taxi' && (!startLocation || !endLocation || !amount)) {
      showNotice('warning', 'Enter pickup, drop-off, and a valid taxi amount.')
      return false
    }
    if (category === 'toll' && (!amount || (!startLocation && !endLocation && !locationDetail))) {
      showNotice('warning', 'Enter the toll amount and either the route or from/to locations.')
      return false
    }
    if (category === 'parking' && (!amount || !locationDetail)) {
      showNotice('warning', 'Enter the parking location and a valid amount.')
      return false
    }
    if (category === 'other' && (!amount || !expenseType)) {
      showNotice('warning', 'Enter what was paid for and a valid amount.')
      return false
    }
    if (
      editingClaim?.type &&
      editingClaim.type !== targetItemType &&
      typeof window !== 'undefined' &&
      !window.confirm(
        'Changing this travel claim category will replace the current claim type. Continue?',
      )
    ) {
      return false
    }

    const nextItem = {
      id:
        editingClaim?.type === (category === 'mileage' ? 'mileage' : 'expense')
          ? editingClaim.id
          : buildClaimId(),
      date: formData.mileageDate,
      description: purpose,
      startLocation,
      endLocation,
      source: chargeTo ? 'manual-allocation' : '',
      sourceLabel: chargeTo,
      chargeToProjectId: chargeToMode === 'project' ? formData.mileageChargeToProjectId : '',
      locationDetail,
      expenseType,
      travelCategory: category,
      travelGroupId: '',
      attachments,
      attachment: attachments[0] || null,
    }

    if (category === 'mileage') {
      const distanceMethod = formData.travelDistanceMethod || 'return_same_route'
      nextItem.km = roundMoney(km)
      nextItem.distanceMethod = distanceMethod
      nextItem.tripMode = distanceMethod === 'return_same_route' ? 'return' : 'one_way'
      nextItem.mileageRate = Number(formData.mileageRate || 0)
      nextItem.amount = calculateMileageAmount(km, formData.mileageRate, distanceMethod)
      setMileageItems((prev) => {
        const withoutLegacyAnchor = editingExpenseItem?.travelGroupId
          ? prev.filter(
              (item) =>
                item.travelGroupId !== editingExpenseItem.travelGroupId || Number(item.km || 0) > 0,
            )
          : prev

        return editingClaim?.type === 'mileage'
          ? withoutLegacyAnchor.map((item) => (item.id === editingClaim.id ? nextItem : item))
          : [...withoutLegacyAnchor, nextItem]
      })
      if (editingClaim?.type === 'expense') {
        setExpenseItems((prev) => prev.filter((item) => item.id !== editingClaim.id))
      }
    } else {
      nextItem.amount = roundMoney(amount)
      nextItem.expenseCategory = category
      setExpenseItems((prev) => {
        if (editingClaim?.type === 'expense') {
          return prev.map((item) => (item.id === editingClaim.id ? nextItem : item))
        }

        return editingMileageItem?.travelGroupId
          ? [
              ...prev.filter((item) => item.travelGroupId !== editingMileageItem.travelGroupId),
              nextItem,
            ]
          : [...prev, nextItem]
      })
      if (editingClaim?.type === 'mileage') {
        setMileageItems((prev) => prev.filter((item) => item.id !== editingClaim.id))
      }
    }

    setFormData((prev) => ({
      ...prev,
      mileageDate: '',
      startLocation: '',
      endLocation: '',
      mileagePurpose: '',
      mileageChargeToMode: 'company',
      mileageChargeToProjectId: '',
      mileageChargeTo: '',
      mileageKm: '',
      mileageTripMode: 'return',
      travelCategory: 'mileage',
      travelDistanceMethod: 'return_same_route',
      travelLocationDetail: '',
      travelExpenseType: '',
      travelExpenseAmount: '',
      travelAttachments: [],
      mileageAttachment: null,
    }))
    setEditingClaim(null)
    resetAttachmentInputs()
    return true
  }

  const removeClaimItem = useCallback(
    (type, id) => {
      const setters = {
        allowance: setAllowanceItems,
        expense: setExpenseItems,
        medical: setMedicalItems,
        mileage: setMileageItems,
      }
      if (type === 'mileage') {
        const removedMileage = mileageItems.find((item) => item.id === id)
        if (removedMileage?.travelGroupId) {
          if (
            typeof window !== 'undefined' &&
            !window.confirm(
              'This legacy mileage item has linked travel expenses and their evidence. Remove all linked items?',
            )
          ) {
            return
          }
          setExpenseItems((prev) =>
            prev.filter((item) => item.travelGroupId !== removedMileage.travelGroupId),
          )
        }
      }
      setters[type]?.((prev) => prev.filter((item) => item.id !== id))
      if (editingClaim?.type === type && editingClaim.id === id) {
        setEditingClaim(null)
        setFormData((prev) => ({ ...prev, ...createEmptyClaimFields() }))
        resetAttachmentProcessing()
        resetAttachmentInputs()
      }
    },
    [editingClaim, mileageItems, resetAttachmentInputs, resetAttachmentProcessing],
  )

  const startEditClaimItem = useCallback(
    (type, id) => {
      const itemsByType = {
        allowance: allowanceItems,
        expense: expenseItems,
        medical: medicalItems,
        mileage: mileageItems,
      }
      const item = itemsByType[type]?.find((claimItem) => claimItem.id === id)
      if (!item) return false

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
        const category = claimTravelCategory(item)
        if (category) {
          const linkedMileage = mileageItems.find(
            (mileageItem) => item.travelGroupId && mileageItem.travelGroupId === item.travelGroupId,
          )
          const attachments = getClaimAttachments(item)
          setFormData((prev) => ({
            ...prev,
            mileageDate: item.date || linkedMileage?.date || '',
            startLocation: item.startLocation || linkedMileage?.startLocation || '',
            endLocation: item.endLocation || linkedMileage?.endLocation || '',
            mileagePurpose: item.description || linkedMileage?.description || '',
            ...getMileageChargeToFormState(
              item.sourceLabel || linkedMileage?.sourceLabel,
              projectOptions,
              item.chargeToProjectId || linkedMileage?.chargeToProjectId,
            ),
            mileageKm: '',
            mileageTripMode: 'return',
            travelCategory: category === 'legacy_combined' ? 'other' : category,
            travelDistanceMethod: 'return_same_route',
            travelLocationDetail: item.locationDetail || '',
            travelExpenseType: item.expenseType || '',
            travelExpenseAmount: String(item.amount ?? ''),
            travelAttachments: attachments,
            mileageAttachment: attachments[0] || null,
          }))
          setActiveAdjustmentType('mileage')
        } else {
          setFormData((prev) => ({
            ...prev,
            expenseDate: item.date || '',
            expenseDescription: item.description || '',
            expenseAmount: String(item.amount ?? ''),
            expenseAttachment: item.attachment || null,
          }))
        }
      } else if (type === 'medical') {
        setFormData((prev) => ({
          ...prev,
          medicalDate: item.date || '',
          medicalDescription: item.description || '',
          medicalAmount: String(item.amount ?? ''),
          medicalAttachment: item.attachment || null,
        }))
      } else if (type === 'mileage') {
        const attachments = getClaimAttachments(item)
        setFormData((prev) => ({
          ...prev,
          mileageDate: item.date || '',
          startLocation: item.startLocation || '',
          endLocation: item.endLocation || '',
          mileagePurpose: item.description || '',
          ...getMileageChargeToFormState(item.sourceLabel, projectOptions, item.chargeToProjectId),
          mileageKm: String(item.km ?? ''),
          mileageTripMode: item.tripMode || 'return',
          travelCategory: 'mileage',
          travelDistanceMethod:
            item.distanceMethod || (item.tripMode === 'one_way' ? 'one_way' : 'return_same_route'),
          travelLocationDetail: item.locationDetail || '',
          travelExpenseType: '',
          travelExpenseAmount: '',
          travelAttachments: attachments,
          mileageAttachment: attachments[0] || null,
        }))
        setActiveAdjustmentType('mileage')
      }
      setIsAdjusting(true)
      if (!(type === 'expense' && claimTravelCategory(item))) {
        setActiveAdjustmentType(type)
      }
      setShowClaimDraft(true)
      resetAttachmentInputs()
      return true
    },
    [
      allowanceItems,
      expenseItems,
      medicalItems,
      mileageItems,
      projectOptions,
      resetAttachmentInputs,
    ],
  )

  const allClaims = useMemo(
    () => [
      ...mapClaimItems(allowanceItems, 'Allowance'),
      ...mapClaimItems(expenseItems, 'Expense'),
      ...mapClaimItems(mileageItems, 'Mileage'),
      ...mapClaimItems(medicalItems, 'Medical'),
    ],
    [allowanceItems, expenseItems, medicalItems, mileageItems],
  )
  const claimsTotal = useMemo(
    () => roundMoney(allClaims.reduce((total, claim) => total + Number(claim.amount || 0), 0)),
    [allClaims],
  )

  const draftPayload = useMemo(
    () =>
      createDraftPayload({ formData, allowanceItems, expenseItems, mileageItems, medicalItems }),
    [allowanceItems, expenseItems, formData, medicalItems, mileageItems],
  )
  const hasDraftContent = useMemo(() => draftHasContent(draftPayload), [draftPayload])
  const draftFingerprint = useMemo(() => draftContentFingerprint(draftPayload), [draftPayload])
  const draftPayloadRef = useRef(draftPayload)
  const allClaimsRef = useRef(allClaims)
  const lastSyncedFingerprintRef = useRef(null)
  const draftRequestRef = useRef(null)
  // The debounced save always reads the freshest snapshot, not the one from the render
  // that scheduled it.
  draftPayloadRef.current = draftPayload
  allClaimsRef.current = allClaims

  const handleConfigureMedicalEntitlement = () => {
    if (attachmentProcessingRef.current.medical) return

    const claimMonth = draftPayload.formData.claimMonth || getCurrentClaimMonth()
    const wasSavedLocally = writeOtherClaimDraft({ claimMonth, draft: draftPayload })
    if (!wasSavedLocally) {
      const message =
        'Your medical claim could not be preserved in this browser. Keep this page open and try again before opening Salary Settings.'
      setDraftSaveError(message)
      setDraftSaveState('error')
      showNotice('error', message, { scope: 'submission-error' })
      return
    }

    setDraftSaveError('')
    setDraftSaveState('dirty')
    onConfigureMedicalEntitlement?.({ claimMonth })
  }

  useEffect(() => {
    if (
      hasSubmittedRef.current ||
      (initialRecordRef.current && initialRecordRef.current.status !== 'Draft') ||
      isLoading ||
      isSubmitting
    ) {
      return undefined
    }
    // Adopting server-assigned ids changes state without changing anything the user typed.
    // Re-saving that echo is what turned this autosave into an endless request loop.
    if (draftFingerprint === lastSyncedFingerprintRef.current) return undefined

    const claimMonth = draftPayloadRef.current.formData.claimMonth || getCurrentClaimMonth()
    const saveRevision = ++draftSaveRevisionRef.current
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
    draftRequestRef.current?.abort()
    draftRequestRef.current = null

    if (!hasDraftContent) {
      clearOtherClaimDraft({ claimMonth })
      if (hasPersistedDraftRef.current) {
        draftSaveTimerRef.current = window.setTimeout(() => {
          clearOtherClaimServerDraft(claimMonth)
            .then(() => {
              if (saveRevision !== draftSaveRevisionRef.current) return
              hasPersistedDraftRef.current = false
              draftRecordRef.current = null
              lastSyncedFingerprintRef.current = draftFingerprint
              setDraftSaveError('')
              setDraftSaveState('idle')
            })
            .catch((error) => {
              if (saveRevision === draftSaveRevisionRef.current) {
                setDraftSaveError(error?.message || 'Could not clear the server draft.')
                setDraftSaveState('error')
              }
            })
        }, 800)
      } else {
        setDraftSaveState('idle')
      }
      return () => {
        if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
      }
    }

    writeOtherClaimDraft({ claimMonth, draft: draftPayloadRef.current })
    setDraftSaveError('')
    setDraftSaveState('dirty')
    draftSaveTimerRef.current = window.setTimeout(() => {
      const controller = typeof AbortController === 'undefined' ? null : new AbortController()
      draftRequestRef.current = controller
      setDraftSaveState('saving')
      saveOtherClaimDraft(
        {
          claimMonthValue: claimMonth,
          claims: allClaimsRef.current.filter((claim) => isCompleteClaim(claim)),
          draftPayload: draftPayloadRef.current,
        },
        { signal: controller?.signal },
      )
        .then((savedDraft) => {
          if (saveRevision !== draftSaveRevisionRef.current || hasSubmittedRef.current) return
          hasPersistedDraftRef.current = true
          if (savedDraft) lastSyncedFingerprintRef.current = draftFingerprint
          if (savedDraft?.id) {
            draftRecordRef.current = { id: savedDraft.id, claimMonth }
          }
          if (Array.isArray(savedDraft?.claims)) {
            setAllowanceItems((items) =>
              mergeCanonicalClaimItems(items, 'Allowance', savedDraft.claims),
            )
            setExpenseItems((items) =>
              mergeCanonicalClaimItems(items, 'Expense', savedDraft.claims),
            )
            setMileageItems((items) =>
              mergeCanonicalClaimItems(items, 'Mileage', savedDraft.claims),
            )
            setMedicalItems((items) =>
              mergeCanonicalClaimItems(items, 'Medical', savedDraft.claims),
            )
          }
          setDraftSaveError('')
          setDraftSaveState('saved')
        })
        .catch((error) => {
          if (controller?.signal.aborted || error?.name === 'AbortError') return
          if (saveRevision === draftSaveRevisionRef.current) {
            setDraftSaveError(error?.message || 'Could not sync the draft to the server.')
            setDraftSaveState('error')
          }
        })
    }, DRAFT_AUTOSAVE_DELAY_MS)

    return () => {
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
    }
  }, [draftFingerprint, hasDraftContent, isLoading, isSubmitting])

  const handleSaveClaimDraft = (saveClaim) => {
    if (!saveClaim()) return
    hideNotice()
    setShowClaimDraft(false)
  }

  const handleCancelClaimDraft = () => {
    resetClaimDrafts()
    hideNotice()
    setShowClaimDraft(false)
  }

  const handleApplyAnother = () => {
    const claimMonth = getCurrentClaimMonth()
    initialRecordRef.current = null
    hasSubmittedRef.current = false
    draftSaveRevisionRef.current += 1
    draftRecordRef.current = null
    setActiveRecordId(null)
    setFormData({
      claimMonth,
      mileageRate: salaryProfile?.defaultMileageRate || '0.6',
      ...createEmptyClaimFields(),
    })
    clearEditableClaimState()
    hideNotice()
    setIsAdjusting(false)
    setActiveAdjustmentType('allowance')
    setShowClaimDraft(false)
    hasPersistedDraftRef.current = false
    setDraftSaveError('')
    setDraftSaveState('idle')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    const claimMonth = formData.claimMonth || getCurrentClaimMonth()
    if (claimsTotal <= 0) {
      showNotice('warning', 'Add at least one claim before submitting.')
      return
    }
    if (medicalItems.length > 0 && Number(salaryProfile?.yearlyMedicalClaim || 0) <= 0) {
      showNotice(
        'error',
        'A medical claim is included, but no annual medical entitlement is configured. Set the entitlement in Salary Settings, then review and submit this claim.',
        { scope: 'submission-error' },
      )
      return
    }
    try {
      setIsSubmitting(true)
      draftSaveRevisionRef.current += 1
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)

      let submissionRecordId = activeRecordId
      let submissionRecordVersion = initialRecordRef.current?.recordVersion || null
      let submissionClaims = allClaims
      const shouldSyncDraft =
        !initialRecordRef.current || initialRecordRef.current.status === 'Draft'
      if (shouldSyncDraft) {
        try {
          setDraftSaveError('')
          setDraftSaveState('saving')
          draftRequestRef.current?.abort()
          draftRequestRef.current = null
          const syncedDraft = await saveOtherClaimDraft({
            claimMonthValue: claimMonth,
            claims: allClaims.filter((claim) => isCompleteClaim(claim, allClaims)),
            draftPayload,
          })
          if (!syncedDraft?.id) {
            throw new Error('The draft could not be confirmed by the server.')
          }
          submissionRecordId = syncedDraft.id
          submissionRecordVersion = syncedDraft.recordVersion || submissionRecordVersion
          hasPersistedDraftRef.current = true
          draftRecordRef.current = { id: syncedDraft.id, claimMonth }
          lastSyncedFingerprintRef.current = draftFingerprint
          // The sync is the authority on attachment identity from here on; submitting the
          // pre-sync snapshot is what made the server reject evidence it had just stored.
          const canonicalClaims = Array.isArray(syncedDraft.claims) ? syncedDraft.claims : []
          if (canonicalClaims.length) {
            const canonicalById = new Map(
              canonicalClaims.filter((claim) => claim.id).map((claim) => [String(claim.id), claim]),
            )
            submissionClaims = allClaims.map((claim) => {
              const canonical = canonicalById.get(String(claim.id))
              if (!canonical) return claim

              const attachments = mergeCanonicalAttachments(
                getClaimAttachments(claim),
                getClaimAttachments(canonical),
              )
              return { ...claim, attachments, attachment: attachments[0] || null }
            })
            setAllowanceItems((items) =>
              mergeCanonicalClaimItems(items, 'Allowance', canonicalClaims),
            )
            setExpenseItems((items) => mergeCanonicalClaimItems(items, 'Expense', canonicalClaims))
            setMileageItems((items) => mergeCanonicalClaimItems(items, 'Mileage', canonicalClaims))
            setMedicalItems((items) => mergeCanonicalClaimItems(items, 'Medical', canonicalClaims))
          }
          setDraftSaveState('saved')
        } catch (error) {
          const message = error?.message || 'Could not sync the draft to the server.'
          setDraftSaveError(message)
          setDraftSaveState('error')
          showNotice('error', `Submission stopped because the draft could not sync. ${message}`, {
            scope: 'submission-error',
          })
          return
        }
      }

      const savedRecord = await saveOtherClaimRecord({
        id: submissionRecordId || `other-claim-${claimMonth}`,
        claimMonth: formatClaimMonth(claimMonth),
        claimMonthValue: claimMonth,
        claimsTotal,
        status: 'Submitted',
        claims: submissionClaims,
        submittedAt: new Date().toISOString(),
        amendmentReason: amendmentReasonRef.current,
        recordVersion: submissionRecordVersion,
      })
      setActiveRecordId(savedRecord.id || null)
      draftRecordRef.current = null
      hasSubmittedRef.current = true
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
      if (shouldSyncDraft) {
        clearOtherClaimDraft({ claimMonth })
        clearOtherClaimServerDraft(claimMonth).catch(() => {})
        hasPersistedDraftRef.current = false
        setDraftSaveError('')
        setDraftSaveState('idle')
      }
      if (savedRecord.mailStatus === 'digest') {
        showNotice(
          'success',
          savedRecord.mailMessage ||
            'Other claim was submitted for review. Reviewers will receive the daily pending-work digest when applicable.',
          { scope: 'submission-success' },
        )
      } else if (savedRecord.mailSent === true) {
        showNotice('success', 'Other claim was submitted for review.', {
          scope: 'submission-success',
        })
      } else {
        showNotice(
          'warning',
          savedRecord.mailMessage ||
            'Other claim was submitted, but workflow notification delivery could not be confirmed.',
          { scope: 'submission-success' },
        )
      }
    } catch (err) {
      const message = err?.message || 'Could not submit other claim.'
      showNotice('error', message, { scope: 'submission-error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedClaimMonth = formData.claimMonth || getCurrentClaimMonth()
  const claimMonthOptions = useMemo(() => {
    const baseOptions = buildClaimMonthOptions()
    const hasSelectedInOptions = baseOptions.some((option) => option.value === selectedClaimMonth)
    if (hasSelectedInOptions) return baseOptions

    return [
      { value: selectedClaimMonth, label: formatClaimMonth(selectedClaimMonth) },
      ...baseOptions,
    ]
  }, [selectedClaimMonth])
  const handleClaimMonthSelect = useCallback(
    (claimMonth) => {
      handleChange({ target: { name: 'claimMonth', value: claimMonth } })
    },
    [handleChange],
  )

  const renderPanelAddAction = () =>
    showClaimDraft ? null : (
      <CButton
        color="primary"
        variant="outline"
        size="sm"
        type="button"
        onClick={() => {
          resetClaimDrafts()
          hideNotice()
          setShowClaimDraft(true)
        }}
      >
        Add
      </CButton>
    )

  const handleAdjustmentTypeSelect = (type) => {
    if (
      editingClaim &&
      activeAdjustmentType !== type &&
      typeof window !== 'undefined' &&
      !window.confirm(
        'Switching claim types will discard the unsaved changes in the current editor. Continue?',
      )
    ) {
      return
    }
    if (editingClaim && activeAdjustmentType !== type) {
      resetClaimDrafts()
    }
    setActiveAdjustmentType(type)
    setShowClaimDraft(true)
  }

  const renderAdjustmentForm = () => (
    <section className="salary-form-panel mb-3" aria-labelledby="otherClaimAdjustmentTypeHeading">
      <div className="salary-form-panel-header">
        <h3 className="salary-form-panel-heading" id="otherClaimAdjustmentTypeHeading">
          Adjustment Type
        </h3>
      </div>
      <div className="salary-adjustment-type-row">
        {otherClaimTypes.map((type) => (
          <CButton
            key={type.key}
            className={`salary-adjustment-type-card${activeAdjustmentType === type.key ? ' salary-adjustment-type-card--active' : ''}`}
            color="primary"
            variant="outline"
            size="sm"
            type="button"
            aria-pressed={activeAdjustmentType === type.key}
            onClick={() => handleAdjustmentTypeSelect(type.key)}
          >
            {type.label}
          </CButton>
        ))}
      </div>

      {activeAdjustmentType === 'allowance' && (
        <MoneyClaimEditor
          idPrefix="otherAllowance"
          title="Non-Recurring Allowance"
          fieldPrefix="allowance"
          placeholder="Phone allowance"
          attachmentOptional
          formData={formData}
          showDraft={showClaimDraft}
          addAction={renderPanelAddAction()}
          attachmentInputVersion={attachmentInputVersion}
          isPreparing={attachmentProcessing.allowance}
          onChange={handleChange}
          onAttachmentChange={(file) => handleAttachmentChange('allowance', file)}
          onSave={() => handleSaveClaimDraft(addAllowance)}
          onCancel={handleCancelClaimDraft}
        />
      )}
      {activeAdjustmentType === 'expense' && (
        <MoneyClaimEditor
          idPrefix="otherExpense"
          title="Expense"
          fieldPrefix="expense"
          placeholder="Office supplies or professional fee"
          formData={formData}
          showDraft={showClaimDraft}
          addAction={renderPanelAddAction()}
          attachmentInputVersion={attachmentInputVersion}
          isPreparing={attachmentProcessing.expense}
          onChange={handleChange}
          onAttachmentChange={(file) => handleAttachmentChange('expense', file)}
          onSave={() => handleSaveClaimDraft(addExpense)}
          onCancel={handleCancelClaimDraft}
        />
      )}
      {activeAdjustmentType === 'medical' && (
        <MoneyClaimEditor
          idPrefix="otherMedical"
          title="Medical"
          fieldPrefix="medical"
          placeholder="Clinic, medicine, or medical claim"
          formData={formData}
          showDraft={showClaimDraft}
          addAction={renderPanelAddAction()}
          attachmentInputVersion={attachmentInputVersion}
          isPreparing={attachmentProcessing.medical}
          guidance={
            salaryProfile && Number(salaryProfile.yearlyMedicalClaim || 0) <= 0 ? (
              <CAlert color="warning" className="mb-3">
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                  <div>
                    <strong>Set your annual medical entitlement before submitting.</strong>
                    <div className="small mt-1">
                      Your medical claim draft will be kept while you update Salary Settings. HR can
                      verify the entitlement during claim review.
                    </div>
                  </div>
                  {onConfigureMedicalEntitlement && (
                    <CButton
                      color="warning"
                      type="button"
                      className="flex-shrink-0"
                      disabled={attachmentProcessing.medical}
                      onClick={handleConfigureMedicalEntitlement}
                    >
                      {attachmentProcessing.medical
                        ? 'Preparing receipt...'
                        : 'Set Medical Entitlement'}
                    </CButton>
                  )}
                </div>
              </CAlert>
            ) : null
          }
          onChange={handleChange}
          onAttachmentChange={(file) => handleAttachmentChange('medical', file)}
          onSave={() => handleSaveClaimDraft(addMedical)}
          onCancel={handleCancelClaimDraft}
        />
      )}
      {activeAdjustmentType === 'mileage' && (
        <TravelClaimEditor
          formData={formData}
          showDraft={showClaimDraft}
          addAction={renderPanelAddAction()}
          attachmentInputVersion={attachmentInputVersion}
          isPreparing={attachmentProcessing.mileage}
          isProjectOptionsLoading={isProjectOptionsLoading}
          projectOptions={projectOptions}
          onChange={handleChange}
          onAttachmentChange={handleTravelAttachmentChange}
          onAttachmentRemove={removeTravelAttachment}
          onSave={() => handleSaveClaimDraft(addTravelClaim)}
          onCancel={handleCancelClaimDraft}
        />
      )}
    </section>
  )

  if (isSubmitting || (notice.visible && notice.scope === 'submission-success')) {
    return (
      <CCardBody className="salary-section-body">
        <CAlert color={isSubmitting ? 'info' : notice.color} className="mb-3 py-3">
          {isSubmitting ? 'Preparing other claim...' : notice.message}
        </CAlert>
        {isSubmitting ? (
          <div className="d-flex align-items-center">
            <CSpinner size="sm" className="me-2" />
            Processing request...
          </div>
        ) : (
          <div className="salary-submit-actions">
            <CButton color="primary" size="sm" onClick={handleApplyAnother}>
              Apply Another
            </CButton>
            {onViewRecords && (
              <CButton color="secondary" variant="outline" size="sm" onClick={onViewRecords}>
                View Records
              </CButton>
            )}
          </div>
        )}
      </CCardBody>
    )
  }

  if (isLoading) {
    return (
      <CCardBody className="salary-section-body">
        <DataTableLoadingState message="Loading claim settings..." />
      </CCardBody>
    )
  }

  const draftStatusText =
    {
      dirty: 'Draft pending save',
      saving: 'Saving draft...',
      saved: 'Draft saved',
      restored: 'Draft restored',
      error: 'Saved on this device, but not synced to server',
    }[draftSaveState] || ''

  return (
    <CForm onSubmit={handleSubmit}>
      <CCardHeader className="salary-section-header">
        <div className="salary-section-heading-group">
          <h3 className="salary-form-panel-heading" id="otherClaimSummaryHeading">
            Other Claim Summary
          </h3>
        </div>
        {!isAdjusting && (
          <CButton
            color="primary"
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              setIsAdjusting(true)
              setShowClaimDraft(true)
            }}
          >
            Add Claim
          </CButton>
        )}
      </CCardHeader>
      <CCardBody className="salary-section-body">
        <input
          id="otherClaimMonth"
          type="hidden"
          name="claimMonth"
          value={formData.claimMonth}
          readOnly
        />
        <div className="salary-month-picker salary-month-picker--body" aria-label="Claim month">
          <span className="salary-month-picker-label">Claim month</span>
          <div className="salary-month-picker-buttons" role="group">
            {claimMonthOptions.map((option) => (
              <CButton
                key={option.value}
                color="primary"
                variant={selectedClaimMonth === option.value ? undefined : 'outline'}
                size="sm"
                type="button"
                className="salary-month-picker-button"
                aria-pressed={selectedClaimMonth === option.value}
                disabled={Boolean(activeRecordId)}
                onClick={() => handleClaimMonthSelect(option.value)}
              >
                {option.label}
              </CButton>
            ))}
          </div>
        </div>
      </CCardBody>
      {isAdjusting && (
        <CCardBody className="salary-section-body">{renderAdjustmentForm()}</CCardBody>
      )}
      <CCardBody className="salary-section-body" aria-labelledby="otherClaimSummaryHeading">
        <OtherClaimSummary
          allowanceItems={allowanceItems}
          expenseItems={expenseItems}
          mileageItems={mileageItems}
          medicalItems={medicalItems}
          claimsTotal={claimsTotal}
          onEdit={startEditClaimItem}
          onRemove={removeClaimItem}
        />
      </CCardBody>
      <CCardBody className="salary-settings-actions-body">
        {notice.visible && notice.scope !== 'submission-success' && (
          <CAlert
            ref={notice.scope === 'submission-error' ? submissionErrorRef : undefined}
            color={notice.color}
            className="py-2"
            dismissible
            onClose={hideNotice}
            role={notice.scope === 'submission-error' ? 'alert' : undefined}
            tabIndex={notice.scope === 'submission-error' ? -1 : undefined}
          >
            {notice.message}
          </CAlert>
        )}
        {draftSaveState === 'error' &&
          draftSaveError &&
          !(notice.visible && notice.scope === 'submission-error') && (
            <CAlert color="warning" className="py-2" role="alert">
              Your entries remain saved on this device. Server sync failed: {draftSaveError}
            </CAlert>
          )}
        <div className="salary-submit-actions">
          {draftStatusText && (
            <span className="salary-draft-save-state" role="status">
              {draftStatusText}
            </span>
          )}
          <CButton
            type="submit"
            color="primary"
            size="sm"
            disabled={
              isSubmitting ||
              draftSaveState === 'saving' ||
              Object.values(attachmentProcessing).some(Boolean)
            }
          >
            Submit
          </CButton>
        </div>
      </CCardBody>
    </CForm>
  )
}

export default OtherClaimApply
