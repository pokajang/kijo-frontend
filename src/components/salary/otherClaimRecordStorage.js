import { apiFetch, apiJson } from '../../api/apiClient'
import { dispatchAppNotificationsChanged } from '../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'
export const otherClaimRecordsChangedEvent = 'kijo:other-claim-records-changed'
const claimTypes = new Set(['Allowance', 'Expense', 'Mileage', 'Medical'])
const attachmentMimes = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const attachmentExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png'])
const maxServerAttachmentBytes = 5 * 1024 * 1024

export const formatClaimMonth = (claimMonth) => {
  if (!claimMonth) return 'Current period'

  const [year, month] = String(claimMonth).split('-').map(Number)
  if (!year || !month) return claimMonth

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export const normalizeOtherClaimStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  return status
}

const normalizeAttachment = (attachment) => {
  if (!attachment) return null

  return {
    id: attachment.id,
    name: attachment.name || attachment.originalName || 'attachment',
    size: Number(attachment.size || 0),
    type: attachment.type || attachment.mimeType || '',
    url: attachment.url || attachment.downloadUrl || '',
    downloadUrl: attachment.downloadUrl || attachment.url || '',
    dataUrl: attachment.dataUrl || '',
    file: attachment.file,
    originalName: attachment.originalName || attachment.name || '',
    originalSize: Number(attachment.originalSize || attachment.size || 0),
    compressed: Boolean(attachment.compressed),
  }
}

export const normalizeOtherClaim = (claim = {}) => ({
  id: claim.id,
  type: claim.type,
  date: claim.date || '',
  description: claim.description || '',
  amount: Number(claim.amount || 0),
  meta: claim.meta || '',
  km: claim.km,
  startLocation: claim.startLocation || '',
  endLocation: claim.endLocation || '',
  source: claim.source || '',
  sourceLabel: claim.sourceLabel || '',
  tripMode: claim.tripMode || (claim.type === 'Mileage' ? 'return' : ''),
  travelGroupId: claim.travelGroupId || '',
  expenseCategory: claim.expenseCategory || '',
  attachment: normalizeAttachment(claim.attachment),
})

export const normalizeOtherClaimRecord = (record = {}) => ({
  id: record.id,
  staffId: record.staffId,
  staffName: record.staffName || '',
  staffCode: record.staffCode || '',
  claimMonth: record.claimMonth || formatClaimMonth(record.claimMonthValue),
  claimMonthValue: record.claimMonthValue || '',
  claimsTotal: Number(record.claimsTotal || 0),
  medicalClaimsTotal: Number(record.medicalClaimsTotal || 0),
  status: normalizeOtherClaimStatus(record.status || 'Submitted'),
  claims: Array.isArray(record.claims) ? record.claims.map(normalizeOtherClaim) : [],
  draftPayload:
    record.draftPayload &&
    typeof record.draftPayload === 'object' &&
    !Array.isArray(record.draftPayload)
      ? record.draftPayload
      : null,
  draftSavedAt: record.draftSavedAt || '',
  submittedAt: record.submittedAt || '',
  checkedBy: record.checkedBy || null,
  checkedAt: record.checkedAt || '',
  checkedStatus: record.checkedStatus || '',
  checkedRemarks: record.checkedRemarks || '',
  checkerName: record.checkerName || '',
  checkerCode: record.checkerCode || '',
  approvedBy: record.approvedBy || null,
  approvedAt: record.approvedAt || '',
  approvedStatus: record.approvedStatus || '',
  approvedRemarks: record.approvedRemarks || '',
  approverName: record.approverName || '',
  approverCode: record.approverCode || '',
  workflow: record.workflow || null,
})

const normalizeOtherClaimRecordResponse = (payload = {}) => {
  const record = normalizeOtherClaimRecord(payload.record || {})
  record.mailSent = payload.mail_sent
  record.mailStatus = payload.mail_status || ''
  record.mailMessage = payload.mail_message || ''
  return record
}

const dispatchRecordsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(otherClaimRecordsChangedEvent))
  }
}

const normalizeClaimDateForPayload = (date) => {
  if (!date) return null
  return /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : date
}

const getExtension = (fileName = '') => String(fileName).split('.').pop()?.toLowerCase() || ''

const isServerSafeAttachmentFile = (file) => {
  if (!file) return false
  const extension = getExtension(file.name)
  return (
    Number(file.size || 0) <= maxServerAttachmentBytes &&
    (attachmentMimes.has(file.type) || attachmentExtensions.has(extension))
  )
}

const isServerSafeDraftClaim = (claim = {}, claims = []) => {
  const type = String(claim.type || '')
  const amount = Number(claim.amount || 0)
  const km = Number(claim.km || 0)
  const date = normalizeClaimDateForPayload(claim.date)

  if (!claim.id || !claimTypes.has(type)) return false
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (String(claim.description || '').length > 255) return false
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999.99) return false
  if (
    claim.km !== undefined &&
    claim.km !== null &&
    (!Number.isFinite(km) || km < 0 || km > 999999.99)
  ) {
    return false
  }

  if (type === 'Mileage') {
    const hasLinkedTravelExpense = claims.some(
      (item) =>
        item.type === 'Expense' &&
        claim.travelGroupId &&
        item.travelGroupId === claim.travelGroupId &&
        Number(item.amount || 0) > 0,
    )
    return Boolean(
      date &&
        String(claim.startLocation || '').trim() &&
        String(claim.endLocation || '').trim() &&
        (km > 0 || hasLinkedTravelExpense),
    )
  }

  return Boolean(String(claim.description || '').trim() && amount > 0)
}

const claimForPayload = (claim) => ({
  id: String(claim.id),
  type: claim.type,
  date: normalizeClaimDateForPayload(claim.date),
  description: claim.description,
  amount: claim.amount,
  meta: claim.meta || '',
  km: claim.km ?? null,
  startLocation: claim.startLocation || '',
  endLocation: claim.endLocation || '',
  source: claim.source || '',
  sourceLabel: claim.sourceLabel || '',
  tripMode: claim.tripMode || '',
  travelGroupId: claim.travelGroupId || '',
  expenseCategory: claim.expenseCategory || '',
  attachmentId: claim.attachment?.id ?? null,
})

const attachmentFileFromDataUrl = (attachment) => {
  if (attachment?.file) return attachment.file
  if (!attachment?.dataUrl || typeof File === 'undefined') return null

  const [header = '', data = ''] = String(attachment.dataUrl).split(',')
  if (!header.startsWith('data:') || !data) return null

  const mimeType =
    header.match(/^data:([^;]+)/)?.[1] || attachment.type || 'application/octet-stream'
  const isBase64 = header.includes(';base64')
  const binary = isBase64 ? atob(data) : decodeURIComponent(data)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new File([bytes], attachment.name || attachment.originalName || 'attachment', {
    type: mimeType,
    lastModified: Date.now(),
  })
}

const appendClaimAttachments = (formData, claims) => {
  claims.forEach((claim) => {
    if (claim.attachment?.id) return

    const file = attachmentFileFromDataUrl(claim.attachment)
    if (isServerSafeAttachmentFile(file)) {
      formData.append(`attachments[${claim.id}]`, file, claim.attachment.name || file.name)
    }
  })
}

export const getOtherClaimRecords = async () => {
  const payload = await apiJson(`${API_BASE}hr/salary/other-claims`)
  return Array.isArray(payload.records) ? payload.records.map(normalizeOtherClaimRecord) : []
}

export const getOtherClaimRecordUrlKey = (record = {}) => record.id || record.claimMonthValue

export const findOtherClaimRecord = async (id) => {
  try {
    const payload = await apiJson(`${API_BASE}hr/salary/other-claims/${encodeURIComponent(id)}`, {
      silentError: true,
    })
    return payload.record ? normalizeOtherClaimRecord(payload.record) : null
  } catch (error) {
    if (error?.notFound || error?.status === 404) return null
    throw error
  }
}

export const findOtherClaimRecordByUrlKey = async (key) => {
  if (!key) return null

  if (/^\d{4}-\d{2}$/.test(String(key))) {
    const records = await getOtherClaimRecords()
    const matchedRecord = records.find((record) => record.claimMonthValue === key)
    return matchedRecord?.id ? findOtherClaimRecord(matchedRecord.id) : null
  }

  return findOtherClaimRecord(key)
}

export const saveOtherClaimRecord = async (record) => {
  const formData = new FormData()
  const claims = Array.isArray(record.claims) ? record.claims : []

  if (record.id && !String(record.id).startsWith('other-claim-')) {
    formData.append('application_id', String(record.id))
  }
  formData.append('claim_month', record.claimMonthValue)
  formData.append('claims', JSON.stringify(claims.map(claimForPayload)))
  if (String(record.amendmentReason || '').trim()) {
    formData.append('amendment_reason', String(record.amendmentReason).trim())
  }
  appendClaimAttachments(formData, claims)

  const payload = await apiJson(`${API_BASE}hr/salary/other-claims`, {
    method: 'POST',
    body: formData,
  })
  dispatchRecordsChanged()
  dispatchAppNotificationsChanged()
  return normalizeOtherClaimRecordResponse(payload)
}

export const fetchOtherClaimDraft = async (claimMonth) => {
  if (!claimMonth) return null

  const payload = await apiJson(
    `${API_BASE}hr/salary/other-claims/draft?claim_month=${encodeURIComponent(claimMonth)}`,
    { silentError: true },
  )
  return payload.record ? normalizeOtherClaimRecord(payload.record) : null
}

export const saveOtherClaimDraft = async (draft) => {
  const formData = new FormData()
  const draftClaims = Array.isArray(draft.claims) ? draft.claims : []
  const claims = draftClaims.filter((claim) => isServerSafeDraftClaim(claim, draftClaims))
  const claimMonth = draft.claimMonthValue || draft.draftPayload?.formData?.claimMonth || ''

  if (!/^\d{4}-\d{2}$/.test(claimMonth)) return null

  formData.append('claim_month', claimMonth)
  formData.append('claims', JSON.stringify(claims.map(claimForPayload)))
  formData.append('draft_payload', JSON.stringify(draft.draftPayload || {}))
  appendClaimAttachments(formData, claims)

  const payload = await apiJson(`${API_BASE}hr/salary/other-claims/draft`, {
    method: 'PUT',
    body: formData,
    silentError: true,
  })
  dispatchRecordsChanged()
  return payload.record ? normalizeOtherClaimRecord(payload.record) : null
}

export const clearOtherClaimServerDraft = async (claimMonth) => {
  if (!claimMonth) return

  await apiJson(
    `${API_BASE}hr/salary/other-claims/draft?claim_month=${encodeURIComponent(claimMonth)}`,
    {
      method: 'DELETE',
      silentError: true,
    },
  )
  dispatchRecordsChanged()
}

export const removeOtherClaimRecord = async (id, reason = '') => {
  const trimmedReason = String(reason || '').trim()
  await apiJson(`${API_BASE}hr/salary/other-claims/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...(trimmedReason
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: trimmedReason }),
        }
      : {}),
  })
  dispatchRecordsChanged()
  dispatchAppNotificationsChanged()
}

export const exportOtherClaimPdf = async (id) => {
  const response = await apiFetch(
    `${API_BASE}hr/salary/other-claims/${encodeURIComponent(id)}/claims-pdf`,
  )
  if (!response.ok) {
    throw new Error(response.statusText || 'Unable to export other claim PDF.')
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get('content-disposition')
        ?.match(/filename="?([^"]+)"?/i)?.[1]
        ?.trim() || `other-claims-${id}.pdf`,
  }
}
