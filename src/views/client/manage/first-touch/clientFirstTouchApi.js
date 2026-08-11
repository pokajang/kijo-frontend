import { apiJson } from '../../../../api/apiClient'
import { dispatchAppNotificationsChanged } from '../../../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const apiUrl = (path) => `${API_BASE}${String(path).replace(/^\/+/, '')}`

const normalizeProof = (proof) => ({
  ...proof,
  previewUrl: proof.previewUrl ? apiUrl(proof.previewUrl) : '',
})

const normalizeClaim = (claim) =>
  claim
    ? {
        ...claim,
        proofs: (claim.proofs || []).map(normalizeProof),
        revisions: claim.revisions || [],
      }
    : null

const normalizeRecord = (record) => ({
  ...record,
  firstTouch: normalizeClaim(record.firstTouch),
  claims: (record.claims || []).map(normalizeClaim),
  disputes: (record.disputes || []).map((dispute) => ({
    ...dispute,
    proofs: (dispute.proofs || []).map(normalizeProof),
  })),
  clarifications: (record.clarifications || []).map((clarification) => ({
    ...clarification,
    proofs: (clarification.proofs || []).map(normalizeProof),
  })),
  projects: record.projects || [],
  timeline: record.timeline || [],
})

const append = (formData, key, value) => {
  if (value === null || value === undefined || value === '') return
  formData.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
}

const appendClaimFields = (formData, claim) => {
  const fields = {
    source_group: claim.sourceGroup,
    source_value: claim.sourceValue,
    channel: claim.channel,
    method: claim.method,
    occurred_on: claim.occurredAt,
    occurred_time: claim.occurredTime,
    occurrence_precision: claim.occurrencePrecision,
    occurrence_timezone: claim.occurrenceTimezone,
    chronology_needs_review: claim.chronologyNeedsReview,
    client_contact: claim.clientContact,
    contact_mode: claim.contactMode,
    amiosh_contact_staff_id: claim.amioshContactStaffId,
    amiosh_contact_name: claim.amioshContact,
    amiosh_contact_code: claim.amioshContactCode,
    referrer_staff_id: claim.referrerStaffId,
    referrer_name: claim.referrerName,
    referrer_code: claim.referrerCode,
    employment_context: claim.employmentContext,
    employment_boundary: claim.employmentBoundary,
    employment_ended_on: claim.employmentEndedAt,
    employment_departure_type: claim.employmentDepartureType,
    linked_inquiry_id: claim.linkedInquiryId,
    inquiry_ref: claim.inquiryRef,
    notes: claim.notes,
  }
  Object.entries(fields).forEach(([key, value]) => append(formData, key, value))
}

const appendEvidence = (formData, proofs = [], { includeExisting = false } = {}) => {
  proofs.forEach((proof) => {
    if (proof.file instanceof File) {
      formData.append('evidence[]', proof.file, proof.originalName || proof.file.name)
    } else if (includeExisting && Number.isFinite(Number(proof.id))) {
      formData.append('keep_evidence_ids[]', String(proof.id))
    }
  })
}

export async function listClientFirstTouches() {
  const response = await apiJson(apiUrl('client-first-touches'))
  return (response.data || []).map(normalizeRecord)
}

export async function getClientFirstTouch(companyId) {
  const response = await apiJson(apiUrl(`client-first-touches/${companyId}`))
  return normalizeRecord(response.data)
}

export async function listFirstTouchStaffOptions() {
  const response = await apiJson(apiUrl('client-first-touches/staff-options'))
  return response.data || []
}

export async function listFirstTouchInquiryOptions(companyId) {
  const response = await apiJson(apiUrl(`client-first-touches/${companyId}/inquiry-options`))
  return response.data || []
}

export async function submitClientFirstTouchClaim(companyId, claim) {
  const formData = new FormData()
  appendClaimFields(formData, claim)
  appendEvidence(formData, claim.proofs)
  const response = await apiJson(apiUrl(`client-first-touches/${companyId}/claims`), {
    method: 'POST',
    body: formData,
  })
  dispatchAppNotificationsChanged()
  return normalizeRecord(response.data)
}

export async function updateClientFirstTouchClaim(companyId, claimId, claim) {
  const formData = new FormData()
  appendClaimFields(formData, claim)
  append(formData, 'expected_version', claim.expectedVersion)
  append(formData, 'edit_reason', claim.editReason)
  appendEvidence(formData, claim.proofs, { includeExisting: true })
  const response = await apiJson(apiUrl(`client-first-touches/${companyId}/claims/${claimId}`), {
    method: 'POST',
    body: formData,
  })
  dispatchAppNotificationsChanged()
  return normalizeRecord(response.data)
}

export async function submitClientFirstTouchDispute(companyId, dispute) {
  const formData = new FormData()
  append(formData, 'claim_id', dispute.claimId)
  append(formData, 'reason', dispute.reason)
  append(formData, 'explanation', dispute.explanation)
  appendEvidence(formData, dispute.proofs)
  const response = await apiJson(apiUrl(`client-first-touches/${companyId}/disputes`), {
    method: 'POST',
    body: formData,
  })
  dispatchAppNotificationsChanged()
  return normalizeRecord(response.data)
}

export async function listClientFirstTouchConflicts() {
  const response = await apiJson(apiUrl('client-first-touch-conflicts'))
  return (response.data || []).map(normalizeRecord)
}

export async function resolveClientFirstTouchConflict(conflictId, resolution) {
  const response = await apiJson(apiUrl(`client-first-touch-conflicts/${conflictId}/resolve`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: resolution.decision,
      note: resolution.note,
      selected_claim_id: resolution.selectedClaimId || null,
      clarification_recipient_staff_id: resolution.clarificationRecipientStaffId || null,
    }),
  })
  dispatchAppNotificationsChanged()
  return normalizeRecord(response.data)
}

export async function respondClientFirstTouchClarification(conflictId, clarificationId, response) {
  const formData = new FormData()
  append(formData, 'response', response.response)
  appendEvidence(formData, response.proofs)
  const result = await apiJson(
    apiUrl(`client-first-touch-conflicts/${conflictId}/clarifications/${clarificationId}/respond`),
    { method: 'POST', body: formData },
  )
  dispatchAppNotificationsChanged()
  return normalizeRecord(result.data)
}
