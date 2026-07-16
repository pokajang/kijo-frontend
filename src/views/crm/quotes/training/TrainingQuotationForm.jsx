// TrainingQuotationForm.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { CCol } from '@coreui/react'

import TrainingDetailsCard from './TrainingDetailsCard'
import PricingDetailsCard from './PricingDetailsCard'
import ReviewQuotationCard from './ReviewQuotationCard'
import { isQuoteResultSuccess, quoteApiUrl } from '../quoteApi'
import {
  LEGACY_QUOTE_SERVICE_DRAFT_KEYS,
  clearQuoteServiceDraft,
  readQuoteServiceDraft,
  writeQuoteServiceDraft,
} from '../quoteMainDrafts'
import TrafficLightCard from '../shared/TrafficLightCard'
import { formatTrainingDurationLabel } from './trainingDuration'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'
import dialog from '../../../../components/dialog/dialogService'
import { fetchPriceException } from '../priceException'
import { getTrainingRateOption } from './trainingRates'
import { DEFAULT_HRD_CHARGE_RATE, normalizeTrainingHrdCharge } from './trainingHrd'
import {
  calculateTrainingTotal,
  calculateMealTotal,
  calculateDiscount,
  calculateMobilization,
  calculateSubtotal,
  calculateSST,
  calculateHRD,
  calculateGrandTotal,
} from './calculations'
import { TRAFFIC_LIGHT_RULE_VERSION } from '../shared/trafficLightConfig'

const presetPaymentMethods = ['HRD Grant', 'Self-Payment', 'E-Perolehan']
const defaultPaymentMethod = 'HRD Grant'
export const TRAINING_QUOTE_DRAFT_KEY = LEGACY_QUOTE_SERVICE_DRAFT_KEYS.training

export const loadTrainingQuoteDraft = (storage) => {
  return readQuoteServiceDraft({ serviceKey: 'training', storage })
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
  const { priceExceptionRequestId } = useQuoteRouteParams()
  const draftContext = useMemo(
    () => ({
      clientId: selectedClient?.company_id,
      language: proposalLanguage,
    }),
    [proposalLanguage, selectedClient?.company_id],
  )
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
    priceExceptionRequestId,
    unitPrice: 4500,
    travelCharge: 0,
    mealsProvided: 'No',
    mealPrice: '',
    discountType: 'No Discount',
    discountValue: 0,
    sstRate: 0,
    hrdCharge: DEFAULT_HRD_CHARGE_RATE,
    estimatedTotalCost: '',
    trafficLightRuleVersion: TRAFFIC_LIGHT_RULE_VERSION,
    attachProposal: true,
    proposalLanguage,
  }

  const draft =
    !isEditMode &&
    !priceExceptionRequestId &&
    readQuoteServiceDraft({ serviceKey: 'training', ...draftContext })

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

  if (!hydratedDraft.trainingId && hydratedDraft.proposal_id) {
    hydratedDraft.trainingId = hydratedDraft.proposal_id
  }

  hydratedDraft.hrdCharge = normalizeTrainingHrdCharge(
    hydratedDraft.paymentMethod,
    hydratedDraft.hrdCharge,
  )

  const [formData, setFormData] = useState({
    ...hydratedDraft,
  })
  const previousProposalLanguageRef = useRef(formData.proposalLanguage || proposalLanguage)
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
        priceExceptionRequestId:
          priceExceptionRequestId || initialFormData.priceExceptionRequestId || '',
        unitPrice: parseFloat(initialFormData.unitPrice) || 0,
        travelCharge: parseFloat(initialFormData.travelCharge) || 0,
        mealPrice: parseFloat(initialFormData.mealPrice) || '',
        discountValue: toNumberOrEmpty(initialFormData.discountValue),
        sstRate: parseFloat(initialFormData.sstRate) || 0,
        hrdCharge: normalizeTrainingHrdCharge(initialPaymentMethod, initialFormData.hrdCharge),
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
        estimatedTotalCost:
          typeof initialFormData.estimatedTotalCost === 'number'
            ? initialFormData.estimatedTotalCost
            : toNumberOrEmpty(initialFormData.estimatedTotalCost),
        trafficLightRuleVersion:
          initialFormData.trafficLightRuleVersion ||
          initialFormData.traffic_light_rule_version ||
          TRAFFIC_LIGHT_RULE_VERSION,
      }))
    }
  }, [initialFormData, priceExceptionRequestId, proposalLanguage])

  useEffect(() => {
    const requestId = priceExceptionRequestId
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
  }, [priceExceptionRequestId])

  useEffect(() => {
    if (!appliedPriceException) return
    const requestId = priceExceptionRequestId
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
  }, [appliedPriceException, priceExceptionRequestId])

  useEffect(() => {
    if (!isEditMode && !priceExceptionRequestId) {
      writeQuoteServiceDraft({ serviceKey: 'training', ...draftContext, draft: formData })
    }
  }, [draftContext, formData, isEditMode, priceExceptionRequestId])

  useEffect(() => {
    if (isEditMode || priceExceptionRequestId) {
      clearQuoteServiceDraft({ serviceKey: 'training', ...draftContext })
    }
  }, [draftContext, isEditMode, priceExceptionRequestId])

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
        if (isQuoteResultSuccess(result)) {
          const options = rows.map((item) => ({
            value: item.id,
            proposal_id: item.id,
            label: `${item.training_title} - ${formatTrainingDurationLabel(item.duration)}${item.proposal_language === 'ms-MY' ? ' [BM]' : ''}`,
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
    if (previousProposalLanguageRef.current === proposalLanguage) return
    previousProposalLanguageRef.current = proposalLanguage

    setFormData((prev) => ({
      ...prev,
      proposalLanguage,
      trainingId: '',
      trainingTitle: '',
      proposal_id: '',
      template: null,
    }))
  }, [proposalLanguage, isEditMode])

  useEffect(() => {
    if (
      isEditMode ||
      formData.trainingId ||
      !formData.trainingTitle ||
      trainingOptions.length === 0
    ) {
      return
    }

    const matchingOptions = trainingOptions.filter(
      (option) => option.trainingTitle === formData.trainingTitle,
    )
    if (matchingOptions.length !== 1) return

    const [matchingOption] = matchingOptions
    setFormData((prev) => {
      if (prev.trainingId || prev.trainingTitle !== matchingOption.trainingTitle) return prev

      return {
        ...prev,
        trainingId: matchingOption.value,
        proposal_id: matchingOption.proposal_id || matchingOption.value,
        ...getPricingDurationDefaults(matchingOption.duration),
      }
    })
  }, [formData.trainingId, formData.trainingTitle, isEditMode, trainingOptions])

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
    !!formData.trainingId &&
    !!formData.trainingTitle &&
    !!formData.trainingVenue &&
    hasPaymentMethod

  const isDiscountValid =
    (formData.discountType || 'No Discount') &&
    formData.discountValue !== '' &&
    !isNaN(formData.discountValue) &&
    parseFloat(formData.discountValue) >= 0 &&
    (formData.discountType === 'percent' ? parseFloat(formData.discountValue) <= 100 : true)

  const isPerPaxMode = formData.pricingBasis === 'per_pax'
  const selectedRate = getTrainingRateOption(formData.trainingRateType)
  const allowsZeroPricing = selectedRate.enforceRateFloors === false
  const unitPriceNumber = Number(formData.unitPrice)
  const mealPriceNumber = Number(formData.mealPrice)
  const hasValidUnitPrice = allowsZeroPricing
    ? formData.unitPrice !== '' && !Number.isNaN(unitPriceNumber) && unitPriceNumber >= 0
    : unitPriceNumber > 0
  const hasValidMealPrice =
    formData.mealsProvided === 'No' ||
    (allowsZeroPricing
      ? formData.mealPrice !== '' && !Number.isNaN(mealPriceNumber) && mealPriceNumber >= 0
      : mealPriceNumber > 0)
  const hasValidSessionInputs = isPerPaxMode
    ? true
    : formData.trainingQty > 0 && formData.trainingDuration > 0

  const isPricingDetailsComplete =
    hasValidSessionInputs &&
    formData.noOfPax > 0 &&
    hasValidUnitPrice &&
    hasValidMealPrice &&
    isDiscountValid

  const {
    trainingQty,
    trainingDuration,
    unitPrice,
    noOfPax,
    mealsProvided,
    mealPrice,
    discountValue,
    travelCharge,
    sstRate,
    hrdCharge,
  } = formData

  const trainingTotal = calculateTrainingTotal(
    trainingQty,
    trainingDuration,
    unitPrice,
    noOfPax,
    formData.pricingBasis,
  )
  const mealTotal = calculateMealTotal(
    mealsProvided,
    mealPrice,
    noOfPax,
    trainingDuration,
    trainingQty,
  )
  const discountAmount = calculateDiscount(discountValue)
  const mobilizationCost = calculateMobilization(travelCharge)
  const subtotal = calculateSubtotal(trainingTotal, mealTotal, mobilizationCost, discountAmount)
  const sstAmount = calculateSST(subtotal, sstRate)
  const hrdAmount = calculateHRD(trainingTotal, discountAmount, hrdCharge)
  const quoteGrandTotal = calculateGrandTotal(subtotal, sstAmount, hrdAmount)

  const handleRequestOverride = () => {
    dialog.alert(
      'This pricing category can be saved with the configured reference rates. Negotiation requests remain available from quote records when a saved quote needs a discount approval.',
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
            proposalLanguage={proposalLanguage}
          />
        </CCol>
      )}

      {selectedClient?.company_name && isTrainingDetailsComplete && isPricingDetailsComplete && (
        <CCol xs={12}>
          <TrafficLightCard
            serviceKey="training"
            quoteTotal={quoteGrandTotal}
            estimatedTotalCost={formData.estimatedTotalCost}
            trafficLightRuleVersion={formData.trafficLightRuleVersion}
            onEstimatedTotalCostChange={(value) =>
              setFormData((prev) => ({ ...prev, estimatedTotalCost: value }))
            }
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
