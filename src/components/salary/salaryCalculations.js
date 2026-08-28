import socsoEisTable from './socsoEisTable'
import socsoTable from './socsoTable'
import { formatMoney as formatMoneyValue } from '../../utils/formatters/numberFormatters'

export const MILEAGE_RATE = 0.6

const toMoneyNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export const roundMoney = (value) => Math.round((toMoneyNumber(value) + Number.EPSILON) * 100) / 100

export const formatMoney = (value) => formatMoneyValue(roundMoney(value))

export const calculateMileageAmount = (km, rate = MILEAGE_RATE, distanceMethod = 'return') =>
  roundMoney(
    toMoneyNumber(km) *
      (distanceMethod === 'return' || distanceMethod === 'return_same_route' ? 2 : 1) *
      rate,
  )

export const sumAmounts = (items = [], amountKey = 'amount') =>
  roundMoney(items.reduce((total, item) => total + toMoneyNumber(item?.[amountKey]), 0))

export const calculateStatutoryDeductions = (basicSalary) => {
  const basic = toMoneyNumber(basicSalary)
  const effectiveSalary = basic
    ? basic <= 5000
      ? Math.ceil(basic / 20) * 20
      : Math.ceil(basic / 100) * 100
    : 0

  const employerEpf = effectiveSalary
    ? Math.ceil(effectiveSalary * (basic <= 5000 ? 0.13 : 0.12))
    : 0
  const employeeEpf = effectiveSalary ? Math.ceil(effectiveSalary * 0.11) : 0

  const matchedEis = socsoEisTable.find(
    (item) =>
      basic > item.lowerBoundary && (item.upperBoundary === null || basic <= item.upperBoundary),
  )
  const matchedSocso = socsoTable.find(
    (item) =>
      basic > item.lowerBoundary && (item.upperBoundary === null || basic <= item.upperBoundary),
  )

  const employerEis = matchedEis ? toMoneyNumber(matchedEis.employer) : 0
  const employeeEis = matchedEis ? toMoneyNumber(matchedEis.employee) : 0
  const employerSocso = matchedSocso ? toMoneyNumber(matchedSocso.employer) : 0
  const employeeSocso = matchedSocso ? toMoneyNumber(matchedSocso.employee) : 0

  return {
    employerEpf,
    employeeEpf,
    employerSocso,
    employeeSocso,
    employerEis,
    employeeEis,
    employerTotal: roundMoney(employerEpf + employerSocso + employerEis),
    employeeTotal: roundMoney(employeeEpf + employeeSocso + employeeEis),
  }
}

export const calculateSalarySummary = ({
  basicSalary = 0,
  allowanceItems = [],
  expenseItems = [],
  mileageItems = [],
  medicalItems = [],
} = {}) => {
  const basic = roundMoney(basicSalary)
  const totalAllowance = sumAmounts(allowanceItems)
  const totalExpenses = sumAmounts(expenseItems)
  const totalMileage = sumAmounts(mileageItems)
  const totalMedical = sumAmounts(medicalItems)
  const claimsTotal = roundMoney(totalAllowance + totalExpenses + totalMileage + totalMedical)
  const deductions = calculateStatutoryDeductions(basic)

  return {
    basicSalary: basic,
    totalAllowance,
    totalExpenses,
    totalMileage,
    totalMedical,
    claimsTotal,
    deductions,
    payableSalary: roundMoney(basic + claimsTotal - deductions.employeeTotal),
  }
}
