const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
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
}) => ({
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
})

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

export const getCreatedAssignmentId = (result) =>
  result?.assignment_id ??
  result?.data?.assignment_id ??
  result?.vendor?.assignment_id ??
  result?.data?.vendor?.assignment_id ??
  null
