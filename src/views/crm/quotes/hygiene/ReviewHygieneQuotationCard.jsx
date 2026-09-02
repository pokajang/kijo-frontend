import React from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { clearQuoteMainDraft, clearQuoteServiceDraft } from '../quoteMainDrafts'
import { removeQuoteInquirySource } from '../quoteInquirySource'
import { getRecordListPath } from '../../records/config/recordTabs'
import {
  calculateHygieneTotals,
  isHistoricalHygienePricingRule,
  LEGACY_HYGIENE_PRICING_RULE,
} from '../../../../shared/invoice/hygienePricing'
import {
  QuoteClientSummary,
  QuoteReviewCard,
  QuoteReviewTable,
} from '../shared/QuoteReviewComponents'
import TrafficLightDecisionBadge from '../shared/TrafficLightDecisionBadge'
import { formatMoney } from '../../../../utils/formatters/numberFormatters'

const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const ReviewHygieneQuotationCard = ({
  selectedClient,
  formData,
  setFormData,
  onSave,
  saveLabel,
  requiresApproval = false,
  isEditMode = false,
  totalsOverride = null,
}) => {
  const navigate = useNavigate()

  const handleCancel = () => {
    if (isEditMode) {
      navigate(getRecordListPath('ih-tab'))
    } else {
      clearQuoteMainDraft('ih')
      clearQuoteServiceDraft({
        serviceKey: 'ih',
        clientId: selectedClient?.company_id,
        language: formData?.proposalLanguage,
      })
      removeQuoteInquirySource()
      navigate('/crm/quotes', { replace: true, state: { quoteResetToken: Date.now() } })
    }
  }

  const baseUnitPrice = toNumber(formData.unitPrice, 0)
  const sampleCounts = toNumber(formData.sampleCounts, 0)
  const hasWorkUnitsInput = Number(formData.numWorkUnits) > 0
  const workUnits = hasWorkUnitsInput ? toNumber(formData.numWorkUnits, 1) : 1
  const hygieneItems = Array.isArray(formData.hygieneItems) ? formData.hygieneItems : []
  const isLegacyPricing = formData.pricingRuleVersion === LEGACY_HYGIENE_PRICING_RULE
  const isHistoricalPricing = isHistoricalHygienePricingRule(formData.pricingRuleVersion)
  const totals =
    totalsOverride ||
    calculateHygieneTotals({
      sampleCounts,
      numWorkUnits: formData.numWorkUnits,
      unitPrice: formData.unitPrice,
      travelCharge: formData.travelCharge,
      customItems: hygieneItems,
      discount: formData.discount,
      sstPercent: formData.sstPercent,
      pricingRuleVersion: formData.pricingRuleVersion,
      complexityRating: formData.complexityRating,
    })

  return (
    <QuoteReviewCard
      attachProposal={!!formData.attachProposal}
      onAttachProposalChange={(checked) =>
        setFormData((prev) => ({
          ...prev,
          attachProposal: checked,
        }))
      }
      onCancel={handleCancel}
      onSave={onSave}
      saveLabel={saveLabel}
      requiresApproval={requiresApproval}
      isEditMode={isEditMode}
    >
      {/* datatable-exempt: existing embedded/layout table */}
      <QuoteReviewTable>
        <CTableBody>
          <CTableRow>
            <CTableHeaderCell className="text-end">Client Details</CTableHeaderCell>
            <CTableDataCell>
              <QuoteClientSummary client={selectedClient} />
            </CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Service</CTableHeaderCell>
            <CTableDataCell>
              <strong>{formData.serviceTitle}</strong>{' '}
              <small className="text-muted">({formData.serviceCode?.toUpperCase()})</small>
              <br />
              <small>Main Site Address: </small>
              {formData.siteAddress || '-'}
              <br />
              <small className="text-muted">
                Work Units: {hasWorkUnitsInput ? formData.numWorkUnits : 'N/A (assumed 1)'} -{' '}
                {formData.sampleCounts} {formData.sampleUnit}
              </small>
              <br />
              <small className="text-muted">Remarks: {formData.inquiryRemarks}</small>
            </CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Service Cost (RM)</CTableHeaderCell>
            <CTableDataCell>
              {formatMoney(totals.serviceTotal)}{' '}
              <small className="text-muted">
                (Unit Price: {formatMoney(baseUnitPrice)}
                {isLegacyPricing
                  ? ` x Complexity: ${totals.complexityRating} (${totals.complexityMultiplier.toFixed(1)}x)`
                  : ''}{' '}
                x Work Units: {workUnits} x Samples: {sampleCounts})
              </small>
            </CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Mob & Accom (RM)</CTableHeaderCell>
            <CTableDataCell>{formatMoney(toNumber(formData.travelCharge, 0))}</CTableDataCell>
          </CTableRow>

          {!isHistoricalPricing && hygieneItems.length > 0 && (
            <CTableRow>
              <CTableHeaderCell className="text-end">Additional Fees (RM)</CTableHeaderCell>
              <CTableDataCell className="p-0">
                <CTable
                  className="align-middle mb-0 records-table-compact"
                  style={{ width: 'auto', minWidth: 0 }}
                >
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="fw-normal text-muted">#</CTableHeaderCell>
                      <CTableHeaderCell>Amount (RM)</CTableHeaderCell>
                      <CTableHeaderCell>Line Item</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {hygieneItems.map((item, index) => {
                      const quantity = toNumber(item.quantity, 0)
                      const unitPrice = toNumber(item.unit_price, 0)
                      const lineTotal = quantity * unitPrice
                      return (
                        <CTableRow key={item.id || index}>
                          <CTableDataCell className="fw-normal text-muted">
                            {index + 1}
                          </CTableDataCell>
                          <CTableDataCell>{formatMoney(lineTotal)}</CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex align-items-start gap-2 flex-wrap">
                              <strong>{item.item_description || '-'}</strong>
                              <small className="text-muted">
                                ({quantity} {item.unit || 'Lot'} x {formatMoney(unitPrice)})
                              </small>
                              {item.description ? (
                                <small className="text-muted">Notes: {item.description}</small>
                              ) : null}
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </CTableDataCell>
            </CTableRow>
          )}

          {!isHistoricalPricing && (
            <CTableRow>
              <CTableHeaderCell className="text-end">Gross Subtotal (RM)</CTableHeaderCell>
              <CTableDataCell>{formatMoney(totals.subtotalBeforeDiscount)}</CTableDataCell>
            </CTableRow>
          )}

          <CTableRow>
            <CTableHeaderCell className="text-end">Discount (RM)</CTableHeaderCell>
            <CTableDataCell>- {formatMoney(totals.discountTotal)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">
              {isHistoricalPricing ? 'Subtotal (RM)' : 'Subtotal after Discount (RM)'}
            </CTableHeaderCell>
            <CTableDataCell>{formatMoney(totals.taxableTotal)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">
              {formData.sstPercent || '0'}% SST (RM)
            </CTableHeaderCell>
            <CTableDataCell>{formatMoney(totals.sstAmount)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">
              <strong>Grand Total (RM)</strong>
            </CTableHeaderCell>
            <CTableDataCell>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong>{formatMoney(totals.grandTotal)}</strong>
                <TrafficLightDecisionBadge
                  serviceKey="ih"
                  estimatedTotalCost={formData.estimatedTotalCost}
                  quoteTotal={totals.grandTotal}
                />
              </div>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </QuoteReviewTable>
    </QuoteReviewCard>
  )
}

export default ReviewHygieneQuotationCard
