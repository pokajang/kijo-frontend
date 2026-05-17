// src/views/project/InvoiceProjectModal/ManpowerInvoiceForm.jsx
import React, { useCallback, useEffect, useState } from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CBadge,
  CButton,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'

/**
 * Manpower invoice form.
 *
 * Expects:
 * - quoteDetails: flattened API response with keys:
 *     service_title, nature_of_work, site_location, duration_months,
 *     no_of_pax, unit_cost, discount, sst_percent,
 *     sub_total, sst_amount, grand_total
 * - pricing: object to hold form values including remarks
 * - setPricing: setter for pricing state
 */
const ManpowerInvoiceForm = ({ project, quoteDetails, pricing, setPricing, mode = 'create' }) => {
  const normalizeText = useCallback((value) => (typeof value === 'string' ? value.trim() : ''), [])
  const stripClaimSuffix = useCallback(
    (value) => value.replace(/\s*-\s*For Month(s)?:.*$/i, '').trim(),
    [],
  )

  const getBaseTitle = useCallback(() => {
    const title = normalizeText(quoteDetails?.service_title)
    if (title) {
      const nature = normalizeText(quoteDetails?.nature_of_work)
      const site = normalizeText(quoteDetails?.site_location)
      let base = title
      if (nature) base += ` of ${nature}`
      if (site) base += ` at ${site}`
      return stripClaimSuffix(base)
    }
    const projectName = normalizeText(project?.project_name)
    if (projectName) return stripClaimSuffix(projectName)
    const pricingTitle = normalizeText(pricing?.service_title)
    if (pricingTitle) return stripClaimSuffix(pricingTitle)
    return 'Manpower Supply'
  }, [normalizeText, pricing?.service_title, project?.project_name, quoteDetails, stripClaimSuffix])

  const getClaimSuffix = useCallback(
    (data) => {
      if (data.claim_type === 'multi') {
        const text = normalizeText(data.claim_months_text)
        return text ? ` - For Months: ${text}` : ' - For Months: Multiple Months'
      }
      const month = normalizeText(data.month)
      return month ? ` - For Month: ${month}` : ''
    },
    [normalizeText],
  )

  const [showAddItemRow, setShowAddItemRow] = useState(false)
  const [newItem, setNewItem] = useState({
    item_description: '',
    description: '',
    quantity: '',
    unit: '',
    unit_price: '',
  })

  // Seed form values on mount or when quoteDetails/project changes
  useEffect(() => {
    const baseTitle = getBaseTitle()
    if (!baseTitle) return
    const defaultMonth = new Date().toISOString().slice(0, 7)
    setPricing((prev) => {
      const month = prev.month || defaultMonth
      const claimType = prev.claim_type || 'single'
      const claimMonthsText = prev.claim_months_text || ''
      const next = {
        ...prev,
        claim_type: claimType,
        claim_months_text: claimMonthsText,
        month,
        duration: prev.duration || 1,
        unit: !prev.unit || String(prev.unit).toLowerCase() === 'lot' ? 'pax-mth' : prev.unit,
        discount_qty: prev.discount_qty ?? 1,
        discount_unit: prev.discount_unit || 'Lot',
      }

      if (!quoteDetails) {
        return {
          ...next,
          service_title: baseTitle + getClaimSuffix(next),
        }
      }

      return {
        ...next,
        service_title: baseTitle + getClaimSuffix(next),
        duration: prev.duration || 1,
        quantity: parseInt(quoteDetails.no_of_pax, 10) || 0,
        unit_cost: parseFloat(quoteDetails.unit_cost) || 0,
        discount: parseFloat(quoteDetails.discount) || 0,
        sst_percent: parseFloat(quoteDetails.sst_percent) || 0,
        sub_total: parseFloat(quoteDetails.sub_total) || 0,
        sst_amount: parseFloat(quoteDetails.sst_amount) || 0,
        grand_total: parseFloat(quoteDetails.grand_total) || 0,
      }
    })
  }, [getBaseTitle, getClaimSuffix, quoteDetails, setPricing])

  // Update service_title when month changes
  useEffect(() => {
    const baseTitle = getBaseTitle()
    if (!baseTitle) return
    setPricing((prev) => {
      const next = {
        ...prev,
        service_title: baseTitle + getClaimSuffix(prev),
      }
      if (prev.claim_type !== 'multi') {
        next.duration = 1
      } else if (!prev.duration || Number(prev.duration) < 2) {
        next.duration = 2
      }
      return next
    })
  }, [
    pricing.month,
    pricing.claim_type,
    pricing.claim_months_text,
    getBaseTitle,
    getClaimSuffix,
    setPricing,
  ])

  // Recalculate totals when numeric inputs change
  useEffect(() => {
    const qty = parseFloat(pricing.quantity) || 0
    const rate = parseFloat(pricing.unit_cost) || 0
    const items = Array.isArray(pricing.manpower_items) ? pricing.manpower_items : []
    const customTotal = items.reduce((sum, item) => {
      const itemQty = parseFloat(item.quantity) || 0
      const itemPrice = parseFloat(item.unit_price) || 0
      return sum + itemQty * itemPrice
    }, 0)
    const discount = parseFloat(pricing.discount) || 0
    const discountQty = parseFloat(pricing.discount_qty) || 0
    const sstPercent = parseFloat(pricing.sst_percent) || 0
    const duration =
      pricing.claim_type === 'multi' ? Math.max(2, parseFloat(pricing.duration) || 0) : 1

    const discountTotal = discount * discountQty
    const subTotal = qty * rate * duration + customTotal - discountTotal
    const sstAmount = subTotal * (sstPercent / 100)
    const grandTotal = subTotal + sstAmount

    setPricing((prev) => ({
      ...prev,
      sub_total: parseFloat(subTotal.toFixed(2)),
      sst_amount: parseFloat(sstAmount.toFixed(2)),
      grand_total: parseFloat(grandTotal.toFixed(2)),
    }))
  }, [
    pricing.quantity,
    pricing.unit_cost,
    pricing.discount,
    pricing.sst_percent,
    pricing.discount_qty,
    pricing.manpower_items,
    pricing.duration,
    pricing.claim_type,
    setPricing,
  ])

  // Generic input handler for both numeric and text fields
  const handleChange = (field) => (e) => {
    const { value } = e.target
    setPricing((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index, field) => (e) => {
    const { value } = e.target
    setPricing((prev) => {
      const items = Array.isArray(prev.manpower_items) ? [...prev.manpower_items] : []
      items[index] = { ...(items[index] || {}), [field]: value }
      return { ...prev, manpower_items: items }
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
      const items = Array.isArray(prev.manpower_items) ? [...prev.manpower_items] : []
      items.push({
        id: `custom-${Date.now()}`,
        item_description: name,
        description: newItem.description.trim(),
        unit: newItem.unit.trim() || 'Lot',
        quantity: qty,
        unit_price: price,
        is_custom: true,
      })
      return { ...prev, manpower_items: items }
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
      const items = Array.isArray(prev.manpower_items) ? [...prev.manpower_items] : []
      items.splice(index, 1)
      return { ...prev, manpower_items: items }
    })
  }

  const items = Array.isArray(pricing.manpower_items) ? pricing.manpower_items : []
  const canAddItem =
    newItem.item_description.trim() !== '' &&
    Number.isFinite(parseFloat(newItem.quantity)) &&
    parseFloat(newItem.quantity) > 0 &&
    Number.isFinite(parseFloat(newItem.unit_price)) &&
    parseFloat(newItem.unit_price) > 0

  return (
    <>
      <CCardHeader>
        <strong>Invoice Breakdown (Manpower)</strong>
      </CCardHeader>
      <CCardBody>
        {/* Service Title */}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Service Title</CFormLabel>
            <CFormInput type="text" value={pricing.service_title} readOnly />
          </CCol>
        </CRow>

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

        {/* Claim for month & duration */}
        <CRow className="mb-3 g-3">
          <CCol md={3}>
            <CFormLabel>Claim Type</CFormLabel>
            <CFormSelect
              value={pricing.claim_type || 'single'}
              onChange={handleChange('claim_type')}
            >
              <option value="single">Single Month</option>
              <option value="multi">Multi Month</option>
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormLabel>Claim For Month</CFormLabel>
            {pricing.claim_type === 'multi' ? (
              <CFormInput
                type="text"
                placeholder="Jan, Feb, Mar 2026"
                value={pricing.claim_months_text || ''}
                onChange={handleChange('claim_months_text')}
              />
            ) : (
              <CFormInput
                type="month"
                value={pricing.month ?? ''}
                onChange={handleChange('month')}
              />
            )}
          </CCol>
          <CCol md={3}>
            <CFormLabel>Claim Duration (Month)</CFormLabel>
            <CFormInput
              type="number"
              value={pricing.duration ?? ''}
              disabled={pricing.claim_type !== 'multi'}
              onChange={handleChange('duration')}
              min={pricing.claim_type === 'multi' ? 2 : 1}
            />
          </CCol>
          <CCol md={2}>
            <CFormLabel>No. of Pax</CFormLabel>
            <CFormInput
              type="number"
              value={pricing.quantity}
              onChange={handleChange('quantity')}
            />
          </CCol>
        </CRow>

        {/* Pricing table (matches Training layout) */}
        {(() => {
          const qty = parseFloat(pricing.quantity) || 0
          const rate = parseFloat(pricing.unit_cost) || 0
          const duration =
            pricing.claim_type === 'multi' ? Math.max(2, parseFloat(pricing.duration) || 0) : 1
          const paxMonths = qty * duration
          const lineTotal = qty * rate * duration
          const discountQty = parseFloat(pricing.discount_qty) || 0
          const discountValue = parseFloat(pricing.discount) || 0
          const discountTotal = -Math.abs(discountQty * discountValue)
          const sstRateWidthCh = Math.max(String(pricing.sst_percent || '').length, 2)
          const itemRowStart = 2
          const discountRowNum = itemRowStart + items.length

          return (
            /* datatable-exempt: existing embedded/layout table */
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
                  <CTableDataCell>{pricing.service_title || 'Manpower Supply'}</CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="number"
                      min="0"
                      value={paxMonths}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        const nextQty =
                          duration > 0 ? (Number.isFinite(value) ? value / duration : '') : value
                        setPricing((prev) => ({ ...prev, quantity: nextQty }))
                      }}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="text"
                      value={pricing.unit || 'pax-mth'}
                      onChange={handleChange('unit')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CFormInput
                      type="number"
                      value={pricing.unit_cost}
                      onChange={handleChange('unit_cost')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{lineTotal.toFixed(2)}</CTableDataCell>
                </CTableRow>
                {items.map((item, idx) => {
                  const itemQty = parseFloat(item.quantity) || 0
                  const itemPrice = parseFloat(item.unit_price) || 0
                  const rowNum = itemRowStart + idx
                  const showRemove = mode === 'edit' || item.is_custom
                  return (
                    <CTableRow key={item.id || rowNum}>
                      <CTableDataCell className="text-center">
                        {showRemove || item.is_custom ? (
                          <div className="d-flex flex-column gap-1">
                            <div className="d-flex align-items-center gap-2">
                              <span>{rowNum}</span>
                              {item.is_custom ? (
                                <CBadge color="info" className="text-dark">
                                  New
                                </CBadge>
                              ) : null}
                            </div>
                            {showRemove ? (
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
                            ) : null}
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
                  <CTableDataCell>Discount (RM)</CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="number"
                      min="0"
                      value={pricing.discount_qty}
                      onChange={handleChange('discount_qty')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="text"
                      value={pricing.discount_unit || ''}
                      onChange={handleChange('discount_unit')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CFormInput
                      type="number"
                      value={pricing.discount}
                      onChange={handleChange('discount')}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{discountTotal.toFixed(2)}</CTableDataCell>
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
          )
        })()}

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
      </CCardBody>
    </>
  )
}

export default ManpowerInvoiceForm
