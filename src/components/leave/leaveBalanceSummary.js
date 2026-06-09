const currentYear = new Date().getFullYear()

export const allLeaveTypesValue = '__all_leave_types__'

const toNumber = (value) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

const hasValue = (value) => value !== null && typeof value !== 'undefined' && value !== ''

export const formatLeaveBalanceDays = (value) => {
  const number = toNumber(value)
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

export const normalizeLeaveType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const getLeaveTypeOptions = (entitlements = []) =>
  Array.from(new Set(entitlements.map((entitlement) => entitlement.leave_type).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
    .map((leaveType) => ({
      value: leaveType,
      label: leaveType,
    }))

export const getDefaultLeaveType = (entitlements = []) => {
  const options = getLeaveTypeOptions(entitlements)
  const annual = options.find((option) => normalizeLeaveType(option.value).includes('annual'))
  return annual?.value || options[0]?.value || allLeaveTypesValue
}

const getEntitlementBalance = (entitlement = {}) => {
  if (hasValue(entitlement.remaining)) return toNumber(entitlement.remaining)
  return toNumber(entitlement.total_days) - toNumber(entitlement.used_days)
}

const getEntitlementTotals = (entitlements = []) =>
  entitlements.reduce(
    (totals, entitlement) => ({
      assigned: totals.assigned + toNumber(entitlement.total_days),
      used: totals.used + toNumber(entitlement.used_days),
      balance: totals.balance + getEntitlementBalance(entitlement),
    }),
    { assigned: 0, used: 0, balance: 0 },
  )

const getEntitlementsForYear = (entitlements = [], year = currentYear) =>
  entitlements.filter((entitlement) => Number(entitlement.year) === year)

const getSingleYearEntitlementRemarks = (
  entitlements = [],
  year = currentYear,
  enabled = false,
) => {
  if (!enabled) return ''
  const yearEntitlements = getEntitlementsForYear(entitlements, year)
  return yearEntitlements.length === 1 && hasValue(yearEntitlements[0].remarks)
    ? yearEntitlements[0].remarks
    : ''
}

const buildBalanceMetrics = (totals) => [
  { key: 'assigned', label: 'Assigned', value: formatLeaveBalanceDays(totals.assigned) },
  { key: 'used', label: 'Used', value: formatLeaveBalanceDays(totals.used) },
  { key: 'balance', label: 'Balance', value: formatLeaveBalanceDays(totals.balance) },
]

export const filterEntitlementsByType = (entitlements = [], leaveType = allLeaveTypesValue) => {
  if (!leaveType || leaveType === allLeaveTypesValue) return entitlements
  const selectedType = normalizeLeaveType(leaveType)
  return entitlements.filter(
    (entitlement) => normalizeLeaveType(entitlement.leave_type) === selectedType,
  )
}

export const filterEntitlementsByStaff = (entitlements = [], staffId) => {
  if (!hasValue(staffId)) return []
  return entitlements.filter((entitlement) => String(entitlement.staff_id) === String(staffId))
}

export const buildLeaveBalanceSummary = (
  entitlements = [],
  year = currentYear,
  leaveType = allLeaveTypesValue,
) => {
  const previousYear = year - 1
  const scopedEntitlements = filterEntitlementsByType(entitlements, leaveType)
  const includeYearRemarks = Boolean(leaveType && leaveType !== allLeaveTypesValue)
  const thisYearRemarks = getSingleYearEntitlementRemarks(
    scopedEntitlements,
    year,
    includeYearRemarks,
  )
  const previousYearRemarks = getSingleYearEntitlementRemarks(
    scopedEntitlements,
    previousYear,
    includeYearRemarks,
  )
  return [
    {
      key: 'this-year',
      title: 'This Year',
      badge: String(year),
      metrics: buildBalanceMetrics(
        getEntitlementTotals(getEntitlementsForYear(scopedEntitlements, year)),
      ),
      ...(thisYearRemarks ? { remarks: thisYearRemarks } : {}),
    },
    {
      key: 'last-year',
      title: 'Last Year',
      badge: String(previousYear),
      metrics: buildBalanceMetrics(
        getEntitlementTotals(getEntitlementsForYear(scopedEntitlements, previousYear)),
      ),
      ...(previousYearRemarks ? { remarks: previousYearRemarks } : {}),
    },
    {
      key: 'all-time',
      title: 'All Time',
      badge: 'Total',
      metrics: buildBalanceMetrics(getEntitlementTotals(scopedEntitlements)),
    },
  ]
}
