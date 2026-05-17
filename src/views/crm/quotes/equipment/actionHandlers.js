// src/views/crm/quotes/equipment/actionHandlers.js

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleQuoteSuccess } from '../quoteSuccessHandler'
import { clearQuoteMainDraft } from '../quoteMainDrafts'
import { normalizeQuoteResult, quoteSaveMethod, quoteServiceUrl } from '../quoteApi'
import { buildPicPayload } from '../quoteContactUtils'
import { getRecordListPath } from '../../records/config/recordTabs'
import dialog from '../../../../components/dialog/dialogService'

const isSuccess = (payload) =>
  payload?.status === 'success' || payload?.success === true || payload?.ok === true

const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

// Hook for Equipment quotation form, now supports create & edit modes
export function useEquipmentForm(
  selectedClient,
  { initialFormData = null, isEditMode = false, quoteId = null } = {},
) {
  const navigate = useNavigate()
  const hasPriceExceptionRequestId = Boolean(
    new URLSearchParams(window.location.search).get('priceExceptionRequestId'),
  )

  // ─── form data state ──────────────────────────────────────────────────────
  const defaultForm = {
    items: [], // selectedItems.value objects
    quantities: {}, // { [itemId]: number }
    unitPrices: {}, // { [itemId]: number }
    markedUp: {}, // { [itemId]: number }
    deliveryCharge: 0,
    miscCharge: 0,
    discount: 0,
    priceExceptionRequestId: '',
    sstPercent: 0,
  }

  const readDraft = () => {
    if (isEditMode || hasPriceExceptionRequestId) return null
    const raw = localStorage.getItem('draftEquipmentQuote')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch (err) {
      console.warn('Invalid draftEquipmentQuote; ignoring.', err)
      return null
    }
  }

  // Load draft in create mode, otherwise use default
  const draft = readDraft()

  const [formData, setFormData] = useState(draft || defaultForm)

  // Persist draft on every change (create mode only)
  useEffect(() => {
    if (!isEditMode && !hasPriceExceptionRequestId) {
      localStorage.setItem('draftEquipmentQuote', JSON.stringify(formData))
    }
  }, [formData, isEditMode, hasPriceExceptionRequestId])

  // Clear draft when entering edit mode
  useEffect(() => {
    if (isEditMode || hasPriceExceptionRequestId) {
      localStorage.removeItem('draftEquipmentQuote')
    }
  }, [isEditMode, hasPriceExceptionRequestId])

  // ─── catalog fetch & options ───────────────────────────────────────────────
  const [catalogItems, setCatalogItems] = useState([])
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}catalog/items`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'success') {
          setCatalogItems(json.data)
        } else {
          console.error('Failed to load catalog items', json)
        }
      })
      .catch((err) => console.error('Catalog fetch error', err))
  }, [])

  const selectOptions = catalogItems.map((item) => ({
    label: `${item.item_name} - RM ${item.supplier_price}/${item.unit} by ${item.supplier_name}`,
    value: item,
  }))

  // ─── preload data in edit mode ─────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && initialFormData) {
      // selections
      const items = Array.isArray(initialFormData.items) ? initialFormData.items : []
      const sel = items.map((it) => ({
        label: `${pick(it, 'item_name', 'itemName') || '-'} - RM ${pick(it, 'unit_price', 'unitPrice') || 0}`,
        value: {
          id: parseInt(pick(it, 'item_id', 'itemId', 'catalog_item_id', 'catalogItemId'), 10) || 0,
          item_name: pick(it, 'item_name', 'itemName') || '',
          supplier_price: parseFloat(pick(it, 'unit_price', 'unitPrice')) || 0,
          unit: pick(it, 'unit') || '',
          supplier_name: pick(it, 'supplier_name', 'supplierName') || '',
          description: pick(it, 'description') || '',
          category_id: pick(it, 'category_id', 'categoryId') || '',
        },
      }))
      // quantities, prices, markedUp
      const qs = {},
        ps = {},
        mu = {}
      items.forEach((it) => {
        const itemId =
          parseInt(pick(it, 'item_id', 'itemId', 'catalog_item_id', 'catalogItemId'), 10) || 0
        if (!itemId) return
        qs[itemId] = parseFloat(pick(it, 'quantity')) || 0
        ps[itemId] = parseFloat(pick(it, 'unit_price', 'unitPrice')) || 0
        mu[itemId] =
          parseFloat(
            pick(it, 'marked_up_price', 'markedUpPrice', 'markedUp', 'unit_price', 'unitPrice'),
          ) || 0
      })
      const getNumber = (...keys) => {
        for (const key of keys) {
          const value = initialFormData[key]
          if (value != null && value !== '') {
            const parsed = parseFloat(value)
            if (Number.isFinite(parsed)) return parsed
          }
        }
        return 0
      }
      setFormData({
        items: sel,
        quantities: qs,
        unitPrices: ps,
        markedUp: mu,
        deliveryCharge: getNumber('deliveryCharge', 'delivery_charge'),
        miscCharge: getNumber('miscCharge', 'misc_charge'),
        discount: getNumber('discount'),
        priceExceptionRequestId: '',
        sstPercent: getNumber('sstPercent', 'sst_percent'),
      })
    }
  }, [isEditMode, initialFormData])

  // ─── handlers ───────────────────────────────────────────────────────────────
  const handleSelectChange = (opts) => {
    const list = opts || []
    const qs = {},
      ps = {},
      mu = {}
    list.forEach(({ value }) => {
      const id = value.id
      const basePrice = formData.unitPrices[id] ?? parseFloat(value.supplier_price)
      qs[id] = formData.quantities[id] ?? 1
      ps[id] = basePrice
      mu[id] = parseFloat((basePrice * 1.5).toFixed(2))
    })
    setFormData((f) => ({
      ...f,
      items: list,
      quantities: qs,
      unitPrices: ps,
      markedUp: mu,
    }))
  }

  const handleQtyChange = (id, v) =>
    setFormData((f) => ({
      ...f,
      quantities: { ...f.quantities, [id]: parseInt(v, 10) || 0 },
    }))

  const handlePriceChange = (id, v) => {
    const price = parseFloat(v) || 0
    setFormData((f) => ({
      ...f,
      unitPrices: { ...f.unitPrices, [id]: price },
      markedUp: { ...f.markedUp, [id]: parseFloat((price * 1.5).toFixed(2)) },
    }))
  }

  const handleMarkedUpChange = (id, v) =>
    setFormData((f) => ({
      ...f,
      markedUp: { ...f.markedUp, [id]: parseFloat(v) || 0 },
    }))

  // ─── computed totals ───────────────────────────────────────────────────────
  const itemsTotal = Object.entries(formData.quantities).reduce(
    (sum, [id, q]) => sum + q * (formData.markedUp[id] || 0),
    0,
  )

  const subtotal = itemsTotal + formData.deliveryCharge + formData.miscCharge - formData.discount

  const sstAmount = subtotal * (formData.sstPercent / 100)
  const grandTotal = subtotal + sstAmount

  // ─── Save / Cancel handlers ───────────────────────────────────────────────
  const handleSaveQuote = async () => {
    if (!selectedClient) {
      console.warn('No client selected')
      return
    }
    const { primaryPIC, pic_name, pic_email, pic_phone, pic_position } =
      buildPicPayload(selectedClient)
    if (!primaryPIC) {
      dialog.alert('Please select at least one client contact (PIC) before saving.')
      return
    }
    const itemsPayload = formData.items.map(({ value: item }) => {
      const qty = formData.quantities[item.id] || 0
      const price = parseFloat(formData.markedUp[item.id] || 0)
      const lineTotal = parseFloat((qty * price).toFixed(2))
      return {
        catalog_item_id: item.id,
        item_id: item.id,
        item_name: item.item_name || '',
        quantity: qty,
        unit_price: formData.unitPrices[item.id] || 0,
        marked_up_price: price,
        line_total: lineTotal,
        total_price: lineTotal,
      }
    })
    const payload = {
      ...(isEditMode && { id: quoteId }),
      isRevision: new URLSearchParams(window.location.search).get('isRevision') === 'true',
      client_id: selectedClient.company_id,
      client_name: selectedClient.company_name,
      client_ssm: selectedClient.ssm_number,
      client_address: selectedClient.address,
      client_city: selectedClient.city,
      client_state: selectedClient.state,
      client_zip: selectedClient.zip,
      pic_name,
      pic_email,
      pic_phone,
      pic_position,
      items: itemsPayload,
      discount: formData.discount,
      price_exception_request_id: null,
      delivery_charge: formData.deliveryCharge,
      misc_charge: formData.miscCharge,
      sst_percent: formData.sstPercent,
      sub_total: parseFloat(subtotal.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      sst_amount: parseFloat(sstAmount.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
    }
    const endpoint = quoteServiceUrl('equipment', isEditMode ? quoteId : null)
    try {
      const res = await fetch(endpoint, {
        method: quoteSaveMethod(isEditMode),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const rawResult = await res.json()
      const result = normalizeQuoteResult(rawResult)
      if (isSuccess(result)) {
        await handleQuoteSuccess(result)
        if (!isEditMode) {
          clearQuoteMainDraft('equipment')
          localStorage.removeItem('draftEquipmentQuote')
          sessionStorage.removeItem('quoteInquirySource')
        }
        const quoteRef = result.quote_ref_no ? `: ${result.quote_ref_no}` : ''
        const goToList = await dialog.confirm(
          `Equipment quotation ${isEditMode ? 'updated' : 'created'}${quoteRef}. Go to quote records?`,
          {
            title: isEditMode ? 'Quotation Updated' : 'Quotation Created',
            confirmText: 'Go to list',
            cancelText: isEditMode ? 'Stay here' : 'Create another',
          },
        )
        if (goToList) {
          navigate(getRecordListPath('equipment-tab'), { replace: true })
        } else if (!isEditMode) {
          window.location.href = '/crm/quotes'
        }
      } else {
        dialog.alert('Error: ' + (result.message || 'Failed to save quotation.'))
      }
    } catch (err) {
      console.error(err)
      dialog.alert('Error: Network or server error while saving quotation.')
    }
  }

  const handleCancel = () => {
    if (isEditMode) {
      navigate(getRecordListPath('equipment-tab'), { replace: true })
    } else {
      clearQuoteMainDraft('equipment')
      localStorage.removeItem('draftEquipmentQuote')
      sessionStorage.removeItem('quoteInquirySource')
      window.location.href = '/crm/quotes'
    }
  }

  return {
    // options + selection
    selectOptions,
    selectedItems: formData.items,
    handleSelectChange,

    // line-item state
    quantities: formData.quantities,
    handleQtyChange,
    unitPrices: formData.unitPrices,
    handlePriceChange,
    markedUp: formData.markedUp,
    handleMarkedUpChange,

    // charges
    deliveryCharge: formData.deliveryCharge,
    setDeliveryCharge: (v) => setFormData((f) => ({ ...f, deliveryCharge: v })),
    miscCharge: formData.miscCharge,
    setMiscCharge: (v) => setFormData((f) => ({ ...f, miscCharge: v })),
    discount: formData.discount,
    setDiscount: (v) => setFormData((f) => ({ ...f, discount: v })),
    sstPercent: formData.sstPercent,
    setSstPercent: (v) => setFormData((f) => ({ ...f, sstPercent: v })),

    // totals
    itemsTotal,
    subtotal,
    sstAmount,
    grandTotal,

    // actions
    handleSaveQuote,
    handleCancel,
  }
}
