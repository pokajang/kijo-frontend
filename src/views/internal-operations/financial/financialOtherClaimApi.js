import { apiFetch, apiJson } from '../../../api/apiClient'
import { normalizeOtherClaimRecord } from '../../../components/salary/otherClaimRecordStorage'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

export const fetchFinancialOtherClaimRecords = async (scope = 'current') => {
  const query = scope === 'archived' ? '?scope=archived' : ''
  const payload = await apiJson(`${API_BASE}hr/salary/other-claims/financial-records${query}`)
  return Array.isArray(payload.records) ? payload.records.map(normalizeOtherClaimRecord) : []
}

export const fetchFinancialOtherClaimRecord = async (id) => {
  const payload = await apiJson(
    `${API_BASE}hr/salary/other-claims/financial-records/${encodeURIComponent(id)}`,
  )
  return payload.record ? normalizeOtherClaimRecord(payload.record) : null
}

export const submitFinancialOtherClaimAction = async (
  id,
  action,
  remarks = '',
  workflowInstanceId = null,
  recordVersion = null,
) => {
  if (workflowInstanceId) {
    const payload = await apiJson(
      `${API_BASE}workflows/instances/${encodeURIComponent(workflowInstanceId)}/actions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks, record_version: recordVersion || undefined }),
      },
    )

    dispatchAppNotificationsChanged()
    return payload.record ? normalizeOtherClaimRecord(payload.record) : null
  }

  const payload = await apiJson(
    `${API_BASE}hr/salary/other-claims/financial-records/${encodeURIComponent(id)}/action`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, remarks, record_version: recordVersion || undefined }),
    },
  )

  dispatchAppNotificationsChanged()
  return payload.record ? normalizeOtherClaimRecord(payload.record) : null
}

export const restoreArchivedFinancialOtherClaim = async (id, recordVersion = null) => {
  const payload = await apiJson(
    `${API_BASE}hr/salary/other-claims/financial-records/${encodeURIComponent(id)}/restore-archive`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_version: Number(recordVersion || 0) || undefined }),
    },
  )
  dispatchAppNotificationsChanged()
  return payload
}

export const exportFinancialOtherClaimPdf = async (id) => {
  const response = await apiFetch(
    `${API_BASE}hr/salary/other-claims/financial-records/${encodeURIComponent(id)}/claims-pdf`,
  )
  if (!response.ok) {
    throw new Error(response.statusText || 'Unable to export other claim PDF.')
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get('content-disposition')
        ?.match(/filename="?([^"]+)"?/i)?.[1]
        ?.trim() || `other-claims-${id}.pdf`,
  }
}
