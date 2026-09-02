import React from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { formatNumber } from '../../../../../utils/formatters/numberFormatters'

const amount = (value) => formatNumber(value, { minimumFractionDigits: 2 })

const NegotiationRequestModal = ({
  visible,
  record,
  form,
  onChange,
  onCancel,
  onConfirm,
  isSubmitting = false,
}) => {
  const currentAmount = Number(record?.amount ?? record?.quote_value ?? 0)
  const discountAmount = Number(form.requestedDiscountAmount || 0)
  const finalTotalAmount = Number(form.requestedFinalTotal || 0)
  const hasDiscount = Number(form.requestedDiscountAmount || 0) > 0
  const hasFinalTotal = finalTotalAmount > 0
  const hasOneAmount = hasDiscount !== hasFinalTotal
  const amountIsValid =
    (hasDiscount && discountAmount <= currentAmount) ||
    (hasFinalTotal && finalTotalAmount < currentAmount)
  const canSubmit = hasOneAmount && amountIsValid && String(form.reason || '').trim().length > 0

  return (
    <CModal visible={visible} onClose={onCancel} alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Request Negotiation</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <div className="fw-semibold">{record?.quotationId || record?.quote_ref_no || '-'}</div>
          <div className="text-muted small">
            {record?.clientDetails?.companyName || record?.clientName}
          </div>
          <div className="text-muted small">
            Current amount: RM {amount(record?.amount ?? record?.quote_value)}
          </div>
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="negotiationDiscount">Requested Discount</CFormLabel>
          <CInputGroup>
            <CInputGroupText>RM</CInputGroupText>
            <CFormInput
              id="negotiationDiscount"
              type="number"
              min="0"
              max={currentAmount || undefined}
              step="0.01"
              value={form.requestedDiscountAmount}
              disabled={hasFinalTotal}
              onChange={(event) => onChange('requestedDiscountAmount', event.target.value)}
            />
          </CInputGroup>
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="negotiationFinalTotal">Requested Final Total</CFormLabel>
          <CInputGroup>
            <CInputGroupText>RM</CInputGroupText>
            <CFormInput
              id="negotiationFinalTotal"
              type="number"
              min="0"
              max={currentAmount || undefined}
              step="0.01"
              value={form.requestedFinalTotal}
              disabled={hasDiscount}
              onChange={(event) => onChange('requestedFinalTotal', event.target.value)}
            />
          </CInputGroup>
          <div className="form-text">
            Enter either a discount or a final total below the current amount.
          </div>
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="negotiationReason">Reason</CFormLabel>
          <CFormTextarea
            id="negotiationReason"
            rows={3}
            value={form.reason}
            onChange={(event) => onChange('reason', event.target.value)}
            placeholder="Client budget, revised scope, competitor price, or commercial reason."
          />
        </div>

        <div>
          <CFormLabel htmlFor="negotiationRemarks">Internal Remarks</CFormLabel>
          <CFormTextarea
            id="negotiationRemarks"
            rows={2}
            value={form.remarks}
            onChange={(event) => onChange('remarks', event.target.value)}
          />
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </CButton>
        <CButton
          color="primary"
          size="sm"
          onClick={onConfirm}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default NegotiationRequestModal
