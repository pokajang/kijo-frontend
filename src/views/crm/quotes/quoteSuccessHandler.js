import { linkInquiryQuote } from '../../marketing/inquiries/inquiryUtils'
import { quoteApiUrl } from './quoteApi'
import { normalizeQuoteServiceKey } from './quoteMainServices'
import { readQuoteInquirySource, removeQuoteInquirySource } from './quoteInquirySource'

const isSuccess = (payload) =>
  payload?.status === 'success' || payload?.success === true || payload?.ok === true

const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const readQuoteMeta = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.result,
    payload?.payload,
    payload?.quote,
    payload?.data?.quote,
    payload?.data?.data,
    Array.isArray(payload?.data) ? payload.data[0] : null,
    Array.isArray(payload) ? payload[0] : null,
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const quoteId = pick(candidate, 'quote_id', 'quoteId', 'id')
      const quoteRefNo = pick(candidate, 'quote_ref_no', 'quoteRefNo', 'quotation_no', 'quote_no')
      if (quoteId !== undefined || quoteRefNo !== undefined) {
        return { quoteId, quoteRefNo }
      }
    }
  }

  return { quoteId: undefined, quoteRefNo: undefined }
}

export async function handleQuoteSuccess(result) {
  if (!isSuccess(result)) {
    return { saved: false, reason: 'quote-not-success' }
  }

  const inquiry = readQuoteInquirySource()
  if (!inquiry) return { saved: false, reason: 'no-inquiry' }

  const { quoteId, quoteRefNo } = readQuoteMeta(result)

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
