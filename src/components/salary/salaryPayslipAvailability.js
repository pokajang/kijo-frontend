export const payslipApprovalTooltip = 'Payslip available after approval.'
export const payslipMonthClosedTooltip = 'Payslip available from the 1st day of next month.'

const salaryMonthAvailableFrom = (salaryMonthValue = '') => {
  const match = String(salaryMonthValue || '').match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null
  }

  return new Date(year, monthIndex + 1, 1)
}

export const getSalaryPayslipAvailability = (record = {}, now = new Date()) => {
  if (record?.status !== 'Approved') {
    return { available: false, tooltip: payslipApprovalTooltip }
  }

  const availableFrom = salaryMonthAvailableFrom(record?.salaryMonthValue)
  if (!availableFrom) {
    return { available: false, tooltip: payslipMonthClosedTooltip }
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (today < availableFrom) {
    return { available: false, tooltip: payslipMonthClosedTooltip }
  }

  return { available: true, tooltip: '' }
}
