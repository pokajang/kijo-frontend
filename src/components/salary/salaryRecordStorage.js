import { apiFetch, apiJson } from '../../api/apiClient'
import { dispatchAppNotificationsChanged } from '../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'
export const salaryRecordsChangedEvent = 'kijo:salary-records-changed'
const salaryClaimTypes = new Set(['Allowance'])

const pdfExportErrorMessage = async (response, fallback) => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return response.statusText || fallback

  try {
    const data = await response.clone().json()
    return data?.message || data?.error || response.statusText || fallback
  } catch {
    return response.statusText || fallback
  }
}
export const formatSalaryMonth = (salaryMonth) => {
  if (!salaryMonth) return 'Current period'

  const [year, month] = String(salaryMonth).split('-').map(Number)
  if (!year || !month) return salaryMonth

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
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

const normalizeClaim = (claim = {}) => ({
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
  attachment: normalizeAttachment(claim.attachment),
})

const salaryClaimsForRecord = (claims) =>
  Array.isArray(claims)
    ? claims.map(normalizeClaim).filter((claim) => salaryClaimTypes.has(claim.type))
    : []

const salaryClaimsTotal = (claims) =>
  claims.reduce((total, claim) => total + Number(claim.amount || 0), 0)

export const normalizeSalaryStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  return status
}

const normalizeRecord = (record = {}) => {
  const hasClaimDetails = Array.isArray(record.claims)
  const salaryClaims = salaryClaimsForRecord(record.claims)

  return {
    id: record.id,
    salaryMonth: record.salaryMonth || formatSalaryMonth(record.salaryMonthValue),
    salaryMonthValue: record.salaryMonthValue || '',
    basicSalary: Number(record.basicSalary || 0),
    claimsTotal: hasClaimDetails
      ? salaryClaimsTotal(salaryClaims)
      : Number(record.claimsTotal || 0),
    medicalClaimsTotal: 0,
    employeeDeductions: Number(record.employeeDeductions || 0),
    employerContributions: Number(record.employerContributions || 0),
    payableSalary: Number(record.payableSalary || 0),
    status: normalizeSalaryStatus(record.status || 'Submitted'),
    claims: salaryClaims,
    deductions: record.deductions || {},
    draftPayload:
      record.draftPayload &&
      typeof record.draftPayload === 'object' &&
      !Array.isArray(record.draftPayload)
        ? record.draftPayload
        : null,
    draftSavedAt: record.draftSavedAt || '',
    submittedAt: record.submittedAt || '',
  }
}

const normalizeRecordResponse = (payload = {}) => {
  const record = normalizeRecord(payload.record || {})
  record.mailSent = payload.mail_sent
  record.mailStatus = payload.mail_status || ''
  record.mailMessage = payload.mail_message || ''
  return record
}

const dispatchRecordsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(salaryRecordsChangedEvent))
  }
}

const normalizeClaimDateForPayload = (date) => {
  if (!date) return null
  return /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : date
}

const isServerSafeDraftClaim = (claim = {}) => {
  const type = String(claim.type || '')
  const amount = Number(claim.amount || 0)
  const km = Number(claim.km || 0)
  const date = normalizeClaimDateForPayload(claim.date)

  if (!claim.id || !salaryClaimTypes.has(type)) return false
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (String(claim.description || '').length > 255) return false
  if (String(claim.meta || '').length > 255) return false
  if (String(claim.source || '').length > 64) return false
  if (String(claim.sourceLabel || '').length > 255) return false
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999.99) return false
  if (
    claim.km !== undefined &&
    claim.km !== null &&
    (!Number.isFinite(km) || km < 0 || km > 999999.99)
  ) {
    return false
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
  attachmentId: claim.attachment?.id ?? null,
})

export const getSalaryRecords = async () => {
  const payload = await apiJson(`${API_BASE}hr/salary/records`)
  return Array.isArray(payload.records) ? payload.records.map(normalizeRecord) : []
}

export const getSalaryRecordUrlKey = (record = {}) => record.salaryMonthValue || record.id

export const findSalaryRecord = async (id) => {
  try {
    const payload = await apiJson(`${API_BASE}hr/salary/records/${encodeURIComponent(id)}`, {
      silentError: true,
    })
    return payload.record ? normalizeRecord(payload.record) : null
  } catch (error) {
    if (error?.notFound || error?.status === 404) return null
    throw error
  }
}

export const findSalaryRecordByUrlKey = async (key) => {
  if (!key) return null

  if (/^\d{4}-\d{2}$/.test(String(key))) {
    const records = await getSalaryRecords()
    const matchedRecord = records.find((record) => record.salaryMonthValue === key)
    return matchedRecord?.id ? findSalaryRecord(matchedRecord.id) : null
  }

  return findSalaryRecord(key)
}

export const saveSalaryRecord = async (record) => {
  const formData = new FormData()
  const claims = Array.isArray(record.claims)
    ? record.claims.filter((claim) => claim?.type === 'Allowance')
    : []

  formData.append('salary_month', record.salaryMonthValue)
  formData.append('basic_salary', String(record.basicSalary))
  formData.append('claims_total', String(record.claimsTotal))
  formData.append('employee_deductions', String(record.employeeDeductions))
  formData.append('employer_contributions', String(record.deductions?.employerTotal || 0))
  formData.append('payable_salary', String(record.payableSalary))
  formData.append('deductions', JSON.stringify(record.deductions || {}))
  formData.append('claims', JSON.stringify(claims.map(claimForPayload)))
  if (String(record.amendmentReason || '').trim()) {
    formData.append('amendment_reason', String(record.amendmentReason).trim())
  }

  const payload = await apiJson(`${API_BASE}hr/salary/applications`, {
    method: 'POST',
    body: formData,
  })
  dispatchRecordsChanged()
  dispatchAppNotificationsChanged()
  return normalizeRecordResponse(payload)
}

export const fetchSalaryApplicationDraft = async (salaryMonth) => {
  if (!salaryMonth) return null

  const payload = await apiJson(
    `${API_BASE}hr/salary/applications/draft?salary_month=${encodeURIComponent(salaryMonth)}`,
    { silentError: true },
  )
  return payload.record ? normalizeRecord(payload.record) : null
}

export const saveSalaryApplicationDraft = async (draft) => {
  const formData = new FormData()
  const claims = Array.isArray(draft.claims)
    ? draft.claims.filter((claim) => claim?.type === 'Allowance').filter(isServerSafeDraftClaim)
    : []
  const salaryMonth = draft.salaryMonthValue || draft.draftPayload?.formData?.salaryMonth || ''

  if (!/^\d{4}-\d{2}$/.test(salaryMonth)) return null

  formData.append('salary_month', salaryMonth)
  formData.append('basic_salary', String(draft.basicSalary || 0))
  formData.append('claims', JSON.stringify(claims.map(claimForPayload)))
  formData.append('draft_payload', JSON.stringify(draft.draftPayload || {}))
  const payload = await apiJson(`${API_BASE}hr/salary/applications/draft`, {
    method: 'PUT',
    body: formData,
    silentError: true,
  })
  dispatchRecordsChanged()
  return payload.record ? normalizeRecord(payload.record) : null
}

export const clearSalaryApplicationServerDraft = async (salaryMonth) => {
  if (!salaryMonth) return

  await apiJson(
    `${API_BASE}hr/salary/applications/draft?salary_month=${encodeURIComponent(salaryMonth)}`,
    {
      method: 'DELETE',
      silentError: true,
    },
  )
  dispatchRecordsChanged()
}

export const removeSalaryRecord = async (id, reason = '') => {
  const trimmedReason = String(reason || '').trim()
  await apiJson(`${API_BASE}hr/salary/records/${encodeURIComponent(id)}`, {
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

export const exportSalaryClaimsPdf = async (id) => {
  const response = await apiFetch(
    `${API_BASE}hr/salary/records/${encodeURIComponent(id)}/claims-pdf`,
  )
  if (!response.ok) {
    throw new Error(await pdfExportErrorMessage(response, 'Unable to export salary claims PDF.'))
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get('content-disposition')
        ?.match(/filename="?([^"]+)"?/i)?.[1]
        ?.trim() || `salary-claims-${id}.pdf`,
  }
}

export const exportSalaryPayslipPdf = async (id) => {
  const response = await apiFetch(
    `${API_BASE}hr/salary/records/${encodeURIComponent(id)}/payslip-pdf`,
  )
  if (!response.ok) {
    throw new Error(await pdfExportErrorMessage(response, 'Unable to export salary payslip PDF.'))
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get('content-disposition')
        ?.match(/filename="?([^"]+)"?/i)?.[1]
        ?.trim() || `salary-payslip-${id}.pdf`,
  }
}
