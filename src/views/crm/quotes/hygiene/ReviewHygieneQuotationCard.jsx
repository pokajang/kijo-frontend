import React from 'react'
import { useNavigate } from 'react-router-dom'

import { CTableBody, CTableRow, CTableHeaderCell, CTableDataCell } from '@coreui/react'
import { clearQuoteMainDraft, clearQuoteServiceDraft } from '../quoteMainDrafts'
import { removeQuoteInquirySource } from '../quoteInquirySource'
import { getRecordListPath } from '../../records/config/recordTabs'
import { calculateHygieneTotals } from '../../../../shared/invoice/hygienePricing'
import {
  QuoteClientSummary,
  QuoteReviewCard,
  QuoteReviewTable,
} from '../shared/QuoteReviewComponents'
import TrafficLightDecisionBadge from '../shared/TrafficLightDecisionBadge'

const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const ReviewHygieneQuotationCard = ({
  selectedClient,
  formData,
  setFormData,
  onSave,
  isEditMode = false,
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
  const totals = calculateHygieneTotals({
    sampleCounts,
    numWorkUnits: formData.numWorkUnits,
    unitPrice: formData.unitPrice,
    travelCharge: formData.travelCharge,
    customItems: hygieneItems,
    discount: formData.discount,
    sstPercent: formData.sstPercent,
  })

  return (
    <QuoteReviewCard
      cardClassName="mb-2"
      attachProposal={!!formData.attachProposal}
      onAttachProposalChange={(checked) =>
        setFormData((prev) => ({
          ...prev,
          attachProposal: checked,
        }))
      }
      onCancel={handleCancel}
      onSave={onSave}
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
              {totals.serviceTotal.toFixed(2)}{' '}
              <small className="text-muted">
                (Unit Price: {baseUnitPrice.toFixed(2)} x Work Units: {workUnits} x Samples:{' '}
                {sampleCounts})
              </small>
            </CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Mob & Accom (RM)</CTableHeaderCell>
            <CTableDataCell>{toNumber(formData.travelCharge, 0).toFixed(2)}</CTableDataCell>
          </CTableRow>

          {hygieneItems.length > 0 && (
            <CTableRow>
              <CTableHeaderCell className="text-end">Additional Fees (RM)</CTableHeaderCell>
              <CTableDataCell>
                {hygieneItems.map((item, index) => {
                  const quantity = toNumber(item.quantity, 0)
                  const unitPrice = toNumber(item.unit_price, 0)
                  const lineTotal = quantity * unitPrice
                  const prefix = hygieneItems.length > 1 ? `${index + 1}. ` : ''
                  return (
                    <div key={item.id || index} className={index > 0 ? 'mt-2' : undefined}>
                      <div className="d-flex justify-content-between gap-3 flex-wrap">
                        <div>
                          <strong>
                            {prefix}
                            {item.item_description}
                          </strong>{' '}
                          <small className="text-muted">
                            ({quantity} {item.unit || 'Lot'} x {unitPrice.toFixed(2)})
                          </small>
                        </div>
                        <span>{lineTotal.toFixed(2)}</span>
                      </div>
                      {item.description ? (
                        <>
                          <br />
                          <small className="text-muted d-block">{item.description}</small>
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </CTableDataCell>
            </CTableRow>
          )}

          <CTableRow>
            <CTableHeaderCell className="text-end">Gross Subtotal (RM)</CTableHeaderCell>
            <CTableDataCell>{totals.subtotalBeforeDiscount.toFixed(2)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Discount (RM)</CTableHeaderCell>
            <CTableDataCell>- {totals.discountTotal.toFixed(2)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Subtotal after Discount (RM)</CTableHeaderCell>
            <CTableDataCell>{totals.taxableTotal.toFixed(2)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">
              {formData.sstPercent || '0'}% SST (RM)
            </CTableHeaderCell>
            <CTableDataCell>{totals.sstAmount.toFixed(2)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">
              <strong>Grand Total (RM)</strong>
            </CTableHeaderCell>
            <CTableDataCell>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong>{totals.grandTotal.toFixed(2)}</strong>
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
