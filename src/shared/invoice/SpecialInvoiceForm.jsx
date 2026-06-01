// src/shared/invoice/SpecialInvoiceForm.jsx
import React, { useEffect, useMemo, useState } from 'react'
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
 * Special service invoice form with editable remarks.
 *
 * @param {object} quoteDetails  Full quote payload, including special_items array
 * @param {object} pricing       { sub_total, discount, sst_percent, sst_amount, grand_total, remarks }
 * @param {Function} setPricing  Setter for pricing state
 */
const SpecialInvoiceForm = ({ quoteDetails, pricing, setPricing, mode = 'create' }) => {
  const items = useMemo(
    () => (Array.isArray(pricing.special_items) ? pricing.special_items : []),
    [pricing.special_items],
  )
  const [showAddItemRow, setShowAddItemRow] = useState(false)
  const [newItem, setNewItem] = useState({
    item_description: '',
    description: '',
    quantity: '',
    unit: '',
    unit_price: '',
  })

  useEffect(() => {
    if (!quoteDetails?.special_items) return
    setPricing((prev) => {
      if (Array.isArray(prev.special_items) && prev.special_items.length > 0) {
        return prev
      }
      const mapped = quoteDetails.special_items.map((item) => ({
        id: item.id,
        item_description: item.line_item_title || item.item_description || '',
        description: item.description || '',
        unit: item.unit || 'Lot',
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
      }))
      return { ...prev, special_items: mapped }
    })
  }, [quoteDetails, setPricing])

  // Recalculate summary when items or discount/SST change
  useEffect(() => {
    const itemsTotal = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + qty * price
    }, 0)

    const discountQty = parseFloat(pricing.discount_qty) || 1
    const discountUnitPrice = parseFloat(pricing.discount) || 0
    const discountTotal = discountQty * discountUnitPrice

    const afterDiscount = itemsTotal - discountTotal
    const sstAmt = afterDiscount * ((parseFloat(pricing.sst_percent) || 0) / 100)
    const grandTotal = afterDiscount + sstAmt

    setPricing((prev) => ({
      ...prev,
      sub_total: parseFloat(itemsTotal.toFixed(2)),
      sst_amount: parseFloat(sstAmt.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
    }))
  }, [items, pricing.discount, pricing.discount_qty, pricing.sst_percent, setPricing])

  // Handle changes for both numeric and remarks fields
  const handleChange = (field) => (e) => {
    const value = e.target.value
    if (field === 'remarks' || field === 'discount_unit') {
      setPricing((prev) => ({ ...prev, [field]: value }))
    } else {
      const num = parseFloat(value)
      setPricing((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
    }
  }

  const handleItemChange = (index, field) => (e) => {
    const { value } = e.target
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.special_items) ? [...prev.special_items] : []
      const current = nextItems[index] || {}
      nextItems[index] = { ...current, [field]: value }
      return { ...prev, special_items: nextItems }
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
      const nextItems = Array.isArray(prev.special_items) ? [...prev.special_items] : []
      nextItems.push({
        id: `custom-${Date.now()}`,
        item_description: name,
        description: newItem.description.trim(),
        unit: newItem.unit.trim() || 'Lot',
        quantity: qty,
        unit_price: price,
        is_custom: true,
      })
      return { ...prev, special_items: nextItems }
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
      const nextItems = Array.isArray(prev.special_items) ? [...prev.special_items] : []
      nextItems.splice(index, 1)
      return { ...prev, special_items: nextItems }
    })
  }

  const canAddItem =
    newItem.item_description.trim() !== '' &&
    Number.isFinite(parseFloat(newItem.quantity)) &&
    parseFloat(newItem.quantity) > 0 &&
    Number.isFinite(parseFloat(newItem.unit_price)) &&
    parseFloat(newItem.unit_price) > 0

  const discountQty = parseFloat(pricing.discount_qty) || 1
  const discountUnit = pricing.discount_unit || 'Lot'
  const discountUnitPrice = parseFloat(pricing.discount) || 0
  const discountRowNum = items.length + 1

  return (
    <>
      <CCardHeader>
        <strong>Invoice Breakdown (Special Service)</strong>
      </CCardHeader>
      <CCardBody>
        {/* Line items table */}
        {/* datatable-exempt: existing embedded/layout table */}
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
            {items.map((item, idx) => {
              const qty = parseFloat(item.quantity) || 0
              const price = parseFloat(item.unit_price) || 0
              const rowNum = idx + 1
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
                      value={item.item_description ?? item.line_item_title ?? ''}
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
                  <CTableDataCell className="text-end">
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
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.discount_unit || 'Lot'}
                  onChange={handleChange('discount_unit')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.discount}
                  onChange={handleChange('discount')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {(-Math.abs(discountQty * discountUnitPrice)).toFixed(2)}
              </CTableDataCell>
            </CTableRow>

            <CTableRow>
              <CTableDataCell colSpan={4} />
              <CTableDataCell className="text-end fw-semibold align-middle">
                Subtotal (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {(parseFloat(pricing.sub_total) || 0).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={4} />
              <CTableDataCell className="text-end fw-semibold align-middle">
                <div className="d-flex flex-nowrap justify-content-end align-items-center gap-2">
                  <CFormInput
                    type="number"
                    value={pricing.sst_percent}
                    onChange={handleChange('sst_percent')}
                    style={{ width: '64px', minWidth: '64px' }}
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

        {/* Remarks input */}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Remarks</CFormLabel>
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

export default SpecialInvoiceForm
