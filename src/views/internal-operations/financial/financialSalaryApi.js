import { apiFetch, apiJson } from '../../../api/apiClient'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'
const normalizeSalaryStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  if (status === 'Paid') return 'Approved'
  return status
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
  basicSalary: Number(record.basicSalary || 0),
  claimsTotal: Number(record.claimsTotal || 0),
  employeeDeductions: Number(record.employeeDeductions || 0),
  employerContributions: Number(record.employerContributions || 0),
  payableSalary: Number(record.payableSalary || 0),
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
  workflow: record.workflow || null,
})

export const fetchFinancialSalaryRecords = async () => {
  const payload = await apiJson(`${API_BASE}hr/salary/financial-records`)

  return Array.isArray(payload.records) ? payload.records.map(normalizeFinancialSalaryRecord) : []
}

export const submitFinancialSalaryAction = async (
  id,
  action,
  remarks = '',
  workflowInstanceId = null,
) => {
  if (workflowInstanceId) {
    const payload = await apiJson(
      `${API_BASE}workflows/instances/${encodeURIComponent(workflowInstanceId)}/actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks }),
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
      body: JSON.stringify({ action, remarks }),
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
