// src/shared/invoice/EquipmentInvoiceForm.jsx
import React, { useEffect, useState } from 'react'
import {
  CCardHeader,
  CCardBody,
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
  CBadge,
  CButton,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import {
  getEquipmentInvoiceUnitPrice,
  getEquipmentInvoiceUnitPriceValue,
  normalizeEquipmentInvoiceItem,
} from './equipmentInvoiceUtils'

/**
 * Equipment Supply invoice form with editable remarks.
 *
 * Props:
 * - quoteDetails: { equipment_items: [...] }
 * - pricing: { sub_total, discount, delivery_charge, misc_charge, sst_percent, sst_amount, grand_total, remarks }
 * - setPricing: setter for pricing state
 */
const EquipmentInvoiceForm = ({ quoteDetails, pricing, setPricing, mode = 'create' }) => {
  const items = pricing.equipment_items ?? quoteDetails?.equipment_items ?? []
  const [showAddItemRow, setShowAddItemRow] = useState(false)
  const [newItem, setNewItem] = useState({
    item_name: '',
    description: '',
    item_remarks: '',
    quantity: '',
    unit: '',
    marked_up_price: '',
  })

  useEffect(() => {
    if (!quoteDetails?.equipment_items) return
    const normalizedItems = quoteDetails.equipment_items.map(normalizeEquipmentInvoiceItem)
    setPricing((prev) => ({
      ...prev,
      equipment_items: normalizedItems,
      quotation_remarks: prev.quotation_remarks || quoteDetails.quotation_remarks || '',
    }))
  }, [quoteDetails, setPricing])

  const itemsTotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = getEquipmentInvoiceUnitPrice(item)
    return sum + qty * price
  }, 0)
  const deliveryQty = parseFloat(pricing.delivery_qty) || 1
  const deliveryUnitPrice = parseFloat(pricing.delivery_unit_price ?? pricing.delivery_charge) || 0
  const deliveryCharge = deliveryQty * deliveryUnitPrice
  const miscQty = parseFloat(pricing.misc_qty) || 1
  const miscUnitPrice = parseFloat(pricing.misc_unit_price ?? pricing.misc_charge) || 0
  const miscCharge = miscQty * miscUnitPrice
  const discountQty = parseFloat(pricing.discount_qty) || 1
  const discountUnitPrice = parseFloat(pricing.discount_unit_price ?? pricing.discount) || 0
  const discount = discountQty * discountUnitPrice
  const sstPercent = parseFloat(pricing.sst_percent) || 0
  const totalBeforeSst = itemsTotal - discount + deliveryCharge + miscCharge
  const sstAmount = totalBeforeSst * (sstPercent / 100)
  const grandTotal = totalBeforeSst + sstAmount

  // 1) Recompute summary
  useEffect(() => {
    setPricing((prev) => ({
      ...prev,
      sub_total: parseFloat(totalBeforeSst.toFixed(2)),
      sst_amount: parseFloat(sstAmount.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
    }))
  }, [
    itemsTotal,
    discount,
    deliveryCharge,
    miscCharge,
    sstPercent,
    totalBeforeSst,
    sstAmount,
    grandTotal,
    setPricing,
  ])

  const handleItemChange = (index, field) => (e) => {
    const { value } = e.target
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.equipment_items) ? [...prev.equipment_items] : []
      const current = nextItems[index] || {}
      nextItems[index] = {
        ...current,
        [field]: value,
      }
      return { ...prev, equipment_items: nextItems }
    })
  }

  const handleNewItemChange = (field) => (e) => {
    const { value } = e.target
    setNewItem((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddItem = () => {
    const name = newItem.item_name.trim()
    const qty = parseFloat(newItem.quantity)
    const price = parseFloat(newItem.marked_up_price)
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      return
    }

    setPricing((prev) => {
      const nextItems = Array.isArray(prev.equipment_items) ? [...prev.equipment_items] : []
      nextItems.push({
        id: `custom-${Date.now()}`,
        item_name: name,
        description: newItem.description.trim(),
        item_remarks: newItem.item_remarks.trim(),
        unit: newItem.unit.trim() || 'Lot',
        quantity: qty,
        unit_price: price,
        marked_up_price: price,
        is_custom: true,
      })
      return { ...prev, equipment_items: nextItems }
    })

    setNewItem({
      item_name: '',
      description: '',
      item_remarks: '',
      quantity: '',
      unit: '',
      marked_up_price: '',
    })
  }

  const handleRemoveItem = (index) => () => {
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.equipment_items) ? [...prev.equipment_items] : []
      nextItems.splice(index, 1)
      return { ...prev, equipment_items: nextItems }
    })
  }

  const canAddItem =
    newItem.item_name.trim() !== '' &&
    Number.isFinite(parseFloat(newItem.quantity)) &&
    parseFloat(newItem.quantity) > 0 &&
    Number.isFinite(parseFloat(newItem.marked_up_price)) &&
    parseFloat(newItem.marked_up_price) > 0

  // 2) Generic change handler
  const handleChange = (field) => (e) => {
    const { value } = e.target
    if (field === 'remarks' || field === 'quotation_remarks') {
      setPricing((prev) => ({ ...prev, [field]: value }))
    } else {
      const num = parseFloat(value)
      setPricing((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
    }
  }

  const handleChargeQtyChange = (type) => (e) => {
    const qty = parseFloat(e.target.value)
    setPricing((prev) => {
      const nextQty = isNaN(qty) ? 0 : qty
      if (type === 'delivery') {
        const unitPrice = parseFloat(prev.delivery_unit_price ?? prev.delivery_charge) || 0
        return {
          ...prev,
          delivery_qty: nextQty,
          delivery_unit_price: unitPrice,
          delivery_charge: nextQty * unitPrice,
        }
      }
      if (type === 'misc') {
        const unitPrice = parseFloat(prev.misc_unit_price ?? prev.misc_charge) || 0
        return {
          ...prev,
          misc_qty: nextQty,
          misc_unit_price: unitPrice,
          misc_charge: nextQty * unitPrice,
        }
      }
      const unitPrice = parseFloat(prev.discount_unit_price ?? prev.discount) || 0
      return {
        ...prev,
        discount_qty: nextQty,
        discount_unit_price: unitPrice,
        discount: nextQty * unitPrice,
      }
    })
  }

  const handleChargeUnitChange = (type) => (e) => {
    const unit = e.target.value
    if (type === 'delivery') {
      setPricing((prev) => ({ ...prev, delivery_unit: unit }))
    } else if (type === 'misc') {
      setPricing((prev) => ({ ...prev, misc_unit: unit }))
    } else {
      setPricing((prev) => ({ ...prev, discount_unit: unit }))
    }
  }

  const handleChargeUnitPriceChange = (type) => (e) => {
    const price = parseFloat(e.target.value)
    setPricing((prev) => {
      const nextPrice = isNaN(price) ? 0 : price
      if (type === 'delivery') {
        const qty = parseFloat(prev.delivery_qty) || 1
        return {
          ...prev,
          delivery_unit_price: nextPrice,
          delivery_charge: qty * nextPrice,
        }
      }
      if (type === 'misc') {
        const qty = parseFloat(prev.misc_qty) || 1
        return {
          ...prev,
          misc_unit_price: nextPrice,
          misc_charge: qty * nextPrice,
        }
      }
      const qty = parseFloat(prev.discount_qty) || 1
      return {
        ...prev,
        discount_unit_price: nextPrice,
        discount: qty * nextPrice,
      }
    })
  }

  return (
    <>
      <CCardHeader>
        <strong>Equipment Items & Charges</strong>
      </CCardHeader>
      <CCardBody>
        {/* Items table */}
        {/* datatable-exempt: existing embedded/layout table */}
        <CTable
          striped
          responsive
          className="mb-3 data-table-compact embedded-data-table"
          style={{ tableLayout: 'fixed', width: '100%' }}
        >
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
              const price = getEquipmentInvoiceUnitPrice(item)
              const showRemove = mode === 'edit' || item.is_custom
              return (
                <CTableRow key={item.id || idx}>
                  <CTableDataCell className="text-center">
                    {showRemove ? (
                      <div className="d-flex flex-column gap-1">
                        <div className="d-flex align-items-center gap-2">
                          <span>{idx + 1}</span>
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
                      <span>{idx + 1}</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="text"
                      value={item.item_name ?? item.item_description ?? ''}
                      onChange={handleItemChange(idx, 'item_name')}
                      placeholder="Item"
                      className="mb-1"
                    />
                    <CFormTextarea
                      value={item.description ?? ''}
                      onChange={handleItemChange(idx, 'description')}
                      placeholder="Catalogue description"
                      className="form-control-sm"
                      rows={2}
                      maxLength={5000}
                    />
                    <CFormTextarea
                      value={item.item_remarks ?? ''}
                      onChange={handleItemChange(idx, 'item_remarks')}
                      placeholder="Client specifications / item remarks"
                      className="form-control-sm mt-1"
                      rows={2}
                      maxLength={2000}
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
                      value={getEquipmentInvoiceUnitPriceValue(item)}
                      onChange={handleItemChange(idx, 'marked_up_price')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{(qty * price).toFixed(2)}</CTableDataCell>
                </CTableRow>
              )
            })}

            <CTableRow>
              <CTableDataCell className="text-center">{items.length + 1}</CTableDataCell>
              <CTableDataCell>Delivery Charge (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.delivery_qty ?? 1}
                  onChange={handleChargeQtyChange('delivery')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.delivery_unit ?? 'Lot'}
                  onChange={handleChargeUnitChange('delivery')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  value={pricing.delivery_unit_price ?? pricing.delivery_charge}
                  onChange={handleChargeUnitPriceChange('delivery')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{deliveryCharge.toFixed(2)}</CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell className="text-center">{items.length + 2}</CTableDataCell>
              <CTableDataCell>Misc Charge (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.misc_qty ?? 1}
                  onChange={handleChargeQtyChange('misc')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.misc_unit ?? 'Lot'}
                  onChange={handleChargeUnitChange('misc')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  value={pricing.misc_unit_price ?? pricing.misc_charge}
                  onChange={handleChargeUnitPriceChange('misc')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{miscCharge.toFixed(2)}</CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell className="text-center">{items.length + 3}</CTableDataCell>
              <CTableDataCell>Discount (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.discount_qty ?? 1}
                  onChange={handleChargeQtyChange('discount')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.discount_unit ?? 'Lot'}
                  onChange={handleChargeUnitChange('discount')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  value={pricing.discount_unit_price ?? pricing.discount}
                  onChange={handleChargeUnitPriceChange('discount')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {(-Math.abs(discount)).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-end fw-semibold align-middle text-nowrap">
                Subtotal (Before SST) (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {totalBeforeSst.toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-end fw-semibold align-middle text-nowrap">
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
          <CRow className="mb-4 g-2">
            <CCol md={3}>
              <CFormLabel>Item</CFormLabel>
              <CFormInput
                type="text"
                value={newItem.item_name}
                onChange={handleNewItemChange('item_name')}
                placeholder="Item name"
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea
                value={newItem.description}
                onChange={handleNewItemChange('description')}
                placeholder="Catalogue description"
                rows={2}
                maxLength={5000}
              />
              <CFormTextarea
                value={newItem.item_remarks}
                onChange={handleNewItemChange('item_remarks')}
                placeholder="Client specifications / item remarks"
                rows={2}
                maxLength={2000}
                className="mt-1"
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
                value={newItem.marked_up_price}
                onChange={handleNewItemChange('marked_up_price')}
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
            <CFormLabel>Quotation Remarks</CFormLabel>
            <CFormTextarea
              name="quotation_remarks"
              placeholder="General specifications carried from the equipment quotation"
              value={pricing.quotation_remarks || ''}
              onChange={handleChange('quotation_remarks')}
              rows={3}
              maxLength={2000}
            />
          </CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Remarks</CFormLabel>
            <CFormTextarea
              name="remarks"
              placeholder="Leave any remarks for this invoice"
              value={pricing.remarks || ''}
              onChange={handleChange('remarks')}
              rows={2}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default EquipmentInvoiceForm
