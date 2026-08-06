import { getEquipmentInvoiceUnitPrice } from '../../../../shared/invoice/equipmentInvoiceUtils'
import {
  getHygieneComplexityMultiplier,
  isHistoricalHygienePricingRule,
  LEGACY_HYGIENE_PRICING_RULE,
  STANDARD_HYGIENE_PRICING_RULE,
} from '../../../../shared/invoice/hygienePricing'
import { normalizeTrainingHrdCharge } from '../../../crm/quotes/training/trainingHrd'

const toNumber = (value) => parseFloat(value) || 0
const toNegative = (value) => -Math.abs(toNumber(value))

const getLocalISODate = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

export const buildInvoiceCreatePayload = (
  serviceType,
  {
    project,
    quoteDetails,
    pricing,
    projectMeta,
    clientOverrides,
    grantApprovalNo,
    paymentMethodOverride,
    allowWithoutQuote,
    loaNo,
    paymentTermsDays,
    overridePaymentTerms,
  },
) => {
  if (!project) {
    return { success: false, message: 'Missing project information.' }
  }

  if (!quoteDetails && !allowWithoutQuote) {
    return {
      success: false,
      message: 'Quote details are not ready yet. Please wait and try again.',
    }
  }

  const resolvedQuoteId = quoteDetails?.id ?? project?.quote_id ?? null
  if (!resolvedQuoteId && !allowWithoutQuote) {
    return { success: false, message: 'Missing quote reference. Cannot create invoice.' }
  }

  const baseAmount =
    serviceType === 'Training' ? toNumber(pricing.subtotal) : toNumber(pricing.sub_total)

  const paymentMethod = paymentMethodOverride || quoteDetails?.payment_method || 'Direct Payment'
  const isHrdPayment = paymentMethod.trim().toLowerCase() === 'hrd grant'
  if (serviceType === 'Training' && isHrdPayment && !grantApprovalNo?.trim()) {
    return { success: false, message: 'HRD Grant Approval No. is required for HRD payment.' }
  }
  const hrdRate =
    serviceType === 'Training' ? normalizeTrainingHrdCharge(paymentMethod, pricing.hrd_rate) : 0
  const trainingDiscountTotal =
    toNumber(pricing.discount_amount) * toNumber(pricing.discount_qty ?? 1)
  const computedHrdAmount =
    serviceType === 'Training'
      ? Math.max(toNumber(pricing.training_total) - trainingDiscountTotal, 0) * (hrdRate / 100)
      : 0
  const hrdQty = toNumber(pricing.hrd_qty ?? 1)
  const hrdUnitPrice =
    isHrdPayment && hrdRate > 0 ? toNumber(pricing.hrd_amount) || computedHrdAmount : 0
  const hrdAmount = hrdQty * hrdUnitPrice
  const resolvedGrandTotal =
    serviceType === 'Training'
      ? baseAmount + toNumber(pricing.sst_amount) + hrdAmount
      : toNumber(pricing.grand_total)

  if (allowWithoutQuote && !quoteDetails && baseAmount <= 0) {
    return {
      success: false,
      message: 'Please enter a valid invoice amount before creating the invoice.',
    }
  }

  const payload = {
    project_id: project.id,
    service_type: serviceType,
    quote_id: resolvedQuoteId,
    invoice_purpose:
      pricing.service_title || projectMeta?.project_name || project.project_name || '',
    invoice_date: getLocalISODate(),
    override_payment_terms: Boolean(overridePaymentTerms ?? clientOverrides.overridePaymentTerms),
    payment_terms_days: Boolean(overridePaymentTerms ?? clientOverrides.overridePaymentTerms)
      ? Number(paymentTermsDays ?? clientOverrides.paymentTermsDays ?? 30)
      : null,
    payment_method: paymentMethod,
    grant_approval_no:
      serviceType === 'Training' && isHrdPayment ? grantApprovalNo?.trim() || null : null,
    remarks: pricing.remarks || '',
    quotation_remarks:
      pricing.quotation_remarks ??
      quoteDetails?.quotation_remarks ??
      project?.quotation_remarks ??
      '',
    client_award_ref_no: loaNo || '',
    invoice_client_name: clientOverrides.clientName,
    invoice_client_ssm: clientOverrides.clientSSM,
    invoice_client_tin: clientOverrides.clientTIN,
    invoice_client_address: clientOverrides.clientAddress,
    invoice_client_city: clientOverrides.clientCity,
    invoice_client_state: clientOverrides.clientState,
    invoice_client_zip: clientOverrides.clientZip,
    invoice_pic_name: clientOverrides.picName,
    invoice_pic_phone: clientOverrides.picPhone,
    invoice_pic_email: clientOverrides.picEmail,
    invoice_pic_position: clientOverrides.picPosition,
    amount: baseAmount,
    sst_amount: toNumber(pricing.sst_amount),
    hrd_rate: isHrdPayment ? hrdRate : 0,
    hrd_amount: isHrdPayment ? hrdAmount : 0,
    grand_total: resolvedGrandTotal,
    breakdown: [],
  }

  switch (serviceType) {
    case 'Training':
      payload.breakdown = [
        {
          item_description: 'Training Fee',
          unit: pricing.training_unit || 'Lot',
          quantity: toNumber(pricing.training_qty),
          unit_price: toNumber(pricing.training_total),
          description: '',
        },
        {
          item_description: 'Meal Total',
          unit: pricing.meal_unit || 'Lot',
          quantity: toNumber(pricing.meal_qty),
          unit_price: toNumber(pricing.meal_total),
          description: '',
        },
        {
          item_description: 'Mobilization Charge',
          unit: pricing.mobilization_unit || 'Lot',
          quantity: toNumber(pricing.mobilization_qty),
          unit_price: toNumber(pricing.mobilization_cost),
          description: '',
        },
        ...(pricing.training_items || []).map((item) => ({
          id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
          item_description: item.item_description || '',
          description: item.description || '',
          unit: item.unit || 'Lot',
          quantity: toNumber(item.quantity),
          unit_price: toNumber(item.unit_price),
        })),
        {
          item_description: 'Discount',
          unit: pricing.discount_unit || 'Lot',
          quantity: toNumber(pricing.discount_qty),
          unit_price: toNegative(pricing.discount_amount),
          description: '',
        },
        ...(isHrdPayment && hrdAmount > 0
          ? [
              {
                item_description: `${hrdRate}% HRD Charge`,
                unit: pricing.hrd_unit || 'Lot',
                quantity: hrdQty,
                unit_price: hrdUnitPrice,
                description: '',
              },
            ]
          : []),
      ]
      break

    case 'Equipment Supply': {
      const pricingItems = Array.isArray(pricing.equipment_items) ? pricing.equipment_items : []
      const quoteItems = Array.isArray(quoteDetails?.equipment_items)
        ? quoteDetails.equipment_items
        : []
      const equipmentItems = pricingItems.length > 0 ? pricingItems : quoteItems
      payload.breakdown = equipmentItems.map((item) => ({
        item_id: item.item_id ?? null,
        item_description: item.item_name,
        description: item.description || '',
        item_remarks: item.item_remarks ?? item.itemRemarks ?? '',
        unit: item.unit,
        quantity: toNumber(item.quantity),
        unit_price: getEquipmentInvoiceUnitPrice(item),
      }))

      const discountQty = toNumber(pricing.discount_qty ?? 1)
      const discountUnit = pricing.discount_unit || 'Lot'
      const discountUnitPrice = toNumber(
        pricing.discount_unit_price ??
          (discountQty ? toNumber(pricing.discount) / discountQty : pricing.discount),
      )
      const deliveryQty = toNumber(pricing.delivery_qty ?? 1)
      const deliveryUnit = pricing.delivery_unit || 'Lot'
      const deliveryUnitPrice = toNumber(
        pricing.delivery_unit_price ??
          (deliveryQty ? toNumber(pricing.delivery_charge) / deliveryQty : pricing.delivery_charge),
      )
      const miscQty = toNumber(pricing.misc_qty ?? 1)
      const miscUnit = pricing.misc_unit || 'Lot'
      const miscUnitPrice = toNumber(
        pricing.misc_unit_price ??
          (miscQty ? toNumber(pricing.misc_charge) / miscQty : pricing.misc_charge),
      )

      payload.breakdown.push(
        {
          item_description: 'Discount',
          unit: discountUnit,
          quantity: discountQty,
          unit_price: toNegative(discountUnitPrice),
          description: '',
        },
        {
          item_description: 'Delivery Charge',
          unit: deliveryUnit,
          quantity: deliveryQty,
          unit_price: toNumber(deliveryUnitPrice),
          description: '',
        },
        {
          item_description: 'Misc Charge',
          unit: miscUnit,
          quantity: miscQty,
          unit_price: toNumber(miscUnitPrice),
          description: '',
        },
      )
      break
    }

    case 'Manpower Supply': {
      const manpowerTitle =
        pricing.service_title ||
        quoteDetails?.service_title ||
        projectMeta?.project_name ||
        project?.project_name ||
        'Manpower Supply'
      const duration = pricing.claim_type === 'multi' ? Math.max(2, toNumber(pricing.duration)) : 1
      const pax = toNumber(pricing.quantity)
      const paxMonths = pax * duration
      const detailNote = duration > 1 ? `${pax} pax x ${duration} months` : `${pax} pax x 1 month`
      const manpowerItems = Array.isArray(pricing.manpower_items) ? pricing.manpower_items : []

      payload.breakdown = [
        {
          item_description: manpowerTitle,
          unit: pricing.unit || 'pax-mth',
          quantity: paxMonths,
          unit_price: toNumber(pricing.unit_cost),
          description: detailNote,
        },
        ...manpowerItems.map((item) => ({
          id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
          item_description: item.item_description || '',
          description: item.description || '',
          unit: item.unit || 'Lot',
          quantity: toNumber(item.quantity),
          unit_price: toNumber(item.unit_price),
        })),
        {
          item_description: 'Discount',
          unit: pricing.discount_unit || 'Lot',
          quantity: toNumber(pricing.discount_qty ?? 1),
          unit_price: toNegative(pricing.discount),
          description: '',
        },
      ]
      break
    }

    case 'Industrial Hygiene': {
      const buildHygieneBaseLabel = (value) => {
        const raw = String(value || '').trim()
        if (!raw) return 'Industrial Hygiene'
        const parts = raw.split(/\s+at\s+/i)
        return (parts[0] || raw).trim() || 'Industrial Hygiene'
      }
      const sampleCounts = toNumber(pricing.sample_counts)
      const rawWorkUnits = parseFloat(pricing.num_work_units)
      const hasWorkUnits = Number.isFinite(rawWorkUnits) && rawWorkUnits > 0
      const workUnits = hasWorkUnits ? rawWorkUnits : 1
      const baseQty = sampleCounts * workUnits
      const sampleUnit = pricing.sample_unit || quoteDetails.sample_unit || 'sample(s)'
      const pricingRuleVersion =
        pricing.pricing_rule_version ||
        quoteDetails.pricing_rule_version ||
        STANDARD_HYGIENE_PRICING_RULE
      const isLegacyPricing = pricingRuleVersion === LEGACY_HYGIENE_PRICING_RULE
      const isHistoricalPricing = isHistoricalHygienePricingRule(pricingRuleVersion)
      const complexityRating = toNumber(
        pricing.complexity_rating ?? quoteDetails.complexity_rating ?? 1,
      )
      const complexityMultiplier = isLegacyPricing
        ? getHygieneComplexityMultiplier(complexityRating)
        : 1
      const useComboUnit = hasWorkUnits && sampleCounts > 1 && workUnits > 1
      const displayUnit = hasWorkUnits ? (useComboUnit ? 'sample-unit' : sampleUnit) : 'Lump Sum'
      const baseNote = hasWorkUnits
        ? `${sampleCounts} ${sampleUnit} x ${workUnits} work units`
        : `${sampleCounts} ${sampleUnit} - Lump Sum Work Unit`
      const pricedBaseNote = isLegacyPricing
        ? `${baseNote} x complexity ${Math.trunc(complexityRating)} (${complexityMultiplier.toFixed(1)}x)`
        : baseNote
      const travelQty = toNumber(pricing.travel_qty ?? 1)
      const travelUnit = pricing.travel_unit || 'Lot'
      const travelUnitPrice = toNumber(
        pricing.travel_unit_price ??
          (travelQty ? toNumber(pricing.travel_charge) / travelQty : pricing.travel_charge),
      )
      const discountQty = toNumber(pricing.discount_qty ?? 1)
      const discountUnit = pricing.discount_unit || 'Lot'
      const discountUnitPrice = toNumber(
        pricing.discount_unit_price ??
          (discountQty ? toNumber(pricing.discount) / discountQty : pricing.discount),
      )
      const pricingHygieneItems = Array.isArray(pricing.hygiene_items) ? pricing.hygiene_items : []
      const quoteHygieneItems = Array.isArray(quoteDetails?.hygiene_items)
        ? quoteDetails.hygiene_items
        : []
      const hygieneItems =
        pricingRuleVersion === STANDARD_HYGIENE_PRICING_RULE
          ? pricingHygieneItems.length > 0
            ? pricingHygieneItems
            : quoteHygieneItems
          : []
      const calculatedUnitPrice = toNumber(pricing.unit_price) * complexityMultiplier
      const calculatedServiceTotal = baseQty * calculatedUnitPrice
      const contractualServiceTotal = Math.max(
        0,
        toNumber(pricing.sub_total) + toNumber(pricing.discount) - toNumber(pricing.travel_charge),
      )
      const hasStoredHistoricalSubtotal =
        pricing.sub_total !== null && pricing.sub_total !== undefined
      const hasHistoricalVariance =
        isHistoricalPricing &&
        hasStoredHistoricalSubtotal &&
        Math.abs(calculatedServiceTotal - contractualServiceTotal) > 0.01
      const invoiceBaseQty = hasHistoricalVariance ? 1 : baseQty
      const invoiceBaseUnit = hasHistoricalVariance ? 'Lump Sum' : displayUnit
      const invoiceBaseUnitPrice = hasHistoricalVariance
        ? contractualServiceTotal
        : calculatedUnitPrice
      const invoiceBaseNote = hasHistoricalVariance
        ? `${pricedBaseNote}; preserved historical quoted amount`
        : pricedBaseNote

      payload.breakdown = [
        {
          item_description: buildHygieneBaseLabel(
            pricing.service_title || quoteDetails.service_title,
          ),
          unit: invoiceBaseUnit,
          quantity: invoiceBaseQty,
          unit_price: invoiceBaseUnitPrice,
          description: invoiceBaseNote,
        },
        {
          item_description: 'Travel Charge',
          unit: travelUnit,
          quantity: travelQty,
          unit_price: toNumber(travelUnitPrice),
          description: '',
        },
        ...hygieneItems.map((item) => ({
          id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
          item_description: item.item_description || '',
          description: item.description || '',
          unit: item.unit || 'Lot',
          quantity: toNumber(item.quantity),
          unit_price: toNumber(item.unit_price),
        })),
        {
          item_description: 'Discount',
          unit: discountUnit,
          quantity: discountQty,
          unit_price: toNegative(discountUnitPrice),
          description: '',
        },
      ]
      break
    }

    case 'Special Service':
    case 'Special': {
      const specialItems =
        Array.isArray(pricing.special_items) && pricing.special_items.length > 0
          ? pricing.special_items
          : quoteDetails?.special_items || []
      payload.breakdown = specialItems.map((item) => ({
        id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
        item_description: item.item_description || item.line_item_title || '',
        description: item.description || '',
        unit: item.unit || 'Lot',
        quantity: toNumber(item.quantity || 1),
        unit_price: toNumber(item.unit_price),
      }))
      payload.breakdown.push({
        item_description: 'Discount',
        unit: pricing.discount_unit || 'Lot',
        quantity: toNumber(pricing.discount_qty ?? 1),
        unit_price: toNegative(pricing.discount),
        description: '',
      })
      break
    }

    default:
      break
  }

  if (payload.breakdown.length === 0 && !allowWithoutQuote) {
    return { success: false, message: 'Invoice breakdown is empty. Cannot proceed.' }
  }

  return { success: true, payload }
}
