// src/views/project/InvoiceProjectModal/TrainingInvoiceForm.jsx
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
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CBadge,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'

/**
 * Training invoice form with editable remarks.
 *
 * Props:
 * - pricing: { training_total, training_qty, training_unit, meal_total, meal_qty, meal_unit,
 *     mobilization_cost, mobilization_qty, mobilization_unit, discount_amount, discount_qty,
 *     discount_unit, subtotal, sst_rate, sst_amount, grand_total, remarks }
 * - setPricing: setter for pricing state
 */
const TrainingInvoiceForm = ({ pricing, setPricing, mode = 'create' }) => {
  const items = Array.isArray(pricing.training_items) ? pricing.training_items : []
  const itemRowStart = 4
  const sstRateWidthCh = 6
  const discountRowNum = itemRowStart + items.length
  const unitPriceStyle = { maxWidth: '140px' }
  const trainingQty = parseFloat(pricing.training_qty) || 0
  const mealQty = parseFloat(pricing.meal_qty) || 0
  const mobilizationQty = parseFloat(pricing.mobilization_qty) || 0
  const discountQty = parseFloat(pricing.discount_qty) || 0
  const [showAddItemRow, setShowAddItemRow] = useState(false)
  const [newItem, setNewItem] = useState({
    item_description: '',
    description: '',
    quantity: '',
    unit: '',
    unit_price: '',
  })

  const extraItemsTotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + qty * price
  }, 0)

  // 1) Recalculate derived fields whenever inputs change
  useEffect(() => {
    const tt = parseFloat(pricing.training_total) || 0
    const mt = parseFloat(pricing.meal_total) || 0
    const mob = parseFloat(pricing.mobilization_cost) || 0
    const disc = parseFloat(pricing.discount_amount) || 0
    const sstRt = parseFloat(pricing.sst_rate) || 0
    const lineTraining = trainingQty * tt
    const lineMeal = mealQty * mt
    const lineMobilization = mobilizationQty * mob
    const discountTotal = Math.abs(discountQty * disc)

    const subtotal = lineTraining + lineMeal + lineMobilization + extraItemsTotal - discountTotal
    const sst_amount = subtotal * (sstRt / 100)
    const grand_total = subtotal + sst_amount

    setPricing((prev) => ({
      ...prev,
      subtotal: parseFloat(subtotal.toFixed(2)),
      sst_amount: parseFloat(sst_amount.toFixed(2)),
      grand_total: parseFloat(grand_total.toFixed(2)),
    }))
  }, [
    pricing.training_total,
    pricing.training_qty,
    pricing.meal_total,
    pricing.meal_qty,
    pricing.mobilization_cost,
    pricing.mobilization_qty,
    pricing.discount_amount,
    pricing.discount_qty,
    pricing.sst_rate,
    pricing.subtotal,
    trainingQty,
    mealQty,
    mobilizationQty,
    discountQty,
    extraItemsTotal,
    setPricing,
  ])

  // 2) Handler for numeric and text inputs
  const handleChange = (field) => (e) => {
    const { value } = e.target
    if (field === 'remarks') {
      setPricing((prev) => ({ ...prev, remarks: value }))
    } else {
      const num = parseFloat(value)
      setPricing((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
    }
  }

  const handleTextChange = (field) => (e) => {
    const { value } = e.target
    setPricing((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index, field) => (e) => {
    const { value } = e.target
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.training_items) ? [...prev.training_items] : []
      const current = nextItems[index] || {}
      nextItems[index] = {
        ...current,
        [field]: value,
      }
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

  return (
    <>
      <CCardHeader>
        <strong>Invoice Breakdown</strong>
      </CCardHeader>
      <CCardBody>
        {/* datatable-exempt: existing embedded/layout table */}
        <CTable striped responsive className="mb-3 data-table-compact embedded-data-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell className="text-center" style={{ width: '60px' }}>
                #
              </CTableHeaderCell>
              <CTableHeaderCell>Description</CTableHeaderCell>
              <CTableHeaderCell className="text-center" style={{ width: '130px' }}>
                Qty
              </CTableHeaderCell>
              <CTableHeaderCell className="text-center" style={{ width: '130px' }}>
                Unit
              </CTableHeaderCell>
              <CTableHeaderCell className="text-end" style={{ width: '180px' }}>
                Unit Price (RM)
              </CTableHeaderCell>
              <CTableHeaderCell className="text-end" style={{ width: '180px' }}>
                Line Total (RM)
              </CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow>
              <CTableDataCell className="text-center">1</CTableDataCell>
              <CTableDataCell>Training Total (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.training_qty ?? ''}
                  onChange={handleChange('training_qty')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.training_unit ?? ''}
                  onChange={handleTextChange('training_unit')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  name="training_total"
                  value={pricing.training_total}
                  onChange={handleChange('training_total')}
                  style={unitPriceStyle}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {(trainingQty * (parseFloat(pricing.training_total) || 0)).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell className="text-center">2</CTableDataCell>
              <CTableDataCell>Meal Total (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.meal_qty ?? ''}
                  onChange={handleChange('meal_qty')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.meal_unit ?? ''}
                  onChange={handleTextChange('meal_unit')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  name="meal_total"
                  value={pricing.meal_total}
                  onChange={handleChange('meal_total')}
                  style={unitPriceStyle}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {(mealQty * (parseFloat(pricing.meal_total) || 0)).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell className="text-center">3</CTableDataCell>
              <CTableDataCell>Mobilization Cost (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.mobilization_qty ?? ''}
                  onChange={handleChange('mobilization_qty')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.mobilization_unit ?? ''}
                  onChange={handleTextChange('mobilization_unit')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  name="mobilization_cost"
                  value={pricing.mobilization_cost}
                  onChange={handleChange('mobilization_cost')}
                  style={unitPriceStyle}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {(mobilizationQty * (parseFloat(pricing.mobilization_cost) || 0)).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            {items.map((item, idx) => {
              const qty = parseFloat(item.quantity) || 0
              const price = parseFloat(item.unit_price) || 0
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
                      style={{ maxWidth: '90px' }}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CFormInput
                      type="text"
                      value={item.unit ?? ''}
                      onChange={handleItemChange(idx, 'unit')}
                      style={{ maxWidth: '90px' }}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price ?? ''}
                      onChange={handleItemChange(idx, 'unit_price')}
                      style={unitPriceStyle}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{(qty * price).toFixed(2)}</CTableDataCell>
                </CTableRow>
              )
            })}
            <CTableRow>
              <CTableDataCell className="text-center">{discountRowNum}</CTableDataCell>
              <CTableDataCell>Discount (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.discount_qty ?? 1}
                  onChange={handleChange('discount_qty')}
                  style={{ maxWidth: '90px' }}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.discount_unit ?? 'Lot'}
                  onChange={handleTextChange('discount_unit')}
                  style={{ maxWidth: '90px' }}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.discount_amount ?? ''}
                  onChange={handleChange('discount_amount')}
                  style={unitPriceStyle}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {(-Math.abs(discountQty * (parseFloat(pricing.discount_amount) || 0))).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={4} />
              <CTableDataCell className="text-end fw-semibold align-middle">
                Subtotal (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {(parseFloat(pricing.subtotal) || 0).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={4} />
              <CTableDataCell className="text-end fw-semibold align-middle">
                <div className="d-flex flex-nowrap justify-content-end align-items-center gap-2">
                  <CFormInput
                    type="number"
                    name="sst_rate"
                    value={pricing.sst_rate}
                    onChange={handleChange('sst_rate')}
                    style={{ width: `${sstRateWidthCh}ch`, minWidth: '64px' }}
                  />
                  <span className="text-nowrap">SST Rate (%)</span>
                </div>
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {(parseFloat(pricing.sst_amount) || 0).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={4} />
              <CTableDataCell className="text-end fw-bold align-middle">
                Grand Total (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle fw-bold">
                {(parseFloat(pricing.grand_total) || 0).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
          </CTableBody>
        </CTable>

        <div className="mb-3 d-flex justify-content-start">
          <CButton
            color="primary"
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
                style={unitPriceStyle}
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

        {/* Remarks input */}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Invoice Remarks (if any)</CFormLabel>
            <CFormInput
              type="text"
              name="remarks"
              placeholder="Leave any remarks for this invoice"
              value={pricing.remarks || ''}
              onChange={handleChange('remarks')}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default TrainingInvoiceForm
