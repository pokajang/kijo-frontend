// src/views/crm/quotes/equipment/actionHandlers.js

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearQuoteMainDraft,
  clearQuoteServiceDraft,
  readQuoteServiceDraft,
  writeQuoteServiceDraft,
} from '../quoteMainDrafts'
import { isQuoteResultSuccess, quoteApiUrl } from '../quoteApi'
import { removeQuoteInquirySource } from '../quoteInquirySource'
import { buildPicPayload } from '../quoteContactUtils'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'
import { useQuoteSave } from '../helpers/useQuoteSave'
import { getRecordListPath } from '../../records/config/recordTabs'
import dialog from '../../../../components/dialog/dialogService'
import { formatMoney } from '../../../../utils/formatters/numberFormatters'

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
  { initialFormData = null, isEditMode = false, quoteId = null, proposalLanguage = 'en' } = {},
) {
  const navigate = useNavigate()
  const { isRevision, priceExceptionRequestId } = useQuoteRouteParams()
  const hasPriceExceptionRequestId = Boolean(priceExceptionRequestId)
  const draftContext = useMemo(
    () => ({
      clientId: selectedClient?.company_id,
      language: proposalLanguage,
    }),
    [proposalLanguage, selectedClient?.company_id],
  )
  const saveQuote = useQuoteSave({
    serviceKey: 'equipment',
    quoteId,
    isEditMode,
    recordTabKey: 'equipment-tab',
    draftContext,
    successMessage: ({ result }) => {
      const quoteRef = result.quote_ref_no ? `: ${result.quote_ref_no}` : ''
      return `Equipment quotation ${isEditMode ? 'updated' : 'created'}${quoteRef}. Go to quote records?`
    },
  })

  // ─── form data state ──────────────────────────────────────────────────────
  // form data state
  const defaultForm = {
    items: [], // selectedItems.value objects
    quantities: {}, // { [itemId]: number }
    unitPrices: {}, // { [itemId]: number }
    markedUp: {}, // { [itemId]: number }
    itemRemarks: {}, // { [itemId]: client specifications }
    quotationRemarks: '',
    deliveryCharge: 0,
    miscCharge: 0,
    discount: 0,
    priceExceptionRequestId: '',
    sstPercent: 0,
    estimatedTotalCost: '',
    attachProposal: false,
    proposalLanguage,
  }

  const readDraft = () => {
    if (isEditMode || hasPriceExceptionRequestId) return null
    return readQuoteServiceDraft({ serviceKey: 'equipment', ...draftContext })
  }

  // Load draft in create mode, otherwise use default
  const draft = readDraft()

  const [formData, setFormData] = useState({
    ...defaultForm,
    ...(draft || {}),
    itemRemarks: { ...(draft?.itemRemarks || {}) },
    quotationRemarks: String(draft?.quotationRemarks || ''),
  })

  // Persist draft on every change (create mode only)
  useEffect(() => {
    if (!isEditMode && !hasPriceExceptionRequestId) {
      writeQuoteServiceDraft({ serviceKey: 'equipment', ...draftContext, draft: formData })
    }
  }, [draftContext, formData, isEditMode, hasPriceExceptionRequestId])

  // Clear draft when entering edit mode
  useEffect(() => {
    if (isEditMode || hasPriceExceptionRequestId) {
      clearQuoteServiceDraft({ serviceKey: 'equipment', ...draftContext })
    }
  }, [draftContext, isEditMode, hasPriceExceptionRequestId])

  // Catalog fetch + options.
  const [catalogItems, setCatalogItems] = useState([])
  useEffect(() => {
    fetch(quoteApiUrl('catalog/items'), { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (isQuoteResultSuccess(json)) {
          setCatalogItems(json.data)
        } else {
          console.error('Failed to load catalog items', json)
        }
      })
  }, [])

  const selectOptions = catalogItems.map((item) => ({
    label: `${item.item_name} - ${formatMoney(item.supplier_price)}/${item.unit} by ${item.supplier_name}`,
    value: item,
  }))

  // Preload edit data in edit mode.
  useEffect(() => {
    if (isEditMode && initialFormData) {
      // selections
      const items = Array.isArray(initialFormData.items) ? initialFormData.items : []
      const sel = items.map((it) => ({
        label: `${pick(it, 'item_name', 'itemName') || '-'} - ${formatMoney(
          pick(it, 'unit_price', 'unitPrice') || 0,
        )}`,
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
        mu = {},
        itemRemarks = {}
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
        itemRemarks[itemId] = pick(it, 'item_remarks', 'itemRemarks') || ''
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
      const getNullableNumber = (...keys) => {
        for (const key of keys) {
          const value = initialFormData[key]
          if (value === '' || value === null || value === undefined) continue
          const parsed = parseFloat(value)
          if (Number.isFinite(parsed)) return parsed
        }
        return ''
      }
      setFormData({
        items: sel,
        quantities: qs,
        unitPrices: ps,
        markedUp: mu,
        itemRemarks,
        quotationRemarks: pick(initialFormData, 'quotationRemarks', 'quotation_remarks') || '',
        deliveryCharge: getNumber('deliveryCharge', 'delivery_charge'),
        miscCharge: getNumber('miscCharge', 'misc_charge'),
        discount: getNumber('discount'),
        priceExceptionRequestId: '',
        sstPercent: getNumber('sstPercent', 'sst_percent'),
        estimatedTotalCost: getNullableNumber('estimatedTotalCost', 'estimated_total_cost'),
        attachProposal: false,
        proposalLanguage: initialFormData.proposalLanguage || proposalLanguage,
      })
    }
  }, [defaultForm.attachProposal, isEditMode, initialFormData, proposalLanguage])

  // Form handlers.
  const handleSelectChange = (opts) => {
    const list = opts || []
    const qs = {},
      ps = {},
      mu = {},
      itemRemarks = {}
    list.forEach(({ value }) => {
      const id = value.id
      const basePrice = formData.unitPrices[id] ?? parseFloat(value.supplier_price)
      qs[id] = formData.quantities[id] ?? 1
      ps[id] = basePrice
      mu[id] = parseFloat((basePrice * 1.5).toFixed(2))
      itemRemarks[id] = formData.itemRemarks?.[id] || ''
    })
    setFormData((f) => ({
      ...f,
      items: list,
      quantities: qs,
      unitPrices: ps,
      markedUp: mu,
      itemRemarks,
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

  const handleItemRemarksChange = (id, value) =>
    setFormData((f) => ({
      ...f,
      itemRemarks: { ...f.itemRemarks, [id]: value },
    }))

  // Computed totals.
  const itemsTotal = Object.entries(formData.quantities).reduce(
    (sum, [id, q]) => sum + q * (formData.markedUp[id] || 0),
    0,
  )

  const subtotal = itemsTotal + formData.deliveryCharge + formData.miscCharge - formData.discount

  const sstAmount = subtotal * (formData.sstPercent / 100)
  const grandTotal = subtotal + sstAmount

  // Form handlers.
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
    const hasValidSelectedItems =
      formData.items.length > 0 &&
      formData.items.every(({ value: item }) => Number(item?.id || 0) > 0)
    if (!hasValidSelectedItems) {
      dialog.alert('Please select at least one valid equipment item before saving.')
      return
    }
    const hasValidItemPricing = formData.items.every(({ value: item }) => {
      const quantity = Number(formData.quantities[item.id] || 0)
      const markedUpPrice = Number(formData.markedUp[item.id] || 0)
      return quantity > 0 && markedUpPrice >= 0
    })
    if (!hasValidItemPricing) {
      dialog.alert('Please enter a valid quantity for each equipment item before saving.')
      return
    }
    const estimatedTotalCost = Number(formData.estimatedTotalCost)
    if (!Number.isFinite(estimatedTotalCost) || estimatedTotalCost <= 0) {
      dialog.alert(
        'Please enter a valid traffic-light estimated cost greater than zero before saving.',
      )
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
        item_remarks: formData.itemRemarks?.[item.id]?.trim() || null,
        quantity: qty,
        unit_price: formData.unitPrices[item.id] || 0,
        marked_up_price: price,
        line_total: lineTotal,
        total_price: lineTotal,
      }
    })
    const payload = {
      ...(isEditMode && { id: quoteId }),
      isRevision,
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
      quotation_remarks: String(formData.quotationRemarks || '').trim() || null,
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
      estimated_total_cost:
        formData.estimatedTotalCost === '' || formData.estimatedTotalCost == null
          ? null
          : Number(formData.estimatedTotalCost),
      attach_proposal: 0,
      proposal_language: formData.proposalLanguage || proposalLanguage,
    }
    await saveQuote(payload, {
      failureMessage: 'Error: Failed to save quotation.',
      networkErrorMessage: 'Error: Network or server error while saving quotation.',
    })
  }

  const handleCancel = () => {
    if (isEditMode) {
      navigate(getRecordListPath('equipment-tab'), { replace: true })
    } else {
      clearQuoteMainDraft('equipment')
      clearQuoteServiceDraft({ serviceKey: 'equipment', ...draftContext })
      removeQuoteInquirySource()
      navigate('/crm/quotes', { replace: true, state: { quoteResetToken: Date.now() } })
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
    itemRemarks: formData.itemRemarks || {},
    handleItemRemarksChange,
    quotationRemarks: formData.quotationRemarks,
    setQuotationRemarks: (value) => setFormData((f) => ({ ...f, quotationRemarks: value })),

    // charges
    deliveryCharge: formData.deliveryCharge,
    setDeliveryCharge: (v) => setFormData((f) => ({ ...f, deliveryCharge: v })),
    miscCharge: formData.miscCharge,
    setMiscCharge: (v) => setFormData((f) => ({ ...f, miscCharge: v })),
    discount: formData.discount,
    setDiscount: (v) => setFormData((f) => ({ ...f, discount: v })),
    sstPercent: formData.sstPercent,
    setSstPercent: (v) => setFormData((f) => ({ ...f, sstPercent: v })),
    estimatedTotalCost: formData.estimatedTotalCost,
    setEstimatedTotalCost: (value) => setFormData((f) => ({ ...f, estimatedTotalCost: value })),

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
