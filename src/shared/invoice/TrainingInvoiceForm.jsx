// src/shared/invoice/TrainingInvoiceForm.jsx
import React, { useEffect, useState } from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CButton,
  CBadge,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'

const TrainingInvoiceForm = ({
  quoteDetails,
  pricing,
  setPricing,
  paymentMethod = '',
  mode = 'create',
}) => {
  const isHrdPayment =
    String(paymentMethod || '')
      .trim()
      .toLowerCase() === 'hrd grant'

  const items = Array.isArray(pricing.training_items) ? pricing.training_items : []
  const [showAddItemRow, setShowAddItemRow] = useState(false)
  const [newItem, setNewItem] = useState({
    item_description: '',
    description: '',
    quantity: '',
    unit: '',
    unit_price: '',
  })

  // Seed from training quote where available
  useEffect(() => {
    if (!quoteDetails) return

    setPricing((prev) => ({
      ...prev,
      training_total: parseFloat(quoteDetails.training_total ?? prev.training_total ?? 0),
      meal_total: parseFloat(quoteDetails.meal_total ?? prev.meal_total ?? 0),
      mobilization_cost: parseFloat(quoteDetails.mobilization_cost ?? prev.mobilization_cost ?? 0),
      discount_amount: parseFloat(quoteDetails.discount_amount ?? prev.discount_amount ?? 0),
      hrd_rate: parseFloat(quoteDetails.hrd_charge ?? prev.hrd_rate ?? 0),
      hrd_amount: parseFloat(quoteDetails.hrd_amount ?? prev.hrd_amount ?? 0),
      subtotal: parseFloat(quoteDetails.subtotal ?? prev.subtotal ?? 0),
      sst_rate: parseFloat(quoteDetails.sst_rate ?? prev.sst_rate ?? 0),
      sst_amount: parseFloat(quoteDetails.sst_amount ?? prev.sst_amount ?? 0),
      grand_total: parseFloat(quoteDetails.grand_total ?? prev.grand_total ?? 0),
      remarks: quoteDetails.remarks ?? prev.remarks ?? '',
    }))
  }, [quoteDetails, setPricing])

  const trainingTotal = parseFloat(pricing.training_total) || 0
  const mealTotal = parseFloat(pricing.meal_total) || 0
  const mobilizationCost = parseFloat(pricing.mobilization_cost) || 0
  const discountQty = parseFloat(pricing.discount_qty) || 0
  const discountUnit = pricing.discount_unit || 'Lot'
  const discountAmountInput = parseFloat(pricing.discount_amount) || 0
  const discountAmount = Math.abs(discountAmountInput)

  const hrdRate = Math.max(0, parseFloat(pricing.hrd_rate) || 0)
  const customTotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const unitPrice = parseFloat(item.unit_price) || 0
    return sum + qty * unitPrice
  }, 0)

  const subtotal =
    trainingTotal + mealTotal + mobilizationCost + customTotal - discountAmount * discountQty
  const hrdBase = Math.max(trainingTotal - discountAmount * discountQty, 0)
  const computedHrdAmount = isHrdPayment ? hrdBase * (hrdRate / 100) : 0
  const sstPercent = parseFloat(pricing.sst_rate) || 0
  const sstAmount = subtotal * (sstPercent / 100)
  const grandTotal = isHrdPayment ? subtotal + sstAmount + computedHrdAmount : subtotal + sstAmount

  // Recompute summary
  useEffect(() => {
    const nextPricing = {
      ...pricing,
      subtotal: parseFloat(subtotal.toFixed(2)),
      sst_amount: parseFloat(sstAmount.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
    }
    if (isHrdPayment) {
      nextPricing.hrd_amount = parseFloat(computedHrdAmount.toFixed(2))
    }
    setPricing((prev) => ({ ...prev, ...nextPricing }))
  }, [
    subtotal,
    sstAmount,
    grandTotal,
    isHrdPayment,
    hrdRate,
    computedHrdAmount,
    pricing,
    setPricing,
  ])

  const handleChange = (field) => (e) => {
    const { value } = e.target
    const nextValue = [
      'training_total',
      'meal_total',
      'mobilization_cost',
      'sst_rate',
      'hrd_rate',
    ].includes(field)
      ? parseFloat(value)
      : value
    setPricing((prev) => ({ ...prev, [field]: Number.isNaN(nextValue) ? 0 : nextValue }))
  }

  const handleDiscountValueChange = (e) => {
    const value = parseFloat(e.target.value)
    setPricing((prev) => ({ ...prev, discount_amount: Number.isNaN(value) ? 0 : Math.abs(value) }))
  }

  const handleDiscountQtyChange = (e) => {
    const value = parseFloat(e.target.value)
    setPricing((prev) => ({ ...prev, discount_qty: Number.isNaN(value) ? 0 : value }))
  }

  const handleDiscountUnitChange = (e) => {
    setPricing((prev) => ({ ...prev, discount_unit: e.target.value }))
  }

  const handleItemChange = (index, field) => (e) => {
    const { value } = e.target
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.training_items) ? [...prev.training_items] : []
      const current = nextItems[index] || {}
      nextItems[index] = { ...current, [field]: value }
      return { ...prev, training_items: nextItems }
    })
  }

  const handleNewItemChange = (field) => (e) => {
    const { value } = e.target
    setNewItem((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddItem = () => {
    const name = newItem.item_description.trim()
    const qty = parseFloat(newItem.quantity)
    const price = parseFloat(newItem.unit_price)
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      return
    }

    setPricing((prev) => {
      const nextItems = Array.isArray(prev.training_items) ? [...prev.training_items] : []
      nextItems.push({
        id: `custom-${Date.now()}`,
        item_description: name,
        description: newItem.description.trim(),
        unit: newItem.unit.trim() || 'Lot',
        quantity: qty,
        unit_price: price,
        is_custom: true,
      })
      return { ...prev, training_items: nextItems }
    })

    setNewItem({
      item_description: '',
      description: '',
      quantity: '',
      unit: '',
      unit_price: '',
    })
  }

  const handleRemoveItem = (index) => () => {
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.training_items) ? [...prev.training_items] : []
      nextItems.splice(index, 1)
      return { ...prev, training_items: nextItems }
    })
  }

  const canAddItem =
    newItem.item_description.trim() !== '' &&
    Number.isFinite(parseFloat(newItem.quantity)) &&
    parseFloat(newItem.quantity) > 0 &&
    Number.isFinite(parseFloat(newItem.unit_price)) &&
    parseFloat(newItem.unit_price) > 0

  const discountTotal = -(discountQty * discountAmount)
  const hrdAmount = isHrdPayment ? computedHrdAmount : 0
  const sstRateWidth = Math.max(String(pricing.sst_rate || '').length, 2)
  const itemRowStart = 4
  const discountRowNum = itemRowStart + items.length
  const hrdRowNum = discountRowNum + 1

  return (
    <>
      <CCardHeader>
        <strong>Invoice Breakdown (Training)</strong>
      </CCardHeader>
      <CCardBody>
        <CTable striped responsive className="mb-3 data-table-compact embedded-data-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell className="text-center" style={{ width: '50px' }}>
                #
              </CTableHeaderCell>
              <CTableHeaderCell>Description</CTableHeaderCell>
              <CTableHeaderCell className="text-center" style={{ width: '90px' }}>
                Qty
              </CTableHeaderCell>
              <CTableHeaderCell className="text-center" style={{ width: '90px' }}>
                Unit
              </CTableHeaderCell>
              <CTableHeaderCell className="text-end" style={{ width: '105px' }}>
                Unit Price (RM)
              </CTableHeaderCell>
              <CTableHeaderCell className="text-end" style={{ width: '120px' }}>
                Line Total (RM)
              </CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow>
              <CTableDataCell className="text-center">1</CTableDataCell>
              <CTableDataCell>Training Fee</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.training_qty ?? 1}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      training_qty: Number.isNaN(parseFloat(e.target.value))
                        ? prev.training_qty
                        : parseFloat(e.target.value),
                    }))
                  }
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.training_unit || 'Lot'}
                  onChange={(e) =>
                    setPricing((prev) => ({ ...prev, training_unit: e.target.value }))
                  }
                />
              </CTableDataCell>
              <CTableDataCell>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.training_total}
                  onChange={handleChange('training_total')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{trainingTotal.toFixed(2)}</CTableDataCell>
            </CTableRow>

            <CTableRow>
              <CTableDataCell className="text-center">2</CTableDataCell>
              <CTableDataCell>Meal Total</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.meal_qty ?? 1}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      meal_qty: Number.isNaN(parseFloat(e.target.value))
                        ? prev.meal_qty
                        : parseFloat(e.target.value),
                    }))
                  }
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.meal_unit || 'Lot'}
                  onChange={(e) => setPricing((prev) => ({ ...prev, meal_unit: e.target.value }))}
                />
              </CTableDataCell>
              <CTableDataCell>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.meal_total}
                  onChange={handleChange('meal_total')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{mealTotal.toFixed(2)}</CTableDataCell>
            </CTableRow>

            <CTableRow>
              <CTableDataCell className="text-center">3</CTableDataCell>
              <CTableDataCell>Mobilization Charge</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.mobilization_qty ?? 1}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      mobilization_qty: Number.isNaN(parseFloat(e.target.value))
                        ? prev.mobilization_qty
                        : parseFloat(e.target.value),
                    }))
                  }
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.mobilization_unit || 'Lot'}
                  onChange={(e) =>
                    setPricing((prev) => ({ ...prev, mobilization_unit: e.target.value }))
                  }
                />
              </CTableDataCell>
              <CTableDataCell>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.mobilization_cost}
                  onChange={handleChange('mobilization_cost')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{mobilizationCost.toFixed(2)}</CTableDataCell>
            </CTableRow>

            {items.map((item, idx) => {
              const itemQty = parseFloat(item.quantity) || 0
              const itemPrice = parseFloat(item.unit_price) || 0
              const rowNum = itemRowStart + idx
              const showRemove = mode === 'edit' || item.is_custom
              return (
                <CTableRow key={item.id || rowNum}>
                  <CTableDataCell className="text-center">
                    {showRemove ? (
                      <div className="d-flex flex-column gap-1">
                        <div className="d-flex align-items-center gap-2">
                          <span>{rowNum}</span>
                          {item.is_custom ? (
                            <CBadge color="info" className="text-dark">
                              New
                            </CBadge>
                          ) : null}
                        </div>
                        <CTooltip content="Remove item" placement="top">
                          <CButton
                            color="danger"
                            variant="link"
                            size="sm"
                            onClick={handleRemoveItem(idx)}
                            className="p-0 text-danger border-0"
                            style={{ textDecoration: 'none' }}
                          >
                            <CIcon icon={cilTrash} size="sm" />
                          </CButton>
                        </CTooltip>
                      </div>
                    ) : (
                      <span>{rowNum}</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="text"
                      value={item.item_description ?? ''}
                      onChange={handleItemChange(idx, 'item_description')}
                      placeholder="Item"
                      className="mb-1"
                    />
                    <CFormInput
                      type="text"
                      value={item.description ?? ''}
                      onChange={handleItemChange(idx, 'description')}
                      placeholder="Description"
                      className="form-control-sm"
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="number"
                      min="0"
                      value={item.quantity ?? ''}
                      onChange={handleItemChange(idx, 'quantity')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="text"
                      value={item.unit ?? ''}
                      onChange={handleItemChange(idx, 'unit')}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price ?? ''}
                      onChange={handleItemChange(idx, 'unit_price')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {(itemQty * itemPrice).toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
              )
            })}

            <CTableRow>
              <CTableDataCell className="text-center">{discountRowNum}</CTableDataCell>
              <CTableDataCell>Discount</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.discount_qty}
                  onChange={handleDiscountQtyChange}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput type="text" value={discountUnit} onChange={handleDiscountUnitChange} />
              </CTableDataCell>
              <CTableDataCell>
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.discount_amount}
                  onChange={handleDiscountValueChange}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{discountTotal.toFixed(2)}</CTableDataCell>
            </CTableRow>

            {isHrdPayment && (
              <CTableRow>
                <CTableDataCell className="text-center">{hrdRowNum}</CTableDataCell>
                <CTableDataCell>HRD Charge ({hrdRate}% of training net)</CTableDataCell>
                <CTableDataCell className="text-center" />
                <CTableDataCell className="text-center" />
                <CTableDataCell className="text-end">{hrdAmount.toFixed(2)}</CTableDataCell>
                <CTableDataCell className="text-end">{hrdAmount.toFixed(2)}</CTableDataCell>
              </CTableRow>
            )}

            <CTableRow>
              <CTableDataCell colSpan={5} className="text-end fw-semibold align-middle text-nowrap">
                Subtotal (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {subtotal.toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-end fw-semibold align-middle text-nowrap">
                <div className="d-flex flex-nowrap justify-content-end align-items-center gap-2">
                  <CFormInput
                    type="number"
                    value={pricing.sst_rate}
                    onChange={handleChange('sst_rate')}
                    style={{ width: `${sstRateWidth}ch`, minWidth: '64px' }}
                  />
                  <span className="text-nowrap">SST Rate (%)</span>
                </div>
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {sstAmount.toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-end fw-bold align-middle text-nowrap">
                Grand Total (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle fw-bold">
                {grandTotal.toFixed(2)}
              </CTableDataCell>
            </CTableRow>
          </CTableBody>
        </CTable>

        <div className="mb-3 d-flex justify-content-start">
          <CButton
            color={showAddItemRow ? 'secondary' : 'primary'}
            size="sm"
            variant={showAddItemRow ? 'outline' : undefined}
            onClick={() => setShowAddItemRow((prev) => !prev)}
          >
            {showAddItemRow ? 'Cancel Add Item' : 'Add New Item'}
          </CButton>
        </div>

        {showAddItemRow && (
          <CRow className="mb-4 g-2 align-items-end">
            <CCol md={3}>
              <CFormLabel>Item</CFormLabel>
              <CFormInput
                type="text"
                value={newItem.item_description}
                onChange={handleNewItemChange('item_description')}
                placeholder="Item name"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Description</CFormLabel>
              <CFormInput
                type="text"
                value={newItem.description}
                onChange={handleNewItemChange('description')}
                placeholder="Description"
              />
            </CCol>
            <CCol md={1}>
              <CFormLabel>Qty</CFormLabel>
              <CFormInput
                type="number"
                min="0"
                value={newItem.quantity}
                onChange={handleNewItemChange('quantity')}
              />
            </CCol>
            <CCol md={1}>
              <CFormLabel>Unit</CFormLabel>
              <CFormInput
                type="text"
                value={newItem.unit}
                onChange={handleNewItemChange('unit')}
                placeholder="Unit"
              />
            </CCol>
            <CCol md={2}>
              <CFormLabel>Unit Price (RM)</CFormLabel>
              <CFormInput
                type="number"
                min="0"
                step="0.01"
                value={newItem.unit_price}
                onChange={handleNewItemChange('unit_price')}
              />
            </CCol>
            <CCol md={1} className="d-flex align-items-end">
              <CButton
                color="primary"
                size="sm"
                className="w-100"
                onClick={handleAddItem}
                disabled={!canAddItem}
              >
                Add
              </CButton>
            </CCol>
          </CRow>
        )}

        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Remarks</CFormLabel>
            <CFormInput
              type="text"
              value={pricing.remarks || ''}
              onChange={handleChange('remarks')}
              placeholder="Leave any remarks for this invoice"
            />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default TrainingInvoiceForm
