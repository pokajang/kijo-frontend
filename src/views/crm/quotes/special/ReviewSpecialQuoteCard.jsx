import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell } from '@coreui/react'
import { clearQuoteMainDraft, clearQuoteServiceDraft } from '../quoteMainDrafts'
import { removeQuoteInquirySource } from '../quoteInquirySource'
import { getRecordListPath } from '../../records/config/recordTabs'
import {
  QuoteClientSummary,
  QuoteReviewCard,
  QuoteReviewTable,
} from '../shared/QuoteReviewComponents'

export default function ReviewSpecialQuoteCard({
  selectedClient,
  formData,
  setFormData,
  onSave,
  isEditMode = false,
  saveLabel,
  requiresApproval = false,
}) {
  const navigate = useNavigate()

  const handleCancel = () => {
    clearQuoteMainDraft('special')
    clearQuoteServiceDraft({
      serviceKey: 'special',
      clientId: selectedClient?.company_id,
      language: formData?.proposalLanguage,
    })
    removeQuoteInquirySource()

    if (isEditMode) {
      navigate(getRecordListPath('special-tab'))
    } else {
      navigate('/crm/quotes', { replace: true, state: { quoteResetToken: Date.now() } })
    }
  }

  const subtotal = parseFloat(formData.subTotal || 0)
  const sstAmount = parseFloat(formData.sstAmount || 0)
  const discount = parseFloat(formData.discount || 0)
  const attachProposalDisabled = formData.hasAppendableProposal === false
  const attachProposalHelpText = attachProposalDisabled
    ? formData.appendableProposalMessage || 'Selected special proposal cannot be appended.'
    : formData.appendableProposalMessage || ''
  const lineItemsSubtotal = (formData.lineItems || []).reduce(
    (sum, item) => sum + (parseFloat(item.amount || 0) || 0),
    0,
  )
  const grandTotal = (subtotal + sstAmount).toFixed(2)

  return (
    <QuoteReviewCard
      wrapInCol={false}
      cardClassName="mb-0"
      attachProposal={!!formData.attachProposal}
      attachProposalLabel="Attach Proposal PDF"
      attachProposalDisabled={attachProposalDisabled}
      attachProposalHelpText={attachProposalHelpText}
      onAttachProposalChange={(checked) =>
        setFormData((prev) => ({
          ...prev,
          attachProposal: attachProposalDisabled ? false : checked,
        }))
      }
      onCancel={handleCancel}
      onSave={onSave}
      isEditMode={isEditMode}
      saveLabel={saveLabel}
      requiresApproval={requiresApproval}
    >
      <QuoteReviewTable>
        <CTableBody>
          <CTableRow>
            <CTableHeaderCell className="text-end">Client</CTableHeaderCell>
            <CTableDataCell>
              <QuoteClientSummary
                client={selectedClient}
                fallback={{
                  clientName: formData.clientName,
                  clientAddress: formData.clientAddress,
                  clientZip: formData.clientZip,
                  clientCity: formData.clientCity,
                  clientState: formData.clientState,
                  picName: formData.picName,
                  picEmail: formData.picEmail,
                  picPhone: formData.picPhone,
                  picPosition: formData.picPosition,
                }}
              />
            </CTableDataCell>
          </CTableRow>

          <CTableRow>
            <CTableHeaderCell className="text-end">Service</CTableHeaderCell>
            <CTableDataCell>
              {formData.serviceTitle} ({formData.serviceCode})
              <br />
              <small className="text-muted">Remarks: {formData.generalRemarks || '-'}</small>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </QuoteReviewTable>

      <QuoteReviewTable shellClassName="mt-4">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell className="fw-normal text-muted">#</CTableHeaderCell>
            <CTableHeaderCell>Amount (RM)</CTableHeaderCell>
            <CTableHeaderCell>Line Item</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {(formData.lineItems || []).map((it, i) => (
            <CTableRow key={i}>
              <CTableDataCell className="fw-normal text-muted">{i + 1}</CTableDataCell>
              <CTableDataCell>{parseFloat(it.amount || 0).toFixed(2)}</CTableDataCell>
              <CTableDataCell>
                <div className="d-flex align-items-start gap-2 flex-wrap">
                  <strong>{it.title || '-'}</strong>
                  <small className="text-muted">
                    ({Number(it.quantity || 0)} {it.unit || '-'} x{' '}
                    {parseFloat(it.unitPrice || 0).toFixed(2)})
                  </small>
                  {it.description ? (
                    <small className="text-muted">Notes: {it.description}</small>
                  ) : null}
                </div>
              </CTableDataCell>
            </CTableRow>
          ))}

          {discount > 0 && (
            <>
              <CTableRow>
                <CTableHeaderCell colSpan={2} className="text-end">
                  Line Items Subtotal (RM)
                </CTableHeaderCell>
                <CTableDataCell>RM {lineItemsSubtotal.toFixed(2)}</CTableDataCell>
              </CTableRow>
              <CTableRow>
                <CTableHeaderCell colSpan={2} className="text-end">
                  Discount (RM)
                </CTableHeaderCell>
                <CTableDataCell>- RM {discount.toFixed(2)}</CTableDataCell>
              </CTableRow>
            </>
          )}

          <CTableRow>
            <CTableHeaderCell colSpan={2} className="text-end">
              Subtotal (RM)
            </CTableHeaderCell>
            <CTableDataCell>RM {subtotal.toFixed(2)}</CTableDataCell>
          </CTableRow>
          <CTableRow>
            <CTableHeaderCell colSpan={2} className="text-end">
              {formData.sstPercent ?? 0}% SST
            </CTableHeaderCell>
            <CTableDataCell>RM {sstAmount.toFixed(2)}</CTableDataCell>
          </CTableRow>
          <CTableRow>
            <CTableHeaderCell colSpan={2} className="text-end">
              <strong>Grand Total (RM)</strong>
            </CTableHeaderCell>
            <CTableDataCell>
              <strong>RM {grandTotal}</strong>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </QuoteReviewTable>
    </QuoteReviewCard>
  )
}
