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
  CAlert,
  CFormFeedback,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import {
  buildStoredHygieneTotals,
  buildHygieneInvoicePricingSeed,
  calculateHygieneTotals,
  isHistoricalHygienePricingRule,
  STANDARD_HYGIENE_PRICING_RULE,
} from './hygienePricing'
import dialog from '../../components/dialog/dialogService'

/**
 * Industrial Hygiene invoice form (table-based, consistent with other services).
 *
 * Expects:
 * - quoteDetails: hygiene quote payload
 * - pricing: form values
 * - setPricing: setter
 */
const HygieneInvoiceForm = ({
  quoteDetails,
  pricing,
  setPricing,
  fieldErrors = {},
  onClearFieldError,
  financialLocked = false,
  financialLockMessage = '',
  onDirty,
}) => {
  const buildHygieneBaseLabel = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return 'Industrial Hygiene'
    const parts = raw.split(/\s+at\s+/i)
    return (parts[0] || raw).trim() || 'Industrial Hygiene'
  }
  const items = Array.isArray(pricing.hygiene_items) ? pricing.hygiene_items : []
  const pricingRuleVersion =
    pricing.pricing_rule_version ||
    quoteDetails?.pricing_rule_version ||
    STANDARD_HYGIENE_PRICING_RULE
  const isHistoricalPricing = isHistoricalHygienePricingRule(pricingRuleVersion)
  const [pricingDirty, setPricingDirty] = useState(false)
  const [showAddItemRow, setShowAddItemRow] = useState(false)
  const [newItem, setNewItem] = useState({
    item_description: '',
    description: '',
    quantity: '',
    unit: '',
    unit_price: '',
  })

  const errorFor = (path) => fieldErrors?.[path]?.[0] || fieldErrors?.[path] || ''
  const inputErrorProps = (path) => ({
    invalid: Boolean(errorFor(path)),
    'aria-invalid': Boolean(errorFor(path)),
    'aria-describedby': errorFor(path) ? `${path.replaceAll('.', '-')}-error` : undefined,
    'data-field-path': path,
  })
  const clearError = (path) => onClearFieldError?.(path)
  const markDirty = () => onDirty?.()
  const shouldSeedFromQuote = Boolean(
    quoteDetails &&
      !pricing.pricing_rule_version &&
      !pricing.service_title &&
      !(Number(pricing.sample_counts) > 0) &&
      !(Number(pricing.sub_total) > 0) &&
      items.length === 0,
  )

  useEffect(() => {
    if (!shouldSeedFromQuote) return
    setPricing((prev) => ({ ...prev, ...buildHygieneInvoicePricingSeed(quoteDetails) }))
  }, [quoteDetails, setPricing, shouldSeedFromQuote])

  const handleResetFromQuote = async () => {
    if (!quoteDetails || financialLocked) return
    if (
      pricingDirty &&
      !(await dialog.confirm('Reset invoice pricing to the quotation values?', {
        title: 'Reset from Quote',
        confirmText: 'Reset',
        cancelText: 'Keep changes',
      }))
    ) {
      return
    }
    const seed = buildHygieneInvoicePricingSeed(quoteDetails)
    markDirty()
    setPricing((prev) => ({ ...prev, ...seed }))
    setPricingDirty(false)
  }

  const sampleCounts = parseFloat(pricing.sample_counts) || 0
  const rawWorkUnits = parseFloat(pricing.num_work_units)
  const hasWorkUnits = Number.isFinite(rawWorkUnits) && rawWorkUnits > 0
  const workUnits = hasWorkUnits ? rawWorkUnits : 1
  const unitPrice = parseFloat(pricing.unit_price) || 0
  const baseQty = sampleCounts * workUnits
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

  const storedHistoricalTotals =
    isHistoricalPricing && quoteDetails
      ? buildStoredHygieneTotals({
          sampleCounts: quoteDetails.sample_counts,
          numWorkUnits: quoteDetails.num_work_units,
          travelCharge: quoteDetails.travel_charge,
          discount: quoteDetails.discount,
          sstPercent: quoteDetails.sst_percent,
          sstAmount: quoteDetails.sst_amount,
          subTotal: quoteDetails.sub_total,
          grandTotal: quoteDetails.grand_total,
          pricingRuleVersion,
          complexityRating: quoteDetails.complexity_rating,
        })
      : null
  const preserveHistoricalSnapshot =
    isHistoricalPricing &&
    !pricingDirty &&
    quoteDetails &&
    items.length === 0 &&
    Math.abs(
      (parseFloat(pricing.sub_total) || 0) - storedHistoricalTotals.subtotalBeforeDiscount,
    ) <= 0.01 &&
    Math.abs((parseFloat(pricing.grand_total) || 0) - storedHistoricalTotals.grandTotal) <= 0.01
  const totals = preserveHistoricalSnapshot
    ? storedHistoricalTotals
    : calculateHygieneTotals({
        sampleCounts,
        numWorkUnits: pricing.num_work_units,
        unitPrice: pricing.unit_price,
        travelCharge,
        customItems: items,
        discount: discountTotal,
        sstPercent: pricing.sst_percent,
        pricingRuleVersion,
        complexityRating: pricing.complexity_rating,
      })
  const baseTotal = totals.serviceTotal

  // Recompute summary
  useEffect(() => {
    if (shouldSeedFromQuote) return
    setPricing((prev) => ({
      ...prev,
      // Invoice amount is always the gross amount before discount and SST.
      // Historical quote storage may use either gross or net subtotal semantics.
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
    shouldSeedFromQuote,
  ])

  const handleChange = (field) => (e) => {
    const { value } = e.target
    clearError(`pricing.${field}`)
    markDirty()
    if (field !== 'remarks') setPricingDirty(true)
    if (['service_title', 'remarks', 'sample_unit'].includes(field)) {
      setPricing((prev) => ({ ...prev, [field]: value }))
      return
    }
    const num = parseFloat(value)
    if (field === 'num_work_units') {
      setPricingDirty(true)
      if (value === '') {
        setPricing((prev) => ({ ...prev, [field]: '' }))
        return
      }
      const next = Number.isFinite(num) && num > 0 ? num : ''
      setPricing((prev) => ({ ...prev, [field]: next }))
      return
    }
    setPricingDirty(true)
    setPricing((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
  }

  const handleBaseQtyChange = (e) => {
    clearError('pricing.sample_counts')
    markDirty()
    setPricingDirty(true)
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
    clearError(`pricing.${type}_qty`)
    markDirty()
    setPricingDirty(true)
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
    markDirty()
    setPricingDirty(true)
    const unit = e.target.value
    if (type === 'travel') {
      setPricing((prev) => ({ ...prev, travel_unit: unit }))
    } else {
      setPricing((prev) => ({ ...prev, discount_unit: unit }))
    }
  }

  const handleChargeUnitPriceChange = (type) => (e) => {
    clearError(`pricing.${type}_unit_price`)
    markDirty()
    setPricingDirty(true)
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
    clearError(`pricing.hygiene_items.${index}.${field}`)
    markDirty()
    setPricingDirty(true)
    const { value } = e.target
    setPricing((prev) => {
      const nextItems = Array.isArray(prev.hygiene_items) ? [...prev.hygiene_items] : []
      const current = nextItems[index] || {}
      nextItems[index] = { ...current, [field]: value }
      return { ...prev, hygiene_items: nextItems }
    })
  }

  const handleNewItemChange = (field) => (e) => {
    markDirty()
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
    setPricingDirty(true)
    markDirty()

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
    markDirty()
    setPricingDirty(true)
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
        {quoteDetails ? (
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <span className="small text-body-secondary">
              Loaded from Quote · {isHistoricalPricing ? 'Historical pricing' : 'Standard pricing'}
            </span>
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={handleResetFromQuote}
              disabled={financialLocked}
            >
              Reset from Quote
            </CButton>
          </div>
        ) : null}
        {financialLocked ? (
          <CAlert color="warning">{financialLockMessage || 'Financial values are locked.'}</CAlert>
        ) : null}
        {/* Service Title */}
        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel>Service Title</CFormLabel>
            <CFormInput
              type="text"
              value={pricing.service_title || ''}
              onChange={handleChange('service_title')}
              disabled={financialLocked}
              {...inputErrorProps('pricing.service_title')}
            />
            {errorFor('pricing.service_title') ? (
              <CFormFeedback invalid id="pricing-service_title-error">
                {errorFor('pricing.service_title')}
              </CFormFeedback>
            ) : null}
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
              disabled={financialLocked}
              {...inputErrorProps('pricing.sample_counts')}
            />
            {errorFor('pricing.sample_counts') ? (
              <CFormFeedback invalid id="pricing-sample_counts-error">
                {errorFor('pricing.sample_counts')}
              </CFormFeedback>
            ) : null}
          </CCol>
          <CCol md={4}>
            <CFormLabel>Sample Unit</CFormLabel>
            <CFormInput
              type="text"
              value={pricing.sample_unit ?? ''}
              onChange={handleChange('sample_unit')}
              disabled={financialLocked}
              {...inputErrorProps('pricing.sample_unit')}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Work Units</CFormLabel>
            <CFormInput
              type="number"
              value={pricing.num_work_units ?? ''}
              onChange={handleChange('num_work_units')}
              disabled={financialLocked}
              {...inputErrorProps('pricing.num_work_units')}
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
                <CFormInput
                  type="number"
                  min="0"
                  value={baseQty}
                  onChange={handleBaseQtyChange}
                  disabled={financialLocked}
                  {...inputErrorProps('pricing.sample_counts')}
                />
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
                  disabled={financialLocked}
                  {...inputErrorProps('pricing.unit_price')}
                />
                {errorFor('pricing.unit_price') ? (
                  <CFormFeedback invalid id="pricing-unit_price-error">
                    {errorFor('pricing.unit_price')}
                  </CFormFeedback>
                ) : null}
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
                  disabled={financialLocked}
                  {...inputErrorProps('pricing.travel_qty')}
                />
                {errorFor('pricing.travel_qty') ? (
                  <CFormFeedback invalid id="pricing-travel_qty-error">
                    {errorFor('pricing.travel_qty')}
                  </CFormFeedback>
                ) : null}
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.travel_unit ?? 'Lot'}
                  onChange={handleChargeUnitChange('travel')}
                  disabled={financialLocked}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.travel_unit_price ?? ''}
                  onChange={handleChargeUnitPriceChange('travel')}
                  disabled={financialLocked}
                  {...inputErrorProps('pricing.travel_unit_price')}
                />
                {errorFor('pricing.travel_unit_price') ? (
                  <CFormFeedback invalid id="pricing-travel_unit_price-error">
                    {errorFor('pricing.travel_unit_price')}
                  </CFormFeedback>
                ) : null}
              </CTableDataCell>
              <CTableDataCell className="text-end">{travelCharge.toFixed(2)}</CTableDataCell>
            </CTableRow>

            {items.map((item, idx) => {
              const qty = parseFloat(item.quantity) || 0
              const price = parseFloat(item.unit_price) || 0
              const rowNum = itemRowStart + idx
              const showRemove = true
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
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveItem(idx)}
                            disabled={financialLocked}
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
                      disabled={financialLocked}
                      {...inputErrorProps(`pricing.hygiene_items.${idx}.item_description`)}
                    />
                    {errorFor(`pricing.hygiene_items.${idx}.item_description`) ? (
                      <CFormFeedback
                        invalid
                        className="d-block"
                        id={`pricing-hygiene_items-${idx}-item_description-error`}
                      >
                        {errorFor(`pricing.hygiene_items.${idx}.item_description`)}
                      </CFormFeedback>
                    ) : null}
                    <CFormInput
                      type="text"
                      value={item.description ?? ''}
                      onChange={handleItemChange(idx, 'description')}
                      placeholder="Description"
                      className="form-control-sm"
                      disabled={financialLocked}
                    />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CFormInput
                      type="number"
                      min="0"
                      value={item.quantity ?? ''}
                      onChange={handleItemChange(idx, 'quantity')}
                      disabled={financialLocked}
                      {...inputErrorProps(`pricing.hygiene_items.${idx}.quantity`)}
                    />
                    {errorFor(`pricing.hygiene_items.${idx}.quantity`) ? (
                      <CFormFeedback
                        invalid
                        className="d-block"
                        id={`pricing-hygiene_items-${idx}-quantity-error`}
                      >
                        {errorFor(`pricing.hygiene_items.${idx}.quantity`)}
                      </CFormFeedback>
                    ) : null}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CFormInput
                      type="text"
                      value={item.unit ?? ''}
                      onChange={handleItemChange(idx, 'unit')}
                      disabled={financialLocked}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price ?? ''}
                      onChange={handleItemChange(idx, 'unit_price')}
                      disabled={financialLocked}
                      {...inputErrorProps(`pricing.hygiene_items.${idx}.unit_price`)}
                    />
                    {errorFor(`pricing.hygiene_items.${idx}.unit_price`) ? (
                      <CFormFeedback invalid id={`pricing-hygiene_items-${idx}-unit_price-error`}>
                        {errorFor(`pricing.hygiene_items.${idx}.unit_price`)}
                      </CFormFeedback>
                    ) : null}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{(qty * price).toFixed(2)}</CTableDataCell>
                </CTableRow>
              )
            })}

            <CTableRow>
              <CTableDataCell colSpan={5} className="text-end fw-semibold align-middle text-nowrap">
                Gross Subtotal (RM)
              </CTableDataCell>
              <CTableDataCell className="text-end align-middle">
                {totals.subtotalBeforeDiscount.toFixed(2)}
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
                  disabled={financialLocked}
                  {...inputErrorProps('pricing.discount_qty')}
                />
                {errorFor('pricing.discount_qty') ? (
                  <CFormFeedback invalid id="pricing-discount_qty-error">
                    {errorFor('pricing.discount_qty')}
                  </CFormFeedback>
                ) : null}
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CFormInput
                  type="text"
                  value={pricing.discount_unit ?? 'Lot'}
                  onChange={handleChargeUnitChange('discount')}
                  disabled={financialLocked}
                />
              </CTableDataCell>
              <CTableDataCell className="text-end">
                <CFormInput
                  type="number"
                  min="0"
                  value={pricing.discount_unit_price ?? ''}
                  onChange={handleChargeUnitPriceChange('discount')}
                  disabled={financialLocked}
                  {...inputErrorProps('pricing.discount_unit_price')}
                />
                {errorFor('pricing.discount_unit_price') ? (
                  <CFormFeedback invalid id="pricing-discount_unit_price-error">
                    {errorFor('pricing.discount_unit_price')}
                  </CFormFeedback>
                ) : null}
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
                    disabled={financialLocked}
                    {...inputErrorProps('pricing.sst_percent')}
                  />
                  <span className="text-nowrap">SST Rate (%)</span>
                </div>
                {errorFor('pricing.sst_percent') ? (
                  <div className="invalid-feedback d-block" id="pricing-sst_percent-error">
                    {errorFor('pricing.sst_percent')}
                  </div>
                ) : null}
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
            color={showAddItemRow ? 'secondary' : 'primary'}
            size="sm"
            variant={showAddItemRow ? 'outline' : undefined}
            onClick={() => setShowAddItemRow((prev) => !prev)}
            disabled={financialLocked}
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
