import dialog from '../../../../components/dialog/dialogService'
import {
  getEquipmentInvoiceUnitPrice,
  normalizeEquipmentInvoiceItem,
} from '../../../../shared/invoice/equipmentInvoiceUtils'
// src/views/project/InvoiceProjectModal/actionHandlers.js

const toNumber = (value) => parseFloat(value) || 0
const toNegative = (value) => -Math.abs(toNumber(value))

const getLocalISODate = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const normalizeApiPayload = (json) => {
  const isObject = json && typeof json === 'object'
  if (!isObject) return json

  const looksLikeEnvelope =
    'data' in json || 'message' in json || ('status' in json && !('id' in json))

  if (looksLikeEnvelope) {
    const status = typeof json.status === 'string' ? json.status.toLowerCase() : ''
    if (status && status !== 'success') {
      throw new Error(json.message || 'Request failed.')
    }
    if (json.error) {
      throw new Error(json.error)
    }
    return json.data ?? {}
  }

  if ('error' in json && !('id' in json)) {
    throw new Error(json.error || 'Request failed.')
  }

  return json
}

const fetchQuotePayload = async (url, signal) => {
  const res = await fetch(url, { signal, credentials: 'include' })
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error('Invalid server response.')
  }

  if (!res.ok) {
    throw new Error(json?.message || json?.error || `Request failed with status ${res.status}`)
  }

  return normalizeApiPayload(json)
}

// ── TRAINING ────────────────────────────────────────────────────────────────

// Fetch quote & pricing for Training
export const useTrainingQuoteData = (quote_id, setQuoteDetails, setPricing) => {
  if (!quote_id) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/training/${encodeURIComponent(quote_id)}`,
    controller.signal,
  )
    .then((data) => {
      setQuoteDetails(data)
      setPricing((prev) => ({
        ...prev,
        training_total: parseFloat(data.training_total) || 0,
        meal_total: parseFloat(data.meal_total) || 0,
        mobilization_cost: parseFloat(data.mobilization_cost) || 0,
        discount_amount: parseFloat(data.discount_amount) || 0,
        subtotal: parseFloat(data.subtotal) || 0,
        sst_rate: parseFloat(data.sst_rate) || 0,
        sst_amount: parseFloat(data.sst_amount) || 0,
        grand_total: parseFloat(data.grand_total) || 0,
      }))
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('Training fetch error:', err)
    })
  return () => controller.abort()
}

// src/views/project/InvoiceProjectModal/actionHandlers.js

// ── EQUIPMENT SUPPLY ─────────────────────────────────────────────────────────
export const useEquipmentQuoteData = (quote_id, setQuoteDetails, setPricing) => {
  if (!quote_id) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/equipment/${encodeURIComponent(quote_id)}`,
    controller.signal,
  )
    .then((data) => {
      setQuoteDetails(data)
      setPricing((prev) => ({
        ...prev,
        sub_total: parseFloat(data.subtotal || 0),
        discount: parseFloat(data.discount || 0),
        delivery_charge: parseFloat(data.delivery_charge || 0),
        misc_charge: parseFloat(data.misc_charge || 0),
        sst_percent: parseFloat(data.sst_percent || 0),
        sst_amount: parseFloat(data.sst_amount || 0),
        grand_total: parseFloat(data.grand_total || 0),
        equipment_items: Array.isArray(data.equipment_items)
          ? data.equipment_items.map(normalizeEquipmentInvoiceItem)
          : [],
      }))
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('Equipment fetch error:', err)
    })
  return () => controller.abort()
}

// ── MANPOWER SUPPLY ──────────────────────────────────────────────────────────
export const useManpowerQuoteData = (quote_id, setQuoteDetails, setPricing) => {
  if (!quote_id) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/manpower/${encodeURIComponent(quote_id)}`,
    controller.signal,
  )
    .then((data) => {
      setQuoteDetails(data)
      setPricing((prev) => ({
        ...prev,
        sub_total: parseFloat(data.sub_total || 0),
        discount: parseFloat(data.discount || 0),
        sst_percent: parseFloat(data.sst_percent || 0),
        sst_amount: parseFloat(data.sst_amount || 0),
        grand_total: parseFloat(data.grand_total || 0),
      }))
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('Manpower data fetch error:', err)
    })
  return () => controller.abort()
}

// ── INDUSTRIAL HYGIENE ───────────────────────────────────────────────────────
export const useHygieneQuoteData = (quote_id, setQuoteDetails, setPricing) => {
  if (!quote_id) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/ih/${encodeURIComponent(quote_id)}`,
    controller.signal,
  )
    .then((data) => {
      setQuoteDetails(data)
      setPricing((prev) => ({
        ...prev,
        sub_total: parseFloat(data.sub_total || 0),
        discount: parseFloat(data.discount || 0),
        sst_percent: parseFloat(data.sst_percent || 0),
        sst_amount: parseFloat(data.sst_amount || 0),
        grand_total: parseFloat(data.grand_total || 0),
      }))
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('Hygiene data fetch error:', err)
    })
  return () => controller.abort()
}

// ── SPECIAL SERVICE ──────────────────────────────────────────────────────────
export const useSpecialQuoteData = (quote_id, setQuoteDetails, setPricing) => {
  if (!quote_id) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/special/${encodeURIComponent(quote_id)}`,
    controller.signal,
  )
    .then((data) => {
      setQuoteDetails(data)
      setPricing((prev) => ({
        ...prev,
        sub_total: parseFloat(data.sub_total || 0),
        discount: parseFloat(data.discount || 0),
        sst_percent: parseFloat(data.sst_percent || 0),
        sst_amount: parseFloat(data.sst_amount || 0),
        grand_total: parseFloat(data.grand_total || 0),
      }))
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('Special data fetch error:', err)
    })

  return () => controller.abort()
}

// ── (additional services like Manpower, Hygiene, Special can follow the same pattern) ──

// ── JD14 GRANT NUMBER ────────────────────────────────────────────────────────────

export const useJD14ApprovalNo = (project_id, setGrantApprovalNo) => {
  if (!project_id) return
  const controller = new AbortController()
  fetch(`${import.meta.env.VITE_API_BASE}jd14-forms/by-project?project_id=${project_id}`, {
    signal: controller.signal,
    credentials: 'include',
  })
    .then((res) => res.json())
    .then((data) => {
      if (data?.approval_no) setGrantApprovalNo(data.approval_no)
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('JD14 fetch error:', err)
    })
  return () => controller.abort()
}

// ── INVOICE CREATION ───────────────────────────────────────────────────────────

export const createInvoiceForType = async (
  serviceType,
  {
    project,
    quoteDetails,
    pricing,
    projectMeta,
    clientOverrides, // ← add this
    grantApprovalNo,
    paymentMethodOverride,
    allowWithoutQuote,
    navigate,
    loaNo,
    paymentTermsDays,
    overridePaymentTerms,
  },
) => {
  if (!project) {
    dialog.alert('❌ Missing project information.')
    return { success: false }
  }

  if (!quoteDetails && !allowWithoutQuote) {
    dialog.alert('❌ Quote details are not ready yet. Please wait and try again.')
    return { success: false }
  }

  const resolvedQuoteId = quoteDetails?.id ?? project?.quote_id ?? null
  if (!resolvedQuoteId && !allowWithoutQuote) {
    dialog.alert('❌ Missing quote reference. Cannot create invoice.')
    return { success: false }
  }

  const baseAmount =
    serviceType === 'Training' ? toNumber(pricing.subtotal) : toNumber(pricing.sub_total)

  const paymentMethod = paymentMethodOverride || quoteDetails?.payment_method || 'Direct Payment'
  const isHrdPayment = paymentMethod.trim().toLowerCase() === 'hrd grant'
  if (serviceType === 'Training' && isHrdPayment && !grantApprovalNo?.trim()) {
    dialog.alert('❌ HRD Grant Approval No. is required for HRD payment.')
    return { success: false }
  }
  if (allowWithoutQuote && !quoteDetails && baseAmount <= 0) {
    dialog.alert('❌ Please enter a valid invoice amount before creating the invoice.')
    return { success: false }
  }
  // inside createInvoiceForType(...)
  let payload = {
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
    client_award_ref_no: loaNo || '',

    // send overrides instead of project values
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

    // ─── Explicit financial totals ───────────────────────────────────────────
    // ensures every service sends its amounts to the backend
    amount: baseAmount,
    sst_amount: toNumber(pricing.sst_amount), // SST value
    grand_total: toNumber(pricing.grand_total), // total after all additions

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
      ]
      break

    case 'Equipment Supply':
      {
        const pricingItems = Array.isArray(pricing.equipment_items) ? pricing.equipment_items : []
        const quoteItems = Array.isArray(quoteDetails?.equipment_items)
          ? quoteDetails.equipment_items
          : []
        const equipmentItems = pricingItems.length > 0 ? pricingItems : quoteItems
        payload.breakdown = equipmentItems.map((item) => ({
          item_description: item.item_name,
          description: item.description || '',
          unit: item.unit,
          quantity: toNumber(item.quantity),
          unit_price: getEquipmentInvoiceUnitPrice(item),
        }))
      }
      // append fees & taxes
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
      }
      break

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
      // one manpower line (use service_title if available)
      payload.breakdown = [
        {
          item_description: manpowerTitle,
          unit: pricing.unit || 'pax-mth',
          quantity: paxMonths,
          unit_price: toNumber(pricing.unit_cost), // per-person rate
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

    case 'Industrial Hygiene':
      {
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

        payload.breakdown = [
          {
            item_description: buildHygieneBaseLabel(
              pricing.service_title || quoteDetails.service_title,
            ),
            unit: displayUnit,
            quantity: baseQty,
            unit_price: toNumber(pricing.unit_price),
            description: baseNote,
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
      }
      break

    case 'Special Service':
    case 'Special':
      // map each special line-item (from pricing if available)
      {
        const specialItems =
          Array.isArray(pricing.special_items) && pricing.special_items.length > 0
            ? pricing.special_items
            : quoteDetails.special_items || []
        payload.breakdown = specialItems.map((item) => ({
          id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
          item_description: item.item_description || item.line_item_title || '',
          description: item.description || '',
          unit: item.unit || 'Lot',
          quantity: toNumber(item.quantity || 1),
          unit_price: toNumber(item.unit_price),
        }))
      }
      // then append any discount & SST
      payload.breakdown.push({
        item_description: 'Discount',
        unit: pricing.discount_unit || 'Lot',
        quantity: toNumber(pricing.discount_qty ?? 1),
        unit_price: toNegative(pricing.discount),
        description: '',
      })
      break

    default:
      break
  }

  if (payload.breakdown.length === 0 && !allowWithoutQuote) {
    dialog.alert('❌ Invoice breakdown is empty. Cannot proceed.')
    return { success: false }
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (data.status === 'success') {
      if (data.invoice_id) navigate(`/commercial/invoice/${data.invoice_id}`)
      return { success: true, invoiceId: data.invoice_id, invoiceRefNo: data.invoice_ref_no }
    }
    if (data.status === 'exists') {
      const openExisting = await dialog.confirm(
        'Invoice already exists: ' + data.message + '. Open existing invoice?',
        {
          title: 'Invoice Exists',
          confirmText: 'Open invoice',
          cancelText: 'Stay here',
        },
      )
      if (openExisting && data.invoice_id) navigate(`/commercial/invoice/${data.invoice_id}`)
      return { success: false, invoiceId: data.invoice_id }
    }
    dialog.alert('Invoice creation failed: ' + (data.message || 'Unknown error.'))
    return { success: false }
  } catch (err) {
    console.error('Invoice creation error:', err)
    dialog.alert('Server error occurred.')
    return { success: false }
  }
}
