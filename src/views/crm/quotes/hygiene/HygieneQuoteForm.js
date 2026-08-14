// src/views/crm/quotes/hygiene/HygieneQuotationForm.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import HygieneDetailsCard from './HygieneDetailsCard'
import HygieneQuoteLifecycleAlerts from './HygieneQuoteLifecycleAlerts'
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
import {
  buildStoredHygieneTotals,
  calculateHygieneTotals,
  isHistoricalHygienePricingRule,
  isKnownHygienePricingRule,
  STANDARD_HYGIENE_PRICING_RULE,
} from '../../../../shared/invoice/hygienePricing'
import TrafficLightCard from '../shared/TrafficLightCard'
import { getTrafficLightStatus } from '../shared/trafficLightConfig'

const IH_PRICING_INPUT_FIELDS = [
  'sampleCounts',
  'numWorkUnits',
  'unitPrice',
  'travelCharge',
  'discount',
  'sstPercent',
]

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

  const toNumber = useCallback((value, fallback = 0) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }, [])

  const toNumberOrEmpty = (value) => {
    if (value === '' || value === null || value === undefined) return ''
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : ''
  }

  const toInteger = useCallback((value, fallback = 0) => {
    const n = parseInt(value, 10)
    return Number.isFinite(n) ? n : fallback
  }, [])

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
      pricingRuleVersion: STANDARD_HYGIENE_PRICING_RULE,
      complexityRating: 1,
      inquiryRemarks: '',
      unitPrice: 500,
      discount: 300,
      hygieneItems: [],
      upgradePricingRule: false,
      pricingState: null,
      priceExceptionRequestId: '',
      sstPercent: 0,
      sstAmount: '0.00',
      subTotal: '0.00',
      grandTotal: '0.00',
      estimatedTotalCost: '',
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
  const [pricingChangeConfirmed, setPricingChangeConfirmed] = useState(false)
  const [saveRemediation, setSaveRemediation] = useState(null)
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
        pricingRuleVersion: initialFormData.pricingRuleVersion || defaultForm.pricingRuleVersion,
        complexityRating: initialFormData.complexityRating ?? defaultForm.complexityRating,
        discount: initialFormData.discount ?? defaultForm.discount,
        hygieneItems: Array.isArray(initialFormData.hygieneItems)
          ? initialFormData.hygieneItems
          : defaultForm.hygieneItems,
        pricingState: initialFormData.pricingState || defaultForm.pricingState,
        priceExceptionRequestId: '',
        sstPercent: initialFormData.sstPercent ?? defaultForm.sstPercent,
        sstAmount: initialFormData.sstAmount ?? defaultForm.sstAmount,
        subTotal: initialFormData.subTotal ?? defaultForm.subTotal,
        grandTotal: initialFormData.grandTotal ?? defaultForm.grandTotal,
        estimatedTotalCost:
          typeof initialFormData.estimatedTotalCost === 'number'
            ? initialFormData.estimatedTotalCost
            : toNumberOrEmpty(initialFormData.estimatedTotalCost),
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
      pricingRuleVersion: defaultForm.pricingRuleVersion,
      complexityRating: defaultForm.complexityRating,
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

  const isHistoricalPricing =
    isEditMode && isHistoricalHygienePricingRule(formData.pricingRuleVersion)
  const hasKnownPricingRule = isKnownHygienePricingRule(formData.pricingRuleVersion)
  const originatedWithHistoricalPricing =
    isEditMode &&
    initialFormData &&
    isHistoricalHygienePricingRule(initialFormData.pricingRuleVersion)
  const historicalPricingInputsChanged =
    originatedWithHistoricalPricing &&
    IH_PRICING_INPUT_FIELDS.every(
      (field) =>
        Math.abs(toNumber(formData[field], 0) - toNumber(initialFormData[field], 0)) < 0.00001,
    ) === false
  const historicalPricingUnchanged = isHistoricalPricing && !historicalPricingInputsChanged
  const preserveHistoricalSnapshot =
    isHistoricalPricing && (!historicalPricingInputsChanged || !pricingChangeConfirmed)

  useEffect(() => {
    if (!historicalPricingInputsChanged) setPricingChangeConfirmed(false)
  }, [historicalPricingInputsChanged])

  const quoteTotals = useMemo(() => {
    if (!hasKnownPricingRule) {
      const storedSubTotal = toNumber(formData.subTotal, 0)
      const storedDiscount = toNumber(formData.discount, 0)
      return {
        effectiveWorkUnits: Math.max(1, toNumber(formData.numWorkUnits, 1)),
        baseQuantity: toNumber(formData.sampleCounts, 0),
        pricingRuleVersion: formData.pricingRuleVersion,
        complexityRating: toInteger(formData.complexityRating, 1),
        complexityMultiplier: 1,
        serviceTotal: Math.max(
          0,
          storedSubTotal + storedDiscount - toNumber(formData.travelCharge, 0),
        ),
        customTotal: 0,
        subtotalBeforeDiscount: storedSubTotal + storedDiscount,
        discountTotal: storedDiscount,
        taxableTotal: storedSubTotal,
        sstAmount: toNumber(formData.sstAmount, 0),
        subTotal: storedSubTotal,
        grandTotal: toNumber(formData.grandTotal, 0),
      }
    }

    if (preserveHistoricalSnapshot) {
      return buildStoredHygieneTotals({
        sampleCounts: formData.sampleCounts,
        numWorkUnits: formData.numWorkUnits,
        travelCharge: formData.travelCharge,
        discount: formData.discount,
        sstPercent: formData.sstPercent,
        sstAmount: formData.sstAmount,
        subTotal: formData.subTotal,
        grandTotal: formData.grandTotal,
        pricingRuleVersion: formData.pricingRuleVersion,
        complexityRating: formData.complexityRating,
      })
    }

    return calculateHygieneTotals({
      sampleCounts: toInteger(formData.sampleCounts, 0),
      numWorkUnits:
        String(formData.numWorkUnits || '').trim() !== ''
          ? Math.max(1, toInteger(formData.numWorkUnits, 1))
          : 0,
      unitPrice: toNumber(formData.unitPrice, 0),
      travelCharge: toNumber(formData.travelCharge, 0),
      customItems: Array.isArray(formData.hygieneItems) ? formData.hygieneItems : [],
      discount: toNumber(formData.discount, 0),
      sstPercent: toNumber(formData.sstPercent, 0),
      pricingRuleVersion: formData.pricingRuleVersion,
      complexityRating: formData.complexityRating,
    })
  }, [
    formData.sampleCounts,
    formData.numWorkUnits,
    formData.unitPrice,
    formData.travelCharge,
    formData.hygieneItems,
    formData.discount,
    formData.sstPercent,
    formData.pricingRuleVersion,
    formData.complexityRating,
    formData.subTotal,
    formData.grandTotal,
    formData.sstAmount,
    hasKnownPricingRule,
    preserveHistoricalSnapshot,
    toInteger,
    toNumber,
  ])

  const restoreHistoricalPricing = useCallback(() => {
    if (!initialFormData) return

    setFormData((current) => ({
      ...current,
      ...Object.fromEntries(
        IH_PRICING_INPUT_FIELDS.map((field) => [field, initialFormData[field] ?? current[field]]),
      ),
      pricingRuleVersion: initialFormData.pricingRuleVersion,
      complexityRating: initialFormData.complexityRating ?? 1,
      hygieneItems: Array.isArray(initialFormData.hygieneItems) ? initialFormData.hygieneItems : [],
      estimatedTotalCost: initialFormData.estimatedTotalCost ?? '',
      sstAmount: initialFormData.sstAmount ?? current.sstAmount,
      subTotal: initialFormData.subTotal ?? current.subTotal,
      grandTotal: initialFormData.grandTotal ?? current.grandTotal,
      upgradePricingRule: false,
    }))
    setPricingChangeConfirmed(false)
    setSaveRemediation(null)
  }, [initialFormData])

  const focusEstimatedCost = useCallback(() => {
    document.getElementById('estimatedTotalCost')?.focus()
  }, [])

  const handleRecoverableFailure = useCallback((result) => {
    const knownRecoverableErrors = new Set([
      'ESTIMATED_COST_REQUIRED',
      'UNKNOWN_PRICING_RULE',
      'QUOTE_SAVE_FAILED',
      'QUOTE_NETWORK_ERROR',
    ])
    if (!knownRecoverableErrors.has(result?.error_code)) return false

    setSaveRemediation(result)
    return true
  }, [])

  const handleSaveQuote = async () => {
    setSaveRemediation(null)

    if (!hasKnownPricingRule) {
      setSaveRemediation({
        error_code: 'UNKNOWN_PRICING_RULE',
        message:
          'Stored quotation data is still available, but financial editing is disabled until the pricing rule is repaired.',
      })
      return
    }

    if (isHistoricalPricing && historicalPricingInputsChanged && !pricingChangeConfirmed) {
      setSaveRemediation({
        error_code: 'PRICING_CHANGE_REQUIRES_RECALCULATION',
        message:
          'Confirm recalculation or restore the original pricing before saving this historical quotation.',
      })
      return
    }

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
    const estimatedCost =
      formData.estimatedTotalCost === '' || formData.estimatedTotalCost == null
        ? null
        : Number(formData.estimatedTotalCost)
    const estimatedCostPayload = Number.isFinite(estimatedCost) ? estimatedCost : null
    if (
      !isHistoricalPricing &&
      (!Number.isFinite(estimatedCostPayload) || estimatedCostPayload <= 0)
    ) {
      dialog.alert('Please enter a traffic-light estimated cost greater than zero before saving.')
      return
    }

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
      upgrade_pricing_rule: Boolean(formData.upgradePricingRule),
      price_exception_request_id: null,
      sst_percent: toNumber(formData.sstPercent, 0),
      sst_amount: quoteTotals.sstAmount,
      sub_total: quoteTotals.subTotal,
      grand_total: quoteTotals.grandTotal,
      estimated_total_cost: estimatedCostPayload,
      complexity_rating: toInteger(formData.complexityRating, 1),
      attach_proposal: formData.attachProposal ? 1 : 0,
      proposal_language: formData.proposalLanguage || proposalLanguage,
    }

    const saveResult = await saveQuote(payload, {
      onRecoverableFailure: handleRecoverableFailure,
    })

    if (saveResult?.saved && saveResult.result?.data) {
      setFormData((current) => ({
        ...current,
        pricingRuleVersion:
          saveResult.result.data.pricing_rule_version || current.pricingRuleVersion,
        upgradePricingRule: false,
      }))
      setSaveRemediation(null)
    }
  }

  const hasEstimatedCost = Number(formData.estimatedTotalCost) > 0
  const canShowPricing = hasKnownPricingRule && (hasEstimatedCost || isHistoricalPricing)
  const trafficLightStatus = getTrafficLightStatus({
    serviceKey: 'ih',
    estimatedTotalCost: formData.estimatedTotalCost,
    quoteTotal: quoteTotals.grandTotal,
  }).status
  const requiresApproval = trafficLightStatus === 'yellow' || trafficLightStatus === 'red'
  const saveLabel = requiresApproval
    ? isEditMode
      ? 'Update & Apply Approval'
      : 'Save & Apply Approval'
    : undefined

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
          <HygieneQuoteLifecycleAlerts
            formData={formData}
            hasKnownPricingRule={hasKnownPricingRule}
            isHistoricalPricing={isHistoricalPricing}
            historicalPricingInputsChanged={historicalPricingInputsChanged}
            pricingChangeConfirmed={pricingChangeConfirmed}
            onConfirmRecalculation={() => {
              setPricingChangeConfirmed(true)
              setSaveRemediation(null)
            }}
            onRestoreHistoricalPricing={restoreHistoricalPricing}
            onFocusEstimatedCost={focusEstimatedCost}
            saveRemediation={saveRemediation}
            onRetrySave={handleSaveQuote}
          />

          <TrafficLightCard
            serviceKey="ih"
            estimatedTotalCost={formData.estimatedTotalCost}
            onEstimatedTotalCostChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                estimatedTotalCost: value,
              }))
            }
          />

          {canShowPricing && (
            <PricingCard
              formData={formData}
              setFormData={setFormData}
              isEditMode={isEditMode}
              totalsOverride={quoteTotals}
              preserveStoredTotals={preserveHistoricalSnapshot}
            />
          )}

          {selectedClient && formData.serviceId && formData.serviceCode && canShowPricing && (
            <ReviewHygieneQuotationCard
              selectedClient={selectedClient}
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveQuote}
              saveLabel={saveLabel}
              requiresApproval={requiresApproval}
              isEditMode={isEditMode}
              quoteId={quoteId}
              totalsOverride={quoteTotals}
            />
          )}
        </>
      )}
    </>
  )
}
