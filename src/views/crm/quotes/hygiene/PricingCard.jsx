import React, { useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CTooltip,
} from '@coreui/react'

import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'
import { calculateHygieneTotals } from '../../../../shared/invoice/hygienePricing'

const PricingCard = ({ formData, setFormData }) => {
  const {
    unitPrice = 0,
    travelCharge = 0,
    numWorkUnits = 0,
    sampleCounts = 0,
    discount = 0,
    sstPercent = 0,
  } = formData

  const totals = calculateHygieneTotals({
    sampleCounts,
    numWorkUnits,
    unitPrice,
    travelCharge,
    discount,
    sstPercent,
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      subTotal: totals.subtotalBeforeDiscount.toFixed(2),
      sstAmount: totals.sstAmount.toFixed(2),
      grandTotal: totals.grandTotal.toFixed(2),
    }))
  }, [
    unitPrice,
    travelCharge,
    numWorkUnits,
    sampleCounts,
    discount,
    sstPercent,
    totals.subtotalBeforeDiscount,
    totals.sstAmount,
    totals.grandTotal,
    setFormData,
  ])

  return (
    <CCol>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Pricing Details</strong>
        </CCardHeader>
        <CCardBody>
          <CForm className="g-3">
            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Unit Price (per unit)</CFormLabel>
                <CFormInput
                  name="unitPrice"
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unitPrice: e.target.value }))}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel>Mob & Accom Costs</CFormLabel>
                <CFormInput
                  name="travelCharge"
                  type="number"
                  value={travelCharge}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, travelCharge: e.target.value }))
                  }
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel>Discount</CFormLabel>
                <CFormInput
                  name="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, discount: e.target.value }))}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel>
                  Subtotal
                  <CTooltip
                    content={
                      <>
                        Subtotal = (Samples x Work Units x Unit Price) + Travel. If Work Units is
                        left blank, 1 is assumed. Discount is applied before Grand Total.
                      </>
                    }
                    placement="left"
                  >
                    <span className="ms-2" tabIndex={0} role="button">
                      <CIcon icon={cilInfo} size="sm" />
                    </span>
                  </CTooltip>
                </CFormLabel>
                <CFormInput
                  name="subTotal"
                  type="number"
                  value={totals.subtotalBeforeDiscount.toFixed(2)}
                  readOnly
                  disabled
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel>SST (%)</CFormLabel>
                <CFormInput
                  name="sstPercent"
                  type="number"
                  value={sstPercent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sstPercent: e.target.value }))}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel>SST Amount</CFormLabel>
                <CFormInput
                  name="sstAmount"
                  type="number"
                  value={totals.sstAmount.toFixed(2)}
                  readOnly
                  disabled
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel>Grand Total</CFormLabel>
                <CFormInput
                  name="grandTotal"
                  type="number"
                  value={totals.grandTotal.toFixed(2)}
                  readOnly
                  disabled
                />
              </CCol>
            </CRow>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default PricingCard
