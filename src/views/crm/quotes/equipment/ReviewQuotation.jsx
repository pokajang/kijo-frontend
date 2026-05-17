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

export default function ReviewQuotation({
  selectedItems,
  quantities,
  markedUp,
  deliveryCharge,
  miscCharge,
  discount,
  sstPercent,
  subtotal,
  sstAmount,
  grandTotal,
  onCancel,
  onSave,
  isEditMode = false,
}) {
  return (
    <QuoteReviewSection
      title="Review Price"
      onCancel={onCancel}
      onSave={onSave}
      isEditMode={isEditMode}
    >
      <CRow>
        <CCol xs={12}>
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
                    <CTableDataCell>{item.item_name}</CTableDataCell>
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
                  <strong>RM {grandTotal.toFixed(2)}</strong>
                </CTableDataCell>
              </CTableRow>
            </CTableBody>
          </QuoteReviewTable>
        </CCol>
      </CRow>
    </QuoteReviewSection>
  )
}
