import React from 'react'

import { CTableBody, CTableRow, CTableHeaderCell, CTableDataCell } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { handleQuoteSuccess } from '../quoteSuccessHandler'
import { clearQuoteMainDraft } from '../quoteMainDrafts'
import { normalizeQuoteResult, quoteSaveMethod, quoteServiceUrl } from '../quoteApi'
import { buildPicPayload } from '../quoteContactUtils'
import { getRecordListPath } from '../../records/config/recordTabs'
import {
  QuoteClientSummary,
  QuoteReviewCard,
  QuoteReviewTable,
} from '../shared/QuoteReviewComponents'

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
import dialog from '../../../../components/dialog/dialogService'

const isSuccess = (payload) =>
  payload?.status === 'success' || payload?.success === true || payload?.ok === true

const money = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const toYesNo = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['yes', 'y', '1', 'true'].includes(normalized)) return 'Yes'
  }
  if (value === true || value === 1) return 'Yes'
  return 'No'
}

const toDateString = (value) => {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const ReviewQuotationCard = ({
  clientDetails,
  formData,
  setFormData,
  isEditMode,
  quoteId,
  proposalLanguage = 'en',
  appliedPriceException = null,
}) => {
  const navigate = useNavigate()

  const {
    pricingBasis,
    trainingQty,
    trainingDuration,
    durationUnit,
    unitPrice,
    travelCharge,
    noOfPax,
    mealsProvided,
    mealPrice,
    discountType,
    discountValue,
    sstRate,
    hrdCharge,
    trainingTitle,
    trainingVenue,
  } = formData

  const durationLabel = durationUnit || 'day(s)'
  const isPerPaxMode = pricingBasis === 'per_pax'
  const safePax = Number(noOfPax || 0)
  const safeUnitPrice = Number(unitPrice || 0)

  const trainingTotal = calculateTrainingTotal(
    trainingQty,
    trainingDuration,
    unitPrice,
    noOfPax,
    pricingBasis,
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
  const grandTotal = calculateGrandTotal(subtotal, sstAmount, hrdAmount)

  const handleSaveQuote = async () => {
    if (!clientDetails || !formData.trainingTitle) {
      dialog.alert('Client or topic missing')
      return
    }

    const { primaryPIC, pic_name, pic_email, pic_phone, pic_position } =
      buildPicPayload(clientDetails)

    if (!primaryPIC) {
      dialog.alert('Please select at least one client contact (PIC) before saving.')
      return
    }

    const normalizedMealsProvided = toYesNo(formData.mealsProvided)
    const mealsProvidedFlag = normalizedMealsProvided === 'Yes' ? 1 : 0
    const payload = {
      ...(isEditMode && { id: quoteId }),
      isRevision: new URLSearchParams(window.location.search).get('isRevision') === 'true',
      client_id: clientDetails.company_id,
      training_id: formData.trainingId,
      client_snapshot: {
        company_name: clientDetails.company_name,
        ssm_number: clientDetails.ssm_number,
        address: clientDetails.address,
        city: clientDetails.city,
        state: clientDetails.state,
        zip: clientDetails.zip,
      },
      pic_snapshot: {
        full_name: pic_name,
        email: pic_email,
        mobile_number: pic_phone,
        position: pic_position,
      },
      training_title: formData.trainingTitle,
      training_type: formData.trainingTypeOption,
      training_rate_type: formData.trainingRateType || 'client_site_normal',
      payment_method: formData.paymentMethod,
      proposed_date: toDateString(formData.selectedDate),
      proposed_end_date: toDateString(formData.selectedEndDate),
      to_be_confirmed: formData.toBeConfirmed,
      venue: formData.trainingVenue,
      remarks: formData.trainingInqRemarks,
      target_groups: formData.targetGroups,
      pax: Number(formData.noOfPax) || 0,
      session_count: isPerPaxMode ? null : formData.trainingQty,
      duration_per_session: isPerPaxMode ? null : formData.trainingDuration,
      duration_unit: isPerPaxMode ? null : formData.durationUnit,
      pricing_basis: pricingBasis || 'per_session',
      unit_price: Number(formData.unitPrice) || 0,
      travel_charge: Number(formData.travelCharge) || 0,
      travel_region: formData.travelRegion || 'none',
      price_exception_request_id:
        new URLSearchParams(window.location.search).get('priceExceptionRequestId') || null,
      meals_provided: mealsProvidedFlag,
      meals_provided_text: normalizedMealsProvided,
      meal_price: mealsProvidedFlag === 1 ? Number(formData.mealPrice) || 0 : null,
      discount_type: formData.discountType,
      discount_value: Number(formData.discountValue) || 0,
      sst_rate: Number(formData.sstRate) || 0,
      hrd_charge: Number(formData.hrdCharge) || 0,
      training_total: trainingTotal,
      meal_total: mealTotal,
      mobilization_cost: mobilizationCost,
      discount_amount: discountAmount,
      subtotal,
      sst_amount: sstAmount,
      hrd_amount: hrdAmount,
      grand_total: grandTotal,
      attach_proposal: formData.attachProposal,
      proposal_id: formData.proposal_id,
      proposal_language: formData.proposalLanguage || proposalLanguage,
    }

    const endpoint = quoteServiceUrl('training', isEditMode ? quoteId : null)

    try {
      const response = await fetch(endpoint, {
        method: quoteSaveMethod(isEditMode),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const rawResult = await response.json()
      const result = normalizeQuoteResult(rawResult)

      if (isSuccess(result)) {
        await handleQuoteSuccess(result)
        localStorage.removeItem('draftTrainingQuote')
        clearQuoteMainDraft('training')
        sessionStorage.removeItem('quoteInquirySource')
        const goToList = await dialog.confirm(
          `Quotation ${isEditMode ? 'updated' : 'created'} successfully. Go to quote records?`,
          {
            title: isEditMode ? 'Quotation Updated' : 'Quotation Created',
            confirmText: 'Go to list',
            cancelText: isEditMode ? 'Stay here' : 'Create another',
          },
        )
        if (goToList) {
          navigate(getRecordListPath('training-tab'))
        } else if (!isEditMode) {
          window.location.href = '/crm/quotes'
        }
      } else {
        dialog.alert(`Failed to save quote: ${result.message}`)
      }
    } catch (err) {
      console.error('Error saving quote:', err)
      dialog.alert('Server error. Please try again.')
    }
  }

  const handleCancel = () => {
    // Clear both training and main quote drafts
    localStorage.removeItem('draftTrainingQuote')
    clearQuoteMainDraft('training')
    sessionStorage.removeItem('quoteInquirySource')

    if (isEditMode) {
      // Navigate back to records in edit mode
      navigate(getRecordListPath('training-tab'))
    } else {
      // Full reload to reset QuoteMain state
      window.location.href = '/crm/quotes'
    }
  }

  return (
    <QuoteReviewCard
      wrapInCol={false}
      attachProposal={formData.attachProposal || false}
      onAttachProposalChange={(checked) =>
        setFormData((prev) => ({
          ...prev,
          attachProposal: checked,
        }))
      }
      onCancel={handleCancel}
      onSave={handleSaveQuote}
      isEditMode={isEditMode}
    >
      {/* datatable-exempt: existing embedded/layout table */}
      <QuoteReviewTable bordered>
        <CTableBody>
          {/* Client Info */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Client Details</CTableHeaderCell>
            <CTableDataCell>
              <QuoteClientSummary client={clientDetails} />
            </CTableDataCell>
          </CTableRow>

          {/* Training Cost */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Training Cost</CTableHeaderCell>
            <CTableDataCell>
              RM {trainingTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <small className="text-body-secondary ms-2">
                {isPerPaxMode
                  ? `${safePax} pax x RM ${safeUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} per pax`
                  : `${trainingQty} session(s) x ${trainingDuration} ${durationLabel} x RM ${safeUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}{' '}
                - Topic: {trainingTitle}
              </small>
              {appliedPriceException && (
                <small className="d-block text-body-secondary">
                  Base training rates remain locked; approved negotiation is applied through
                  discount.
                </small>
              )}
            </CTableDataCell>
          </CTableRow>

          {/* Mobilization Costs */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Mobilization Costs</CTableHeaderCell>
            <CTableDataCell>
              RM {mobilizationCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <small className="text-body-secondary ms-2">
                Travel & accommodation to {trainingVenue}
              </small>
            </CTableDataCell>
          </CTableRow>

          {appliedPriceException && (
            <CTableRow>
              <CTableHeaderCell className="text-end">Negotiation</CTableHeaderCell>
              <CTableDataCell>
                Approved discount RM {money(discountAmount)} from request #
                {appliedPriceException.id}. This replaces any existing discount when saved.
              </CTableDataCell>
            </CTableRow>
          )}

          {/* Meals */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Meals</CTableHeaderCell>
            <CTableDataCell>
              {mealTotal > 0 ? (
                <>
                  RM {mealTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <small className="text-body-secondary ms-2">
                    {safePax} pax x RM{' '}
                    {Number(mealPrice || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    x {trainingDuration} day(s) x {trainingQty} session(s)
                  </small>
                </>
              ) : (
                <>Not applicable</>
              )}
            </CTableDataCell>
          </CTableRow>

          {/* Discount */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Discount</CTableHeaderCell>
            <CTableDataCell>
              {discountAmount > 0 ? (
                <>
                  - RM {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <small className="text-body-secondary ms-2">{discountType} Discount</small>
                </>
              ) : (
                <>Not applicable</>
              )}
            </CTableDataCell>
          </CTableRow>

          {/* Subtotal */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Subtotal</CTableHeaderCell>
            <CTableDataCell>
              RM {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CTableDataCell>
          </CTableRow>

          {/* SST */}
          <CTableRow>
            <CTableHeaderCell className="text-end">SST</CTableHeaderCell>
            <CTableDataCell>
              RM {sstAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <small className="text-body-secondary ms-2">({sstRate}%)</small>
            </CTableDataCell>
          </CTableRow>

          {/* HRD Charge */}
          <CTableRow>
            <CTableHeaderCell className="text-end">HRD Charge</CTableHeaderCell>
            <CTableDataCell>
              RM {hrdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <small className="text-body-secondary ms-2">
                ({hrdCharge}% of net training cost)
              </small>
            </CTableDataCell>
          </CTableRow>

          {/* Grand Total */}
          <CTableRow color="light">
            <CTableHeaderCell className="text-end">Grand Total</CTableHeaderCell>
            <CTableDataCell>
              <strong>RM {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </QuoteReviewTable>
    </QuoteReviewCard>
  )
}

export default ReviewQuotationCard
