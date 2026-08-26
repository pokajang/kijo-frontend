import { apiFetch } from '../../../../api/apiClient'

const PDF_MIME_TYPE = 'application/pdf'
const MAX_FILENAME_LENGTH = 180
const INVALID_FILENAME_CHARACTERS = /[\u0000-\u001f\u007f<>:"/\\|?*]+/g

export class QuotationPdfError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message)
    this.name = 'QuotationPdfError'
    this.status = status
    this.data = data
  }
}

const decodeExtendedFilename = (value) => {
  const normalized = String(value || '')
    .trim()
    .replace(/^"|"$/g, '')
  const encodedValue = normalized.includes("''") ? normalized.split("''", 2)[1] : normalized

  try {
    return decodeURIComponent(encodedValue)
  } catch {
    return encodedValue
  }
}

const filenameFromDisposition = (contentDisposition = '') => {
  const extendedMatch = String(contentDisposition).match(/filename\*\s*=\s*([^;]+)/i)
  if (extendedMatch?.[1]) return decodeExtendedFilename(extendedMatch[1])

  const standardMatch = String(contentDisposition).match(/filename\s*=\s*(?:"([^"]*)"|([^;]*))/i)
  return String(standardMatch?.[1] || standardMatch?.[2] || '').trim()
}

const recordFilenameFallback = (record = {}) => {
  const reference =
    record.quotationId ||
    record.quoteRefNo ||
    record.quote_ref_no ||
    `quotation-${record.id || 'download'}`
  const clientName =
    record.clientDetails?.companyName || record.clientName || record.client_name || ''

  return clientName ? `${reference}_${clientName}.pdf` : `${reference}.pdf`
}

export const sanitizeQuotationPdfFilename = (filename, fallback = 'quotation.pdf') => {
  const sanitize = (value) =>
    String(value || '')
      .normalize('NFKC')
      .replace(INVALID_FILENAME_CHARACTERS, '_')
      .replace(/\s+/g, ' ')
      .replace(/^[. ]+/g, '')
      .replace(/[. ]+$/g, '')
      .trim()

  let safeName = sanitize(filename) || sanitize(fallback) || 'quotation.pdf'
  if (!/\.pdf$/i.test(safeName)) safeName += '.pdf'

  if (safeName.length > MAX_FILENAME_LENGTH) {
    safeName = `${safeName.slice(0, MAX_FILENAME_LENGTH - 4).replace(/[. ]+$/g, '')}.pdf`
  }

  return safeName
}

export const getQuotationPdfFilename = (contentDisposition, record = {}) =>
  sanitizeQuotationPdfFilename(
    filenameFromDisposition(contentDisposition),
    recordFilenameFallback(record),
  )

const responsePayload = async (response) => {
  try {
    return await response.clone().json()
  } catch {
    return null
  }
}

const responseErrorMessage = (response, payload) => {
  if (payload?.message || payload?.error) return payload.message || payload.error
  if (response.status === 401)
    return 'Your session has expired. Sign in again to generate this PDF.'
  if (response.status === 403) return 'You do not have permission to generate this quotation PDF.'
  if (response.status === 404) return 'The quotation PDF could not be found.'
  if (response.status === 409) return 'This quotation is not ready to be issued as a PDF.'
  return `The quotation PDF could not be generated (HTTP ${response.status}).`
}

const validatePdfBlob = async (blob, contentType) => {
  const mimeType = String(contentType || blob?.type || '')
    .split(';')[0]
    .trim()
    .toLowerCase()

  if (mimeType !== PDF_MIME_TYPE) {
    throw new QuotationPdfError('The quotation PDF response was invalid.')
  }

  const signature = await blob.slice(0, 1024).text()
  if (!signature.includes('%PDF-')) {
    throw new QuotationPdfError('The generated quotation is not a valid PDF file.')
  }
}

export const loadQuotationPdf = async ({ url, record, signal } = {}) => {
  if (!url) throw new QuotationPdfError('The quotation PDF is not available.')

  const response = await apiFetch(url, {
    credentials: 'include',
    headers: { Accept: PDF_MIME_TYPE },
    signal,
    silentError: true,
  })

  if (!response.ok) {
    const data = await responsePayload(response)
    throw new QuotationPdfError(responseErrorMessage(response, data), {
      status: response.status,
      data,
    })
  }

  const blob = await response.blob()
  await validatePdfBlob(blob, response.headers.get('content-type'))

  return {
    blob,
    filename: getQuotationPdfFilename(response.headers.get('content-disposition'), record),
  }
}
