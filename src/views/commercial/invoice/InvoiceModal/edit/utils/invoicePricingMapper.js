import { isExactLabel, normalizeDesc } from './labelUtils'
import { toNumber } from './numberUtils'
import { defaultPricing } from './pricingDefaults'

const getLines = (invoice) => (Array.isArray(invoice?.breakdown) ? invoice.breakdown : [])

const parseHrdRateFromDescription = (description) => {
  const raw = String(description || '').trim()
  const percentMatch = raw.match(/(\d+(?:\.\d+)?)\s*%\s*hrd\s*charge/i)
  if (percentMatch) {
    return toNumber(percentMatch[1])
  }
  return 0
}

const isHrdLine = (line) => {
  const raw = String(line?.item_description || '')
  return /^\s*(\d+(?:\.\d+)?\s*%\s*)?hrd\s*charge\b/i.test(raw)
}

export const buildPricingFromInvoice = (invoice) => {
  const serviceType = invoice?.service_type || invoice?.serviceType || ''
  const lines = getLines(invoice)
  const baseAmount = toNumber(invoice?.amount)
  const sstAmount = toNumber(invoice?.sst_amount)
  const grandTotal = toNumber(invoice?.grand_total)
  const sstRate = baseAmount > 0 ? (sstAmount / baseAmount) * 100 : 0
  const remarks = invoice?.remarks || ''

  const pricing = { ...defaultPricing, remarks }
  let quoteDetails = null

  switch (serviceType) {
    case 'Training': {
      const trainingItems = []
      let trainingTotal = 0
      let trainingQty = 1
      let trainingUnit = 'Lot'
      let mealTotal = 0
      let mealQty = 1
      let mealUnit = 'Lot'
      let mobilizationCost = 0
      let mobilizationQty = 1
      let mobilizationUnit = 'Lot'
      let discountAmount = 0
      let discountQty = 1
      let discountUnit = 'Lot'
      let hrdAmount = 0
      let hrdRate = 0
      let hrdQty = 1
      let hrdUnit = 'Lot'

      const isDiscountLine = (line) => isExactLabel(line, ['discount', 'less'])
      const isTrainingLine = (line) => isExactLabel(line, ['training fee', 'training total'])
      const isMealLine = (line) => isExactLabel(line, ['meal total'])
      const isMobilizationLine = (line) =>
        isExactLabel(line, ['mobilization charge', 'mobilization cost'])

      lines.forEach((line) => {
        const price = toNumber(line?.unit_price)
        if (isDiscountLine(line)) {
          discountAmount = Math.abs(price)
          discountQty = toNumber(line?.quantity, 1)
          discountUnit = line?.unit || 'Lot'
        } else if (isMealLine(line)) {
          mealTotal = price
          mealQty = toNumber(line?.quantity, 1)
          mealUnit = line?.unit || 'Lot'
        } else if (isMobilizationLine(line)) {
          mobilizationCost = price
          mobilizationQty = toNumber(line?.quantity, 1)
          mobilizationUnit = line?.unit || 'Lot'
        } else if (isHrdLine(line)) {
          hrdQty = toNumber(line?.quantity, 1)
          hrdAmount = price
          hrdUnit = line?.unit || 'Lot'
          hrdRate = parseHrdRateFromDescription(line?.item_description)
        } else if (isTrainingLine(line)) {
          trainingTotal = price
          trainingQty = toNumber(line?.quantity, 1)
          trainingUnit = line?.unit || 'Lot'
        } else {
          trainingItems.push({
            id: line.id,
            item_description: line.item_description || '',
            description: line.description || '',
            unit: line.unit || 'Lot',
            quantity: toNumber(line.quantity, 1),
            unit_price: price,
          })
        }
      })

      if (hrdRate <= 0 && hrdAmount > 0) {
        const netTraining = trainingTotal - discountAmount * discountQty
        hrdRate = netTraining > 0 ? (hrdAmount / netTraining) * 100 : 0
      }

      return {
        pricing: {
          ...pricing,
          training_total: trainingTotal,
          training_qty: trainingQty,
          training_unit: trainingUnit,
          meal_total: mealTotal,
          meal_qty: mealQty,
          meal_unit: mealUnit,
          mobilization_cost: mobilizationCost,
          mobilization_qty: mobilizationQty,
          mobilization_unit: mobilizationUnit,
          discount_amount: discountAmount,
          discount_qty: discountQty,
          discount_unit: discountUnit,
          subtotal: baseAmount,
          sst_rate: sstRate,
          sst_amount: sstAmount,
          grand_total: grandTotal,
          hrd_rate: hrdRate,
          hrd_amount: hrdAmount,
          hrd_qty: hrdQty,
          hrd_unit: hrdUnit,
          training_items: trainingItems,
        },
        quoteDetails,
      }
    }

    case 'Equipment Supply': {
      const equipmentItems = []
      let discount = 0
      let discountQty = 1
      let discountUnit = 'Lot'
      let discountUnitPrice = 0
      let deliveryCharge = 0
      let deliveryQty = 1
      let deliveryUnit = 'Lot'
      let deliveryUnitPrice = 0
      let miscCharge = 0
      let miscQty = 1
      let miscUnit = 'Lot'
      let miscUnitPrice = 0

      const isDiscountLine = (line) => isExactLabel(line, ['discount', 'less'])
      const isDeliveryLine = (line) => isExactLabel(line, ['delivery charge'])
      const isMiscLine = (line) => isExactLabel(line, ['misc charge'])

      lines.forEach((line) => {
        const price = toNumber(line?.unit_price)
        if (isDiscountLine(line)) {
          discountQty = toNumber(line?.quantity, 1)
          discountUnit = line?.unit || 'Lot'
          discountUnitPrice = Math.abs(price)
          discount = discountQty * discountUnitPrice
        } else if (isDeliveryLine(line)) {
          deliveryQty = toNumber(line?.quantity, 1)
          deliveryUnit = line?.unit || 'Lot'
          deliveryUnitPrice = price
          deliveryCharge = deliveryQty * deliveryUnitPrice
        } else if (isMiscLine(line)) {
          miscQty = toNumber(line?.quantity, 1)
          miscUnit = line?.unit || 'Lot'
          miscUnitPrice = price
          miscCharge = miscQty * miscUnitPrice
        } else {
          equipmentItems.push({
            id: line.id,
            item_name: line.item_description || '',
            description: line.description || '',
            unit: line.unit || 'Lot',
            quantity: toNumber(line.quantity, 1),
            unit_price: price,
            marked_up_price: price,
          })
        }
      })

      return {
        pricing: {
          ...pricing,
          equipment_items: equipmentItems,
          discount,
          discount_qty: discountQty,
          discount_unit: discountUnit,
          discount_unit_price: discountUnitPrice,
          delivery_charge: deliveryCharge,
          delivery_qty: deliveryQty,
          delivery_unit: deliveryUnit,
          delivery_unit_price: deliveryUnitPrice,
          misc_charge: miscCharge,
          misc_qty: miscQty,
          misc_unit: miscUnit,
          misc_unit_price: miscUnitPrice,
          sub_total: baseAmount,
          sst_percent: sstRate,
          sst_amount: sstAmount,
          grand_total: grandTotal,
        },
        quoteDetails,
      }
    }

    case 'Manpower Supply': {
      const isDiscountLine = (line) => isExactLabel(line, ['discount', 'less'])
      const discountLine = lines.find((line) => isDiscountLine(line))
      const nonDiscountLines = lines.filter((line) => !isDiscountLine(line))
      const purposeKey = normalizeDesc(invoice?.invoice_purpose)
      const mainLine =
        nonDiscountLines.find((line) => normalizeDesc(line?.item_description) === purposeKey) ||
        nonDiscountLines[0]
      const customLines = nonDiscountLines.filter((line) => line !== mainLine)
      const lineQty = toNumber(mainLine?.quantity, 0)
      const unitRaw = String(mainLine?.unit || '')
        .trim()
        .toLowerCase()
      const isPaxMonthUnit =
        unitRaw.includes('pax') && (unitRaw.includes('mth') || unitRaw.includes('month'))
      const unitCost = toNumber(mainLine?.unit_price, 0)
      const customTotal = customLines.reduce((sum, line) => {
        const qty = toNumber(line?.quantity, 0)
        const price = toNumber(line?.unit_price, 0)
        return sum + qty * price
      }, 0)
      const discountQty = toNumber(discountLine?.quantity, 1)
      const discountUnit = Math.abs(toNumber(discountLine?.unit_price, 0))
      const discountTotal = discountQty * discountUnit
      const baseLineSubtotal = Number.isFinite(baseAmount)
        ? baseAmount - customTotal + discountTotal
        : lineQty * unitCost
      const invoiceMonth = String(invoice?.invoice_date || '').slice(0, 7)
      let durationFromPurpose = 1
      const purposeRaw = String(invoice?.invoice_purpose || '')
      const monthsMatch = purposeRaw.match(/for\s+months:\s*(.+)$/i)
      if (monthsMatch && monthsMatch[1]) {
        const tokens = monthsMatch[1]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
        if (tokens.length >= 2) durationFromPurpose = tokens.length
      } else if (purposeRaw.match(/for\s+month:/i)) {
        durationFromPurpose = 1
      }
      let durationEstimate =
        lineQty > 0 && unitCost > 0 ? baseLineSubtotal / (lineQty * unitCost) : 1
      if (!Number.isFinite(durationEstimate) || durationEstimate < 1) {
        durationEstimate = 1
      }
      const duration =
        durationFromPurpose >= 2
          ? durationFromPurpose
          : durationEstimate >= 2
            ? parseFloat(durationEstimate.toFixed(2))
            : 1
      const isMulti = duration >= 2
      const normalizedUnitCost =
        !isMulti && lineQty > 0 ? parseFloat((baseLineSubtotal / lineQty).toFixed(2)) : unitCost
      const pax =
        isPaxMonthUnit && duration > 0 ? parseFloat((lineQty / duration).toFixed(2)) : lineQty

      return {
        pricing: {
          ...pricing,
          service_title:
            invoice?.invoice_purpose || mainLine?.item_description || 'Manpower Supply',
          quantity: pax,
          unit_cost: normalizedUnitCost,
          unit:
            !mainLine?.unit || String(mainLine.unit).toLowerCase() === 'lot'
              ? 'pax-mth'
              : mainLine.unit,
          discount: discountUnit,
          discount_qty: discountQty,
          discount_unit: discountLine?.unit || 'Lot',
          manpower_items: customLines.map((line) => ({
            id: line.id,
            item_description: line.item_description || '',
            description: line.description || '',
            unit: line.unit || 'Lot',
            quantity: toNumber(line.quantity, 1),
            unit_price: toNumber(line.unit_price),
          })),
          sst_percent: sstRate,
          sub_total: baseAmount,
          sst_amount: sstAmount,
          grand_total: grandTotal,
          claim_type: isMulti ? 'multi' : 'single',
          duration,
          month: invoiceMonth || pricing.month,
        },
        quoteDetails,
      }
    }

    case 'Industrial Hygiene': {
      const isDiscountLine = (line) => isExactLabel(line, ['discount', 'less'])
      const isTravelLine = (line) =>
        isExactLabel(line, ['travel charge', 'mobilization charge', 'mobilization cost'])
      const isGeneratedBaseLine = (line) => {
        const detail = String(line?.description || '')
        return (
          /[\d.]+\s+.+?\s+x\s+[\d.]+\s*work units?/i.test(detail) ||
          /[\d.]+\s+.+?\s*-\s*Lump Sum Work Unit/i.test(detail)
        )
      }

      const discountLine = lines.find((line) => isDiscountLine(line))
      const travelLine = lines.find((line) => isTravelLine(line))
      const nonMetaLines = lines.filter((line) => !isDiscountLine(line) && !isTravelLine(line))
      const purposeKey = normalizeDesc(invoice?.invoice_purpose)
      const mainLine =
        nonMetaLines.find((line) => normalizeDesc(line?.item_description) === purposeKey) ||
        nonMetaLines.find((line) => isGeneratedBaseLine(line)) ||
        nonMetaLines[0]
      const customLines = nonMetaLines.filter((line) => line !== mainLine)

      const baseQty = toNumber(mainLine?.quantity, 0)
      let sampleCounts = baseQty
      let workUnits = 1
      let sampleUnitFromNote = ''
      const detail = String(mainLine?.description || '')
      const comboMatch = detail.match(/([\d.]+)\s+(.+?)\s+x\s+([\d.]+)\s*work units?/i)
      if (comboMatch) {
        sampleCounts = toNumber(comboMatch[1], baseQty)
        sampleUnitFromNote = String(comboMatch[2] || '').trim()
        workUnits = toNumber(comboMatch[3], 1)
      }
      const lumpMatch = detail.match(/([\d.]+)\s+(.+?)\s*-\s*Lump Sum Work Unit/i)
      if (lumpMatch) {
        sampleCounts = toNumber(lumpMatch[1], baseQty)
        sampleUnitFromNote = String(lumpMatch[2] || '').trim()
        workUnits = ''
      }
      const hasLumpSum = /lump sum/i.test(detail)
      if (!Number.isFinite(workUnits) || workUnits < 1) {
        workUnits = hasLumpSum ? '' : 1
      }
      const sampleUnit =
        sampleUnitFromNote ||
        (String(mainLine?.unit || '').toLowerCase() === 'sample-unit' ? '' : mainLine?.unit) ||
        'sample(s)'
      const unitPrice = toNumber(mainLine?.unit_price, 0)

      const travelQty = toNumber(travelLine?.quantity, 1)
      const travelUnit = travelLine?.unit || 'Lot'
      const travelUnitPrice = toNumber(travelLine?.unit_price, 0)
      const travelCharge = travelQty * travelUnitPrice

      const discountQty = toNumber(discountLine?.quantity, 1)
      const discountUnit = discountLine?.unit || 'Lot'
      const discountUnitPrice = Math.abs(toNumber(discountLine?.unit_price, 0))
      const discountTotal = discountQty * discountUnitPrice

      return {
        pricing: {
          ...pricing,
          service_title:
            invoice?.invoice_purpose || mainLine?.item_description || 'Industrial Hygiene',
          sample_counts: sampleCounts,
          sample_unit: sampleUnit || 'sample(s)',
          num_work_units: workUnits,
          unit_price: unitPrice,
          travel_qty: travelQty,
          travel_unit: travelUnit,
          travel_unit_price: travelUnitPrice,
          travel_charge: travelCharge,
          discount: discountTotal,
          discount_qty: discountQty,
          discount_unit: discountUnit,
          discount_unit_price: discountUnitPrice,
          hygiene_items: customLines.map((line) => ({
            id: line.id,
            item_description: line.item_description || '',
            description: line.description || '',
            unit: line.unit || 'Lot',
            quantity: toNumber(line.quantity, 1),
            unit_price: toNumber(line.unit_price),
          })),
          sst_percent: sstRate,
          sub_total: baseAmount,
          sst_amount: sstAmount,
          grand_total: grandTotal,
        },
        quoteDetails,
      }
    }

    case 'Special Service':
    case 'Special': {
      const discountLine = lines.find((line) => isExactLabel(line, ['discount', 'less']))
      const discountQty = toNumber(discountLine?.quantity, 1)
      const discountUnit = discountLine?.unit || 'Lot'
      const discountUnitPrice = Math.abs(toNumber(discountLine?.unit_price, 0))
      const discount = discountQty * discountUnitPrice
      const specialItems = lines
        .filter((line) => !isExactLabel(line, ['discount', 'less']))
        .map((line) => {
          const qty = toNumber(line.quantity, 1)
          const price = toNumber(line.unit_price)
          return {
            id: line.id,
            item_description: line.item_description || '',
            description: line.description || '',
            unit: line.unit || 'Lot',
            quantity: qty,
            unit_price: price,
          }
        })

      return {
        pricing: {
          ...pricing,
          discount,
          discount_qty: discountQty,
          discount_unit: discountUnit,
          special_items: specialItems,
          sub_total: baseAmount,
          sst_percent: sstRate,
          sst_amount: sstAmount,
          grand_total: grandTotal,
        },
        quoteDetails,
      }
    }

    default:
      return { pricing: { ...pricing }, quoteDetails }
  }
}
