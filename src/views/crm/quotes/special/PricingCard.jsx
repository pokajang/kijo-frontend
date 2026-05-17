// src/views/crm/quotes/special/PricingCard.jsx

import React, { useEffect } from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CFormLabel, CFormInput } from '@coreui/react'

export default function PricingCard({ formData, setFormData }) {
  // Update quantity or unitPrice for a given line
  const handleLineChange = (idx, field, value) => {
    const parsed = parseFloat(value)
    setFormData((prev) => {
      const items = prev.lineItems.map((it, i) => {
        if (i !== idx) return it

        // Always store numbers
        const quantity = field === 'quantity' ? (isNaN(parsed) ? 0 : parsed) : it.quantity || 0
        const unitPrice = field === 'unitPrice' ? (isNaN(parsed) ? 0 : parsed) : it.unitPrice || 0

        const amount = parseFloat((quantity * unitPrice).toFixed(2))

        return { ...it, quantity, unitPrice, amount }
      })

      return { ...prev, lineItems: items }
    })
  }

  // Update SST % field
  const handleSstChange = (e) => {
    const val = parseFloat(e.target.value)
    setFormData((prev) => ({
      ...prev,
      sstPercent: isNaN(val) ? 0 : val,
    }))
  }

  const handleDiscountChange = (e) => {
    const val = parseFloat(e.target.value)
    setFormData((prev) => ({
      ...prev,
      discount: isNaN(val) ? 0 : val,
    }))
  }

  // Recalculate subtotal and SST amount whenever line items, discount, or SST % changes
  useEffect(() => {
    const grossSubtotal = (formData.lineItems || []).reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    )
    const subtotal = Math.max(0, grossSubtotal - (Number(formData.discount) || 0))
    const sstAmt = parseFloat(((subtotal * (formData.sstPercent || 0)) / 100).toFixed(2))

    setFormData((prev) => ({
      ...prev,
      subTotal: parseFloat(subtotal.toFixed(2)),
      sstAmount: sstAmt,
    }))
  }, [formData.lineItems, formData.discount, formData.sstPercent, setFormData])

  // Compute grand total for display
  const grandTotal = parseFloat(((formData.subTotal || 0) + (formData.sstAmount || 0)).toFixed(2))

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Pricing Details</strong>
        </CCardHeader>
        <CCardBody>
          {/* Header Row */}
          <CRow className="fw-bold align-items-center g-3 mb-2">
            <CCol md={6}>Service Item</CCol>
            <CCol md={2}>Qty</CCol>
            <CCol md={2}>Unit Price (RM)</CCol>
            <CCol md={2}>Amount (RM)</CCol>
          </CRow>

          {/* Line Items */}
          {(formData.lineItems || []).map((item, idx) => (
            <CRow className="align-items-center g-3 mb-2" key={idx}>
              <CCol md={6}>
                <div>
                  <strong>{item.title}</strong>
                </div>
                <div className="text-muted">{item.description}</div>
                <div className="fst-italic">Unit: {item.unit}</div>
              </CCol>

              <CCol md={2}>
                <CFormInput
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                />
              </CCol>

              <CCol md={2}>
                <CFormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                />
              </CCol>

              <CCol md={2}>
                <CFormInput type="number" readOnly value={item.amount} />
              </CCol>
            </CRow>
          ))}

          {/* Summary Row */}
          <CRow className="fw-bold align-items-center g-3 mt-4">
            <CCol md={4}>
              <CFormLabel>Line Items Subtotal</CFormLabel>
              <div>
                RM {(formData.lineItems || []).reduce((sum, item) => sum + (item.amount || 0), 0)}
              </div>
            </CCol>

            <CCol md={2}>
              <CFormLabel>Discount (RM)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                min="0"
                value={formData.discount}
                onChange={handleDiscountChange}
              />
            </CCol>

            <CCol md={2}>
              <CFormLabel>SST (%)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                min="0"
                value={formData.sstPercent}
                onChange={handleSstChange}
                placeholder="e.g. 6.00"
              />
            </CCol>

            <CCol md={2}>
              <CFormLabel>SST Amount (RM)</CFormLabel>
              <CFormInput type="number" readOnly value={formData.sstAmount} />
            </CCol>

            <CCol md={2}>
              <CFormLabel>Total (RM)</CFormLabel>
              <div>RM {grandTotal}</div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </CCol>
  )
}
