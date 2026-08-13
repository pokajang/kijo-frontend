import dialog from '../../../../components/dialog/dialogService'
import { normalizeEquipmentInvoiceItem } from '../../../../shared/invoice/equipmentInvoiceUtils'
import { buildHygieneInvoicePricingSeed } from '../../../../shared/invoice/hygienePricing'
import { normalizeTrainingHrdCharge } from '../../../crm/quotes/training/trainingHrd'
import { buildInvoiceCreatePayload } from './invoiceCreatePayload'

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

export const mapInvoiceFieldErrors = (fieldErrors = {}, breakdown = []) => {
  const mapped = {}
  Object.entries(fieldErrors).forEach(([path, messages]) => {
    if (path === 'sst_percent') {
      mapped['pricing.sst_percent'] = messages
      return
    }
    const match = path.match(/^breakdown\.(\d+)\.(.+)$/)
    if (!match) {
      mapped[path] = messages
      return
    }
    const lineIndex = Number(match[1])
    const field = match[2]
    const line = breakdown[lineIndex] || {}
    const type = line.line_type
    if (type === 'service') {
      const serviceField = {
        quantity: 'sample_counts',
        unit_price: 'unit_price',
        item_description: 'service_title',
        unit: 'sample_unit',
      }[field]
      mapped[`pricing.${serviceField || field}`] = messages
    } else if (type === 'travel')
      mapped[`pricing.travel_${field === 'quantity' ? 'qty' : field}`] = messages
    else if (type === 'discount')
      mapped[`pricing.discount_${field === 'quantity' ? 'qty' : field}`] = messages
    else {
      const customIndex = breakdown
        .slice(0, lineIndex)
        .filter((candidate) => (candidate.line_type || 'custom') === 'custom').length
      mapped[`pricing.hygiene_items.${customIndex}.${field}`] = messages
    }
  })
  return mapped
}

export const useTrainingQuoteData = (quoteId, setQuoteDetails, setPricing) => {
  if (!quoteId) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/training/${encodeURIComponent(quoteId)}`,
    controller.signal,
  )
    .then((data) => {
      const hrdRate = normalizeTrainingHrdCharge(data.payment_method, data.hrd_charge)
      setQuoteDetails(data)
      setPricing((prev) => ({
        ...prev,
        training_total: parseFloat(data.training_total) || 0,
        meal_total: parseFloat(data.meal_total) || 0,
        mobilization_cost: parseFloat(data.mobilization_cost) || 0,
        discount_amount: parseFloat(data.discount_amount) || 0,
        hrd_rate: hrdRate,
        hrd_amount: parseFloat(data.hrd_amount) || 0,
        hrd_qty: 1,
        hrd_unit: 'Lot',
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

export const useEquipmentQuoteData = (quoteId, setQuoteDetails, setPricing) => {
  if (!quoteId) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/equipment/${encodeURIComponent(quoteId)}`,
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

export const useManpowerQuoteData = (quoteId, setQuoteDetails, setPricing) => {
  if (!quoteId) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/manpower/${encodeURIComponent(quoteId)}`,
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

export const useHygieneQuoteData = (quoteId, setQuoteDetails, setPricing, setQuoteError) => {
  if (!quoteId) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/ih/${encodeURIComponent(quoteId)}`,
    controller.signal,
  )
    .then((data) => {
      setQuoteError?.('')
      setQuoteDetails(data)
      const seed = buildHygieneInvoicePricingSeed(data)
      setPricing((prev) => ({ ...prev, ...seed }))
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('Hygiene data fetch error:', err)
        setQuoteError?.('Quote values could not be loaded. Your draft is retained.')
      }
    })
  return () => controller.abort()
}

export const useSpecialQuoteData = (quoteId, setQuoteDetails, setPricing) => {
  if (!quoteId) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/special/${encodeURIComponent(quoteId)}`,
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

export const useJD14ApprovalNo = (projectId, setGrantApprovalNo) => {
  if (!projectId) return
  const controller = new AbortController()
  fetch(`${import.meta.env.VITE_API_BASE}jd14-forms/by-project?project_id=${projectId}`, {
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

export const submitInvoicePayload = async (payload) => {
  if (!payload) {
    dialog.alert('Invoice payload is missing. Please review the invoice again.')
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
      return {
        success: true,
        invoiceId: data.invoice_id,
        invoiceRefNo: data.invoice_ref_no,
        projectClosed: Boolean(data.project_closed),
      }
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
      return { success: false, invoiceId: data.invoice_id, openExisting }
    }
    const responseFieldErrors = data.field_errors || data.errors
    if (responseFieldErrors) {
      return {
        success: false,
        code: data.code || 'invoice_validation_failed',
        message: data.message || 'Some invoice fields require attention.',
        fieldErrors: mapInvoiceFieldErrors(responseFieldErrors, payload.breakdown || []),
      }
    }
    dialog.alert('Invoice creation failed: ' + (data.message || 'Unknown error.'))
    return { success: false }
  } catch (err) {
    console.error('Invoice creation error:', err)
    dialog.alert('Invoice could not be saved. Your draft is retained. Please try again.')
    return { success: false }
  }
}

export const createInvoiceForType = async (serviceType, args) => {
  const built = buildInvoiceCreatePayload(serviceType, args)
  if (!built.success) {
    dialog.alert(built.message || 'Invoice cannot be created.')
    return { success: false }
  }

  return submitInvoicePayload(built.payload)
}
