import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'

export default function LineItemsPricing({
  lineItems,
  subtotal,
  sstPercent,
  sstAmount,
  grandTotal,
}) {
  return (
    <>
      <CCardHeader>
        <strong>Line Items & Pricing Details</strong>
      </CCardHeader>
      <CCardBody>
        {lineItems.length > 0 ? (
          /* datatable-exempt: existing embedded/layout table */
          <CTable hover responsive className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>#</CTableHeaderCell>
                <CTableHeaderCell>Title</CTableHeaderCell>
                <CTableHeaderCell>Description</CTableHeaderCell>
                <CTableHeaderCell>Unit</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Quantity</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Unit Price (RM)</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Line Total (RM)</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {lineItems.map((item, idx) => (
                <CTableRow key={item.id ?? idx}>
                  <CTableDataCell>{idx + 1}</CTableDataCell>
                  <CTableDataCell>{item.title}</CTableDataCell>
                  <CTableDataCell>{item.description}</CTableDataCell>
                  <CTableDataCell>{item.unit}</CTableDataCell>
                  <CTableDataCell className="text-center">{item.quantity}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {Number(item.unitPrice).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {Number(item.lineTotal).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                </CTableRow>
              ))}

              {/* summary rows */}
              <CTableRow>
                <CTableDataCell colSpan={6} className="fw-bold text-end">
                  Subtotal
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  RM {Number(subtotal).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </CTableDataCell>
              </CTableRow>
              <CTableRow>
                <CTableDataCell colSpan={6} className="fw-bold text-end">
                  SST ({sstPercent}%)
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  RM {Number(sstAmount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </CTableDataCell>
              </CTableRow>
              <CTableRow>
                <CTableDataCell colSpan={6} className="fw-bold text-success text-end">
                  Grand Total
                </CTableDataCell>
                <CTableDataCell className="text-end fw-bold text-success">
                  RM {Number(grandTotal).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </CTableDataCell>
              </CTableRow>
            </CTableBody>
          </CTable>
        ) : (
          <p className="text-center">No line items.</p>
        )}
      </CCardBody>
    </>
  )
}
