// src/crm/quotes/manpower/ReviewManpowerQuoteCard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CTableBody, CTableRow, CTableHeaderCell, CTableDataCell } from '@coreui/react'
import { clearQuoteMainDraft, clearQuoteServiceDraft } from '../quoteMainDrafts'
import { removeQuoteInquirySource } from '../quoteInquirySource'
import { getRecordListPath } from '../../records/config/recordTabs'
import { getManpowerRateOption } from './manpowerRates'
import {
  QuoteClientSummary,
  QuoteReviewCard,
  QuoteReviewTable,
} from '../shared/QuoteReviewComponents'
import { formatMoney } from '../../../../utils/formatters/numberFormatters'

export default function ReviewManpowerQuoteCard({
  selectedClient,
  formData,
  setFormData,
  onSave,
  saveLabel,
  requiresApproval = false,
  isEditMode = false,
  appliedPriceException = null,
}) {
  const navigate = useNavigate()
  const rateOption = getManpowerRateOption(formData.manpowerRateType)
  const isHourly = formData.billingUnit === 'hour'
  const durationValue = isHourly ? formData.durationHours : formData.durationMonths
  const durationLabel = isHourly ? 'hours' : 'months'
  const unitRateLabel = isHourly ? 'per pax per hour' : 'per pax per month'

  const handleCancel = () => {
    if (isEditMode) {
      navigate(getRecordListPath('manpower-tab'))
    } else {
      clearQuoteMainDraft('manpower')
      clearQuoteServiceDraft({
        serviceKey: 'manpower',
        clientId: selectedClient?.company_id,
        language: formData?.proposalLanguage,
      })
      removeQuoteInquirySource()
      navigate('/crm/quotes', { replace: true, state: { quoteResetToken: Date.now() } })
    }
  }

  return (
    <QuoteReviewCard
      attachProposal={!!formData.attachProposal}
      attachProposalLabel="Attach Proposal PDF"
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
          {/* Client Info */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Client Details</CTableHeaderCell>
            <CTableDataCell>
              <QuoteClientSummary client={selectedClient} />
            </CTableDataCell>
          </CTableRow>

          {/* Service Template */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Service Details</CTableHeaderCell>
            <CTableDataCell>
              <strong>{formData.serviceTitle}</strong>{' '}
              <small className="text-muted">({formData.serviceCode})</small>
              <br />
              Nature of Project: {formData.natureOfWork || '-'}
              <br />
              Site Location: {formData.siteLocation || '-'}
              <br />
              Rate Type: {rateOption?.label || '-'}
              <br />
              Duration: {durationValue ?? '-'} {durationLabel}
              <br />
              No of Personnel: {formData.noOfPax ?? '-'} pax
              <br />
              Remarks: {formData.inquiryRemarks || '-'}
            </CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Unit Rate (RM)</CTableHeaderCell>
            <CTableDataCell>
              {formatMoney(formData.unitCost)} {unitRateLabel}
              {appliedPriceException && (
                <small className="d-block text-muted">
                  Base rate remains locked; approved negotiation is applied through discount.
                </small>
              )}
            </CTableDataCell>
          </CTableRow>

          {appliedPriceException && (
            <CTableRow>
              <CTableHeaderCell className="text-end">Negotiation</CTableHeaderCell>
              <CTableDataCell>
                Approved discount {formatMoney(formData.discount)} from request #
                {appliedPriceException.id}. This replaces any existing discount when saved.
              </CTableDataCell>
            </CTableRow>
          )}

          {/* Discount */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Discount (RM)</CTableHeaderCell>
            <CTableDataCell>- {formatMoney(formData.discount)}</CTableDataCell>
          </CTableRow>

          {/* Subtotal */}
          <CTableRow>
            <CTableHeaderCell className="text-end">Subtotal (RM)</CTableHeaderCell>
            <CTableDataCell>{formatMoney(formData.subTotal)}</CTableDataCell>
          </CTableRow>

          {/* SST */}
          <CTableRow>
            <CTableHeaderCell className="text-end">
              {formData.sstPercent ?? 0}% SST (RM)
            </CTableHeaderCell>
            <CTableDataCell>{formatMoney(formData.sstAmount)}</CTableDataCell>
          </CTableRow>

          {/* Grand Total */}
          <CTableRow>
            <CTableHeaderCell className="text-end">
              <strong>Grand Total (RM)</strong>
            </CTableHeaderCell>
            <CTableDataCell>
              <strong>{formatMoney(formData.grandTotal)}</strong>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </QuoteReviewTable>
    </QuoteReviewCard>
  )
}
