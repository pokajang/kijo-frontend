// src/views/crm/quotes/special/SpecialQuotationForm.js

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SpecialDetailsCard from './SpecialDetailsCard'
import PricingCard from './PricingCard'
import ReviewSpecialQuoteCard from './ReviewSpecialQuoteCard'
import { handleQuoteSuccess } from '../quoteSuccessHandler'
import { clearQuoteMainDraft } from '../quoteMainDrafts'
import { normalizeQuoteResult, quoteSaveMethod, quoteServiceUrl } from '../quoteApi'
import { buildPicPayload } from '../quoteContactUtils'
import { getRecordListPath } from '../../records/config/recordTabs'
import dialog from '../../../../components/dialog/dialogService'

const isSuccess = (payload) =>
  payload?.status === 'success' || payload?.success === true || payload?.ok === true

export const SPECIAL_QUOTE_DRAFT_KEY = 'draftSpecialQuote'

export const loadSpecialQuoteDraft = (
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) => {
  if (!storage || typeof storage.getItem !== 'function') return null

  try {
    const raw = storage.getItem(SPECIAL_QUOTE_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    if (typeof storage.removeItem === 'function') {
      storage.removeItem(SPECIAL_QUOTE_DRAFT_KEY)
    }
    return null
  }
}

export default function SpecialQuotationForm({
  selectedClient,
  initialFormData = null,
  isEditMode = false,
  quoteId = null,
  proposalLanguage = 'en',
}) {
  const navigate = useNavigate()
  const hasPriceExceptionRequestId = Boolean(
    new URLSearchParams(window.location.search).get('priceExceptionRequestId'),
  )

  // Default form structure
  const defaultForm = {
    specialId: null,
    serviceTitle: '',
    serviceCode: '',
    generalRemarks: '',
    lineItems: [], // { id, title, description, unit, quantity, unitPrice, amount }
    discount: 0,
    priceExceptionRequestId: '',
    sstPercent: 0,
    subTotal: 0,
    sstAmount: 0,
    attachProposal: true,
    clientId: null,
    clientName: '',
    clientSsm: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
    clientZip: '',
    picName: '',
    picEmail: '',
    picPhone: '',
    picPosition: '',
    proposalLanguage,
  }

  // Load draft from localStorage (only in create mode)
  const draft = !isEditMode && !hasPriceExceptionRequestId ? loadSpecialQuoteDraft() : null
  const [formData, setFormData] = useState(draft || defaultForm)
  const [initialized, setInitialized] = useState(false)

  // Persist draft on any change
  useEffect(() => {
    if (!isEditMode && !hasPriceExceptionRequestId) {
      localStorage.setItem(SPECIAL_QUOTE_DRAFT_KEY, JSON.stringify(formData))
    }
  }, [formData, isEditMode, hasPriceExceptionRequestId])

  // Clear draft when switching to edit mode
  useEffect(() => {
    if (isEditMode || hasPriceExceptionRequestId) {
      localStorage.removeItem(SPECIAL_QUOTE_DRAFT_KEY)
    }
  }, [isEditMode, hasPriceExceptionRequestId])

  // Populate formData in edit mode once
  useEffect(() => {
    if (!isEditMode || !initialFormData || initialized) return
    const items = Array.isArray(initialFormData.lineItems)
      ? initialFormData.lineItems.map((li) => ({
          id: li.id,
          title: li.title || '',
          description: li.description || '',
          unit: li.unit || '',
          quantity: parseFloat(li.quantity) || 1,
          unitPrice: parseFloat(li.unitPrice) || 0,
          amount: parseFloat(li.amount ?? li.lineTotal ?? li.line_total ?? li.total_price) || 0,
        }))
      : []

    setFormData({
      specialId: initialFormData.specialId ?? null,
      serviceTitle: initialFormData.serviceTitle ?? '',
      serviceCode: initialFormData.serviceCode ?? '',
      generalRemarks: initialFormData.generalRemarks ?? '',
      lineItems: items,
      discount: parseFloat(initialFormData.discount) || 0,
      priceExceptionRequestId: '',
      sstPercent: parseFloat(initialFormData.sstPercent) || 0,
      subTotal: parseFloat(initialFormData.subTotal) || 0,
      sstAmount: parseFloat(initialFormData.sstAmount) || 0,
      attachProposal: Boolean(initialFormData.attachProposal),
      clientId: initialFormData.clientId ?? null,
      clientName: initialFormData.clientName || '',
      clientSsm: initialFormData.clientSsm || '',
      clientAddress: initialFormData.clientAddress || '',
      clientCity: initialFormData.clientCity || '',
      clientState: initialFormData.clientState || '',
      clientZip: initialFormData.clientZip || '',
      picName: initialFormData.picName || '',
      picEmail: initialFormData.picEmail || '',
      picPhone: initialFormData.picPhone || '',
      picPosition: initialFormData.picPosition || '',
      proposalLanguage: initialFormData.proposalLanguage || proposalLanguage,
    })
    setInitialized(true)
  }, [initialFormData, isEditMode, initialized, proposalLanguage])

  useEffect(() => {
    if (isEditMode) return
    setFormData((prev) => ({
      ...prev,
      proposalLanguage,
      specialId: null,
      serviceTitle: '',
      serviceCode: '',
      lineItems: [],
    }))
  }, [proposalLanguage, isEditMode])

  // Save or update the quote
  const handleSaveQuote = async () => {
    if (!selectedClient) {
      dialog.alert('Please select a client before saving.')
      return
    }
    if (!formData.specialId) {
      dialog.alert('Please choose a Special Service type.')
      return
    }

    const url = quoteServiceUrl('special', isEditMode ? quoteId : null)

    const subTotal = parseFloat(formData.subTotal || 0)
    const sstAmount = parseFloat(formData.sstAmount || 0)
    const grandTotal = parseFloat((subTotal + sstAmount).toFixed(2))
    const { primaryPIC, pic_name, pic_email, pic_phone, pic_position } =
      buildPicPayload(selectedClient)

    if (!primaryPIC) {
      dialog.alert('Please select at least one client contact (PIC) before saving.')
      return
    }

    const clientPayload = {
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
    }

    const corePayload = {
      sp_id: formData.specialId,
      service_title: formData.serviceTitle,
      service_code: formData.serviceCode,
      general_remarks: formData.generalRemarks,
      line_items: formData.lineItems.map((li) => ({
        item_name: li.title,
        title: li.title,
        description: li.description,
        unit: li.unit,
        quantity: Number(li.quantity) || 0,
        unit_price: Number(li.unitPrice) || 0,
        line_total: Number(li.amount) || 0,
        total_price: Number(li.amount) || 0,
      })),
      discount: Number(formData.discount) || 0,
      price_exception_request_id: null,
      sst_percent: Number(formData.sstPercent) || 0,
      sub_total: subTotal,
      sst_amount: sstAmount,
      grand_total: grandTotal,
      attach_proposal: formData.attachProposal ? 1 : 0,
      proposal_language: formData.proposalLanguage || proposalLanguage,
    }

    const payload = {
      ...(isEditMode && {
        id: quoteId,
        isRevision: new URLSearchParams(window.location.search).get('isRevision') === 'true',
      }),
      ...clientPayload,
      ...corePayload,
    }
    console.log('🔔 Saving quote payload:', payload)

    try {
      const res = await fetch(url, {
        method: quoteSaveMethod(isEditMode),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const rawResult = await res.json()
      const result = normalizeQuoteResult(rawResult)

      if (isSuccess(result)) {
        await handleQuoteSuccess(result)
        // Clear drafts
        localStorage.removeItem('draftSpecialQuote')
        clearQuoteMainDraft('special')
        sessionStorage.removeItem('quoteInquirySource')
        const goToList = await dialog.confirm(
          `Quotation ${isEditMode ? 'updated' : 'created'}. Go to quote records?`,
          {
            title: isEditMode ? 'Quotation Updated' : 'Quotation Created',
            confirmText: 'Go to list',
            cancelText: isEditMode ? 'Stay here' : 'Create another',
          },
        )
        if (goToList) {
          navigate(getRecordListPath('special-tab'), { replace: true })
        } else if (!isEditMode) {
          window.location.href = '/crm/quotes'
        }
      } else {
        dialog.alert(result.message || '❌ Save failed.')
      }
    } catch (err) {
      console.error('❌ Save error:', err)
      dialog.alert('❌ Error saving quotation.')
    }
  }

  // Determine render gates
  const showPricing =
    isEditMode || (selectedClient && formData.specialId != null && formData.lineItems.length > 0)
  const showReview = isEditMode || parseFloat(formData.subTotal || 0) > 0

  return (
    <>
      <SpecialDetailsCard
        formData={formData}
        setFormData={setFormData}
        isEditMode={isEditMode}
        proposalLanguage={proposalLanguage}
      />

      {showPricing && (
        <>
          <PricingCard formData={formData} setFormData={setFormData} />

          {showReview && (
            <ReviewSpecialQuoteCard
              selectedClient={selectedClient}
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveQuote}
              isEditMode={isEditMode}
              quoteId={quoteId}
            />
          )}
        </>
      )}
    </>
  )
}
