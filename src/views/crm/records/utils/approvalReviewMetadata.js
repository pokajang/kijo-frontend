const cleanValue = (value) => {
  if (value == null) return ''
  const text = String(value).trim()
  return text.length ? text : ''
}

export const readFirstValue = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = cleanValue(source?.[key])
    if (value) return value
  }
  return ''
}

export const readNullableNumber = (...values) => {
  for (const value of values) {
    if (value === '' || value == null) continue
    if (typeof value === 'number' && Number.isFinite(value)) return value

    const normalized = String(value).replace(/[^0-9.+-]/g, '')
    if (!normalized) continue
    const number = Number(normalized)
    if (Number.isFinite(number)) return number
  }
  return null
}

const quoteReferenceKeys = [
  'quote_ref_no',
  'quotationId',
  'quoteNo',
  'quote_no',
  'quotation_no',
  'quotationNo',
  'quote_ref',
  'quoteRefNo',
  'quoteRef',
  'quoteNumber',
  'quote_number',
  'quotationNumber',
  'reference',
  'refNo',
  'ref_no',
  'quotation_ref_no',
]

export const getQuoteReviewMetadata = (quote = {}) => {
  const formData = quote?.formData || {}
  const clientDetails = quote?.clientDetails || {}
  const firstLineItem = Array.isArray(quote?.lineItems) ? quote.lineItems[0] : {}

  const quotedTotal = readNullableNumber(
    quote?.quoted_total,
    quote?.quotedTotal,
    quote?.grandTotal,
    quote?.grand_total,
    quote?.amount,
    quote?.quote_value,
    formData?.grandTotal,
    formData?.grand_total,
    formData?.amount,
  )
  const estimatedCost = readNullableNumber(
    quote?.estimatedCost,
    quote?.estimated_cost,
    quote?.estimated_total_cost,
    quote?.cost_total,
    formData?.estimatedCost,
    formData?.estimated_cost,
    formData?.estimatedTotalCost,
  )
  const marginPercent = readNullableNumber(
    quote?.margin_percent,
    quote?.marginPercent,
    formData?.margin_percent,
    formData?.marginPercent,
  )

  const derivedSubject = getSubject(quote)

  return {
    quoteRefNo: readFirstValue(quote, quoteReferenceKeys),
    quoteTitle:
      readFirstValue(quote, [
        'quote_title',
        'quotation_title',
        'title',
        'quoteTitle',
        'quoteName',
        'serviceName',
        'name',
        'trainingTitle',
        'training_title',
        'serviceTitle',
        'service_title',
      ]) ||
      readFirstValue(formData, ['trainingTitle', 'serviceTitle', 'service_title', 'title']) ||
      (derivedSubject && derivedSubject !== '-' ? derivedSubject : '') ||
      readFirstValue(firstLineItem, [
        'itemName',
        'item_name',
        'title',
        'name',
        'description',
        'line_item_title',
      ]),
    quoteDate: readFirstValue(quote, [
      'quote_date',
      'quotation_date',
      'quoteDate',
      'date',
      'created_at',
      'updated_at',
      'dateCreated',
      'createdAt',
      'date_created',
    ]),
    clientName:
      readFirstValue(quote, [
        'client_name',
        'clientName',
        'customer_name',
        'company_name',
        'companyName',
        'customerName',
      ]) ||
      readFirstValue(clientDetails, [
        'companyName',
        'company_name',
        'clientName',
        'client_name',
        'name',
        'fullName',
      ]),
    quotedTotal,
    estimatedCost,
    marginPercent,
  }
}

export const enrichApprovalReviewMetadata = (approval = {}, quote = null) => {
  const quoteMetadata = quote ? getQuoteReviewMetadata(quote) : {}
  const quotedTotal = readNullableNumber(
    approval?.quoted_total,
    approval?.quotedTotal,
    approval?.grand_total,
    approval?.grandTotal,
    approval?.amount,
    approval?.quote_value,
    quoteMetadata.quotedTotal,
  )
  const estimatedCost = readNullableNumber(
    approval?.estimated_cost,
    approval?.estimatedCost,
    approval?.estimated_total_cost,
    quoteMetadata.estimatedCost,
  )
  const suppliedMarginPercent = readNullableNumber(
    approval?.margin_percent,
    approval?.marginPercent,
  )
  const calculatedMarginPercent =
    quotedTotal != null && estimatedCost != null && estimatedCost > 0
      ? ((quotedTotal - estimatedCost) / estimatedCost) * 100
      : null
  const marginPercent =
    suppliedMarginPercent ?? quoteMetadata.marginPercent ?? calculatedMarginPercent

  const metadata = {
    quoteRefNo: readFirstValue(approval, quoteReferenceKeys) || quoteMetadata.quoteRefNo || '',
    quoteTitle:
      readFirstValue(approval, [
        'quote_title',
        'quotation_title',
        'quoteTitle',
        'quote_name',
        'title',
        'name',
      ]) ||
      quoteMetadata.quoteTitle ||
      '',
    quoteDate:
      readFirstValue(approval, [
        'quote_date',
        'quotation_date',
        'quoteDate',
        'dateCreated',
        'createdAt',
        'date_created',
        'date',
        'created_at',
        'updated_at',
      ]) ||
      quoteMetadata.quoteDate ||
      '',
    clientName:
      readFirstValue(approval, [
        'client_name',
        'clientName',
        'fullName',
        'customerName',
        'customer_name',
        'company_name',
        'companyName',
      ]) ||
      quoteMetadata.clientName ||
      '',
    quotedTotal,
    estimatedCost,
    marginPercent,
  }
  const missingFields = [
    !metadata.quoteRefNo && 'quotation reference',
    !metadata.quoteTitle && 'quotation title',
    !metadata.quoteDate && 'quotation date',
    !metadata.clientName && 'client',
    metadata.quotedTotal == null && 'quoted total',
    metadata.estimatedCost == null && 'estimated cost',
    metadata.marginPercent == null && 'markup on cost',
  ].filter(Boolean)

  return {
    ...approval,
    quote_ref_no: metadata.quoteRefNo || approval?.quote_ref_no,
    quote_title: metadata.quoteTitle || approval?.quote_title,
    quote_date: metadata.quoteDate || approval?.quote_date,
    client_name: metadata.clientName || approval?.client_name,
    quoted_total: metadata.quotedTotal,
    estimated_cost: metadata.estimatedCost,
    margin_percent: metadata.marginPercent,
    review_metadata_missing_fields: missingFields,
    review_metadata_margin_calculated:
      suppliedMarginPercent == null &&
      quoteMetadata.marginPercent == null &&
      calculatedMarginPercent != null,
  }
}

export const needsApprovalReviewMetadataHydration = (approval = {}) => {
  const metadata = enrichApprovalReviewMetadata(approval)
  return metadata.review_metadata_missing_fields.length > 0
}
import { getSubject } from './allRecordsTableUtils'
