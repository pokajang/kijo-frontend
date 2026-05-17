import React from 'react'
import { useNavigate } from 'react-router-dom'

import { CTableBody, CTableRow, CTableHeaderCell, CTableDataCell } from '@coreui/react'
import { clearQuoteMainDraft } from '../quoteMainDrafts'
import { getRecordListPath } from '../../records/config/recordTabs'
import { calculateHygieneTotals } from '../../../../shared/invoice/hygienePricing'
import {
  QuoteClientSummary,
  QuoteReviewCard,
  QuoteReviewTable,
} from '../shared/QuoteReviewComponents'

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
      localStorage.removeItem('draftHygieneQuote')
      sessionStorage.removeItem('quoteInquirySource')
      window.location.href = '/crm/quotes'
    }
  }

  const baseUnitPrice = toNumber(formData.unitPrice, 0)
  const sampleCounts = toNumber(formData.sampleCounts, 0)
  const hasWorkUnitsInput = Number(formData.numWorkUnits) > 0
  const workUnits = hasWorkUnitsInput ? toNumber(formData.numWorkUnits, 1) : 1
  const totals = calculateHygieneTotals({
    sampleCounts,
    numWorkUnits: formData.numWorkUnits,
    unitPrice: formData.unitPrice,
    travelCharge: formData.travelCharge,
    discount: formData.discount,
    sstPercent: formData.sstPercent,
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

          <CTableRow>
            <CTableHeaderCell className="text-end">Discount (RM)</CTableHeaderCell>
            <CTableDataCell>- {toNumber(formData.discount, 0).toFixed(2)}</CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Subtotal (RM)</CTableHeaderCell>
            <CTableDataCell>{totals.subtotalBeforeDiscount.toFixed(2)}</CTableDataCell>
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
              <strong>{totals.grandTotal.toFixed(2)}</strong>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </QuoteReviewTable>
    </QuoteReviewCard>
  )
}

export default ReviewHygieneQuotationCard
