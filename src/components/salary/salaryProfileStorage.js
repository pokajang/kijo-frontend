import { apiJson } from '../../api/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const getCurrentMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7)

export const createDefaultSalaryProfile = () => ({
  basicSalary: '3000',
  effectiveMonth: getCurrentMonth(),
  vehicle: '',
  defaultMileageRate: '0.60',
  yearlyMedicalClaim: '0.00',
  notes: '',
  recurringAllowances: [],
})

const normalizeAllowance = (allowance = {}, index = 0) => ({
  id: allowance.id || `allowance-${index + 1}`,
  description: String(allowance.description || '').trim(),
  amount: String(allowance.amount ?? ''),
  startMonth: String(allowance.startMonth || ''),
  endMonth: '',
  active: true,
})

export const normalizeSalaryProfile = (profile = {}) => {
  const fallback = createDefaultSalaryProfile()

  return {
    basicSalary: String(profile.basicSalary ?? fallback.basicSalary),
    effectiveMonth: String(profile.effectiveMonth || fallback.effectiveMonth),
    vehicle: String(profile.vehicle || ''),
    defaultMileageRate: String(profile.defaultMileageRate ?? fallback.defaultMileageRate),
    yearlyMedicalClaim: String(profile.yearlyMedicalClaim ?? fallback.yearlyMedicalClaim),
    notes: String(profile.notes || ''),
    recurringAllowances: Array.isArray(profile.recurringAllowances)
      ? profile.recurringAllowances.map(normalizeAllowance)
      : [],
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
