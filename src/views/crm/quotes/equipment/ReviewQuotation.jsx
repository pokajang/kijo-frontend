// src/views/crm/quotes/equipment/ReviewQuotation.jsx

import React from 'react'
import {
  CRow,
  CCol,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { QuoteReviewSection, QuoteReviewTable } from '../shared/QuoteReviewComponents'
import TrafficLightDecisionBadge from '../shared/TrafficLightDecisionBadge'

export default function ReviewQuotation({
  selectedItems,
  quantities,
  markedUp,
  itemRemarks = {},
  quotationRemarks = '',
  deliveryCharge,
  miscCharge,
  discount,
  sstPercent,
  subtotal,
  sstAmount,
  grandTotal,
  estimatedTotalCost,
  attachProposal,
  onAttachProposalChange,
  onCancel,
  onSave,
  saveLabel,
  requiresApproval = false,
  isEditMode = false,
}) {
  return (
    <QuoteReviewSection
      title="Review Price"
      onCancel={onCancel}
      onSave={onSave}
      saveLabel={saveLabel}
      requiresApproval={requiresApproval}
      isEditMode={isEditMode}
      attachProposal={attachProposal}
      attachProposalLabel="Attach Proposal PDF"
      onAttachProposalChange={onAttachProposalChange}
    >
      <CRow>
        <CCol xs={12}>
          {quotationRemarks?.trim() ? (
            <div className="mb-3">
              <strong>Quotation Remarks</strong>
              <div className="text-body-secondary" style={{ whiteSpace: 'pre-line' }}>
                {quotationRemarks}
              </div>
            </div>
          ) : null}
          {/* datatable-exempt: existing embedded/layout table */}
          <QuoteReviewTable>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>#</CTableHeaderCell>
                <CTableHeaderCell>Item</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
                <CTableHeaderCell>Unit</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Unit Price (RM)</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Total (RM)</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {selectedItems.map(({ value: item }, idx) => {
                const qty = quantities[item.id] || 0
                const price = parseFloat(markedUp[item.id] || 0)
                return (
                  <CTableRow key={idx}>
                    <CTableHeaderCell>{idx + 1}</CTableHeaderCell>
                    <CTableDataCell>
                      <div>{item.item_name}</div>
                      {itemRemarks[item.id]?.trim() ? (
                        <small className="text-body-secondary" style={{ whiteSpace: 'pre-line' }}>
                          Specifications: {itemRemarks[item.id]}
                        </small>
                      ) : null}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">{qty}</CTableDataCell>
                    <CTableDataCell>{item.unit}</CTableDataCell>
                    <CTableDataCell className="text-end">{price.toFixed(2)}</CTableDataCell>
                    <CTableDataCell className="text-end">{(qty * price).toFixed(2)}</CTableDataCell>
                  </CTableRow>
                )
              })}

              {/* Other charges */}
              {deliveryCharge > 0 && (
                <CTableRow>
                  <CTableHeaderCell colSpan={5} className="text-end">
                    Delivery Charge
                  </CTableHeaderCell>
                  <CTableDataCell className="text-end">
                    RM {deliveryCharge.toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
              )}

              {miscCharge > 0 && (
                <CTableRow>
                  <CTableHeaderCell colSpan={5} className="text-end">
                    Miscellaneous Charge
                  </CTableHeaderCell>
                  <CTableDataCell className="text-end">RM {miscCharge.toFixed(2)}</CTableDataCell>
                </CTableRow>
              )}

              {discount > 0 && (
                <CTableRow>
                  <CTableHeaderCell colSpan={5} className="text-end">
                    Discount
                  </CTableHeaderCell>
                  <CTableDataCell className="text-end">- RM {discount.toFixed(2)}</CTableDataCell>
                </CTableRow>
              )}

              {/* Subtotal immediately after last item */}
              <CTableRow>
                <CTableHeaderCell colSpan={5} className="text-end">
                  Subtotal
                </CTableHeaderCell>
                <CTableDataCell className="text-end">RM {subtotal.toFixed(2)}</CTableDataCell>
              </CTableRow>

              {/* SST just above Grand Total */}
              {sstPercent > 0 && (
                <CTableRow>
                  <CTableHeaderCell colSpan={5} className="text-end">
                    {sstPercent}% SST
                  </CTableHeaderCell>
                  <CTableDataCell className="text-end">RM {sstAmount.toFixed(2)}</CTableDataCell>
                </CTableRow>
              )}

              <CTableRow>
                <CTableHeaderCell colSpan={5} className="text-end">
                  <strong>Grand Total</strong>
                </CTableHeaderCell>
                <CTableDataCell className="text-end">
                  <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">
                    <strong>RM {grandTotal.toFixed(2)}</strong>
                    <TrafficLightDecisionBadge
                      serviceKey="equipment"
                      estimatedTotalCost={estimatedTotalCost}
                      quoteTotal={grandTotal}
                    />
                  </div>
                </CTableDataCell>
              </CTableRow>
            </CTableBody>
          </QuoteReviewTable>
        </CCol>
      </CRow>
    </QuoteReviewSection>
  )
}
