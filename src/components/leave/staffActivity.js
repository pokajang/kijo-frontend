const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const hasTerminatedAt = (value) => {
  if (value === null || typeof value === 'undefined') return false
  return String(value).trim() !== ''
}

export const getStaffStatus = (record = {}) =>
  record.staff_status ??
  record.applicant_status ??
  (record.applicant_name || record.applicant_code || record.type || record.applied_at
    ? undefined
    : record.status)

export const getStaffTerminatedAt = (record = {}) =>
  record.staff_terminated_at ?? record.applicant_terminated_at ?? record.terminated_at

export const isActiveStaffRecord = (record = {}) => {
  if (hasTerminatedAt(getStaffTerminatedAt(record))) return false

  const status = normalizeStatus(getStaffStatus(record))
  if (!status) return true

  return status === 'active'
}

export const filterActiveStaffRecords = (records = [], includeInactive = false) =>
  includeInactive ? records : records.filter((record) => isActiveStaffRecord(record))
