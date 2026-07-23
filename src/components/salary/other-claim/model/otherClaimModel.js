import { roundMoney } from '../../salaryCalculations'

export const OTHER_CLAIM_DRAFT_SCHEMA_VERSION = 5

export const otherClaimTypes = [
  { key: 'allowance', label: 'Non-Recurring Allowance' },
  { key: 'expense', label: 'Expense' },
  { key: 'medical', label: 'Medical' },
  { key: 'mileage', label: 'Travel & Mileage' },
]

export const travelCategories = [
  { value: 'mileage', label: 'Mileage' },
  { value: 'taxi', label: 'Taxi / e-hailing' },
  { value: 'toll', label: 'Toll' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other travel expense' },
]

export const distanceMethods = [
  { value: 'one_way', label: 'One-way trip' },
  { value: 'return_same_route', label: 'Return trip, same route' },
  { value: 'total_distance', label: 'Return trip, different routes' },
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

export const claimTravelCategory = (claim = {}) => {
  if (claim.travelCategory) return claim.travelCategory
  if (claim.type === 'Mileage') return 'mileage'
  if (claim.expenseCategory === 'combined') return 'legacy_combined'
  return claim.expenseCategory || ''
}

export const claimDistanceMethod = (claim = {}) =>
  claim.distanceMethod || (claim.tripMode === 'one_way' ? 'one_way' : 'return_same_route')

export const tripDistanceKm = (item = {}) => {
  const routeKm = Number(item.km || 0)
  return claimDistanceMethod(item) === 'return_same_route' ? routeKm * 2 : routeKm
}

export const formatMileageMeta = (item = {}) => {
  const km = Number(item.km || 0)
  if (!km) return ''

  switch (claimDistanceMethod(item)) {
    case 'one_way':
      return `${formatKm(km)} KM one-way`
    case 'total_distance':
      return `${formatKm(km)} KM total distance travelled`
    default:
      return `${formatKm(km)} KM one-way / ${formatKm(km * 2)} KM return`
  }
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
  travelCategory: 'mileage',
  travelDistanceMethod: 'return_same_route',
  travelLocationDetail: '',
  travelExpenseType: '',
  travelExpenseAmount: '',
  travelAttachments: [],
  mileageAttachment: null,
})

const attachmentClientId = (attachment = {}, index = 0) =>
  String(attachment.clientId || attachment.id || `attachment-${index}-${attachment.name || 'file'}`)

export const normalizeAttachment = (attachment = {}, index = 0) => {
  if (!attachment) return null

  return {
    ...attachment,
    clientId: attachmentClientId(attachment, index),
    purpose: attachment.purpose || '',
  }
}

export const normalizeAttachments = (claim = {}) => {
  const attachments = Array.isArray(claim.attachments)
    ? claim.attachments
    : claim.attachment
      ? [claim.attachment]
      : []

  return attachments.map(normalizeAttachment).filter(Boolean)
}

export const normalizeEditableClaim = (claim = {}) => {
  const attachments = normalizeAttachments(claim)

  return {
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
    travelCategory: claimTravelCategory(claim),
    distanceMethod: claimDistanceMethod(claim),
    mileageRate: claim.mileageRate ?? null,
    chargeToProjectId: claim.chargeToProjectId || '',
    locationDetail: claim.locationDetail || '',
    expenseType: claim.expenseType || '',
    attachments,
    attachment: attachments[0] || null,
  }
}

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
    clientId: attachment.clientId,
    purpose: attachment.purpose,
  }
}

export const serializeAttachment = (attachment) => {
  if (!attachment) return null
  return { ...serializeDraftAttachment(attachment), file: attachment.file }
}

export const serializeAttachments = (attachments = []) =>
  (Array.isArray(attachments) ? attachments : []).map(serializeAttachment).filter(Boolean)

export const serializeDraftAttachments = (attachments = []) =>
  (Array.isArray(attachments) ? attachments : []).map(serializeDraftAttachment).filter(Boolean)

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
  travelCategory: item.travelCategory || '',
  distanceMethod: item.distanceMethod || '',
  mileageRate: item.mileageRate ?? null,
  chargeToProjectId: item.chargeToProjectId || '',
  locationDetail: item.locationDetail || '',
  expenseType: item.expenseType || '',
  attachments: serializeDraftAttachments(
    item.attachments || (item.attachment ? [item.attachment] : []),
  ),
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
    travelCategory: item.travelCategory || claimTravelCategory({ ...item, type }),
    distanceMethod: item.distanceMethod || claimDistanceMethod(item),
    mileageRate: item.mileageRate ?? null,
    chargeToProjectId: item.chargeToProjectId || '',
    locationDetail: item.locationDetail || '',
    expenseType: item.expenseType || '',
    source: item.source,
    sourceLabel: item.sourceLabel,
    attachments: serializeAttachments(
      item.attachments || (item.attachment ? [item.attachment] : []),
    ),
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
    travelAttachments: serializeDraftAttachments(formData.travelAttachments),
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
  return Object.entries(createEmptyClaimFields()).some(([key, defaultValue]) => {
    if (Array.isArray(defaultValue)) return Array.isArray(fields[key]) && fields[key].length > 0
    return Boolean(fields[key]) && fields[key] !== defaultValue
  })
}

const normalizeDraftItems = (items) =>
  Array.isArray(items) ? items.map((item) => normalizeEditableClaim(item)) : []

export const stateFromDraft = (draft = {}, fallbackMonth = getCurrentClaimMonth()) => {
  const fields = draft.formData || {}
  const travelAttachments = Array.isArray(fields.travelAttachments)
    ? fields.travelAttachments.map(normalizeAttachment).filter(Boolean)
    : fields.mileageAttachment
      ? [normalizeAttachment(fields.mileageAttachment)]
      : []

  return {
    formData: {
      claimMonth: fields.claimMonth || fallbackMonth,
      mileageRate: String(fields.mileageRate || ''),
      ...createEmptyClaimFields(),
      ...fields,
      travelAttachments,
      mileageAttachment: travelAttachments[0] || null,
    },
    allowanceItems: normalizeDraftItems(draft.allowanceItems),
    expenseItems: normalizeDraftItems(draft.expenseItems),
    mileageItems: normalizeDraftItems(draft.mileageItems),
    medicalItems: normalizeDraftItems(draft.medicalItems),
  }
}

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

export const isCompleteClaim = (claim) => {
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
