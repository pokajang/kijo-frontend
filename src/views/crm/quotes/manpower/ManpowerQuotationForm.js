// src/views/crm/quotes/manpower/ManpowerQuotationForm.js

import React, { useState, useEffect, useMemo, useRef } from 'react'
import ManpowerDetailsCard from './ManpowerDetailsCard'
import ReviewManpowerQuoteCard from './ReviewManpowerQuoteCard'
import {
  clearQuoteServiceDraft,
  readQuoteServiceDraft,
  writeQuoteServiceDraft,
} from '../quoteMainDrafts'
import { buildPicPayload } from '../quoteContactUtils'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'
import { useQuoteSave } from '../helpers/useQuoteSave'
import dialog from '../../../../components/dialog/dialogService'
import { getManpowerRate, getManpowerRateOption, inferManpowerRateType } from './manpowerRates'
import { fetchPriceException } from '../priceException'

const getApprovedNegotiationDiscount = (row) =>
  Number(row?.approved_discount_amount || row?.requested_discount_amount || 0)

export default function ManpowerQuotationForm({
  selectedClient,
  initialFormData = null,
  isEditMode = false,
  quoteId = null,
  proposalLanguage = 'en',
}) {
  const { isRevision, priceExceptionRequestId } = useQuoteRouteParams()
  const draftContext = useMemo(
    () => ({
      clientId: selectedClient?.company_id,
      language: proposalLanguage,
    }),
    [proposalLanguage, selectedClient?.company_id],
  )
  const saveQuote = useQuoteSave({
    serviceKey: 'manpower',
    quoteId,
    isEditMode,
    recordTabKey: 'manpower-tab',
    draftContext,
  })

  // Default form structure
  const defaultForm = {
    mpId: null,
    serviceTitle: '',
    serviceCode: '',
    manpowerRateType: '',
    billingUnit: 'month',
    requiresManagementApproval: false,
    natureOfWork: '',
    siteLocation: '',
    durationMonths: 0,
    durationHours: 0,
    noOfPax: 0,
    unitCost: 0,
    discount: 0,
    priceExceptionRequestId,
    sstPercent: 0,
    subTotal: '0.00',
    sstAmount: '0.00',
    grandTotal: '0.00',
    attachProposal: true,
    inquiryRemarks: '',
    proposalLanguage,
  }

  // Load draft if in create mode
  const draft =
    !isEditMode &&
    !priceExceptionRequestId &&
    readQuoteServiceDraft({ serviceKey: 'manpower', ...draftContext })
  const [formData, setFormData] = useState(draft || defaultForm)
  const [appliedPriceException, setAppliedPriceException] = useState(null)
  const previousProposalLanguageRef = useRef(formData.proposalLanguage || proposalLanguage)

  useEffect(() => {
    if (!formData.manpowerRateType) return

    const nextRate = getManpowerRate({
      rateType: formData.manpowerRateType,
      durationMonths: formData.durationMonths,
    })

    setFormData((prev) => {
      const nextRequiresApproval = !!nextRate.requiresManagementApproval
      const nextDurationHours = nextRate.billingUnit === 'hour' ? prev.durationHours : 0
      const nextDurationMonths = nextRate.billingUnit === 'hour' ? 0 : prev.durationMonths
      const currentUnitCost = Number(prev.unitCost) || 0
      const nextUnitCost =
        nextRate.unitCost > 0 && currentUnitCost < nextRate.unitCost
          ? nextRate.unitCost
          : prev.unitCost

      if (
        Number(prev.unitCost) === Number(nextUnitCost) &&
        prev.billingUnit === nextRate.billingUnit &&
        !!prev.requiresManagementApproval === nextRequiresApproval &&
        Number(prev.durationHours || 0) === Number(nextDurationHours || 0) &&
        Number(prev.durationMonths || 0) === Number(nextDurationMonths || 0)
      ) {
        return prev
      }

      return {
        ...prev,
        unitCost: nextUnitCost,
        billingUnit: nextRate.billingUnit,
        requiresManagementApproval: nextRequiresApproval,
        durationHours: nextDurationHours,
        durationMonths: nextDurationMonths,
      }
    })
  }, [formData.manpowerRateType, formData.durationMonths, formData.durationHours])

  // Persist draft whenever formData changes (create mode only)
  useEffect(() => {
    if (!isEditMode && !priceExceptionRequestId) {
      writeQuoteServiceDraft({ serviceKey: 'manpower', ...draftContext, draft: formData })
    }
  }, [draftContext, formData, isEditMode, priceExceptionRequestId])

  // Clear draft on entering edit mode
  useEffect(() => {
    if (isEditMode || priceExceptionRequestId) {
      clearQuoteServiceDraft({ serviceKey: 'manpower', ...draftContext })
    }
  }, [draftContext, isEditMode, priceExceptionRequestId])

  // Populate formData in edit mode
  useEffect(() => {
    if (!isEditMode || !initialFormData) return
    const storedRateType = initialFormData.manpowerRateType || ''
    const billingFallbackRate = getManpowerRate({
      rateType:
        storedRateType ||
        inferManpowerRateType({
          serviceTitle: initialFormData.serviceTitle,
          serviceCode: initialFormData.serviceCode,
          unitCost: initialFormData.unitCost,
        }),
      durationMonths: initialFormData.durationMonths,
    })
    const approvalFallbackRate = storedRateType
      ? getManpowerRate({
          rateType: storedRateType,
          durationMonths: initialFormData.durationMonths,
        })
      : null
    const billingUnit = initialFormData.billingUnit || billingFallbackRate.billingUnit || 'month'

    setFormData({
      mpId: initialFormData.mpId ?? null,
      serviceTitle: initialFormData.serviceTitle ?? '',
      serviceCode: initialFormData.serviceCode ?? '',
      manpowerRateType: storedRateType,
      billingUnit,
      requiresManagementApproval:
        initialFormData.requiresManagementApproval ??
        !!approvalFallbackRate?.requiresManagementApproval,
      natureOfWork: initialFormData.natureOfWork ?? '',
      siteLocation: initialFormData.siteLocation ?? '',
      durationMonths: billingUnit === 'hour' ? 0 : (initialFormData.durationMonths ?? 0),
      durationHours:
        billingUnit === 'hour'
          ? (initialFormData.durationHours ?? initialFormData.durationMonths ?? 0)
          : 0,
      noOfPax: initialFormData.noOfPax ?? 0,
      inquiryRemarks: initialFormData.inquiryRemarks || '',
      unitCost: initialFormData.unitCost ?? 0,
      discount: initialFormData.discount ?? 0,
      priceExceptionRequestId:
        priceExceptionRequestId || initialFormData.priceExceptionRequestId || '',
      sstPercent: initialFormData.sstPercent ?? 0,
      subTotal: initialFormData.subTotal ?? '0.00',
      sstAmount: initialFormData.sstAmount ?? '0.00',
      grandTotal: initialFormData.grandTotal ?? '0.00',
      attachProposal: initialFormData.attachProposal ?? true,
      proposalLanguage: initialFormData.proposalLanguage || proposalLanguage,
    })
  }, [initialFormData, isEditMode, priceExceptionRequestId, proposalLanguage])

  useEffect(() => {
    const requestId = priceExceptionRequestId
    if (!requestId) return

    fetchPriceException(requestId)
      .then((row) => {
        if (!row || row.status !== 'approved' || row.service_group !== 'manpower') return
        const approvedDiscount = getApprovedNegotiationDiscount(row)
        setAppliedPriceException(row)
        setFormData((prev) => ({
          ...prev,
          priceExceptionRequestId: requestId,
          discount: approvedDiscount,
        }))
      })
      .catch((error) => dialog.alert(error?.message || 'Failed to apply price exception.'))
  }, [priceExceptionRequestId])

  useEffect(() => {
    if (!appliedPriceException) return
    const requestId = priceExceptionRequestId
    const approvedDiscount = getApprovedNegotiationDiscount(appliedPriceException)

    setFormData((prev) => {
      if (
        String(prev.priceExceptionRequestId || '') === String(requestId || '') &&
        Number(prev.discount || 0) === approvedDiscount
      ) {
        return prev
      }

      return {
        ...prev,
        priceExceptionRequestId: requestId,
        discount: approvedDiscount,
      }
    })
  }, [appliedPriceException, priceExceptionRequestId])

  useEffect(() => {
    if (isEditMode) return
    if (previousProposalLanguageRef.current === proposalLanguage) return
    previousProposalLanguageRef.current = proposalLanguage

    setFormData((prev) => ({
      ...prev,
      proposalLanguage,
      mpId: null,
      serviceTitle: '',
      serviceCode: '',
      manpowerRateType: '',
      billingUnit: 'month',
      requiresManagementApproval: false,
      durationMonths: 0,
      durationHours: 0,
      noOfPax: 0,
      unitCost: 0,
      discount: appliedPriceException ? getApprovedNegotiationDiscount(appliedPriceException) : 0,
      sstPercent: 0,
      subTotal: '0.00',
      sstAmount: '0.00',
      grandTotal: '0.00',
    }))
  }, [appliedPriceException, proposalLanguage, isEditMode])

  // Save or update the quote
  const handleSaveQuote = async () => {
    const { primaryPIC, pic_name, pic_email, pic_phone, pic_position } =
      buildPicPayload(selectedClient)
    if (!primaryPIC) {
      dialog.alert('Please select at least one client contact (PIC) before saving.')
      return
    }

    const hasApprovedOverride =
      Boolean(priceExceptionRequestId) || Boolean(initialFormData?.priceExceptionRequestId)
    if (formData.requiresManagementApproval && !hasApprovedOverride) {
      dialog.alert(
        'Special Manpower Supply requires an approved override request before quotation.',
      )
      return
    }

    const durationQuantity =
      formData.billingUnit === 'hour'
        ? Number(formData.durationHours)
        : Number(formData.durationMonths)
    if (!durationQuantity || durationQuantity <= 0) {
      dialog.alert(
        `Please enter a valid duration in ${formData.billingUnit === 'hour' ? 'hours' : 'months'}.`,
      )
      return
    }

    if (!formData.noOfPax || Number(formData.noOfPax) <= 0) {
      dialog.alert('Please enter the number of personnel.')
      return
    }

    if (!formData.unitCost || Number(formData.unitCost) <= 0) {
      dialog.alert('Please enter a valid unit cost before saving.')
      return
    }

    const stipulatedRate = getManpowerRate({
      rateType: formData.manpowerRateType,
      durationMonths: formData.durationMonths,
    })
    if (
      stipulatedRate.unitCost > 0 &&
      !formData.requiresManagementApproval &&
      Number(formData.unitCost) < stipulatedRate.unitCost
    ) {
      const rateOption = getManpowerRateOption(formData.manpowerRateType)
      const formattedMinimum = stipulatedRate.unitCost.toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      dialog.alert(
        `Unit cost cannot be lower than the stipulated ${
          rateOption?.label ? `${rateOption.label} ` : ''
        }rate of RM ${formattedMinimum} per pax per ${stipulatedRate.billingUnit}.`,
      )
      return
    }

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
      mp_id: formData.mpId,
      service_title: formData.serviceTitle,
      service_code: formData.serviceCode,
      manpower_rate_type: formData.manpowerRateType,
      billing_unit: formData.billingUnit,
      duration_hours: formData.durationHours,
      requires_management_approval: formData.requiresManagementApproval ? 1 : 0,
      nature_of_work: formData.natureOfWork,
      site_location: formData.siteLocation,
      duration_months: formData.billingUnit === 'hour' ? 0 : formData.durationMonths,
      no_of_pax: formData.noOfPax,
      inquiry_remarks: formData.inquiryRemarks,
      unit_cost: formData.unitCost,
      discount: formData.discount,
      price_exception_request_id:
        priceExceptionRequestId ||
        formData.priceExceptionRequestId ||
        initialFormData?.priceExceptionRequestId ||
        null,
      sst_percent: formData.sstPercent,
      sub_total: formData.subTotal,
      sst_amount: formData.sstAmount,
      grand_total: formData.grandTotal,
      attach_proposal: formData.attachProposal ? 1 : 0,
      proposal_language: formData.proposalLanguage || proposalLanguage,
    }

    await saveQuote(payload)
  }

  return (
    <>
      <ManpowerDetailsCard
        formData={formData}
        setFormData={setFormData}
        selectedClient={selectedClient}
        isEditMode={isEditMode}
        proposalLanguage={proposalLanguage}
        appliedPriceException={appliedPriceException}
        onRequestOverride={() => {
          dialog.alert(
            'Pre-quote override requests are disabled. Save the quotation first, then request negotiation from the quote records page.',
          )
        }}
      />

      {selectedClient && formData.mpId != null && (
        <ReviewManpowerQuoteCard
          selectedClient={selectedClient}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveQuote}
          isEditMode={isEditMode}
          quoteId={quoteId}
          appliedPriceException={appliedPriceException}
        />
      )}
    </>
  )
}
