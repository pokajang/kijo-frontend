// quoteMainServices.js
import TrainingQuotationForm from './training'
import ManpowerQuotationForm from './manpower'
import HygieneQuoteForm from './hygiene'
import SpecialQuotationForm from './special'
import EquipmentQuotationForm from './equipment'
import { quoteServiceUrl } from './quoteApi'

export const quoteServiceKeys = ['training', 'ih', 'manpower', 'equipment', 'special']

const quoteServiceAliases = {
  training: 'training',
  'training-tab': 'training',
  ih: 'ih',
  'ih-tab': 'ih',
  'industrial hygiene': 'ih',
  'industrial-hygiene': 'ih',
  manpower: 'manpower',
  'manpower-tab': 'manpower',
  'manpower supply': 'manpower',
  'manpower-supply': 'manpower',
  equipment: 'equipment',
  'equipment-tab': 'equipment',
  'equipment supply': 'equipment',
  'equipment-supply': 'equipment',
  special: 'special',
  'special-tab': 'special',
  'special service': 'special',
}

const toInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toFloat = (value, fallback = 0) => {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toBool = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['1', 'true', 'yes', 'on'].includes(normalized)
  }
  return false
}

const toYesNo = (value) => (toBool(value) ? 'Yes' : 'No')

const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

const parseDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeEquipmentItems = (row) => {
  const sourceItems = Array.isArray(row?.items)
    ? row.items
    : Array.isArray(row?.line_items)
      ? row.line_items
      : Array.isArray(row?.lineItems)
        ? row.lineItems
        : []

  return sourceItems.map((item) => {
    const itemId = toInt(pick(item, 'item_id', 'itemId', 'catalog_item_id', 'catalogItemId'), 0)
    const unitPrice = toFloat(pick(item, 'unit_price', 'unitPrice'), 0)
    const markedUpPrice = toFloat(
      pick(item, 'marked_up_price', 'markedUpPrice', 'markedUp', 'unit_price', 'unitPrice'),
      unitPrice,
    )
    return {
      item_id: itemId || null,
      item_name: pick(item, 'item_name', 'itemName') || '',
      supplier_name: pick(item, 'supplier_name', 'supplierName') || '',
      unit: pick(item, 'unit') || '',
      description: pick(item, 'description') || '',
      category_id: pick(item, 'category_id', 'categoryId') || null,
      quantity: toFloat(pick(item, 'quantity'), 0),
      unit_price: unitPrice,
      marked_up_price: markedUpPrice,
      line_total: toFloat(
        pick(item, 'line_total', 'lineTotal', 'amount', 'total_price', 'totalPrice'),
        0,
      ),
    }
  })
}

// Centralized service configuration
export const serviceConfig = {
  training: {
    displayName: 'Training',
    formComponent: TrainingQuotationForm,
    getEditEndpoint: (id) => quoteServiceUrl('training', id),
    mapRowToFormData: (row) => {
      const parsedSessionCount = toInt(pick(row, 'session_count', 'sessionCount'), 0)
      const parsedDurationPerSession = toInt(
        pick(row, 'duration_per_session', 'durationPerSession'),
        0,
      )
      const isPerPax =
        !Number.isFinite(parsedSessionCount) ||
        parsedSessionCount <= 0 ||
        !Number.isFinite(parsedDurationPerSession) ||
        parsedDurationPerSession <= 0

      const mealsProvided = toYesNo(pick(row, 'meals_provided', 'mealsProvided'))
      const explicitPricingBasis = pick(row, 'pricing_basis', 'pricingBasis')
      const pricingBasis =
        explicitPricingBasis === 'per_pax' || explicitPricingBasis === 'per_session'
          ? explicitPricingBasis
          : isPerPax
            ? 'per_pax'
            : 'per_session'

      return {
        trainingId: pick(row, 'training_id', 'trainingId', 'proposal_id', 'proposalId'),
        trainingTitle: pick(row, 'training_title', 'trainingTitle'),
        trainingTypeOption: pick(row, 'training_type', 'trainingType'),
        trainingRateType:
          pick(row, 'training_rate_type', 'trainingRateType') || 'client_site_normal',
        paymentMethod: pick(row, 'payment_method', 'paymentMethod'),
        selectedDate: parseDate(pick(row, 'proposed_date', 'proposedDate')),
        selectedEndDate: parseDate(pick(row, 'proposed_end_date', 'proposedEndDate')),
        toBeConfirmed: toBool(pick(row, 'to_be_confirmed', 'toBeConfirmed')),
        trainingVenue: pick(row, 'venue', 'training_venue', 'trainingVenue'),
        trainingInqRemarks:
          pick(row, 'remarks', 'inquiry_remarks', 'trainingInqRemarks', 'inquiryRemarks') || '',
        pricingBasis,
        trainingQty: isPerPax ? 1 : parsedSessionCount,
        trainingDuration: isPerPax ? 1 : parsedDurationPerSession,
        durationUnit: pick(row, 'duration_unit', 'durationUnit') || 'day(s)',
        noOfPax: toInt(pick(row, 'pax', 'no_of_pax', 'noOfPax'), 0),
        unitPrice: toFloat(pick(row, 'unit_price', 'unitPrice'), 0),
        travelCharge: toFloat(pick(row, 'travel_charge', 'travelCharge'), 0),
        travelRegion: pick(row, 'travel_region', 'travelRegion') || 'none',
        mealsProvided,
        mealPrice: mealsProvided === 'Yes' ? toFloat(pick(row, 'meal_price', 'mealPrice'), 0) : '',
        discountType: pick(row, 'discount_type', 'discountType') || '',
        discountValue: toFloat(pick(row, 'discount_value', 'discountValue'), 0),
        sstRate: toFloat(pick(row, 'sst_rate', 'sstRate'), 0),
        hrdCharge: toFloat(pick(row, 'hrd_charge', 'hrdCharge'), 0),
        targetGroups: pick(row, 'target_groups', 'targetGroups') || '',
        attachProposal: toBool(pick(row, 'attach_proposal', 'attachProposal')),
        proposal_id: pick(row, 'proposal_id', 'proposalId') || '',
        proposalLanguage: pick(row, 'proposal_language', 'proposalLanguage') || 'en',
        priceExceptionRequestId:
          pick(row, 'price_exception_request_id', 'priceExceptionRequestId') || '',
      }
    },
  },

  ih: {
    displayName: 'Industrial Hygiene',
    formComponent: HygieneQuoteForm,
    getEditEndpoint: (id) => quoteServiceUrl('ih', id),
    mapRowToFormData: (row) => ({
      serviceId: pick(row, 'service_id', 'serviceId'),
      serviceTitle: pick(row, 'service_title', 'serviceTitle') || '',
      serviceCode: pick(row, 'service_code', 'serviceCode') || '',
      siteAddress: pick(row, 'site_address', 'siteAddress') || '',
      sampleCounts: toInt(pick(row, 'sample_counts', 'sampleCounts'), 0),
      sampleUnit: pick(row, 'sample_unit', 'sampleUnit') || 'sample(s)',
      numWorkUnits: toInt(pick(row, 'num_work_units', 'numWorkUnits'), 0),
      travelCharge: toFloat(pick(row, 'travel_charge', 'travelCharge'), 0),
      inquiryRemarks: pick(row, 'inquiry_remarks', 'inquiryRemarks') || '',
      unitPrice: toFloat(pick(row, 'unit_price', 'unitPrice'), 0),
      discount: toFloat(pick(row, 'discount', 'discountValue'), 0),
      priceExceptionRequestId:
        pick(row, 'price_exception_request_id', 'priceExceptionRequestId') || '',
      sstPercent: toFloat(pick(row, 'sst_percent', 'sstPercent'), 0),
      sstAmount: toFloat(pick(row, 'sst_amount', 'sstAmount'), 0),
      subTotal: toFloat(pick(row, 'sub_total', 'subTotal'), 0),
      grandTotal: toFloat(pick(row, 'grand_total', 'grandTotal'), 0),
      attachProposal: toBool(pick(row, 'attach_proposal', 'attachProposal')),
      proposalLanguage: pick(row, 'proposal_language', 'proposalLanguage') || 'en',
    }),
  },

  manpower: {
    displayName: 'Manpower Supply',
    formComponent: ManpowerQuotationForm,
    getEditEndpoint: (id) => quoteServiceUrl('manpower', id),
    mapRowToFormData: (row) => ({
      mpId: pick(row, 'mp_id', 'mpId'),
      serviceTitle: pick(row, 'service_title', 'serviceTitle') || '',
      serviceCode: pick(row, 'service_code', 'serviceCode') || '',
      manpowerRateType: pick(row, 'manpower_rate_type', 'manpowerRateType') || '',
      billingUnit: pick(row, 'billing_unit', 'billingUnit') || '',
      natureOfWork: pick(row, 'scope', 'nature_of_work', 'natureOfWork') || '',
      siteLocation: pick(row, 'site_location', 'siteLocation') || '',
      durationMonths: toInt(pick(row, 'duration_months', 'durationMonths'), 0),
      durationHours: toFloat(pick(row, 'duration_hours', 'durationHours'), 0),
      noOfPax: toInt(pick(row, 'quantity', 'no_of_pax', 'noOfPax'), 0),
      unitCost: toFloat(pick(row, 'unit_cost', 'unitCost'), 0),
      discount: toFloat(pick(row, 'discount'), 0),
      priceExceptionRequestId:
        pick(row, 'price_exception_request_id', 'priceExceptionRequestId') || '',
      sstPercent: toFloat(pick(row, 'sst_percent', 'sstPercent'), 0),
      subTotal: toFloat(pick(row, 'sub_total', 'subTotal'), 0),
      sstAmount: toFloat(pick(row, 'sst_amount', 'sstAmount'), 0),
      grandTotal: toFloat(pick(row, 'grand_total', 'grandTotal'), 0),
      attachProposal: toBool(pick(row, 'attach_proposal', 'attachProposal')),
      inquiryRemarks: pick(row, 'inquiry_remarks', 'inquiryRemarks') || '',
      proposalLanguage: pick(row, 'proposal_language', 'proposalLanguage') || 'en',
      requiresManagementApproval: toBool(
        pick(row, 'requires_management_approval', 'requiresManagementApproval'),
      ),
    }),
  },

  equipment: {
    displayName: 'Equipment Supply',
    formComponent: EquipmentQuotationForm,
    getEditEndpoint: (id) => quoteServiceUrl('equipment', id),
    mapRowToFormData: (row) => ({
      items: normalizeEquipmentItems(row),

      // client & PIC (only include if your form uses them)
      clientId: pick(row, 'client_id', 'clientId'),
      clientName: pick(row, 'client_name', 'clientName'),
      picName: pick(row, 'pic_name', 'picName'),

      // financial fields
      discount: toFloat(pick(row, 'discount'), 0),
      priceExceptionRequestId:
        pick(row, 'price_exception_request_id', 'priceExceptionRequestId') || '',
      deliveryCharge: toFloat(pick(row, 'delivery_charge', 'deliveryCharge'), 0),
      miscCharge: toFloat(pick(row, 'misc_charge', 'miscCharge'), 0),
      sstPercent: toFloat(pick(row, 'sst_percent', 'sstPercent'), 0),
      sstAmount: toFloat(pick(row, 'sst_amount', 'sstAmount'), 0),
      subtotal: toFloat(pick(row, 'subtotal', 'sub_total', 'subTotal'), 0),
      grandTotal: toFloat(pick(row, 'grand_total', 'grandTotal'), 0),
      attachProposal: toBool(pick(row, 'attach_proposal', 'attachProposal')),
    }),
  },

  special: {
    displayName: 'Special Service',
    formComponent: SpecialQuotationForm,
    getEditEndpoint: (id) => quoteServiceUrl('special', id),
    mapRowToFormData: (row) => {
      const lineItems = Array.isArray(row?.lineItems)
        ? row.lineItems
        : Array.isArray(row?.line_items)
          ? row.line_items
          : []
      const items = lineItems.map((li, index) => ({
        id: pick(li, 'itemId', 'id') ?? index,
        title: pick(li, 'title', 'item_name', 'line_item_title') || '',
        description: pick(li, 'description') || '',
        unit: pick(li, 'unit') || '',
        quantity: toFloat(pick(li, 'quantity'), 0),
        unitPrice: toFloat(pick(li, 'unitPrice', 'unit_price'), 0),
        amount: toFloat(
          pick(li, 'amount', 'line_total', 'lineTotal', 'total_price', 'totalPrice'),
          0,
        ),
      }))

      return {
        specialId: toInt(pick(row, 'spId', 'sp_id', 'specialId'), 0) || null,
        serviceTitle: pick(row, 'serviceTitle', 'service_title') || '',
        serviceCode: pick(row, 'serviceCode', 'service_code') || '',
        generalRemarks: pick(row, 'generalRemarks', 'general_remarks') || '',

        lineItems: items,

        sstPercent: toFloat(pick(row, 'sstPercent', 'sst_percent'), 0),
        discount: toFloat(pick(row, 'discount'), 0),
        priceExceptionRequestId:
          pick(row, 'price_exception_request_id', 'priceExceptionRequestId') || '',
        subTotal: toFloat(pick(row, 'subTotal', 'sub_total'), 0),
        sstAmount: toFloat(pick(row, 'sstAmount', 'sst_amount'), 0),
        grandTotal: toFloat(pick(row, 'grandTotal', 'grand_total'), 0),

        attachProposal: toBool(pick(row, 'attachProposal', 'attach_proposal')),
        proposalLanguage: pick(row, 'proposalLanguage', 'proposal_language') || 'en',
      }
    },
  },
}

// Helpers to map between displayName and key
export const getServiceKeyByName = (displayName) =>
  Object.keys(serviceConfig).find((key) => serviceConfig[key].displayName === displayName)

export const normalizeQuoteServiceKey = (value) => {
  if (!value) return ''
  const raw = String(value).trim()
  if (serviceConfig[raw]) return raw

  const alias = quoteServiceAliases[raw.toLowerCase()]
  if (alias) return alias

  return getServiceKeyByName(raw) || ''
}

export const getQuoteService = (keyOrAlias) => {
  const key = normalizeQuoteServiceKey(keyOrAlias)
  return key ? serviceConfig[key] || null : null
}

export const getServiceList = () =>
  Object.entries(serviceConfig).map(([key, { displayName }]) => ({ key, label: displayName }))
