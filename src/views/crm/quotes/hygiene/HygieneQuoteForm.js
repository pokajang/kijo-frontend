// src/views/crm/quotes/hygiene/HygieneQuotationForm.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import HygieneDetailsCard from './HygieneDetailsCard'
import PricingCard from './PricingCard'
import ReviewHygieneQuotationCard from './ReviewHygieneQuotationCard'
import {
  clearQuoteServiceDraft,
  readQuoteServiceDraft,
  writeQuoteServiceDraft,
} from '../quoteMainDrafts'
import { buildPicPayload } from '../quoteContactUtils'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'
import { useQuoteSave } from '../helpers/useQuoteSave'
import dialog from '../../../../components/dialog/dialogService'
import { calculateHygieneTotals } from '../../../../shared/invoice/hygienePricing'

export default function HygieneQuotationForm({
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
    serviceKey: 'ih',
    quoteId,
    isEditMode,
    recordTabKey: 'ih-tab',
    draftContext,
  })

  const toNumber = (value, fallback = 0) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  const toInteger = (value, fallback = 0) => {
    const n = parseInt(value, 10)
    return Number.isFinite(n) ? n : fallback
  }

  // Helper to build default address
  const buildSiteAddress = useCallback((client) => {
    if (!client) return ''
    const { address, zip, city, state } = client
    const parts = [address, zip && city ? `${zip} ${city}` : zip || city, state].filter(Boolean)
    return parts.join(', ')
  }, [])

  // Default form shape
  const defaultForm = useMemo(
    () => ({
      serviceId: null,
      serviceTitle: '',
      serviceCode: '',
      siteAddress: buildSiteAddress(selectedClient),
      travelCharge: 0,
      sampleCounts: 0,
      sampleUnit: 'sample(s)',
      numWorkUnits: '',
      inquiryRemarks: '',
      unitPrice: 500,
      discount: 300,
      hygieneItems: [],
      priceExceptionRequestId: '',
      sstPercent: 0,
      sstAmount: '0.00',
      subTotal: '0.00',
      grandTotal: '0.00',
      attachProposal: true,
      proposalLanguage,
    }),
    [buildSiteAddress, selectedClient, proposalLanguage],
  )

  // Load draft in create mode
  const loadDraft = () => {
    if (isEditMode || hasPriceExceptionRequestId) return null
    return readQuoteServiceDraft({ serviceKey: 'ih', ...draftContext })
  }

  const draft = loadDraft()
  const [formData, setFormData] = useState({ ...defaultForm, ...(draft || {}) })
  const previousProposalLanguageRef = useRef(formData.proposalLanguage || proposalLanguage)

  // Persist draft on change (create mode only)
  useEffect(() => {
    if (!isEditMode && !hasPriceExceptionRequestId) {
      writeQuoteServiceDraft({ serviceKey: 'ih', ...draftContext, draft: formData })
    }
  }, [draftContext, formData, isEditMode, hasPriceExceptionRequestId])

  useEffect(() => {
    if (isEditMode || hasPriceExceptionRequestId) {
      clearQuoteServiceDraft({ serviceKey: 'ih', ...draftContext })
    }
  }, [draftContext, isEditMode, hasPriceExceptionRequestId])

  // Populate in edit mode
  useEffect(() => {
    if (isEditMode && initialFormData) {
      setFormData({
        ...defaultForm,
        ...initialFormData,
        siteAddress: initialFormData.siteAddress ?? defaultForm.siteAddress,
        sampleCounts: initialFormData.sampleCounts ?? defaultForm.sampleCounts,
        sampleUnit: initialFormData.sampleUnit ?? defaultForm.sampleUnit,
        numWorkUnits:
          Number(initialFormData.numWorkUnits) > 0
            ? initialFormData.numWorkUnits
            : defaultForm.numWorkUnits,
        discount: initialFormData.discount ?? defaultForm.discount,
        hygieneItems: Array.isArray(initialFormData.hygieneItems)
          ? initialFormData.hygieneItems
          : defaultForm.hygieneItems,
        priceExceptionRequestId: '',
        sstPercent: initialFormData.sstPercent ?? defaultForm.sstPercent,
        sstAmount: initialFormData.sstAmount ?? defaultForm.sstAmount,
        subTotal: initialFormData.subTotal ?? defaultForm.subTotal,
        grandTotal: initialFormData.grandTotal ?? defaultForm.grandTotal,
        serviceTitle: initialFormData.serviceTitle ?? defaultForm.serviceTitle,
        serviceCode: initialFormData.serviceCode ?? defaultForm.serviceCode,
        attachProposal: initialFormData.attachProposal ?? defaultForm.attachProposal,
        proposalLanguage: initialFormData.proposalLanguage || proposalLanguage,
      })
    }
  }, [defaultForm, initialFormData, isEditMode, proposalLanguage])

  // Update siteAddress if client changes (and not in edit mode)
  useEffect(() => {
    if (!isEditMode && selectedClient) {
      setFormData((prev) => {
        if (prev.siteAddress) return prev
        return {
          ...prev,
          siteAddress: buildSiteAddress(selectedClient),
        }
      })
    }
  }, [buildSiteAddress, selectedClient, isEditMode])

  useEffect(() => {
    if (isEditMode) return
    if (previousProposalLanguageRef.current === proposalLanguage) return
    previousProposalLanguageRef.current = proposalLanguage

    setFormData((prev) => ({
      ...prev,
      proposalLanguage,
      serviceId: null,
      serviceTitle: '',
      serviceCode: '',
      sampleCounts: 0,
      numWorkUnits: '',
      travelCharge: 0,
      unitPrice: defaultForm.unitPrice,
      discount: defaultForm.discount,
      hygieneItems: [],
      sstPercent: defaultForm.sstPercent,
      sstAmount: defaultForm.sstAmount,
      subTotal: defaultForm.subTotal,
      grandTotal: defaultForm.grandTotal,
    }))
  }, [defaultForm, proposalLanguage, isEditMode])

  const handleSaveQuote = async () => {
    const { primaryPIC, pic_name, pic_email, pic_phone, pic_position } =
      buildPicPayload(selectedClient)
    if (!primaryPIC) {
      dialog.alert('Please select at least one client contact (PIC) before saving.')
      return
    }

    if (!formData.serviceId || !formData.serviceTitle || !formData.serviceCode) {
      dialog.alert('Please select a valid IH service type before saving.')
      return
    }

    const normalizedSampleCounts = Math.max(0, toInteger(formData.sampleCounts, 0))
    const hasWorkUnitsInput = String(formData.numWorkUnits ?? '').trim() !== ''
    const normalizedNumWorkUnits = hasWorkUnitsInput
      ? Math.max(1, toInteger(formData.numWorkUnits, 1))
      : 0
    const hygieneItems = Array.isArray(formData.hygieneItems)
      ? formData.hygieneItems
          .map((item, index) => {
            const quantity = toNumber(item.quantity, 0)
            const unitPrice = toNumber(item.unit_price, 0)
            return {
              id: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
              item_description: String(item.item_description || '').trim(),
              description: String(item.description || '').trim(),
              quantity,
              unit: String(item.unit || 'Lot').trim() || 'Lot',
              unit_price: unitPrice,
              line_total: Number((quantity * unitPrice).toFixed(2)),
              sort_order: index,
            }
          })
          .filter((item) => item.item_description && item.quantity > 0 && item.unit_price > 0)
      : []
    const totals = calculateHygieneTotals({
      sampleCounts: normalizedSampleCounts,
      numWorkUnits: normalizedNumWorkUnits,
      unitPrice: formData.unitPrice,
      travelCharge: formData.travelCharge,
      customItems: hygieneItems,
      discount: formData.discount,
      sstPercent: formData.sstPercent,
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
      service_id: formData.serviceId,
      service_title: formData.serviceTitle,
      service_code: formData.serviceCode,
      site_address: formData.siteAddress,
      travel_charge: toNumber(formData.travelCharge, 0),
      sample_counts: normalizedSampleCounts,
      sample_unit: formData.sampleUnit,
      num_work_units: normalizedNumWorkUnits,
      inquiry_remarks: formData.inquiryRemarks,
      unit_price: toNumber(formData.unitPrice, 0),
      discount: toNumber(formData.discount, 0),
      hygiene_items: hygieneItems,
      price_exception_request_id: null,
      sst_percent: toNumber(formData.sstPercent, 0),
      sst_amount: totals.sstAmount,
      sub_total: totals.subtotalBeforeDiscount,
      grand_total: totals.grandTotal,
      attach_proposal: formData.attachProposal ? 1 : 0,
      proposal_language: formData.proposalLanguage || proposalLanguage,
    }

    await saveQuote(payload)
  }

  return (
    <>
      <HygieneDetailsCard
        formData={formData}
        setFormData={setFormData}
        selectedClient={selectedClient}
        isEditMode={isEditMode}
        proposalLanguage={proposalLanguage}
      />

      {toInteger(formData.sampleCounts, 0) > 0 && (
        <>
          <PricingCard formData={formData} setFormData={setFormData} isEditMode={isEditMode} />

          {selectedClient && formData.serviceId && formData.serviceCode && (
            <ReviewHygieneQuotationCard
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
