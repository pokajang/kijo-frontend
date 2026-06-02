import { isDateInPeriodRange } from '../filters'

const DATE_YEAR_RE = /^(\d{4})/
const UNKNOWN_YEAR = 'Unknown'

const hasValue = (value) => value !== null && typeof value !== 'undefined' && value !== ''

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const getFirstValue = (...values) => {
  const value = values.find(hasValue)
  return hasValue(value) ? value : ''
}

export const getLeaveStatusSortPriority = (status) => {
  switch (status) {
    case 'Pending':
      return 0
    case 'Approved':
      return 1
    case 'Rejected':
      return 2
    case 'Cancelled':
      return 3
    default:
      return 4
  }
}

export const normalizeLeaveRecordForFilters = (record = {}) => ({
  leaveType: getFirstValue(record.leaveType, record.type, record.leave_type),
  status: getFirstValue(record.status),
  reason: getFirstValue(record.reason),
  appliedAt: getFirstValue(record.appliedAt, record.applied_at),
  startDate: getFirstValue(record.startDate, record.start_date),
  endDate: getFirstValue(record.endDate, record.end_date),
  staffId: getFirstValue(record.staffId, record.staff_id),
  searchText: [
    record.leaveType,
    record.type,
    record.leave_type,
    record.reason,
    record.status,
    record.staff,
    record.applicant_name,
    record.applicant_code,
    record.reviewer_name,
    record.reviewer_code,
    record.approver_name,
    record.approver_code,
    record.canceller_name,
    record.canceller_code,
    record.reviewed_status,
    record.approved_status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase(),
})

export const getLeaveRecordScopeDate = (record = {}) =>
  normalizeLeaveRecordForFilters(record).startDate || null

export const getLeaveRecordYearGroupKey = (record = {}) => {
  const match = String(getLeaveRecordScopeDate(record) || '').match(DATE_YEAR_RE)
  return match ? match[1] : UNKNOWN_YEAR
}

export const compareLeaveRecordYearGroupsDesc = (left, right) => {
  if (left === right) return 0
  if (left === UNKNOWN_YEAR) return 1
  if (right === UNKNOWN_YEAR) return -1

  const leftYear = Number(left)
  const rightYear = Number(right)
  if (Number.isFinite(leftYear) && Number.isFinite(rightYear)) return rightYear - leftYear
  return String(right).localeCompare(String(left), undefined, { numeric: true })
}

export const shouldGroupLeaveRecordsByYear = (periodRange = {}) => periodRange?.preset === 'all'

export const getLeaveRecordTypeOptions = (records = []) =>
  Array.from(
    new Set(
      records.map((record) => normalizeLeaveRecordForFilters(record).leaveType).filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right))

export const getLeaveRecordStatusOptions = (records = []) =>
  Array.from(
    new Set(records.map((record) => normalizeLeaveRecordForFilters(record).status).filter(Boolean)),
  ).sort((left, right) => {
    const priorityCompare = getLeaveStatusSortPriority(left) - getLeaveStatusSortPriority(right)
    return priorityCompare || left.localeCompare(right)
  })

export const filterLeaveRecords = (
  records = [],
  { searchTerm = '', leaveType = '', status = '', staffId = '', periodRange } = {},
) => {
  const term = normalizeText(searchTerm)
  const selectedLeaveType = String(leaveType || '')
  const selectedStatus = String(status || '')
  const selectedStaffId = String(staffId || '')

  return records.filter((record) => {
    const normalized = normalizeLeaveRecordForFilters(record)
    const searchMatch = !term || normalized.searchText.includes(term)
    const typeMatch = !selectedLeaveType || normalized.leaveType === selectedLeaveType
    const statusMatch = !selectedStatus || normalized.status === selectedStatus
    const staffMatch = !selectedStaffId || String(normalized.staffId) === selectedStaffId
    const periodMatch = isDateInPeriodRange(getLeaveRecordScopeDate(record), periodRange)

    return searchMatch && typeMatch && statusMatch && staffMatch && periodMatch
  })
}
