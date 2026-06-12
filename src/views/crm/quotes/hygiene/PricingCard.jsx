import React, { useEffect, useMemo, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
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
  const hygieneItems = useMemo(
    () => (Array.isArray(formData.hygieneItems) ? formData.hygieneItems : []),
    [formData.hygieneItems],
  )
  const [newItem, setNewItem] = useState({
    item_description: '',
    description: '',
    quantity: 1,
    unit: 'Lot',
    unit_price: '',
  })

  const totals = calculateHygieneTotals({
    sampleCounts,
    numWorkUnits,
    unitPrice,
    travelCharge,
    customItems: hygieneItems,
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
    hygieneItems,
    numWorkUnits,
    sampleCounts,
    discount,
    sstPercent,
    totals.subtotalBeforeDiscount,
    totals.sstAmount,
    totals.grandTotal,
    setFormData,
  ])

  const handleItemChange = (index, field) => (event) => {
    const { value } = event.target
    setFormData((prev) => {
      const nextItems = Array.isArray(prev.hygieneItems) ? [...prev.hygieneItems] : []
      const current = nextItems[index] || {}
      nextItems[index] = { ...current, [field]: value }
      return { ...prev, hygieneItems: nextItems }
    })
  }

  const handleRemoveItem = (index) => () => {
    setFormData((prev) => {
      const nextItems = Array.isArray(prev.hygieneItems) ? [...prev.hygieneItems] : []
      nextItems.splice(index, 1)
      return { ...prev, hygieneItems: nextItems }
    })
  }

  const canAddItem =
    String(newItem.item_description || '').trim() !== '' &&
    Number(newItem.quantity) > 0 &&
    Number(newItem.unit_price) > 0

  const handleAddItem = () => {
    if (!canAddItem) return

    setFormData((prev) => ({
      ...prev,
      hygieneItems: [
        ...(Array.isArray(prev.hygieneItems) ? prev.hygieneItems : []),
        {
          id: `additional-${Date.now()}`,
          item_description: newItem.item_description.trim(),
          description: newItem.description.trim(),
          quantity: Number(newItem.quantity) || 0,
          unit: newItem.unit.trim() || 'Lot',
          unit_price: Number(newItem.unit_price) || 0,
        },
      ],
    }))
    setNewItem({
      item_description: '',
      description: '',
      quantity: 1,
      unit: 'Lot',
      unit_price: '',
    })
  }

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

            <div className="mt-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <strong>Additional Fees</strong>
              </div>

              {/* datatable-exempt: existing embedded/layout table */}
              <CTable responsive striped className="data-table-compact embedded-data-table">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '48px' }}>#</CTableHeaderCell>
                    <CTableHeaderCell>Item</CTableHeaderCell>
                    <CTableHeaderCell>Notes</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '96px' }}>Qty</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '96px' }}>Unit</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '140px' }}>Unit Price</CTableHeaderCell>
                    <CTableHeaderCell className="text-end" style={{ width: '120px' }}>
                      Total
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '90px' }}>Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {hygieneItems.map((item, index) => {
                    const quantity = Number(item.quantity) || 0
                    const unitPrice = Number(item.unit_price) || 0
                    return (
                      <CTableRow key={item.id || index}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={item.item_description || ''}
                            onChange={handleItemChange(index, 'item_description')}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormTextarea
                            rows={1}
                            value={item.description || ''}
                            onChange={handleItemChange(index, 'description')}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            type="number"
                            min="0"
                            value={item.quantity ?? ''}
                            onChange={handleItemChange(index, 'quantity')}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            value={item.unit || ''}
                            onChange={handleItemChange(index, 'unit')}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price ?? ''}
                            onChange={handleItemChange(index, 'unit_price')}
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {(quantity * unitPrice).toFixed(2)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="danger"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveItem(index)}
                          >
                            Remove
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                  <CTableRow>
                    <CTableDataCell>New</CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        value={newItem.item_description}
                        onChange={(event) =>
                          setNewItem((prev) => ({
                            ...prev,
                            item_description: event.target.value,
                          }))
                        }
                        placeholder="Blank sample"
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormTextarea
                        rows={1}
                        value={newItem.description}
                        onChange={(event) =>
                          setNewItem((prev) => ({ ...prev, description: event.target.value }))
                        }
                        placeholder="Optional notes"
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        type="number"
                        min="0"
                        value={newItem.quantity}
                        onChange={(event) =>
                          setNewItem((prev) => ({ ...prev, quantity: event.target.value }))
                        }
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        value={newItem.unit}
                        onChange={(event) =>
                          setNewItem((prev) => ({ ...prev, unit: event.target.value }))
                        }
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unit_price}
                        onChange={(event) =>
                          setNewItem((prev) => ({ ...prev, unit_price: event.target.value }))
                        }
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {(
                        (Number(newItem.quantity) || 0) * (Number(newItem.unit_price) || 0)
                      ).toFixed(2)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        color="primary"
                        size="sm"
                        disabled={!canAddItem}
                        onClick={handleAddItem}
                      >
                        Add
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default PricingCard
