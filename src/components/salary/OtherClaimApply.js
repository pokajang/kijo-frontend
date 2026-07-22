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
  createAttachmentProcessingState,
  createDraftPayload,
  createEmptyClaimFields,
  draftHasContent,
  firstClaimType,
  getCurrentClaimMonth,
  isCompleteClaim,
  mapClaimItems,
  otherClaimTypes,
  parseMileageDescription,
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

const getMileageChargeToFormState = (chargeToLabel, projectOptions = []) => {
  const cleanedLabel = String(chargeToLabel || '').trim()
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
}) => {
  const initialType = firstClaimType(editRecord)
  const [isAdjusting, setIsAdjusting] = useState(Boolean(editRecord) || showAdjustments)
  const [activeAdjustmentType, setActiveAdjustmentType] = useState(initialType)
  const [showClaimDraft, setShowClaimDraft] = useState(Boolean(editRecord))
  const [notice, setNotice] = useState({
    visible: false,
    message: '',
    color: 'info',
    scope: 'general',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(!editRecord)
  const [salaryProfile, setSalaryProfile] = useState(null)
  const initialDraftSaveStateRef = useRef('idle')
  const [draftSaveState, setDraftSaveState] = useState(() => initialDraftSaveStateRef.current)
  const [attachmentInputVersion, setAttachmentInputVersion] = useState(0)
  const [attachmentProcessing, setAttachmentProcessing] = useState(createAttachmentProcessingState)
  const attachmentProcessingRef = useRef(attachmentProcessing)
  const draftSaveTimerRef = useRef(null)
  const initialRecordRef = useRef(editRecord)
  const amendmentReasonRef = useRef(String(amendmentReason || '').trim())
  const hasPersistedDraftRef = useRef(false)
  const hasSubmittedRef = useRef(false)
  const initialStateRef = useRef(null)

  if (!initialStateRef.current) {
    const claimMonth = editRecord?.claimMonthValue || getCurrentClaimMonth()
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
          setDraftSaveState('restored')
          setFormData(restoredState.formData)
          setAllowanceItems(restoredState.allowanceItems)
          setExpenseItems(restoredState.expenseItems)
          setMileageItems(restoredState.mileageItems)
          setMedicalItems(restoredState.medicalItems)
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

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
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

  const addMileage = () => {
    if (attachmentProcessingRef.current.mileage) return false
    const km = toPositiveNumber(formData.mileageKm)
    const travelExpenseAmount = toPositiveNumber(formData.travelExpenseAmount)
    const chargeToMode = formData.mileageChargeToMode || 'company'
    const selectedProjectOption =
      chargeToMode === 'project'
        ? getProjectOptionByValue(projectOptions, formData.mileageChargeToProjectId)
        : null
    const chargeTo =
      chargeToMode === 'project'
        ? selectedProjectOption
          ? selectedProjectOption.label
          : ''
        : 'Company'
    const hasTravelExpenseDetails = Boolean(
      String(formData.travelExpenseAmount ?? '').trim() ||
        formData.travelExpenseCategory ||
        formData.mileageAttachment,
    )
    if (
      chargeToMode === 'project' &&
      (!formData.mileageChargeToProjectId || !selectedProjectOption)
    ) {
      showNotice('warning', 'Select a project before saving travel & mileage.')
      return false
    }
    if (
      !formData.mileageDate ||
      !formData.startLocation.trim() ||
      !formData.endLocation.trim() ||
      !formData.mileagePurpose.trim() ||
      (!km && !hasTravelExpenseDetails)
    ) {
      showNotice(
        'warning',
        'Enter travel date, route, purpose, and either mileage KM or travel expense details.',
      )
      return false
    }
    if (hasTravelExpenseDetails && !travelExpenseAmount) {
      showNotice('warning', 'Enter a valid travel expense amount or clear the expense details.')
      return false
    }
    if (hasTravelExpenseDetails && !formData.travelExpenseCategory) {
      showNotice(
        'warning',
        'Select the combined, parking, toll, taxi, or other travel expense type.',
      )
      return false
    }
    if (hasTravelExpenseDetails && !formData.mileageAttachment) {
      showNotice('warning', 'Attach the travel expense receipt before saving.')
      return false
    }
    const startLocation = formData.startLocation.trim()
    const endLocation = formData.endLocation.trim()
    const purpose = formData.mileagePurpose.trim()
    const editingMileage =
      editingClaim?.type === 'mileage'
        ? mileageItems.find((item) => item.id === editingClaim.id)
        : null
    const travelGroupId = editingMileage?.travelGroupId || buildClaimId()
    const nextItem = {
      id: editingClaim?.type === 'mileage' ? editingClaim.id : buildClaimId(),
      date: formData.mileageDate,
      description: purpose,
      startLocation,
      endLocation,
      km: roundMoney(km),
      tripMode: formData.mileageTripMode || 'return',
      travelGroupId,
      source: chargeTo ? 'manual-allocation' : '',
      sourceLabel: chargeTo,
      amount: calculateMileageAmount(km, formData.mileageRate, formData.mileageTripMode),
      attachment: null,
    }
    setMileageItems((prev) =>
      editingClaim?.type === 'mileage'
        ? prev.map((item) => (item.id === editingClaim.id ? nextItem : item))
        : [...prev, nextItem],
    )
    setExpenseItems((prev) => {
      const previousTravelExpense = prev.find((item) => item.travelGroupId === travelGroupId)
      const withoutCurrentTravelExpense = prev.filter(
        (item) => item.travelGroupId !== travelGroupId,
      )
      if (!travelExpenseAmount) return withoutCurrentTravelExpense

      const categoryLabel = {
        combined: 'Parking / taxi / toll / others',
        parking: 'Parking',
        toll: 'Toll',
        taxi: 'Taxi',
        other: 'Other travel expense',
      }[formData.travelExpenseCategory]
      return [
        ...withoutCurrentTravelExpense,
        {
          id: previousTravelExpense?.id || buildClaimId(),
          date: formData.mileageDate,
          description: `${categoryLabel}: ${purpose}`,
          amount: roundMoney(travelExpenseAmount),
          source: chargeTo ? 'manual-allocation' : '',
          sourceLabel: chargeTo,
          travelGroupId,
          expenseCategory: formData.travelExpenseCategory,
          attachment: formData.mileageAttachment,
        },
      ]
    })
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
      travelExpenseCategory: '',
      travelExpenseAmount: '',
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
      setters[type]?.((prev) => prev.filter((item) => item.id !== id))
      if (type === 'mileage') {
        const removedMileage = mileageItems.find((item) => item.id === id)
        if (removedMileage?.travelGroupId) {
          setExpenseItems((prev) =>
            prev.filter((item) => item.travelGroupId !== removedMileage.travelGroupId),
          )
        }
      }
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

      if (type === 'expense' && item.travelGroupId) {
        const linkedMileage = mileageItems.find(
          (mileageItem) => mileageItem.travelGroupId === item.travelGroupId,
        )
        if (linkedMileage) {
          setEditingClaim({ type: 'mileage', id: linkedMileage.id })
          const locations = parseMileageDescription(linkedMileage.description)
          setFormData((prev) => ({
            ...prev,
            mileageDate: linkedMileage.date || '',
            startLocation: linkedMileage.startLocation || locations.startLocation,
            endLocation: linkedMileage.endLocation || locations.endLocation,
            mileagePurpose: linkedMileage.description || '',
            ...getMileageChargeToFormState(linkedMileage.sourceLabel, projectOptions),
            mileageKm: String(linkedMileage.km ?? ''),
            mileageTripMode: linkedMileage.tripMode || 'return',
            travelExpenseCategory: item.expenseCategory || '',
            travelExpenseAmount: String(item.amount ?? ''),
            mileageAttachment: item.attachment || null,
          }))
          setIsAdjusting(true)
          setActiveAdjustmentType('mileage')
          setShowClaimDraft(true)
          resetAttachmentInputs()
          return true
        }
      }

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
        const travelExpense = expenseItems.find(
          (expenseItem) => item.travelGroupId && expenseItem.travelGroupId === item.travelGroupId,
        )
        setFormData((prev) => ({
          ...prev,
          mileageDate: item.date || '',
          startLocation: item.startLocation || locations.startLocation,
          endLocation: item.endLocation || locations.endLocation,
          mileagePurpose: item.description || '',
          ...getMileageChargeToFormState(item.sourceLabel, projectOptions),
          mileageKm: String(item.km ?? ''),
          mileageTripMode: item.tripMode || 'return',
          travelExpenseCategory: travelExpense?.expenseCategory || '',
          travelExpenseAmount: travelExpense ? String(travelExpense.amount ?? '') : '',
          mileageAttachment: travelExpense?.attachment || null,
        }))
      }
      setIsAdjusting(true)
      setActiveAdjustmentType(type)
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

  useEffect(() => {
    if (
      hasSubmittedRef.current ||
      (initialRecordRef.current && initialRecordRef.current.status !== 'Draft') ||
      isLoading ||
      isSubmitting
    ) {
      return undefined
    }
    const claimMonth = draftPayload.formData.claimMonth || getCurrentClaimMonth()
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)

    if (!hasDraftContent) {
      clearOtherClaimDraft({ claimMonth })
      if (hasPersistedDraftRef.current) {
        draftSaveTimerRef.current = window.setTimeout(() => {
          clearOtherClaimServerDraft(claimMonth)
            .then(() => {
              hasPersistedDraftRef.current = false
              setDraftSaveState('idle')
            })
            .catch(() => setDraftSaveState('error'))
        }, 800)
      } else {
        setDraftSaveState('idle')
      }
      return () => {
        if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
      }
    }

    writeOtherClaimDraft({ claimMonth, draft: draftPayload })
    setDraftSaveState('dirty')
    draftSaveTimerRef.current = window.setTimeout(() => {
      setDraftSaveState('saving')
      saveOtherClaimDraft({
        claimMonthValue: claimMonth,
        claims: allClaims.filter((claim) => isCompleteClaim(claim, allClaims)),
        draftPayload,
      })
        .then(() => {
          hasPersistedDraftRef.current = true
          setDraftSaveState('saved')
        })
        .catch(() => setDraftSaveState('error'))
    }, 1200)

    return () => {
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
    }
  }, [allClaims, draftPayload, hasDraftContent, isLoading, isSubmitting])

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
    try {
      setIsSubmitting(true)
      const savedRecord = await saveOtherClaimRecord({
        id: activeRecordId || `other-claim-${claimMonth}`,
        claimMonth: formatClaimMonth(claimMonth),
        claimMonthValue: claimMonth,
        claimsTotal,
        status: 'Submitted',
        claims: allClaims,
        submittedAt: new Date().toISOString(),
        amendmentReason: amendmentReasonRef.current,
      })
      setActiveRecordId(savedRecord.id || null)
      hasSubmittedRef.current = true
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current)
      clearOtherClaimDraft({ claimMonth })
      clearOtherClaimServerDraft(claimMonth).catch(() => {})
      hasPersistedDraftRef.current = false
      setDraftSaveState('idle')
      if (savedRecord.mailStatus === 'digest') {
        showNotice(
          'success',
          savedRecord.mailMessage ||
            'Other claim was submitted for review. Reviewers will receive the daily pending-work digest when applicable.',
          { scope: 'submission' },
        )
      } else if (savedRecord.mailSent === true) {
        showNotice('success', 'Other claim was submitted for review.', { scope: 'submission' })
      } else {
        showNotice(
          'warning',
          savedRecord.mailMessage ||
            'Other claim was submitted, but workflow notification delivery could not be confirmed.',
          { scope: 'submission' },
        )
      }
    } catch (err) {
      const message = err?.message || 'Could not submit other claim.'
      showNotice('error', message, { scope: 'submission' })
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
            onClick={() => {
              setActiveAdjustmentType(type.key)
              setShowClaimDraft(true)
            }}
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
          placeholder="Parking, toll, or meal claim"
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
          onAttachmentChange={(file) => handleAttachmentChange('mileage', file)}
          onSave={() => handleSaveClaimDraft(addMileage)}
          onCancel={handleCancelClaimDraft}
        />
      )}
    </section>
  )

  if (isSubmitting || (notice.visible && notice.scope === 'submission')) {
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
      error: 'Draft save failed',
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
        {notice.visible && notice.scope !== 'submission' && (
          <CAlert color={notice.color} className="py-2" dismissible onClose={hideNotice}>
            {notice.message}
          </CAlert>
        )}
        <div className="salary-submit-actions">
          {draftStatusText && (
            <span className="salary-draft-save-state" role="status">
              {draftStatusText}
            </span>
          )}
          <CButton type="submit" color="primary" size="sm" disabled={isSubmitting}>
            Submit
          </CButton>
        </div>
      </CCardBody>
    </CForm>
  )
}

export default OtherClaimApply
