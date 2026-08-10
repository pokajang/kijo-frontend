// src/views/crm/quotes/equipment/PricingInput.jsx

import React from 'react'
import {
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import '../shared/TrafficLightCard.css'
import { compactCatalogDescription } from '../../../../utils/catalogDescription'

export default function PricingInput({
  selectedItems,
  quantities,
  handleQtyChange,
  unitPrices,
  markedUp,
  handleMarkedUpChange,
  itemRemarks = {},
  handleItemRemarksChange = () => {},
  deliveryCharge,
  setDeliveryCharge,
  miscCharge,
  setMiscCharge,
  discount,
  setDiscount,
  sstPercent,
  setSstPercent,
  itemsTotal,
  subtotal,
  sstAmount,
  grandTotal,
  trafficLightStatus = 'unknown',
}) {
  const statusClass = `traffic-light-status-card traffic-light-status-card--${trafficLightStatus}`
  const hasStatus = trafficLightStatus !== 'unknown'
  return (
    <>
      {/* 2) Pricing Details */}
      <CCardHeader className={hasStatus ? statusClass : ''}>
        <strong>Pricing Details</strong>
      </CCardHeader>
      <CCardBody className={hasStatus ? statusClass : ''}>
        {selectedItems.map(({ value: item }) => {
          const description = compactCatalogDescription(item.description)
          const itemName = item.item_name || item.itemName || 'Selected item'
          const quantityId = `equipmentQuantity-${item.id}`
          const markedUpPriceId = `equipmentMarkedUpPrice-${item.id}`
          const lineTotalId = `equipmentLineTotal-${item.id}`

          return (
            <CRow key={item.id || item.item_id || itemName} className="align-items-center g-3 mb-3">
              <CCol md={6}>
                <small className="text-muted">Category: {item.category_id || '-'}</small>
                <br />
                <strong>{itemName}</strong>
                {description && (
                  <small className="text-muted d-block">
                    <strong>Description:</strong> {description}
                  </small>
                )}
                <small>
                  <strong>
                    <i>Notes:</i>
                  </strong>{' '}
                  {item.supplier_name || '-'} Price ({item.price_date || '-'}) - RM{' '}
                  {item.supplier_price || 0}/{item.unit || 'N/A'}
                </small>
                <div className="mt-2">
                  <CFormLabel htmlFor={`equipmentItemRemarks-${item.id}`}>
                    Client Specifications / Remarks <span className="text-muted">(optional)</span>
                  </CFormLabel>
                  <CFormTextarea
                    id={`equipmentItemRemarks-${item.id}`}
                    rows={2}
                    maxLength={2000}
                    value={itemRemarks[item.id] || ''}
                    onChange={(event) => handleItemRemarksChange(item.id, event.target.value)}
                    placeholder="e.g. Size: XL; Colour: navy blue"
                  />
                </div>
              </CCol>

              <CCol md={2}>
                <CFormLabel htmlFor={quantityId}>Quantity</CFormLabel>
                <CFormInput
                  id={quantityId}
                  type="number"
                  min="0"
                  value={quantities[item.id] || 0}
                  onChange={(e) => handleQtyChange(item.id, e.target.value)}
                />
              </CCol>

              <CCol md={2}>
                <CFormLabel htmlFor={markedUpPriceId}>Marked Up Price (RM)</CFormLabel>
                <CFormInput
                  id={markedUpPriceId}
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    markedUp[item.id] != null
                      ? markedUp[item.id]
                      : ((unitPrices[item.id] || 0) * 1.5).toFixed(2)
                  }
                  onChange={(e) => handleMarkedUpChange(item.id, e.target.value)}
                />
              </CCol>

              <CCol md={2}>
                <CFormLabel htmlFor={lineTotalId}>Line Total (RM)</CFormLabel>
                <CFormInput
                  id={lineTotalId}
                  type="number"
                  readOnly
                  value={(
                    (quantities[item.id] || 0) *
                    (markedUp[item.id] != null
                      ? markedUp[item.id]
                      : (unitPrices[item.id] || 0) * 1.5)
                  ).toFixed(2)}
                />
              </CCol>
            </CRow>
          )
        })}

        {/* Summary Charges */}
        <CRow className="align-items-end g-3 mt-4">
          <CCol md={2}>
            <CFormLabel htmlFor="equipmentItemsTotal">Items Total (RM)</CFormLabel>
            <CFormInput id="equipmentItemsTotal" readOnly value={itemsTotal.toFixed(2)} />
          </CCol>

          <CCol md={2}>
            <CFormLabel htmlFor="equipmentDeliveryCharge">Delivery Charge (RM)</CFormLabel>
            <CFormInput
              id="equipmentDeliveryCharge"
              type="number"
              step="0.01"
              min="0"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
            />
          </CCol>

          <CCol md={2}>
            <CFormLabel htmlFor="equipmentMiscCharge">Miscellaneous Charge (RM)</CFormLabel>
            <CFormInput
              id="equipmentMiscCharge"
              type="number"
              step="0.01"
              min="0"
              value={miscCharge}
              onChange={(e) => setMiscCharge(parseFloat(e.target.value) || 0)}
            />
          </CCol>

          <CCol md={2}>
            <CFormLabel htmlFor="equipmentDiscount">Discount (RM)</CFormLabel>
            <CFormInput
              id="equipmentDiscount"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            />
          </CCol>

          <CCol md={2}>
            <CFormLabel htmlFor="equipmentSstPercent">SST (%)</CFormLabel>
            <CFormInput
              id="equipmentSstPercent"
              type="number"
              step="0.01"
              min="0"
              value={sstPercent}
              onChange={(e) => setSstPercent(parseFloat(e.target.value) || 0)}
            />
          </CCol>

          <CCol md={2}>
            <CFormLabel htmlFor="equipmentSstAmount">SST Amount (RM)</CFormLabel>
            <CFormInput id="equipmentSstAmount" readOnly value={sstAmount.toFixed(2)} />
          </CCol>

          <CCol md={2}>
            <CFormLabel htmlFor="equipmentSubtotal">Subtotal (RM)</CFormLabel>
            <CFormInput id="equipmentSubtotal" readOnly value={subtotal.toFixed(2)} />
          </CCol>

          <CCol md={2}>
            <CFormLabel htmlFor="equipmentGrandTotal">Grand Total (RM)</CFormLabel>
            <CFormInput id="equipmentGrandTotal" readOnly value={grandTotal.toFixed(2)} />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}
