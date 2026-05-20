import { linkInquiryQuote } from '../../marketing/inquiries/inquiryUtils'
import { isQuoteResultSuccess, quoteApiUrl, readQuoteResultMeta } from './quoteApi'
import { normalizeQuoteServiceKey } from './quoteMainServices'
import { readQuoteInquirySource, removeQuoteInquirySource } from './quoteInquirySource'

export async function handleQuoteSuccess(result) {
  if (!isQuoteResultSuccess(result)) {
    return { saved: false, reason: 'quote-not-success' }
  }

  const inquiry = readQuoteInquirySource()
  if (!inquiry) return { saved: false, reason: 'no-inquiry' }

  const { quoteId, quoteRefNo } = readQuoteResultMeta(result)

  if (!quoteId) {
    return { saved: false, reason: 'missing-quote-id' }
  }

  const serviceType = normalizeQuoteServiceKey(
    inquiry.serviceKey || inquiry.service_type || inquiry.service,
  )
  if (!serviceType) {
    return { saved: false, reason: 'missing-service-type' }
  }

  let inquiryLinked = false
  const linkStoredInquiryQuote = async () => {
    if (!inquiry.inquiryId || inquiryLinked) return

    try {
      await linkInquiryQuote(inquiry.inquiryId, {
        quoteId,
        quoteRefNo,
        serviceType,
      })
      inquiryLinked = true
    } catch (err) {
      console.error('Failed to link inquiry to quote:', err)
    }
  }

  const payload = {
    quote_id: quoteId,
    quote_ref_no: quoteRefNo,
    client_id: inquiry.clientId,
    service_type: serviceType,
    source: inquiry.source,
    remarks: inquiry.remarks,
  }

  const endpoints = [quoteApiUrl('quotes/inquiry-source')]

  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        const status = json?.status ?? json?.data?.status
        if (status === 'success' || status === 'info' || json?.success === true) {
          await linkStoredInquiryQuote()
          removeQuoteInquirySource()
          return { saved: true, reason: status || 'success' }
        }

        console.error('Failed to save inquiry source:', json?.message || 'Unknown error')
      } catch (err) {
        console.error(`Inquiry source save attempt ${attempt} failed:`, err)
      }
    }
  }

  await linkStoredInquiryQuote()
  if (inquiryLinked) {
    removeQuoteInquirySource()
  }

  return {
    saved: false,
    reason: inquiryLinked ? 'source-request-failed-inquiry-linked' : 'request-failed',
  }
}
