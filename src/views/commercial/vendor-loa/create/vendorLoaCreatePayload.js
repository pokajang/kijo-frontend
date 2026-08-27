import { compactCatalogDescription } from '../../../../utils/catalogDescription'

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const nullableText = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}

export const buildEquipmentServicesDescription = (project = {}) => {
  if (project.project_type !== 'Equipment Supply' || !Array.isArray(project.equipment_items)) {
    return ''
  }

  return project.equipment_items
    .map((item) =>
      [
        nullableText(item.item_name ?? item.item_description),
        nullableText(compactCatalogDescription(item.description))
          ? `Description: ${compactCatalogDescription(item.description)}`
          : null,
        nullableText(compactCatalogDescription(item.item_remarks))
          ? `Remarks: ${compactCatalogDescription(item.item_remarks)}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n')
}

export const buildVendorLoaCreatePayload = ({
  project,
  selectedVendor,
  awardAmount,
  paymentTerms,
  awardPosition,
  awardRemarks,
  servicesDescription,
  venueDetails,
  feeBreakdown,
}) => {
  const payload = {
    project_id: project?.id,
    vendor_id: selectedVendor?.vendor_id,
    award_value: toFiniteNumber(awardAmount, NaN),
    position: awardPosition,
    remarks: awardRemarks,
    services_description: servicesDescription,
    venue_details: venueDetails,
    fee_breakdown: feeBreakdown,
    payment_terms: String(paymentTerms || '').trim(),
    award_date: new Date().toISOString().split('T')[0],
  }

  if (project?.project_type === 'Equipment Supply') {
    if (!nullableText(awardRemarks)) delete payload.remarks
    if (!nullableText(servicesDescription)) delete payload.services_description
  }

  return payload
}

export const getVendorLoaUrl = ({ projectId, vendorId, assignmentId }) => {
  const params = new URLSearchParams({
    project_id: String(projectId),
    vendor_id: String(vendorId),
  })

  if (assignmentId) {
    params.set('assignment_id', String(assignmentId))
  }

  return `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(projectId)}/loa?${params.toString()}`
}

export const getVendorLoaWordUrl = ({ projectId, vendorId, assignmentId }) => {
  const params = new URLSearchParams({
    project_id: String(projectId),
    vendor_id: String(vendorId),
  })

  if (assignmentId) {
    params.set('assignment_id', String(assignmentId))
  }

  return `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(projectId)}/loa/word?${params.toString()}`
}

export const getCreatedAssignmentId = (result) =>
  result?.assignment_id ??
  result?.data?.assignment_id ??
  result?.vendor?.assignment_id ??
  result?.data?.vendor?.assignment_id ??
  null
