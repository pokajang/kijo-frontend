// src/views/crm/quotes/special/SpecialQuotationForm.js

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { CCol } from '@coreui/react'
import SpecialDetailsCard from './SpecialDetailsCard'
import PricingCard from './PricingCard'
import ReviewSpecialQuoteCard from './ReviewSpecialQuoteCard'
import {
  LEGACY_QUOTE_SERVICE_DRAFT_KEYS,
  clearQuoteServiceDraft,
  readQuoteServiceDraft,
  writeQuoteServiceDraft,
} from '../quoteMainDrafts'
import { buildPicPayload } from '../quoteContactUtils'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'
import { useQuoteSave } from '../helpers/useQuoteSave'
import dialog from '../../../../components/dialog/dialogService'

export const SPECIAL_QUOTE_DRAFT_KEY = LEGACY_QUOTE_SERVICE_DRAFT_KEYS.special

export const loadSpecialQuoteDraft = (storage) => {
  return readQuoteServiceDraft({ serviceKey: 'special', storage })
}

export default function SpecialQuotationForm({
  selectedClient,
  initialFormData = null,
  isEditMode = false,
  quoteId = null,
  proposalLanguage = 'en',
}) {
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
    serviceKey: 'special',
    quoteId,
    isEditMode,
    recordTabKey: 'special-tab',
    draftContext,
    successMessage: `Quotation ${isEditMode ? 'updated' : 'created'}. Go to quote records?`,
  })

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
    proposalMode: '',
    hasAppendableProposal: null,
    appendablePdfCount: 0,
    hasWrittenProposalContent: false,
    appendableProposalMessage: '',
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

  // Load draft from shared draft storage (only in create mode)
  const draft =
    !isEditMode &&
    !hasPriceExceptionRequestId &&
    readQuoteServiceDraft({ serviceKey: 'special', ...draftContext })
  const [formData, setFormData] = useState(draft || defaultForm)
  const previousProposalLanguageRef = useRef(formData.proposalLanguage || proposalLanguage)
  const [initialized, setInitialized] = useState(false)

  // Persist draft on any change
  useEffect(() => {
    if (!isEditMode && !hasPriceExceptionRequestId) {
      writeQuoteServiceDraft({ serviceKey: 'special', ...draftContext, draft: formData })
    }
  }, [draftContext, formData, isEditMode, hasPriceExceptionRequestId])

  // Clear draft when switching to edit mode
  useEffect(() => {
    if (isEditMode || hasPriceExceptionRequestId) {
      clearQuoteServiceDraft({ serviceKey: 'special', ...draftContext })
    }
  }, [draftContext, isEditMode, hasPriceExceptionRequestId])

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
      proposalMode: initialFormData.proposalMode || '',
      hasAppendableProposal: initialFormData.hasAppendableProposal ?? null,
      appendablePdfCount: Number(initialFormData.appendablePdfCount || 0),
      hasWrittenProposalContent: Boolean(initialFormData.hasWrittenProposalContent),
      appendableProposalMessage: initialFormData.appendableProposalMessage || '',
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
    if (previousProposalLanguageRef.current === proposalLanguage) return
    previousProposalLanguageRef.current = proposalLanguage

    setFormData((prev) => ({
      ...prev,
      proposalLanguage,
      specialId: null,
      serviceTitle: '',
      serviceCode: '',
      lineItems: [],
      proposalMode: '',
      hasAppendableProposal: null,
      appendablePdfCount: 0,
      hasWrittenProposalContent: false,
      appendableProposalMessage: '',
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
    if (!Array.isArray(formData.lineItems) || formData.lineItems.length === 0) {
      dialog.alert('Please add at least one special service line item.')
      return
    }
    if (formData.attachProposal && formData.hasAppendableProposal === false) {
      dialog.alert(
        formData.appendableProposalMessage || 'Selected special proposal cannot be appended.',
      )
      return
    }
    const invalidLineItem = formData.lineItems.find(
      (item) => !String(item.title || '').trim() || Number(item.quantity || 0) <= 0,
    )
    if (invalidLineItem) {
      dialog.alert('Please complete each special service line item title and quantity.')
      return
    }

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
        isRevision,
      }),
      ...clientPayload,
      ...corePayload,
    }

    await saveQuote(payload, {
      failureMessage: 'Save failed.',
      networkErrorMessage: 'Error saving quotation.',
    })
  }

  // Determine render gates
  const showPricing =
    isEditMode || (selectedClient && formData.specialId && formData.lineItems.length > 0)
  const showReview = isEditMode || parseFloat(formData.subTotal || 0) > 0

  return (
    <CCol xs={12}>
      <div className="d-grid gap-3">
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
      </div>
    </CCol>
  )
}
