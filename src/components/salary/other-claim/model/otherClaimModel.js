import { roundMoney } from '../../salaryCalculations'

export const OTHER_CLAIM_DRAFT_SCHEMA_VERSION = 4

export const otherClaimTypes = [
  { key: 'allowance', label: 'Non-Recurring Allowance' },
  { key: 'expense', label: 'Expense' },
  { key: 'medical', label: 'Medical' },
  { key: 'mileage', label: 'Travel & Mileage' },
]

export const createAttachmentProcessingState = () => ({
  allowance: false,
  expense: false,
  medical: false,
  mileage: false,
})

export const getCurrentClaimMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7)

export const buildClaimId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const toPositiveNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

export const formatKm = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return Number.isInteger(number) ? String(number) : String(roundMoney(number))
}

export const tripDistanceKm = (item = {}) => {
  const routeKm = Number(item.km || 0)
  return item.tripMode === 'one_way' ? routeKm : routeKm * 2
}

export const formatMileageMeta = (item = {}) => {
  const oneWayKm = Number(item.km || 0)
  if (!oneWayKm) return ''
  if (item.tripMode === 'one_way') return `${formatKm(oneWayKm)} KM one-way`
  return `${formatKm(oneWayKm)} KM one-way / ${formatKm(oneWayKm * 2)} KM return`
}

export const createEmptyClaimFields = () => ({
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
  mileagePurpose: '',
  mileageChargeToMode: 'company',
  mileageChargeToProjectId: '',
  mileageChargeTo: '',
  mileageKm: '',
  mileageTripMode: 'return',
  travelExpenseCategory: '',
  travelExpenseAmount: '',
  mileageAttachment: null,
})

export const normalizeEditableClaim = (claim = {}) => ({
  id: claim.id || buildClaimId(),
  date: claim.date || '',
  description: claim.description || '',
  amount: Number(claim.amount || 0),
  source: claim.source || '',
  sourceLabel: claim.sourceLabel || '',
  km: claim.km,
  startLocation: claim.startLocation || '',
  endLocation: claim.endLocation || '',
  tripMode: claim.tripMode || (claim.type === 'Mileage' ? 'return' : ''),
  travelGroupId: claim.travelGroupId || '',
  expenseCategory: claim.expenseCategory || '',
  attachment: claim.attachment || null,
})

export const serializeDraftAttachment = (attachment) => {
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

export const serializeAttachment = (attachment) => {
  if (!attachment) return null
  return { ...serializeDraftAttachment(attachment), file: attachment.file }
}

export const serializeDraftItem = (item) => ({
  id: item.id,
  date: item.date || '',
  description: item.description || '',
  amount: Number(item.amount || 0),
  source: item.source || '',
  sourceLabel: item.sourceLabel || '',
  km: item.km,
  startLocation: item.startLocation || '',
  endLocation: item.endLocation || '',
  tripMode: item.tripMode || '',
  travelGroupId: item.travelGroupId || '',
  expenseCategory: item.expenseCategory || '',
  attachment: serializeDraftAttachment(item.attachment),
})

export const mapClaimItems = (items = [], type) =>
  items.map((item) => ({
    id: item.id,
    type,
    date: item.date,
    description: item.description,
    amount: item.amount,
    meta: type === 'Mileage' ? formatMileageMeta(item) : '',
    km: item.km,
    startLocation: item.startLocation,
    endLocation: item.endLocation,
    tripMode: item.tripMode,
    travelGroupId: item.travelGroupId,
    expenseCategory: item.expenseCategory,
    source: item.source,
    sourceLabel: item.sourceLabel,
    attachment: serializeAttachment(item.attachment),
  }))

export const createDraftPayload = ({
  formData,
  allowanceItems,
  expenseItems,
  mileageItems,
  medicalItems,
}) => ({
  schemaVersion: OTHER_CLAIM_DRAFT_SCHEMA_VERSION,
  formData: {
    claimMonth: formData.claimMonth,
    mileageRate: formData.mileageRate,
    ...createEmptyClaimFields(),
    ...formData,
    allowanceAttachment: serializeDraftAttachment(formData.allowanceAttachment),
    expenseAttachment: serializeDraftAttachment(formData.expenseAttachment),
    medicalAttachment: serializeDraftAttachment(formData.medicalAttachment),
    mileageAttachment: serializeDraftAttachment(formData.mileageAttachment),
  },
  allowanceItems: allowanceItems.map(serializeDraftItem),
  expenseItems: expenseItems.map(serializeDraftItem),
  mileageItems: mileageItems.map(serializeDraftItem),
  medicalItems: medicalItems.map(serializeDraftItem),
})

export const draftHasContent = (draft) => {
  if (!draft) return false
  if (
    ['allowanceItems', 'expenseItems', 'mileageItems', 'medicalItems'].some(
      (key) => draft[key]?.length,
    )
  ) {
    return true
  }

  const fields = draft.formData || {}
  return Object.entries(createEmptyClaimFields()).some(
    ([key, defaultValue]) => Boolean(fields[key]) && fields[key] !== defaultValue,
  )
}

const normalizeDraftItems = (items) =>
  Array.isArray(items) ? items.map((item) => normalizeEditableClaim(item)) : []

export const stateFromDraft = (draft = {}, fallbackMonth = getCurrentClaimMonth()) => ({
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

export const stateFromRecord = (record = null) => {
  const claimMonth = record?.claimMonthValue || getCurrentClaimMonth()
  const claims = Array.isArray(record?.claims) ? record.claims : []

  return {
    formData: { claimMonth, mileageRate: '', ...createEmptyClaimFields() },
    allowanceItems: claims
      .filter((claim) => claim.type === 'Allowance')
      .map(normalizeEditableClaim),
    expenseItems: claims.filter((claim) => claim.type === 'Expense').map(normalizeEditableClaim),
    mileageItems: claims.filter((claim) => claim.type === 'Mileage').map(normalizeEditableClaim),
    medicalItems: claims.filter((claim) => claim.type === 'Medical').map(normalizeEditableClaim),
  }
}

export const firstClaimType = (record) => {
  const first = record?.claims?.find((claim) =>
    ['Allowance', 'Expense', 'Mileage', 'Medical'].includes(claim?.type),
  )?.type
  return first ? first.toLowerCase() : 'allowance'
}

export const parseMileageDescription = (description = '') => {
  const [startLocation = '', endLocation = ''] = description.split(' to ')
  return { startLocation, endLocation }
}

export const isCompleteClaim = (claim, claims = []) => {
  if (!claim?.id || !claim?.type || !claim?.description?.trim()) return false
  if (claim.type === 'Mileage') {
    const hasLinkedTravelExpense = claims.some(
      (item) =>
        item.type === 'Expense' &&
        claim.travelGroupId &&
        item.travelGroupId === claim.travelGroupId &&
        Number(item.amount || 0) > 0,
    )
    return Boolean(
      claim.date &&
        claim.startLocation?.trim() &&
        claim.endLocation?.trim() &&
        (Number(claim.km || 0) > 0 || hasLinkedTravelExpense),
    )
  }
  return Number(claim.amount || 0) > 0
}
