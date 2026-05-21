import { recordTabOptions } from '../config/recordTabs'
import { endpointsByService } from '../services/recordsActions'
import { apiJson } from '../../../../api/apiClient'
import { apiUrl } from '../../../../api/apiUrl'

const serviceLabelByTab = Object.fromEntries(recordTabOptions.map((tab) => [tab.key, tab.label]))
const serviceApiPathByTab = {
  'training-tab': 'training',
  'ih-tab': 'ih',
  'manpower-tab': 'manpower',
  'special-tab': 'special',
  'equipment-tab': 'equipment',
}

export const getRecordEmailAddress = (record) => record?.clientDetails?.email?.trim() || ''

export const getRecordPicName = (record) =>
  record?.personInCharge?.trim() || record?.clientDetails?.fullName?.trim() || ''

export const getRecordSubjectText = (record) =>
  record?.__tableMeta?.subject ||
  record?.__serviceTableMeta?.subjectText ||
  record?.subject?.trim() ||
  ''

export const getRecordServiceLabel = (record) =>
  record?.__tableMeta?.serviceLabel ||
  record?.serviceLabel ||
  serviceLabelByTab[record?.serviceTab] ||
  ''

export const getRecordServiceApiPath = (record) => serviceApiPathByTab[record?.serviceTab] || ''

export const buildRecordEmailDraft = (record, overrides = {}) => {
  const email = getRecordEmailAddress(record)
  if (!email) return null

  const quotationId = record?.quotationId?.trim() || 'Quotation'
  const serviceLabel = getRecordServiceLabel(record)
  const subjectText = getRecordSubjectText(record)
  const picName = getRecordPicName(record)
  const quotationPdfUrl = getRecordQuotationPdfUrl(record)
  const attachmentName = `${quotationId}.pdf`
  const greetingName = picName || 'Sir/Madam'
  const quotationIntroLine = serviceLabel
    ? `Attached is our quotation for ${serviceLabel}, reference ${quotationId}, for your review.`
    : `Attached is our quotation, reference ${quotationId}, for your review.`
  const replyToName = overrides.replyToName?.trim() || ''
  const replyToEmail = overrides.replyToEmail?.trim() || ''
  const replyContactNote =
    replyToEmail && replyToName
      ? `Note: Please reply to ${replyToName} at ${replyToEmail} for any follow-up.`
      : replyToEmail
        ? `Note: Please reply to ${replyToEmail} for any follow-up.`
        : null

  const subject = serviceLabel
    ? `Quotation for ${serviceLabel}${subjectText ? ` - ${subjectText}` : ''}`
    : `Quotation ${quotationId}`
  const body = [
    `Dear ${greetingName},`,
    '',
    'Thank you for the opportunity to support your requirements.',
    '',
    quotationIntroLine,
    '',
    'If you have any questions, would like any revisions, or wish to discuss the proposal further, please feel free to contact us.',
    '',
    'We would be glad to discuss how we can best support your needs.',
    '',
    replyContactNote,
    '',
    'Best regards,',
  ]
    .filter((line) => line != null)
    .join('\r\n')

  return {
    to: email,
    subject: overrides.subject ?? subject,
    body: overrides.body ?? body,
    quotationPdfUrl,
    attachmentName,
    toDisplay: picName ? `${picName} <${email}>` : email,
    ccDisplay:
      replyToEmail && replyToName ? `${replyToName} <${replyToEmail}>` : replyToEmail || '',
  }
}

export const getRecordQuotationPdfUrl = (record) => {
  const serviceKey = record?.serviceTab
  const recordId = record?.id
  const generateEndpoint = serviceKey ? endpointsByService[serviceKey]?.generate : null
  const generateUrl =
    typeof generateEndpoint === 'function' && recordId
      ? generateEndpoint(recordId)
      : generateEndpoint
  if (!generateUrl || !recordId) return ''
  const resolvedBaseUrl =
    typeof window !== 'undefined' && generateUrl.startsWith('/')
      ? `${window.location.origin}${generateUrl}`
      : generateUrl
  return `${resolvedBaseUrl}?quote_id=${encodeURIComponent(recordId)}`
}

export const buildRecordGmailComposeUrl = (record, overrides = {}) => {
  const draft = buildRecordEmailDraft(record, overrides)
  if (!draft) return null

  const params = new URLSearchParams({
    view: 'cm',
    to: draft.to,
    su: draft.subject,
    body: draft.body,
  })

  return `https://mail.google.com/mail/?${params.toString()}`
}

export const openRecordEmail = (record, overrides = {}) => {
  const gmailComposeUrl = buildRecordGmailComposeUrl(record, overrides)
  if (!gmailComposeUrl || typeof window === 'undefined') return false
  window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer')
  return true
}

export const openRecordQuotationPdf = (record) => {
  const quotationPdfUrl = getRecordQuotationPdfUrl(record)
  if (!quotationPdfUrl || typeof window === 'undefined') return false
  window.open(quotationPdfUrl, '_blank', 'noopener,noreferrer')
  return true
}

export const shareRecordQuotationPdf = async (record) => {
  const quotationPdfUrl = getRecordQuotationPdfUrl(record)
  const attachmentName = buildRecordEmailDraft(record)?.attachmentName || 'quotation.pdf'

  if (!quotationPdfUrl) {
    throw new Error('Quotation PDF is not available.')
  }

  const response = await fetch(quotationPdfUrl, { credentials: 'include' })
  if (!response.ok) {
    throw new Error('Failed to load quotation PDF for sharing.')
  }

  const blob = await response.blob()
  const contentType = response.headers.get('content-type') || blob.type || ''
  if (contentType && !contentType.toLowerCase().includes('pdf')) {
    throw new Error('Quotation PDF response is invalid for sharing.')
  }

  if (typeof navigator !== 'undefined' && typeof File !== 'undefined') {
    const file = new File([blob], attachmentName, { type: 'application/pdf' })
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          title: attachmentName,
          text: 'Quotation PDF',
          files: [file],
        })
        return { shared: true }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return { shared: false, cancelled: true }
        }
        throw error
      }
    }
  }

  if (typeof window !== 'undefined' && typeof URL !== 'undefined') {
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    return { shared: false, fallback: true }
  }

  throw new Error('Share is not supported in this browser.')
}

export const sendRecordEmailDraft = async (record, { subject, body } = {}) => {
  const service = getRecordServiceApiPath(record)
  const quoteId = record?.id
  if (!service || !quoteId) {
    throw new Error('Unable to resolve the quotation email target.')
  }

  const payload = await apiJson(
    apiUrl(`quote-records/${encodeURIComponent(service)}/${encodeURIComponent(quoteId)}/email`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        subject: subject ?? buildRecordEmailDraft(record)?.subject ?? '',
        body: body ?? buildRecordEmailDraft(record)?.body ?? '',
      }),
    },
  )

  if (payload?.status !== 'success') {
    throw new Error(payload?.message || 'System email request failed.')
  }

  return payload
}
