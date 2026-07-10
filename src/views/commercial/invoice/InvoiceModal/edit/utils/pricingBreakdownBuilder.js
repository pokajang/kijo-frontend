import { buildHygieneBaseLabel } from './labelUtils'
import { toNumber } from './numberUtils'
import { getEquipmentInvoiceUnitPrice } from '../../../../../../shared/invoice/equipmentInvoiceUtils'

export const buildBreakdownFromPricing = (serviceType, pricing, quoteDetails) => {
  const toNegative = (value) => -Math.abs(toNumber(value))
  switch (serviceType) {
    case 'Training':
      const discountQty = toNumber(pricing.discount_qty ?? 1)
      const discountUnit = pricing.discount_unit || 'Lot'
      const hrdAmount = toNumber(pricing.hrd_amount)
      const hrdRate = toNumber(pricing.hrd_rate)
      return [
        {
          id: null,
          item_description: 'Training Fee',
          quantity: toNumber(pricing.training_qty ?? 1),
          unit: pricing.training_unit || 'Lot',
          unit_price: toNumber(pricing.training_total),
          description: '',
        },
        {
          id: null,
          item_description: 'Meal Total',
          quantity: toNumber(pricing.meal_qty ?? 1),
          unit: pricing.meal_unit || 'Lot',
          unit_price: toNumber(pricing.meal_total),
          description: '',
        },
        {
          id: null,
          item_description: 'Mobilization Charge',
          quantity: toNumber(pricing.mobilization_qty ?? 1),
          unit: pricing.mobilization_unit || 'Lot',
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
          id: null,
          item_description: 'Discount',
          unit: discountUnit,
          quantity: discountQty,
          unit_price: toNegative(pricing.discount_amount),
          description: '',
        },
        ...(hrdAmount > 0
          ? [
              {
                id: null,
                item_description: hrdRate > 0 ? `${hrdRate}% HRD Charge` : 'HRD Charge',
                unit: 'Lot',
                quantity: 1,
                unit_price: hrdAmount,
                description: '',
              },
            ]
          : []),
      ]
    case 'Equipment Supply': {
      const items = pricing.equipment_items || []
      const breakdown = items.map((item) => ({
        id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
        item_description: item.item_name || item.item_description || '',
        description: item.description || '',
        unit: item.unit || 'Lot',
        quantity: toNumber(item.quantity),
        unit_price: getEquipmentInvoiceUnitPrice(item),
      }))
      {
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
            (deliveryQty
              ? toNumber(pricing.delivery_charge) / deliveryQty
              : pricing.delivery_charge),
        )
        const miscQty = toNumber(pricing.misc_qty ?? 1)
        const miscUnit = pricing.misc_unit || 'Lot'
        const miscUnitPrice = toNumber(
          pricing.misc_unit_price ??
            (miscQty ? toNumber(pricing.misc_charge) / miscQty : pricing.misc_charge),
        )
        breakdown.push(
          {
            id: null,
            item_description: 'Discount',
            unit: discountUnit,
            quantity: discountQty,
            unit_price: toNegative(discountUnitPrice),
            description: '',
          },
          {
            id: null,
            item_description: 'Delivery Charge',
            unit: deliveryUnit,
            quantity: deliveryQty,
            unit_price: toNumber(deliveryUnitPrice),
            description: '',
          },
          {
            id: null,
            item_description: 'Misc Charge',
            unit: miscUnit,
            quantity: miscQty,
            unit_price: toNumber(miscUnitPrice),
            description: '',
          },
        )
      }
      return breakdown
    }
    case 'Manpower Supply': {
      const title = pricing.service_title || 'Manpower Supply'
      const duration = pricing.claim_type === 'multi' ? Math.max(2, toNumber(pricing.duration)) : 1
      const pax = toNumber(pricing.quantity)
      const paxMonths = pax * duration
      const detailNote = duration > 1 ? `${pax} pax x ${duration} months` : `${pax} pax x 1 month`
      const manpowerItems = Array.isArray(pricing.manpower_items) ? pricing.manpower_items : []
      return [
        {
          id: null,
          item_description: title,
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
          id: null,
          item_description: 'Discount',
          unit: pricing.discount_unit || 'Lot',
          quantity: toNumber(pricing.discount_qty ?? 1),
          unit_price: toNegative(pricing.discount),
          description: '',
        },
      ]
    }
    case 'Industrial Hygiene': {
      const sampleCounts = toNumber(pricing.sample_counts)
      const rawWorkUnits = parseFloat(pricing.num_work_units)
      const hasWorkUnits = Number.isFinite(rawWorkUnits) && rawWorkUnits > 0
      const workUnits = hasWorkUnits ? rawWorkUnits : 1
      const baseQty = sampleCounts * workUnits
      const sampleUnit = pricing.sample_unit || 'sample(s)'
      const useComboUnit = hasWorkUnits && sampleCounts > 1 && workUnits > 1
      const displayUnit = hasWorkUnits ? (useComboUnit ? 'sample-unit' : sampleUnit) : 'Lump Sum'
      const baseNote = hasWorkUnits
        ? `${sampleCounts} ${sampleUnit} x ${workUnits} work units`
        : `${sampleCounts} ${sampleUnit} - Lump Sum Work Unit`
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
      const hygieneItems = Array.isArray(pricing.hygiene_items) ? pricing.hygiene_items : []

      return [
        {
          id: null,
          item_description: buildHygieneBaseLabel(pricing.service_title),
          unit: displayUnit,
          quantity: baseQty,
          unit_price: toNumber(pricing.unit_price),
          description: baseNote,
        },
        {
          id: null,
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
          id: null,
          item_description: 'Discount',
          unit: discountUnit,
          quantity: discountQty,
          unit_price: toNegative(discountUnitPrice),
          description: '',
        },
      ]
    }
    case 'Special Service':
    case 'Special': {
      const items = Array.isArray(pricing.special_items) ? pricing.special_items : []
      const breakdown = items.map((item) => ({
        id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
        item_description: item.item_description || item.line_item_title || '',
        description: item.description || '',
        unit: item.unit || 'Lot',
        quantity: toNumber(item.quantity || 1),
        unit_price: toNumber(item.unit_price),
      }))
      breakdown.push({
        id: null,
        item_description: 'Discount',
        unit: pricing.discount_unit || 'Lot',
        quantity: toNumber(pricing.discount_qty ?? 1),
        unit_price: toNegative(pricing.discount),
        description: '',
      })
      return breakdown
    }
    default:
      return []
  }
}
