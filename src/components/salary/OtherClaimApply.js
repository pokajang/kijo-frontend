import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilExternalLink, cilPencil, cilTrash } from '@coreui/icons'
import { DataTableLoadingState } from '../datatable'
import { formatAttachmentSize, prepareSalaryAttachment } from './attachmentUtils'
import {
  AttachmentInput,
  AttachmentPreviewModal,
  ClaimDraftActions,
  FormPanelHeading,
} from './ApplySalary'
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
import { calculateMileageAmount, formatMoney, roundMoney } from './salaryCalculations'
import {
  createSalaryPreviewColumns,
  formatSignedSalaryMoney,
  SalaryPayablePreviewTable,
} from './SalaryTables'

const colorByType = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
}

const otherClaimTypes = [
  { key: 'allowance', label: 'Non-Recurring Allowance' },
  { key: 'expense', label: 'Expense' },
  { key: 'medical', label: 'Medical' },
  { key: 'mileage', label: 'Mileage' },
]

const createAttachmentProcessingState = () => ({
  allowance: false,
  expense: false,
  medical: false,
  mileage: false,
})

const getCurrentClaimMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7)
const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const toPositiveNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

const formatKm = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return Number.isInteger(number) ? String(number) : String(roundMoney(number))
}

const formatMileageMeta = (item = {}) => {
  const oneWayKm = Number(item.km || 0)
  if (!oneWayKm) return ''
  return `${formatKm(oneWayKm)} KM one-way / ${formatKm(oneWayKm * 2)} KM return`
}

const buildClaimSummaryLabel = ({ item, index, showKm = false }) => {
  const meta = [item.date, item.sourceLabel, showKm ? formatMileageMeta(item) : null]
    .filter(Boolean)
    .join(' - ')
  const attachmentName = item.attachment
    ? `${item.attachment.name || item.attachment.originalName || 'attachment'}${
        item.attachment.size ? ` (${formatAttachmentSize(item.attachment.size)})` : ''
      }`
    : ''

  return (
    <>
      <span>
        {index + 1}. {item.description}
      </span>
      {meta && <span className="salary-preview-note salary-preview-note--inline">{meta}</span>}
      {attachmentName && (
        <span className="salary-preview-note salary-preview-note--inline">{attachmentName}</span>
      )}
    </>
  )
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

const serializeAttachment = (attachment) => {
  if (!attachment) return null

  return {
    ...serializeDraftAttachment(attachment),
    file: attachment.file,
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

const mapClaimItems = (items = [], type) =>
  items.map((item) => ({
    id: item.id,
    type,
    date: item.date,
    description: item.description,
    amount: item.amount,
    meta: item.km ? `${item.km} KM one-way / ${roundMoney(item.km * 2)} KM return` : '',
    km: item.km,
    startLocation: item.startLocation,
    endLocation: item.endLocation,
    source: item.source,
    sourceLabel: item.sourceLabel,
    attachment: serializeAttachment(item.attachment),
  }))

const createDraftPayload = ({
  formData,
  allowanceItems,
  expenseItems,
  mileageItems,
  medicalItems,
}) => ({
  formData: {
    claimMonth: formData.claimMonth,
    mileageRate: formData.mileageRate,
    allowanceDate: formData.allowanceDate,
    allowanceDescription: formData.allowanceDescription,
    allowanceAmount: formData.allowanceAmount,
    allowanceAttachment: serializeDraftAttachment(formData.allowanceAttachment),
    expenseDate: formData.expenseDate,
    expenseDescription: formData.expenseDescription,
    expenseAmount: formData.expenseAmount,
    expenseAttachment: serializeDraftAttachment(formData.expenseAttachment),
    medicalDate: formData.medicalDate,
    medicalDescription: formData.medicalDescription,
    medicalAmount: formData.medicalAmount,
    medicalAttachment: serializeDraftAttachment(formData.medicalAttachment),
    mileageDate: formData.mileageDate,
    startLocation: formData.startLocation,
    endLocation: formData.endLocation,
    mileageKm: formData.mileageKm,
  },
  allowanceItems: allowanceItems.map(serializeDraftItem),
  expenseItems: expenseItems.map(serializeDraftItem),
  mileageItems: mileageItems.map(serializeDraftItem),
  medicalItems: medicalItems.map(serializeDraftItem),
})

const draftHasContent = (draft) => {
  if (!draft) return false
  if (
    ['allowanceItems', 'expenseItems', 'mileageItems', 'medicalItems'].some(
      (key) => draft[key]?.length,
    )
  ) {
    return true
  }
  const fields = draft.formData || {}
  return [
    fields.allowanceDate,
    fields.allowanceDescription,
    fields.allowanceAmount,
    fields.allowanceAttachment,
    fields.expenseDate,
    fields.expenseDescription,
    fields.expenseAmount,
    fields.expenseAttachment,
    fields.medicalDate,
    fields.medicalDescription,
    fields.medicalAmount,
    fields.medicalAttachment,
    fields.mileageDate,
    fields.startLocation,
    fields.endLocation,
    fields.mileageKm,
  ].some(Boolean)
}

const normalizeDraftItems = (items) =>
  Array.isArray(items) ? items.map((item) => normalizeEditableClaim(item)) : []

const stateFromDraft = (draft = {}, fallbackMonth = getCurrentClaimMonth()) => ({
  formData: {
    claimMonth: draft.formData?.claimMonth || fallbackMonth,
    mileageRate: String(draft.formData?.mileageRate || ''),
    ...createEmptyClaimFields(),
    ...(draft.formData || {}),
  },
  allowanceItems: normalizeDraftItems(draft.allowanceItems),
  expenseItems: normalizeDraftItems(draft.expenseItems),
  mileageItems: normalizeDraftItems(draft.mileageItems),
  medicalItems: normalizeDraftItems(draft.medicalItems),
})

const stateFromRecord = (record = null) => {
  const claimMonth = record?.claimMonthValue || getCurrentClaimMonth()
  const claims = Array.isArray(record?.claims) ? record.claims : []

  return {
    formData: {
      claimMonth,
      mileageRate: '',
      ...createEmptyClaimFields(),
    },
    allowanceItems: claims
      .filter((claim) => claim.type === 'Allowance')
      .map(normalizeEditableClaim),
    expenseItems: claims.filter((claim) => claim.type === 'Expense').map(normalizeEditableClaim),
    mileageItems: claims.filter((claim) => claim.type === 'Mileage').map(normalizeEditableClaim),
    medicalItems: claims.filter((claim) => claim.type === 'Medical').map(normalizeEditableClaim),
  }
}

const firstClaimType = (record) => {
  const first = record?.claims?.find((claim) =>
    ['Allowance', 'Expense', 'Mileage', 'Medical'].includes(claim?.type),
  )?.type
  return first ? first.toLowerCase() : 'allowance'
}

const parseMileageDescription = (description = '') => {
  const [startLocation = '', endLocation = ''] = description.split(' to ')
  return { startLocation, endLocation }
}

const isCompleteClaim = (claim) => {
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
  const [previewAttachment, setPreviewAttachment] = useState(null)
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

  const setActiveRecordId = useCallback((recordId) => {
    setActiveRecordIdState(recordId || null)
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

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
      showNotice('warning', 'Enter expense date, description, and a valid amount.')
      return false
    }
    if (!formData.expenseAttachment) {
      showNotice('warning', 'Attach the expense receipt before saving.')
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
      showNotice('warning', 'Enter medical date, description, and a valid amount.')
      return false
    }
    if (!formData.medicalAttachment) {
      showNotice('warning', 'Attach the medical receipt before saving.')
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
      showNotice('warning', 'Enter mileage date, route, and valid one-way KM.')
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

  const removeClaimItem = useCallback(
    (type, id) => {
      const setters = {
        allowance: setAllowanceItems,
        expense: setExpenseItems,
        medical: setMedicalItems,
        mileage: setMileageItems,
      }
      setters[type]?.((prev) => prev.filter((item) => item.id !== id))
      if (editingClaim?.type === type && editingClaim.id === id) {
        setEditingClaim(null)
        setFormData((prev) => ({ ...prev, ...createEmptyClaimFields() }))
        resetAttachmentProcessing()
        resetAttachmentInputs()
      }
    },
    [editingClaim, resetAttachmentInputs, resetAttachmentProcessing],
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
        }))
      }
      setIsAdjusting(true)
      setActiveAdjustmentType(type)
      setShowClaimDraft(true)
      resetAttachmentInputs()
      return true
    },
    [allowanceItems, expenseItems, medicalItems, mileageItems, resetAttachmentInputs],
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
  const previewRows = useMemo(
    () => [
      { id: 'claims-total', item: 'Claims Total', amount: claimsTotal, isSubtotal: true },
      ...[
        ['allowance', 'Allowance', allowanceItems],
        ['expense', 'Expense', expenseItems],
        ['mileage', 'Mileage', mileageItems],
        ['medical', 'Medical', medicalItems],
      ].flatMap(([key, label, items]) => {
        const total = roundMoney(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
        if (total <= 0) return []
        return [
          { id: key, item: label, amount: total, isClaimGroup: true },
          ...items.map((item, index) => ({
            id: `${key}-${item.id}`,
            item: buildClaimSummaryLabel({ item, index, showKm: key === 'mileage' }),
            actionLabel: item.description,
            amount: item.amount,
            isClaimItem: true,
            canEditClaim: true,
            claimType: key,
            claimId: item.id,
            attachment: item.attachment,
          })),
        ]
      }),
    ],
    [allowanceItems, claimsTotal, expenseItems, medicalItems, mileageItems],
  )

  const payablePreviewColumns = useMemo(() => {
    const [itemColumn, amountColumn] = createSalaryPreviewColumns()

    return [
      itemColumn,
      {
        ...amountColumn,
        render: (row) => {
          const amount =
            row.isDetail || row.isClaimItem ? (
              formatSignedSalaryMoney(row.amount)
            ) : (
              <strong>{formatSignedSalaryMoney(row.amount)}</strong>
            )

          if (!row.canEditClaim) return amount

          return (
            <span className="salary-summary-claim-actions">
              <span>{amount}</span>
              <span className="salary-claim-row-controls salary-summary-claim-row-controls">
                {(row.attachment?.dataUrl ||
                  row.attachment?.url ||
                  row.attachment?.downloadUrl) && (
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    className="salary-claim-icon-button"
                    type="button"
                    title="Open attachment"
                    aria-label={`Open ${row.attachment.name || row.attachment.originalName || 'attachment'}`}
                    onClick={() => setPreviewAttachment(row.attachment)}
                  >
                    <CIcon icon={cilExternalLink} size="sm" />
                  </CButton>
                )}
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  className="salary-claim-icon-button"
                  type="button"
                  title="Edit"
                  aria-label={`Edit ${row.actionLabel || 'claim'}`}
                  onClick={() => startEditClaimItem(row.claimType, row.claimId)}
                >
                  <CIcon icon={cilPencil} size="sm" />
                </CButton>
                <CButton
                  color="danger"
                  variant="ghost"
                  size="sm"
                  className="salary-claim-icon-button salary-claim-icon-button--danger"
                  type="button"
                  title="Remove"
                  aria-label={`Remove ${row.actionLabel || 'claim'}`}
                  onClick={() => removeClaimItem(row.claimType, row.claimId)}
                >
                  <CIcon icon={cilTrash} size="sm" />
                </CButton>
              </span>
            </span>
          )
        },
      },
    ]
  }, [removeClaimItem, startEditClaimItem])

  const renderPayablePreviewMobileItem = (row) => {
    const rowClassName = [
      'salary-preview-mobile-row',
      (row.isSubtotal || row.isGroup || row.isClaimGroup) && 'salary-preview-mobile-row--group',
      row.isDetail && 'salary-preview-mobile-row--detail',
      row.isClaimItem && 'salary-preview-mobile-row--deep',
    ]
      .filter(Boolean)
      .join(' ')
    const amount =
      row.isDetail || row.isClaimItem ? (
        formatSignedSalaryMoney(row.amount)
      ) : (
        <strong>{formatSignedSalaryMoney(row.amount)}</strong>
      )

    return (
      <div className={rowClassName}>
        <span className="salary-preview-mobile-label">{row.item}</span>
        <span className="salary-preview-mobile-amount salary-summary-mobile-amount">
          <span>{amount}</span>
          {row.canEditClaim && (
            <span className="salary-summary-claim-row-controls">
              {(row.attachment?.dataUrl || row.attachment?.url || row.attachment?.downloadUrl) && (
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  className="salary-claim-icon-button"
                  type="button"
                  title="Open attachment"
                  aria-label={`Open ${row.attachment.name || row.attachment.originalName || 'attachment'}`}
                  onClick={() => setPreviewAttachment(row.attachment)}
                >
                  <CIcon icon={cilExternalLink} size="sm" />
                </CButton>
              )}
              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                className="salary-claim-icon-button"
                type="button"
                title="Edit"
                aria-label={`Edit ${row.actionLabel || 'claim'}`}
                onClick={() => startEditClaimItem(row.claimType, row.claimId)}
              >
                <CIcon icon={cilPencil} size="sm" />
              </CButton>
              <CButton
                color="danger"
                variant="ghost"
                size="sm"
                className="salary-claim-icon-button salary-claim-icon-button--danger"
                type="button"
                title="Remove"
                aria-label={`Remove ${row.actionLabel || 'claim'}`}
                onClick={() => removeClaimItem(row.claimType, row.claimId)}
              >
                <CIcon icon={cilTrash} size="sm" />
              </CButton>
            </span>
          )}
        </span>
      </div>
    )
  }

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
        claims: allClaims.filter(isCompleteClaim),
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
            className={`salary-adjustment-type-card${
              activeAdjustmentType === type.key ? ' salary-adjustment-type-card--active' : ''
            }`}
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
        <section
          className="salary-adjustment-input-panel mt-3"
          aria-labelledby="otherAllowanceHeading"
        >
          <FormPanelHeading
            id="otherAllowanceHeading"
            title="Non-Recurring Allowance"
            action={renderPanelAddAction()}
          />
          {showClaimDraft && (
            <>
              <CRow className="g-3 salary-claim-field-row">
                <CCol xs={12} md="auto" className="salary-claim-date-col">
                  <CFormLabel htmlFor="otherAllowanceDate" className="mb-1">
                    Date
                  </CFormLabel>
                  <CFormInput
                    id="otherAllowanceDate"
                    type="date"
                    name="allowanceDate"
                    value={formData.allowanceDate}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="otherAllowanceDescription" className="mb-1">
                    Description
                  </CFormLabel>
                  <CFormInput
                    id="otherAllowanceDescription"
                    name="allowanceDescription"
                    value={formData.allowanceDescription}
                    onChange={handleChange}
                    placeholder="Phone allowance"
                  />
                </CCol>
                <CCol xs={12} md="auto" className="salary-claim-amount-col">
                  <CFormLabel htmlFor="otherAllowanceAmount" className="mb-1">
                    Amount
                  </CFormLabel>
                  <CFormInput
                    id="otherAllowanceAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    name="allowanceAmount"
                    value={formData.allowanceAmount}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-attachment-col">
                  <AttachmentInput
                    id="otherAllowanceAttachment"
                    label="Attachment (optional)"
                    attachment={formData.allowanceAttachment}
                    inputKey={`other-allowance-${attachmentInputVersion}`}
                    isPreparing={attachmentProcessing.allowance}
                    onChange={(file) => handleAttachmentChange('allowance', file)}
                  />
                </CCol>
              </CRow>
              <ClaimDraftActions
                onSave={() => handleSaveClaimDraft(addAllowance)}
                onCancel={handleCancelClaimDraft}
                isPreparing={attachmentProcessing.allowance}
              />
            </>
          )}
        </section>
      )}

      {activeAdjustmentType === 'expense' && (
        <section
          className="salary-adjustment-input-panel mt-3"
          aria-labelledby="otherExpenseHeading"
        >
          <FormPanelHeading
            id="otherExpenseHeading"
            title="Expense"
            action={renderPanelAddAction()}
          />
          {showClaimDraft && (
            <>
              <CRow className="g-3 salary-claim-field-row">
                <CCol xs={12} md="auto" className="salary-claim-date-col">
                  <CFormLabel htmlFor="otherExpenseDate" className="mb-1">
                    Date
                  </CFormLabel>
                  <CFormInput
                    id="otherExpenseDate"
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="otherExpenseDescription" className="mb-1">
                    Description
                  </CFormLabel>
                  <CFormInput
                    id="otherExpenseDescription"
                    name="expenseDescription"
                    value={formData.expenseDescription}
                    onChange={handleChange}
                    placeholder="Parking, toll, or meal claim"
                  />
                </CCol>
                <CCol xs={12} md="auto" className="salary-claim-amount-col">
                  <CFormLabel htmlFor="otherExpenseAmount" className="mb-1">
                    Amount
                  </CFormLabel>
                  <CFormInput
                    id="otherExpenseAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    name="expenseAmount"
                    value={formData.expenseAmount}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-attachment-col">
                  <AttachmentInput
                    id="otherExpenseAttachment"
                    attachment={formData.expenseAttachment}
                    inputKey={`other-expense-${attachmentInputVersion}`}
                    isPreparing={attachmentProcessing.expense}
                    onChange={(file) => handleAttachmentChange('expense', file)}
                  />
                </CCol>
              </CRow>
              <ClaimDraftActions
                onSave={() => handleSaveClaimDraft(addExpense)}
                onCancel={handleCancelClaimDraft}
                isPreparing={attachmentProcessing.expense}
              />
            </>
          )}
        </section>
      )}

      {activeAdjustmentType === 'medical' && (
        <section
          className="salary-adjustment-input-panel mt-3"
          aria-labelledby="otherMedicalHeading"
        >
          <FormPanelHeading
            id="otherMedicalHeading"
            title="Medical"
            action={renderPanelAddAction()}
          />
          {showClaimDraft && (
            <>
              <CRow className="g-3 salary-claim-field-row">
                <CCol xs={12} md="auto" className="salary-claim-date-col">
                  <CFormLabel htmlFor="otherMedicalDate" className="mb-1">
                    Date
                  </CFormLabel>
                  <CFormInput
                    id="otherMedicalDate"
                    type="date"
                    name="medicalDate"
                    value={formData.medicalDate}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="otherMedicalDescription" className="mb-1">
                    Description
                  </CFormLabel>
                  <CFormInput
                    id="otherMedicalDescription"
                    name="medicalDescription"
                    value={formData.medicalDescription}
                    onChange={handleChange}
                    placeholder="Clinic, medicine, or medical claim"
                  />
                </CCol>
                <CCol xs={12} md="auto" className="salary-claim-amount-col">
                  <CFormLabel htmlFor="otherMedicalAmount" className="mb-1">
                    Amount
                  </CFormLabel>
                  <CFormInput
                    id="otherMedicalAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    name="medicalAmount"
                    value={formData.medicalAmount}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-attachment-col">
                  <AttachmentInput
                    id="otherMedicalAttachment"
                    attachment={formData.medicalAttachment}
                    inputKey={`other-medical-${attachmentInputVersion}`}
                    isPreparing={attachmentProcessing.medical}
                    onChange={(file) => handleAttachmentChange('medical', file)}
                  />
                </CCol>
              </CRow>
              <ClaimDraftActions
                onSave={() => handleSaveClaimDraft(addMedical)}
                onCancel={handleCancelClaimDraft}
                isPreparing={attachmentProcessing.medical}
              />
            </>
          )}
        </section>
      )}

      {activeAdjustmentType === 'mileage' && (
        <section
          className="salary-adjustment-input-panel mt-3"
          aria-labelledby="otherMileageHeading"
        >
          <FormPanelHeading
            id="otherMileageHeading"
            title="Mileage"
            action={renderPanelAddAction()}
          />
          {showClaimDraft && (
            <>
              <CRow className="g-3 salary-claim-field-row">
                <CCol xs={12} md="auto" className="salary-claim-date-col">
                  <CFormLabel htmlFor="otherMileageDate" className="mb-1">
                    Date
                  </CFormLabel>
                  <CFormInput
                    id="otherMileageDate"
                    type="date"
                    name="mileageDate"
                    value={formData.mileageDate}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="otherStartLocation" className="mb-1">
                    From
                  </CFormLabel>
                  <CFormInput
                    id="otherStartLocation"
                    name="startLocation"
                    value={formData.startLocation}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="otherEndLocation" className="mb-1">
                    To
                  </CFormLabel>
                  <CFormInput
                    id="otherEndLocation"
                    name="endLocation"
                    value={formData.endLocation}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} md="auto" className="salary-claim-km-col">
                  <CFormLabel htmlFor="otherMileageKm" className="mb-1">
                    KM (one-way)
                  </CFormLabel>
                  <CFormInput
                    id="otherMileageKm"
                    type="number"
                    min="0"
                    step="0.1"
                    name="mileageKm"
                    value={formData.mileageKm}
                    onChange={handleChange}
                  />
                  <div className="salary-field-help">Return trip is calculated automatically.</div>
                </CCol>
              </CRow>
              <ClaimDraftActions
                onSave={() => handleSaveClaimDraft(addMileage)}
                onCancel={handleCancelClaimDraft}
              />
            </>
          )}
        </section>
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
      {isAdjusting && (
        <CCardBody className="salary-section-body">{renderAdjustmentForm()}</CCardBody>
      )}
      <CCardBody className="salary-section-body" aria-labelledby="otherClaimSummaryHeading">
        <SalaryPayablePreviewTable
          rows={previewRows}
          columns={payablePreviewColumns}
          payableSalary={claimsTotal}
          renderMobileItem={renderPayablePreviewMobileItem}
          footerRows={[
            {
              key: 'total-claim',
              className: 'salary-payable-preview-footer-row',
              cells: [
                { key: 'item', content: <strong>Total Claim</strong> },
                {
                  key: 'amount',
                  align: 'right',
                  content: <strong>{formatMoney(claimsTotal)}</strong>,
                },
              ],
            },
          ]}
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
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </CForm>
  )
}

export default OtherClaimApply
