import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell } from '@coreui/react'
import { clearQuoteMainDraft } from '../quoteMainDrafts'
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
}) {
  const navigate = useNavigate()

  const handleCancel = () => {
    localStorage.removeItem('draftSpecialQuote')
    clearQuoteMainDraft('special')
    sessionStorage.removeItem('quoteInquirySource')

    if (isEditMode) {
      navigate(getRecordListPath('special-tab'))
    } else {
      window.location.href = '/crm/quotes'
    }
  }

  const subtotal = parseFloat(formData.subTotal || 0)
  const sstAmount = parseFloat(formData.sstAmount || 0)
  const grandTotal = (subtotal + sstAmount).toFixed(2)

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
      isEditMode={isEditMode}
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
            <CTableHeaderCell>#</CTableHeaderCell>
            <CTableHeaderCell>Item</CTableHeaderCell>
            <CTableHeaderCell>Description</CTableHeaderCell>
            <CTableHeaderCell>Unit</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
            <CTableHeaderCell className="text-end">Unit Price (RM)</CTableHeaderCell>
            <CTableHeaderCell className="text-end">Amount (RM)</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {(formData.lineItems || []).map((it, i) => (
            <CTableRow key={i}>
              <CTableHeaderCell>{i + 1}</CTableHeaderCell>
              <CTableDataCell>{it.title}</CTableDataCell>
              <CTableDataCell>{it.description}</CTableDataCell>
              <CTableDataCell>{it.unit}</CTableDataCell>
              <CTableDataCell className="text-center">{it.quantity}</CTableDataCell>
              <CTableDataCell className="text-end">
                {parseFloat(it.unitPrice || 0).toFixed(2)}
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {parseFloat(it.amount || 0).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
          ))}

          <CTableRow>
            <CTableHeaderCell colSpan={6} className="text-end">
              Subtotal (RM)
            </CTableHeaderCell>
            <CTableDataCell className="text-end">RM {subtotal.toFixed(2)}</CTableDataCell>
          </CTableRow>
          <CTableRow>
            <CTableHeaderCell colSpan={6} className="text-end">
              {formData.sstPercent ?? 0}% SST
            </CTableHeaderCell>
            <CTableDataCell className="text-end">RM {sstAmount.toFixed(2)}</CTableDataCell>
          </CTableRow>
          <CTableRow>
            <CTableHeaderCell colSpan={6} className="text-end">
              <strong>Grand Total (RM)</strong>
            </CTableHeaderCell>
            <CTableDataCell className="text-end">
              <strong>RM {grandTotal}</strong>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </QuoteReviewTable>
    </QuoteReviewCard>
  )
}
