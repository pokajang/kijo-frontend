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
import { normalizeTrainingHrdCharge } from '../../views/crm/quotes/training/trainingHrd'

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback
  const number = parseFloat(value)
  return Number.isFinite(number) ? number : fallback
}

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
      training_total: toNumber(quoteDetails.training_total, toNumber(prev.training_total)),
      meal_total: toNumber(quoteDetails.meal_total, toNumber(prev.meal_total)),
      mobilization_cost: toNumber(quoteDetails.mobilization_cost, toNumber(prev.mobilization_cost)),
      discount_amount: toNumber(quoteDetails.discount_amount, toNumber(prev.discount_amount)),
      hrd_rate: normalizeTrainingHrdCharge(
        quoteDetails.payment_method ?? paymentMethod,
        quoteDetails.hrd_charge ?? prev.hrd_rate ?? 0,
      ),
      hrd_amount: toNumber(quoteDetails.hrd_amount, toNumber(prev.hrd_amount)),
      hrd_amount_manual: prev.hrd_amount_manual ?? false,
      hrd_qty: toNumber(prev.hrd_qty, 1) || 1,
      hrd_unit: prev.hrd_unit || 'Lot',
      subtotal: toNumber(quoteDetails.subtotal, toNumber(prev.subtotal)),
      sst_rate: toNumber(quoteDetails.sst_rate, toNumber(prev.sst_rate)),
      sst_amount: toNumber(quoteDetails.sst_amount, toNumber(prev.sst_amount)),
      grand_total: toNumber(quoteDetails.grand_total, toNumber(prev.grand_total)),
      remarks: quoteDetails.remarks ?? prev.remarks ?? '',
    }))
  }, [paymentMethod, quoteDetails, setPricing])

  useEffect(() => {
    if (!isHrdPayment) return

    setPricing((prev) => {
      const nextHrdRate = normalizeTrainingHrdCharge(paymentMethod, prev.hrd_rate)
      return nextHrdRate === prev.hrd_rate ? prev : { ...prev, hrd_rate: nextHrdRate }
    })
  }, [isHrdPayment, paymentMethod, setPricing])

  const trainingQty = toNumber(pricing.training_qty, 1)
  const trainingUnitPrice = toNumber(pricing.training_total)
  const trainingLineTotal = trainingQty * trainingUnitPrice
  const mealQty = toNumber(pricing.meal_qty, 1)
  const mealUnitPrice = toNumber(pricing.meal_total)
  const mealLineTotal = mealQty * mealUnitPrice
  const mobilizationQty = toNumber(pricing.mobilization_qty, 1)
  const mobilizationUnitPrice = toNumber(pricing.mobilization_cost)
  const mobilizationLineTotal = mobilizationQty * mobilizationUnitPrice
  const discountQty = toNumber(pricing.discount_qty)
  const discountUnit = pricing.discount_unit || 'Lot'
  const discountAmountInput = toNumber(pricing.discount_amount)
  const discountAmount = Math.abs(discountAmountInput)

  const hrdRate = Math.max(0, toNumber(pricing.hrd_rate))
  const hrdQty = Math.max(0, toNumber(pricing.hrd_qty, 1))
  const hrdUnit = pricing.hrd_unit || 'Lot'
  const customTotal = items.reduce((sum, item) => {
    const qty = toNumber(item.quantity)
    const unitPrice = toNumber(item.unit_price)
    return sum + qty * unitPrice
  }, 0)

  const subtotal =
    trainingLineTotal +
    mealLineTotal +
    mobilizationLineTotal +
    customTotal -
    discountAmount * discountQty
  const hrdBase = Math.max(trainingLineTotal - discountAmount * discountQty, 0)
  const computedHrdAmount = isHrdPayment ? hrdBase * (hrdRate / 100) : 0
  const hrdAmountInput = toNumber(pricing.hrd_amount, NaN)
  const hrdAmount =
    isHrdPayment && Number.isFinite(hrdAmountInput) && hrdAmountInput > 0
      ? hrdAmountInput
      : computedHrdAmount
  const hrdLineTotal = hrdQty * hrdAmount
  const sstPercent = toNumber(pricing.sst_rate)
  const sstAmount = subtotal * (sstPercent / 100)
  const grandTotal = isHrdPayment ? subtotal + sstAmount + hrdLineTotal : subtotal + sstAmount

  // Recompute summary
  useEffect(() => {
    setPricing((prev) => {
      const next = {
        subtotal: toNumber(subtotal.toFixed(2)),
        sst_amount: toNumber(sstAmount.toFixed(2)),
        grand_total: toNumber(grandTotal.toFixed(2)),
      }

      const shouldAutofillHrdAmount =
        isHrdPayment && !prev.hrd_amount_manual && toNumber(prev.hrd_amount) <= 0 && hrdAmount > 0
      if (shouldAutofillHrdAmount) {
        next.hrd_amount = toNumber(hrdAmount.toFixed(2))
      }

      const unchanged = Object.entries(next).every(([key, value]) => prev[key] === value)
      return unchanged ? prev : { ...prev, ...next }
    })
  }, [subtotal, sstAmount, grandTotal, isHrdPayment, hrdAmount, setPricing])

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
              <CTableDataCell className="text-end">{trainingLineTotal.toFixed(2)}</CTableDataCell>
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
              <CTableDataCell className="text-end">{mealLineTotal.toFixed(2)}</CTableDataCell>
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
              <CTableDataCell className="text-end">
                {mobilizationLineTotal.toFixed(2)}
              </CTableDataCell>
            </CTableRow>

            {items.map((item, idx) => {
              const itemQty = toNumber(item.quantity)
              const itemPrice = toNumber(item.unit_price)
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
                <CTableDataCell className="text-center">
                  <CFormInput
                    type="number"
                    min="0"
                    value={pricing.hrd_qty ?? 1}
                    onChange={(e) =>
                      setPricing((prev) => ({
                        ...prev,
                        hrd_qty: Number.isNaN(parseFloat(e.target.value))
                          ? prev.hrd_qty
                          : parseFloat(e.target.value),
                      }))
                    }
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <CFormInput
                    type="text"
                    value={hrdUnit}
                    onChange={(e) => setPricing((prev) => ({ ...prev, hrd_unit: e.target.value }))}
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <CFormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricing.hrd_amount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      setPricing((prev) => ({
                        ...prev,
                        hrd_amount_manual: true,
                        hrd_amount: Number.isNaN(value) ? 0 : Math.abs(value),
                      }))
                    }}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-end">{hrdLineTotal.toFixed(2)}</CTableDataCell>
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
