// TrainingQuotationForm.jsx

import React, { useState, useEffect } from 'react'
import { CCol } from '@coreui/react'

import TrainingDetailsCard from './TrainingDetailsCard'
import PricingDetailsCard from './PricingDetailsCard'
import ReviewQuotationCard from './ReviewQuotationCard'
import { quoteApiUrl } from '../quoteApi'
import dialog from '../../../../components/dialog/dialogService'
import { fetchPriceException, getPriceExceptionRequestId } from '../priceException'

const durationMap = {
  halfday_am: 'half day (AM)',
  halfday_pm: 'half day (PM)',
  '1day': '1 day',
}

const presetPaymentMethods = ['HRD Grant', 'Self-Payment', 'E-Perolehan']
const defaultPaymentMethod = 'HRD Grant'
export const TRAINING_QUOTE_DRAFT_KEY = 'draftTrainingQuote'

export const loadTrainingQuoteDraft = (
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) => {
  if (!storage || typeof storage.getItem !== 'function') return null

  try {
    const raw = storage.getItem(TRAINING_QUOTE_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    if (typeof storage.removeItem === 'function') {
      storage.removeItem(TRAINING_QUOTE_DRAFT_KEY)
    }
    return null
  }
}

const toNumberOrEmpty = (value) => {
  if (value === '' || value === null || value === undefined) return ''
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? '' : parsed
}

const getApprovedNegotiationDiscount = (row) =>
  Number(row?.approved_discount_amount || row?.requested_discount_amount || 0)

const TrainingQuotationForm = ({
  selectedClient,
  initialFormData,
  isEditMode,
  quoteId,
  proposalLanguage = 'en',
}) => {
  const defaultForm = {
    trainingId: '',
    trainingTitle: '',
    trainingTypeOption: 'Physical',
    paymentMethod: defaultPaymentMethod,
    customPaymentMethod: '',
    selectedDate: null,
    selectedEndDate: null,
    toBeConfirmed: true,
    trainingVenue: '',
    targetGroups: '',
    trainingInqRemarks: '',
    trainingQty: 1,
    trainingDuration: 1,
    durationUnit: 'day(s)',
    noOfPax: 25,
    pricingBasis: 'per_session',
    trainingRateType: 'client_site_normal',
    travelRegion: 'none',
    priceExceptionRequestId: getPriceExceptionRequestId(),
    unitPrice: 4500,
    travelCharge: 0,
    mealsProvided: 'No',
    mealPrice: '',
    discountType: 'No Discount',
    discountValue: 0,
    sstRate: 0,
    hrdCharge: 0,
    attachProposal: true,
    proposalLanguage,
  }

  const draft = !isEditMode && !getPriceExceptionRequestId() ? loadTrainingQuoteDraft() : null

  const hydratedDraft = {
    ...defaultForm,
    ...(draft || {}),
  }

  if (
    hydratedDraft.paymentMethod &&
    !presetPaymentMethods.includes(hydratedDraft.paymentMethod) &&
    !hydratedDraft.customPaymentMethod
  ) {
    hydratedDraft.customPaymentMethod = hydratedDraft.paymentMethod
  }

  const [formData, setFormData] = useState({
    ...hydratedDraft,
  })
  const [appliedPriceException, setAppliedPriceException] = useState(null)

  useEffect(() => {
    if (initialFormData) {
      const initialPaymentMethod = initialFormData.paymentMethod || defaultPaymentMethod
      const isPresetPaymentMethod = presetPaymentMethods.includes(initialPaymentMethod)

      setFormData((prev) => ({
        ...prev,
        ...initialFormData,
        paymentMethod: initialPaymentMethod,
        customPaymentMethod: isPresetPaymentMethod ? '' : initialPaymentMethod,
        trainingQty: parseInt(initialFormData.trainingQty) || 1,
        trainingDuration: parseInt(initialFormData.trainingDuration) || 1,
        durationUnit: initialFormData.durationUnit || 'day(s)',
        noOfPax: parseInt(initialFormData.noOfPax) || 25,
        pricingBasis: initialFormData.pricingBasis || 'per_session',
        trainingRateType: initialFormData.trainingRateType || 'client_site_normal',
        travelRegion: initialFormData.travelRegion || 'none',
        priceExceptionRequestId: getPriceExceptionRequestId() || '',
        unitPrice: parseFloat(initialFormData.unitPrice) || 0,
        travelCharge: parseFloat(initialFormData.travelCharge) || 0,
        mealPrice: parseFloat(initialFormData.mealPrice) || '',
        discountValue: toNumberOrEmpty(initialFormData.discountValue),
        sstRate: parseFloat(initialFormData.sstRate) || 0,
        hrdCharge: parseFloat(initialFormData.hrdCharge) || 0,
        toBeConfirmed:
          initialFormData.toBeConfirmed === true ||
          initialFormData.toBeConfirmed === '1' ||
          !initialFormData.selectedDate,
        attachProposal: !!initialFormData.attachProposal,
        selectedDate: initialFormData.selectedDate ? new Date(initialFormData.selectedDate) : null,
        selectedEndDate: initialFormData.selectedEndDate
          ? new Date(initialFormData.selectedEndDate)
          : null,
        proposalLanguage: initialFormData.proposalLanguage || proposalLanguage,
      }))
    }
  }, [initialFormData, proposalLanguage])

  useEffect(() => {
    const requestId = getPriceExceptionRequestId()
    if (!requestId) return

    fetchPriceException(requestId)
      .then((row) => {
        if (!row || row.status !== 'approved' || row.service_group !== 'training') return
        const approvedDiscount = getApprovedNegotiationDiscount(row)
        setAppliedPriceException(row)
        setFormData((prev) => ({
          ...prev,
          priceExceptionRequestId: requestId,
          discountType: 'Negotiated',
          discountValue: approvedDiscount,
        }))
      })
      .catch((error) => dialog.alert(error?.message || 'Failed to apply price exception.'))
  }, [])

  useEffect(() => {
    if (!appliedPriceException) return
    const requestId = getPriceExceptionRequestId()
    const approvedDiscount = getApprovedNegotiationDiscount(appliedPriceException)

    setFormData((prev) => {
      if (
        String(prev.priceExceptionRequestId || '') === String(requestId || '') &&
        prev.discountType === 'Negotiated' &&
        Number(prev.discountValue || 0) === approvedDiscount
      ) {
        return prev
      }

      return {
        ...prev,
        priceExceptionRequestId: requestId,
        discountType: 'Negotiated',
        discountValue: approvedDiscount,
      }
    })
  }, [appliedPriceException])

  useEffect(() => {
    if (!isEditMode && !getPriceExceptionRequestId()) {
      localStorage.setItem(TRAINING_QUOTE_DRAFT_KEY, JSON.stringify(formData))
    }
  }, [formData, isEditMode])

  useEffect(() => {
    if (isEditMode || getPriceExceptionRequestId()) {
      localStorage.removeItem(TRAINING_QUOTE_DRAFT_KEY)
    }
  }, [isEditMode])

  const [trainingOptions, setTrainingOptions] = useState([])

  useEffect(() => {
    const fetchTrainingTopics = async () => {
      try {
        const query = new URLSearchParams({ language: proposalLanguage })
        const res = await fetch(quoteApiUrl(`quotes/training-topics?${query.toString()}`), {
          credentials: 'include',
        })
        const result = await res.json()
        const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : []
        const ok = result?.status === 'success' || result?.success === true || Array.isArray(result)
        if (ok) {
          const options = rows.map((item) => ({
            value: item.id,
            proposal_id: item.id,
            label: `${item.training_title} – ${durationMap[item.duration] || item.duration}${item.proposal_language === 'ms-MY' ? ' [BM]' : ''}`,
            duration: item.duration,
            trainingTitle: item.training_title,
          }))
          setTrainingOptions(options)
        }
      } catch (err) {
        console.error('Error fetching training topics:', err)
      }
    }
    fetchTrainingTopics()
  }, [proposalLanguage])

  useEffect(() => {
    if (isEditMode) return
    setFormData((prev) => ({
      ...prev,
      proposalLanguage,
      trainingId: '',
      trainingTitle: '',
      proposal_id: '',
      template: null,
    }))
  }, [proposalLanguage, isEditMode])

  const [templateContent, setTemplateContent] = useState(null)

  const activeTemplate = formData.template

  useEffect(() => {
    if (activeTemplate) {
      activeTemplate()
        .then((module) => setTemplateContent(module.default))
        .catch((err) => {
          console.error('Template load error:', err)
          setTemplateContent(null)
        })
    } else {
      setTemplateContent(null)
    }
  }, [activeTemplate])

  const hasPaymentMethod = String(formData.paymentMethod || '').trim() !== ''

  const isTrainingDetailsComplete =
    !!formData.trainingTitle && !!formData.trainingVenue && hasPaymentMethod

  const isDiscountValid =
    (formData.discountType || 'No Discount') &&
    formData.discountValue !== '' &&
    !isNaN(formData.discountValue) &&
    parseFloat(formData.discountValue) >= 0 &&
    (formData.discountType === 'percent' ? parseFloat(formData.discountValue) <= 100 : true)

  const isPerPaxMode = formData.pricingBasis === 'per_pax'
  const hasValidSessionInputs = isPerPaxMode
    ? true
    : formData.trainingQty > 0 && formData.trainingDuration > 0

  const isPricingDetailsComplete =
    hasValidSessionInputs &&
    formData.noOfPax > 0 &&
    formData.unitPrice > 0 &&
    (formData.mealsProvided === 'No' || (formData.mealPrice && formData.mealPrice > 0)) &&
    isDiscountValid

  const handleRequestOverride = () => {
    dialog.alert(
      'Pre-quote override requests are disabled. Save the quotation first, then request negotiation from the quote records page.',
    )
  }

  return (
    <>
      <TrainingDetailsCard
        formData={formData}
        setFormData={setFormData}
        trainingOptions={trainingOptions}
        isEditMode={isEditMode}
        presetPaymentMethods={presetPaymentMethods}
        proposalLanguage={proposalLanguage}
      />

      {selectedClient?.company_name && isTrainingDetailsComplete && (
        <CCol xs={12}>
          <PricingDetailsCard
            formData={formData}
            setFormData={setFormData}
            onRequestOverride={handleRequestOverride}
            appliedPriceException={appliedPriceException}
          />
        </CCol>
      )}

      {selectedClient?.company_name && isTrainingDetailsComplete && isPricingDetailsComplete && (
        <CCol xs={12}>
          <ReviewQuotationCard
            clientDetails={selectedClient}
            formData={formData}
            setFormData={setFormData}
            quoteId={quoteId}
            isEditMode={isEditMode}
            proposalLanguage={proposalLanguage}
            appliedPriceException={appliedPriceException}
          />
        </CCol>
      )}
    </>
  )
}

export default TrainingQuotationForm
