export const normalizeApprovalStatus = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (raw === 'needs revision' || raw === 'needs_revision') return 'Needs Revision'
  if (raw === 'verified' || raw === 'verify') return 'Verified'
  if (raw === 'concurred' || raw === 'concur') return 'Concurred'
  return 'Pending'
}

export const normalizeSessionRoles = (roles) => {
  const arr = Array.isArray(roles) ? roles : []
  return arr
    .map((role) =>
      String(role || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
}

export const hasMeetingVerificationRole = (roles) =>
  normalizeSessionRoles(roles).some(
    (role) =>
      role.includes('manager') ||
      role.includes('hr') ||
      role.includes('admin') ||
      role.includes('super'),
  )
