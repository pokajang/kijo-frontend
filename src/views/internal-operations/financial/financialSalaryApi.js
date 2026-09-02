import { apiFetch, apiJson } from '../../../api/apiClient'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'
const normalizeSalaryStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  if (status === 'Paid') return 'Approved'
  return status
}

const nullableMoney = (value) => {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

const pdfExportErrorMessage = async (response, fallback) => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return response.statusText || fallback

  try {
    const data = await response.clone().json()
    return data?.message || data?.error || response.statusText || fallback
  } catch {
    return response.statusText || fallback
  }
}

const normalizeFinancialSalaryRecord = (record = {}) => ({
  id: record.id,
  staffId: record.staffId,
  staffName: record.staffName || '',
  staffCode: record.staffCode || '',
  salaryMonth: record.salaryMonth || '',
  salaryMonthValue: record.salaryMonthValue || '',
  basicSalary: nullableMoney(record.basicSalary),
  claimsTotal: nullableMoney(record.claimsTotal),
  employeeDeductions: nullableMoney(record.employeeDeductions),
  employerContributions: nullableMoney(record.employerContributions),
  payableSalary: nullableMoney(record.payableSalary),
  canViewSalaryDetails: record.canViewSalaryDetails !== false,
  salaryRestricted: Boolean(record.salaryRestricted || record.canViewSalaryDetails === false),
  canViewFinancialAmounts: record.canViewFinancialAmounts !== false,
  financialAmountsRestricted: Boolean(record.financialAmountsRestricted),
  status: normalizeSalaryStatus(record.status || 'Submitted'),
  submittedAt: record.submittedAt || '',
  checkedBy: record.checkedBy || null,
  checkedAt: record.checkedAt || '',
  checkedStatus: record.checkedStatus || '',
  checkedRemarks: record.checkedRemarks || '',
  checkerName: record.checkerName || '',
  checkerCode: record.checkerCode || '',
  approvedBy: record.approvedBy || null,
  approvedAt: record.approvedAt || '',
  approvedStatus: record.approvedStatus || '',
  approvedRemarks: record.approvedRemarks || '',
  approverName: record.approverName || '',
  approverCode: record.approverCode || '',
  returnedBy: record.returnedBy || null,
  returnedAt: record.returnedAt || '',
  returnedStage: record.returnedStage || '',
  returnRemarks: record.returnRemarks || '',
  recordVersion: Number(record.recordVersion || 1),
  claims: Array.isArray(record.claims) ? record.claims : [],
  workflow: record.workflow || null,
})

export const fetchFinancialSalaryRecords = async () => {
  const payload = await apiJson(`${API_BASE}hr/salary/financial-records`)

  return Array.isArray(payload.records) ? payload.records.map(normalizeFinancialSalaryRecord) : []
}

export const fetchFinancialSalaryRecord = async (id) => {
  const payload = await apiJson(`${API_BASE}hr/salary/financial-records/${encodeURIComponent(id)}`)
  return payload.record ? normalizeFinancialSalaryRecord(payload.record) : null
}

export const submitFinancialSalaryAction = async (
  id,
  action,
  remarks = '',
  workflowInstanceId = null,
  recordVersion = null,
  paymentRecommendation = {},
) => {
  if (workflowInstanceId) {
    const payload = await apiJson(
      `${API_BASE}workflows/instances/${encodeURIComponent(workflowInstanceId)}/actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          remarks,
          record_version: recordVersion || undefined,
          payment_recommendation: paymentRecommendation.priority || undefined,
          payment_recommendation_remarks: paymentRecommendation.remarks || undefined,
        }),
      },
    )

    dispatchAppNotificationsChanged()
    return payload.record ? normalizeFinancialSalaryRecord(payload.record) : null
  }

  const payload = await apiJson(
    `${API_BASE}hr/salary/financial-records/${encodeURIComponent(id)}/action`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        remarks,
        record_version: recordVersion || undefined,
        payment_recommendation: paymentRecommendation.priority || undefined,
        payment_recommendation_remarks: paymentRecommendation.remarks || undefined,
      }),
    },
  )

  dispatchAppNotificationsChanged()
  return payload.record ? normalizeFinancialSalaryRecord(payload.record) : null
}

export const exportFinancialSalaryClaimsPdf = async (id) => {
  const response = await apiFetch(
    `${API_BASE}hr/salary/financial-records/${encodeURIComponent(id)}/claims-pdf`,
  )
  if (!response.ok) {
    throw new Error(await pdfExportErrorMessage(response, 'Unable to export salary claims PDF.'))
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get('content-disposition')
        ?.match(/filename="?([^"]+)"?/i)?.[1]
        ?.trim() || `salary-claims-${id}.pdf`,
  }
}

export const exportFinancialSalaryPayslipPdf = async (id) => {
  const response = await apiFetch(
    `${API_BASE}hr/salary/financial-records/${encodeURIComponent(id)}/payslip-pdf`,
  )
  if (!response.ok) {
    throw new Error(await pdfExportErrorMessage(response, 'Unable to export salary payslip PDF.'))
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get('content-disposition')
        ?.match(/filename="?([^"]+)"?/i)?.[1]
        ?.trim() || `salary-payslip-${id}.pdf`,
  }
}
