import { quoteApiUrl } from '../../quotes/quoteApi'
import { getMessage, isSuccess } from './compatApi'

export const fetchQuoteApprovals = async (fetcher = fetch) => {
  const response = await fetcher(quoteApiUrl('quote-approvals'), { credentials: 'include' })
  const result = await response.json()

  if (!response.ok || !isSuccess(result)) {
    throw new Error(getMessage(result, 'Failed to load quotation approvals.'))
  }

  return Array.isArray(result.data) ? result.data : []
}

export const findQuoteApproval = (approvals, service, quoteId) =>
  approvals.find(
    (approval) =>
      String(approval?.service) === String(service) &&
      Number(approval?.quote_id) === Number(quoteId),
  ) || null
