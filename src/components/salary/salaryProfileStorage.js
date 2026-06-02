import { apiJson } from '../../api/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const getCurrentMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7)

const getPreviousYear = (month = getCurrentMonth()) => {
  const year = Number(String(month || '').slice(0, 4))

  return Number.isFinite(year) && year > 0 ? String(year - 1) : String(new Date().getFullYear() - 1)
}

const createDefaultPreviousYearSnapshot = (month = getCurrentMonth()) => ({
  year: getPreviousYear(month),
  source: 'missing',
  sourceLabel: 'Not configured',
  editable: true,
  available: false,
  message: `${getPreviousYear(month)} snapshot not configured. Set in Salary Settings.`,
  basicSalary: '',
  allowanceTotal: '',
  incrementAmount: '',
  total: '',
})

export const createDefaultSalaryProfile = () => ({
  basicSalary: '3000',
  effectiveMonth: getCurrentMonth(),
  vehicle: '',
  defaultMileageRate: '0.60',
  yearlyMedicalClaim: '0.00',
  notes: '',
  recurringAllowances: [],
  previousYearSnapshot: createDefaultPreviousYearSnapshot(),
})

const normalizeAllowance = (allowance = {}, index = 0) => ({
  id: allowance.id || `allowance-${index + 1}`,
  description: String(allowance.description || '').trim(),
  amount: String(allowance.amount ?? ''),
  startMonth: String(allowance.startMonth || ''),
  endMonth: '',
  active: true,
})

export const normalizePreviousYearSnapshot = (
  snapshot = {},
  effectiveMonth = getCurrentMonth(),
) => {
  const fallback = createDefaultPreviousYearSnapshot(effectiveMonth)

  return {
    year: String(snapshot.year || fallback.year),
    source: String(snapshot.source || fallback.source),
    sourceLabel: String(snapshot.sourceLabel || fallback.sourceLabel),
    editable: snapshot.editable !== false,
    available: Boolean(snapshot.available),
    message: String(snapshot.message || fallback.message),
    basicSalary: String(snapshot.basicSalary ?? fallback.basicSalary),
    allowanceTotal: String(snapshot.allowanceTotal ?? fallback.allowanceTotal),
    incrementAmount: String(snapshot.incrementAmount ?? fallback.incrementAmount),
    total: String(snapshot.total ?? fallback.total),
  }
}

export const normalizeSalaryProfile = (profile = {}) => {
  const fallback = createDefaultSalaryProfile()
  const effectiveMonth = String(profile.effectiveMonth || fallback.effectiveMonth)

  return {
    basicSalary: String(profile.basicSalary ?? fallback.basicSalary),
    effectiveMonth,
    vehicle: String(profile.vehicle || ''),
    defaultMileageRate: String(profile.defaultMileageRate ?? fallback.defaultMileageRate),
    yearlyMedicalClaim: String(profile.yearlyMedicalClaim ?? fallback.yearlyMedicalClaim),
    notes: String(profile.notes || ''),
    recurringAllowances: Array.isArray(profile.recurringAllowances)
      ? profile.recurringAllowances.map(normalizeAllowance)
      : [],
    previousYearSnapshot: normalizePreviousYearSnapshot(
      profile.previousYearSnapshot,
      effectiveMonth,
    ),
  }
}

export const getSalaryProfile = () => {
  return createDefaultSalaryProfile()
}

export const fetchSalaryProfile = async () => {
  const payload = await apiJson(`${API_BASE}hr/salary/profile`)
  return normalizeSalaryProfile(payload.profile)
}

export const saveSalaryProfile = async (profile) => {
  const normalizedProfile = normalizeSalaryProfile(profile)
  const payload = await apiJson(`${API_BASE}hr/salary/profile`, {
    method: 'PUT',
    body: JSON.stringify({
      basic_salary: normalizedProfile.basicSalary,
      effective_month: normalizedProfile.effectiveMonth,
      vehicle: normalizedProfile.vehicle,
      default_mileage_rate: normalizedProfile.defaultMileageRate,
      yearly_medical_claim: normalizedProfile.yearlyMedicalClaim,
      previous_year_snapshot: {
        year: normalizedProfile.previousYearSnapshot.year,
        basic_salary: normalizedProfile.previousYearSnapshot.basicSalary,
        allowance_total: normalizedProfile.previousYearSnapshot.allowanceTotal,
        increment_amount: normalizedProfile.previousYearSnapshot.incrementAmount,
      },
      recurring_allowances: normalizedProfile.recurringAllowances.map((allowance) => ({
        id: allowance.id,
        description: allowance.description,
        amount: allowance.amount,
        start_month: allowance.startMonth || null,
      })),
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return normalizeSalaryProfile(payload.profile)
}

const isAllowanceActiveForMonth = (allowance, salaryMonth) => {
  if (!allowance.description || Number(allowance.amount) <= 0) return false
  if (allowance.startMonth && salaryMonth < allowance.startMonth) return false

  return true
}

export const getActiveRecurringAllowances = (profile, salaryMonth) => {
  const normalizedProfile = normalizeSalaryProfile(profile)
  const month = salaryMonth || getCurrentMonth()

  return normalizedProfile.recurringAllowances
    .filter((allowance) => isAllowanceActiveForMonth(allowance, month))
    .map((allowance) => ({
      id: `profile-${allowance.id}`,
      date: month,
      description: allowance.description,
      amount: Number(allowance.amount),
      source: 'profile',
      sourceLabel: 'Fixed monthly',
    }))
}
