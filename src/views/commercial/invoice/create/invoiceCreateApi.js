import dialog from '../../../../components/dialog/dialogService'
import { normalizeEquipmentInvoiceItem } from '../../../../shared/invoice/equipmentInvoiceUtils'
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

export const useTrainingQuoteData = (quoteId, setQuoteDetails, setPricing) => {
  if (!quoteId) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/training/${encodeURIComponent(quoteId)}`,
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

export const useHygieneQuoteData = (quoteId, setQuoteDetails, setPricing) => {
  if (!quoteId) return
  const controller = new AbortController()
  fetchQuotePayload(
    `${import.meta.env.VITE_API_BASE}invoices/quote/ih/${encodeURIComponent(quoteId)}`,
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
        hygiene_items: Array.isArray(data.hygiene_items)
          ? data.hygiene_items.map((item) => ({
              id: item.id,
              item_description: item.item_description || '',
              description: item.description || '',
              quantity: parseFloat(item.quantity || 0),
              unit: item.unit || 'Lot',
              unit_price: parseFloat(item.unit_price || 0),
            }))
          : [],
      }))
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('Hygiene data fetch error:', err)
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
    dialog.alert('Invoice creation failed: ' + (data.message || 'Unknown error.'))
    return { success: false }
  } catch (err) {
    console.error('Invoice creation error:', err)
    dialog.alert('Server error occurred.')
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
