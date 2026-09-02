const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100

export const hasPaymentAmount = (value) => Math.abs(Number(value || 0)) >= 0.005

const sum = (items, select) => roundMoney(items.reduce((total, item) => total + select(item), 0))

export const employeeTotals = (employee = {}) => {
  const salary = employee.salary || []
  const otherClaims = employee.otherClaims || []
  const stored = employee.totals || {}
  const derived = {
    basicSalary: sum(salary, (row) => Number(row.basicSalary || 0)),
    salaryAdjustments: sum(salary, (row) =>
      sum(row.lineItems || [], (line) => Number(line.amount || 0)),
    ),
    employeeDeductions: sum(salary, (row) => Number(row.employeeDeductions || 0)),
    netSalary: sum(salary, (row) => Number(row.payableSalary || 0)),
    otherClaims: sum(otherClaims, (row) => Number(row.total || 0)),
    employerContributions: sum(salary, (row) => Number(row.employerContributions || 0)),
  }

  const totals = Object.fromEntries(
    Object.entries(derived).map(([key, fallback]) => [
      key,
      stored[key] === undefined ? fallback : roundMoney(stored[key]),
    ]),
  )
  totals.transferAmount =
    stored.transferAmount === undefined
      ? roundMoney(totals.netSalary + totals.otherClaims)
      : roundMoney(stored.transferAmount)

  return totals
}

export const paymentSummaryViewModel = (record = {}) => {
  const snapshot = record.snapshot || {}
  const employees = (snapshot.employees || []).map((employee, index) => ({
    ...employee,
    key: employee.staffCode || `${employee.staffName || 'staff'}-${index}`,
    totals: employeeTotals(employee),
  }))

  return {
    record,
    snapshot,
    employees,
    totals: {
      netSalary: roundMoney(snapshot.totals?.salary),
      otherClaims: roundMoney(snapshot.totals?.otherClaims),
      totalPayout: roundMoney(snapshot.totals?.grandTotal),
    },
    employeeCount: Number(snapshot.counts?.employees ?? employees.length),
    recordCount: Number(snapshot.counts?.records || 0),
    periodLabel:
      snapshot.batchName ||
      record.batchName ||
      snapshot.batchDate ||
      record.batchDate ||
      snapshot.periodLabel ||
      record.paymentPeriod ||
      '—',
  }
}

export const formatAttachmentSize = (value) =>
  value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round((value || 0) / 1024))} KB`
