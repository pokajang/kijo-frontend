import { quoteApiUrl } from './quoteApi'
import { readCurrentQuoteRouteParams } from './helpers/quoteRouteParams'

export const getPriceExceptionRequestId = () => {
  return readCurrentQuoteRouteParams().priceExceptionRequestId
}

export const fetchPriceException = async (id) => {
  if (!id) return null
  const response = await fetch(quoteApiUrl(`quote-price-exceptions/${encodeURIComponent(id)}`), {
    credentials: 'include',
  })
  const result = await response.json()
  if (!response.ok && result?.status !== 'success') {
    throw new Error(result?.message || 'Failed to load approved negotiation.')
  }
  return result?.data || null
}
