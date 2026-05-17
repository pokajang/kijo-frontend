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
import { calculateHygieneTotals } from './hygienePricing'

/**
 * Industrial Hygiene invoice form (table-based, consistent with other services).
 *
 * Expects:
 * - quoteDetails: hygiene quote payload
 * - pricing: form values
 * - setPricing: setter
 */
const HygieneInvoiceForm = ({ quoteDetails, pricing, setPricing, mode = 'create' }) => {
  const buildHygieneBaseLabel = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return 'Industrial Hygiene'
    const parts = raw.split(/\s+at\s+/i)
    return (parts[0] || raw).trim() || 'Industrial Hygiene'
  }
  const items = Array.isArray(pricing.hygiene_items) ? pricing.hygiene_items : []
  const [showAddItemRow, setShowAddItemRow] = useState(false)
  const [newItem, setNewItem] = useState({
    item_description: '',
    description: '',
    quantity: '',
    unit: '',
    unit_price: '',
  })

  // Seed from quote
  useEffect(() => {
    if (!quoteDetails) return
    const title =
      `${quoteDetails.service_title}` +
      ` (${quoteDetails.service_code})` +
      ` at ${quoteDetails.site_address}`

    const travelUnitPrice = parseFloat(quoteDetails.travel_charge) || 0
    const discountUnitPrice = parseFloat(quoteDetails.discount) || 0

    const rawWorkUnits = parseFloat(quoteDetails.num_work_units)
    const seededWorkUnits = Number.isFinite(rawWorkUnits) && rawWorkUnits > 0 ? rawWorkUnits : ''

    setPricing((prev) => ({
      ...prev,
      service_title: title,
      sample_counts: quoteDetails.sample_counts ?? 0,
      sample_unit: quoteDetails.sample_unit ?? prev.sample_unit ?? 'sample(s)',
      num_work_units: seededWorkUnits,
      unit_price: quoteDetails.unit_price ?? 0,
      travel_qty: prev.travel_qty ?? 1,
      travel_unit: prev.travel_unit ?? 'Lot',
      travel_unit_price: travelUnitPrice,
      travel_charge: (prev.travel_qty ?? 1) * travelUnitPrice,
      discount_qty: prev.discount_qty ?? 1,
      discount_unit: prev.discount_unit ?? 'Lot',
      discount_unit_price: discountUnitPrice,
      discount: (prev.discount_qty ?? 1) * discountUnitPrice,
      sst_percent: quoteDetails.sst_percent ?? 0,
      remarks: quoteDetails.inquiry_remarks ?? '',
    }))
  }, [quoteDetails, setPricing])

  const sampleCounts = parseFloat(pricing.sample_counts) || 0
  const rawWorkUnits = parseFloat(pricing.num_work_units)
  const hasWorkUnits = Number.isFinite(rawWorkUnits) && rawWorkUnits > 0
  const workUnits = hasWorkUnits ? rawWorkUnits : 1
  const unitPrice = parseFloat(pricing.unit_price) || 0
  const baseQty = sampleCounts * workUnits
  const baseTotal = baseQty * unitPrice
  const sampleUnit = pricing.sample_unit || 'sample(s)'
  const baseLabel = buildHygieneBaseLabel(pricing.service_title)
  const useComboUnit = hasWorkUnits && sampleCounts > 1 && workUnits > 1
  const displayUnit = hasWorkUnits ? (useComboUnit ? 'sample-unit' : sampleUnit) : 'Lump Sum'
  const baseNote = hasWorkUnits
    ? `${sampleCounts} ${sampleUnit} x ${workUnits} work units`
    : `${sampleCounts} ${sampleUnit} - Lump Sum Work Unit`

  const travelQty = parseFloat(pricing.travel_qty) || 0
  const travelUnitPrice = parseFloat(pricing.travel_unit_price) || 0
  const travelCharge = travelQty * travelUnitPrice

  const discountQty = parseFloat(pricing.discount_qty) || 0
  const discountUnitPrice = parseFloat(pricing.discount_unit_price) || 0
  const discountTotal = discountQty * discountUnitPrice

  const totals = calculateHygieneTotals({
    sampleCounts,
    numWorkUnits: pricing.num_work_units,
    unitPrice: pricing.unit_price,
    travelCharge,
    customItems: items,
    discount: discountTotal,
    sstPercent: pricing.sst_percent,
  })

  // Recompute summary
  useEffect(() => {
    setPricing((prev) => ({
      ...prev,
      sub_total: totals.subtotalBeforeDiscount,
      sst_amount: totals.sstAmount,
      grand_total: totals.grandTotal,
      travel_charge: parseFloat(travelCharge.toFixed(2)),
      discount: parseFloat(discountTotal.toFixed(2)),
    }))
  }, [
    totals.subtotalBeforeDiscount,
    totals.sstAmount,
    totals.grandTotal,
    travelCharge,
    discountTotal,
    setPricing,
  ])

  const handleChange = (field) => (e) => {
    const { value } = e.target
    if (['service_title', 'remarks', 'sample_unit'].includes(field)) {
      setPricing((prev) => ({ ...prev, [field]: value }))
      return
    }
    const num = parseFloat(value)
    if (field === 'num_work_units') {
      if (value === '') {
        setPricing((prev) => ({ ...prev, [field]: '' }))
        return
      }
      const next = Number.isFinite(num) && num > 0 ? num : ''
      setPricing((prev) => ({ ...prev, [field]: next }))
      return
    }
    setPricing((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
  }

  const handleBaseQtyChange = (e) => {
    const total = parseFloat(e.target.value)
    if (!Number.isFinite(total)) {
      setPricing((prev) => ({ ...prev, sample_counts: 0 }))
      return
    }
    if (hasWorkUnits) {
      setPricing((prev) => ({ ...prev, sample_counts: total / workUnits }))
    } else {
      setPricing((prev) => ({ ...prev, sample_counts: total, num_work_units: '' }))
    }
  }

  const handleChargeQtyChange = (type) => (e) => {
    const qty = parseFloat(e.target.value)
    setPricing((prev) => {
      const nextQty = isNaN(qty) ? 0 : qty
      if (type === 'travel') {
        const unitPrice = parseFloat(prev.travel_unit_price) || 0
        return {
          ...prev,
          travel_qty: nextQty,
          travel_charge: nextQty * unitPrice,
        }
      }
      const unitPrice = parseFloat(prev.discount_unit_price) || 0
      return {
        ...prev,
        discount_qty: nextQty,
        discount: nextQty * unitPrice,
      }
    })
  }

  const handleChargeUnitChange = (type) => (e) => {
    const unit = e.target.value
    if (type === 'travel') {
      setPricing((prev) => ({ ...prev, travel_unit: unit }))
    } else {
      setPricing((prev) => ({ ...prev, discount_unit: unit }))
    }
  }

  const handleChargeUnitPriceChange = (type) => (e) => {
    const price = parseFloat(e.target.value)
    setPricing((prev) => {
      const nextPrice = isNaN(price) ? 0 : price
      if (type === 'travel') {
        const qty = parseFloat(prev.travel_qty) || 0
        return {
          ...prev,
          travel_unit_price: nextPrice,
          travel_charge: qty * nextPrice,
        }
      }
      const qty = parseFloat(prev.discount_qty) || 0
      return {
        ...prev,
        discount_unit_price: nextPrice,
        discount: qty * nextPrice,
      }
    })
  }

  const handleItemChange = (index, field) => (e) => {
    const { value } = e.target
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.hygiene_items) ? [...prev.hygiene_items] : []
      const current = nextItems[index] || {}
      nextItems[index] = { ...current, [field]: value }
      return { ...prev, hygiene_items: nextItems }
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
      const nextItems = Array.isArray(prev.hygiene_items) ? [...prev.hygiene_items] : []
      nextItems.push({
        id: `custom-${Date.now()}`,
        item_description: name,
        description: newItem.description.trim(),
        unit: newItem.unit.trim() || 'Lot',
        quantity: qty,
        unit_price: price,
        is_custom: true,
      })
      return { ...prev, hygiene_items: nextItems }
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
      const nextItems = Array.isArray(prev.hygiene_items) ? [...prev.hygiene_items] : []
      nextItems.splice(index, 1)
      return { ...prev, hygiene_items: nextItems }
    })
  }

  const canAddItem =
    newItem.item_description.trim() !== '' &&
    Number.isFinite(parseFloat(newItem.quantity)) &&
    parseFloat(newItem.quantity) > 0 &&
    Number.isFinite(parseFloat(newItem.unit_price)) &&
    parseFloat(newItem.unit_price) > 0

  const itemRowStart = 3
  const discountRowNum = itemRowStart + items.length

  return (
    <>
      <CCardHeader>
        <strong>Invoice Breakdown (Industrial Hygiene)</strong>
      </CCardHeader>
      <CCardBody>
        {/* Service Title */}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Service Title</CFormLabel>
            <CFormInput
              type="text"
              value={pricing.service_title || ''}
              onChange={handleChange('service_title')}
            />
          </CCol>
        </CRow>

        {/* Sample & Work Units */}
        <CRow className="mb-3 g-3">
          <CCol md={4}>
            <CFormLabel>Sample Count</CFormLabel>
            <CFormInput
              type="number"
              value={pricing.sample_counts ?? ''}
              onChange={handleChange('sample_counts')}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Sample Unit</CFormLabel>
            <CFormInput
              type="text"
              value={pricing.sample_unit ?? ''}
              onChange={handleChange('sample_unit')}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Work Units</CFormLabel>
            <CFormInput
              type="number"
              value={pricing.num_work_units ?? ''}
              onChange={handleChange('num_work_units')}
            />
          </CCol>
        </CRow>

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
            <CTableRow>
              <CTableDataCell className="text-center">1</CTableDataCell>
              <CTableDataCell className="text-center">
                <div>{baseLabel}</div>
                <div className="text-muted small">{baseNote}</div>
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput type="number" min="0" value={baseQty} onChange={handleBaseQtyChange} />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput type="text" value={displayUnit} readOnly />
              </CTableDataCell>
              <CTableDataCell>
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.unit_price ?? ''}
                  onChange={handleChange('unit_price')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{baseTotal.toFixed(2)}</CTableDataCell>
            </CTableRow>

            <CTableRow>
              <CTableDataCell className="text-center">2</CTableDataCell>
              <CTableDataCell>Travel Charge (RM)</CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.travel_qty ?? 1}
                  onChange={handleChargeQtyChange('travel')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.travel_unit ?? 'Lot'}
                  onChange={handleChargeUnitChange('travel')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.travel_unit_price ?? ''}
                  onChange={handleChargeUnitPriceChange('travel')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">{travelCharge.toFixed(2)}</CTableDataCell>
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
              <CTableDataCell colSpan={5} className="text-end fw-semibold align-middle text-nowrap">
                Subtotal (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {(parseFloat(pricing.sub_total) || 0).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell className="text-center">{discountRowNum}</CTableDataCell>
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
                  min="0"
                  value={pricing.discount_unit_price ?? ''}
                  onChange={handleChargeUnitPriceChange('discount')}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                {(-Math.abs(discountTotal)).toFixed(2)}
              </CTableDataCell>
            </CTableRow>
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-end fw-semibold align-middle text-nowrap">
                <div className="d-flex flex-nowrap justify-content-end align-items-center gap-2">
                  <CFormInput
                    type="number"
                    value={pricing.sst_percent ?? 0}
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
              <CTableDataCell colSpan={5} className="text-end fw-bold align-middle text-nowrap">
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

        {/* Remarks */}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Invoice Remarks (if any)</CFormLabel>
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

export default HygieneInvoiceForm
