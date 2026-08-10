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

const MobileTotalRow = ({ label, value, strong = false, children }) => (
  <div className="d-flex justify-content-between align-items-start gap-3 py-1">
    <span className={strong ? 'fw-semibold' : 'text-body-secondary'}>{label}</span>
    <span className={`text-end ${strong ? 'fw-bold' : ''}`.trim()}>
      {value}
      {children}
    </span>
  </div>
)

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
          <QuoteReviewTable shellClassName="d-none d-md-block">
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

          <div className="d-md-none" aria-label="Equipment quotation summary">
            <div className="d-grid gap-2">
              {selectedItems.map(({ value: item }, idx) => {
                const qty = quantities[item.id] || 0
                const price = parseFloat(markedUp[item.id] || 0)
                const itemTitleId = `equipmentReviewItem-${item.id || idx}`

                return (
                  <section
                    className="border rounded p-3"
                    aria-labelledby={itemTitleId}
                    key={item.id || idx}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div style={{ minWidth: 0 }}>
                        <div className="small text-body-secondary">Item {idx + 1}</div>
                        <strong id={itemTitleId} className="d-block text-break">
                          {item.item_name}
                        </strong>
                      </div>
                      <strong className="text-nowrap">RM {(qty * price).toFixed(2)}</strong>
                    </div>
                    <div className="small text-body-secondary mt-2">
                      {qty} {item.unit || 'unit'} at RM {price.toFixed(2)} each
                    </div>
                    {itemRemarks[item.id]?.trim() ? (
                      <div className="small mt-2" style={{ whiteSpace: 'pre-line' }}>
                        <span className="fw-semibold">Specifications:</span> {itemRemarks[item.id]}
                      </div>
                    ) : null}
                  </section>
                )
              })}
            </div>

            <div className="border rounded p-3 mt-3">
              {deliveryCharge > 0 ? (
                <MobileTotalRow label="Delivery Charge" value={`RM ${deliveryCharge.toFixed(2)}`} />
              ) : null}
              {miscCharge > 0 ? (
                <MobileTotalRow
                  label="Miscellaneous Charge"
                  value={`RM ${miscCharge.toFixed(2)}`}
                />
              ) : null}
              {discount > 0 ? (
                <MobileTotalRow label="Discount" value={`- RM ${discount.toFixed(2)}`} />
              ) : null}
              <MobileTotalRow label="Subtotal" value={`RM ${subtotal.toFixed(2)}`} />
              {sstPercent > 0 ? (
                <MobileTotalRow label={`${sstPercent}% SST`} value={`RM ${sstAmount.toFixed(2)}`} />
              ) : null}
              <div className="border-top mt-2 pt-2">
                <MobileTotalRow label="Grand Total" value={`RM ${grandTotal.toFixed(2)}`} strong />
                <div className="d-flex justify-content-end mt-2">
                  <TrafficLightDecisionBadge
                    serviceKey="equipment"
                    estimatedTotalCost={estimatedTotalCost}
                    quoteTotal={grandTotal}
                  />
                </div>
              </div>
            </div>
          </div>
        </CCol>
      </CRow>
    </QuoteReviewSection>
  )
}
