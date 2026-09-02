import { apiJson } from '../../../api/apiClient'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

export const submitFinancialWorkflowBulkAction = async (
  action,
  records,
  remarks = '',
  paymentRecommendation = {},
) => {
  const payload = await apiJson(`${API_BASE}workflows/instances/bulk-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      remarks,
      payment_recommendation: paymentRecommendation.priority || undefined,
      payment_recommendation_remarks: paymentRecommendation.remarks || undefined,
      items: records.map((record) => ({
        instance_id: record.workflow?.instanceId || record.workflowPayload?.instanceId,
        record_version: record.recordVersion || undefined,
      })),
    }),
  })

  dispatchAppNotificationsChanged()
  return Array.isArray(payload.records) ? payload.records : []
}
