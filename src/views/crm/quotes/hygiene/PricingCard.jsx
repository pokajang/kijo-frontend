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
} from '@coreui/react'

import DataTableActionMenu from '../../../../components/datatable/DataTableActionMenu'
import { calculateHygieneTotals } from '../../../../shared/invoice/hygienePricing'

const createDefaultItem = () => ({
  item_description: '',
  description: '',
  quantity: 1,
  unit: 'Lot',
  unit_price: '',
})

const getItemLineTotal = (item) => (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)

const normalizeItem = (item) => ({
  ...item,
  item_description: String(item.item_description || '').trim(),
  description: String(item.description || '').trim(),
  quantity: Number(item.quantity) || 0,
  unit: String(item.unit || '').trim() || 'Lot',
  unit_price: Number(item.unit_price) || 0,
})

const isValidItem = (item) =>
  String(item.item_description || '').trim() !== '' &&
  Number(item.quantity) > 0 &&
  Number(item.unit_price) > 0

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
  const [isAddingFee, setIsAddingFee] = useState(false)
  const [newItem, setNewItem] = useState(createDefaultItem)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editItem, setEditItem] = useState(createDefaultItem)

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

  const handleRemoveItem = (index) => () => {
    setFormData((prev) => {
      const nextItems = Array.isArray(prev.hygieneItems) ? [...prev.hygieneItems] : []
      nextItems.splice(index, 1)
      return { ...prev, hygieneItems: nextItems }
    })
  }

  const resetNewItem = () => {
    setNewItem(createDefaultItem())
  }

  const handleStartAddItem = () => {
    resetNewItem()
    setEditingIndex(null)
    setIsAddingFee(true)
  }

  const handleCancelNewItem = () => {
    resetNewItem()
    setIsAddingFee(false)
  }

  const handleStartEditItem = (index) => () => {
    setIsAddingFee(false)
    setEditingIndex(index)
    setEditItem({
      ...createDefaultItem(),
      ...(hygieneItems[index] || {}),
    })
  }

  const handleCancelEditItem = () => {
    setEditingIndex(null)
    setEditItem(createDefaultItem())
  }

  const handleSaveEditItem = () => {
    if (!isValidItem(editItem) || editingIndex === null) return

    setFormData((prev) => {
      const nextItems = Array.isArray(prev.hygieneItems) ? [...prev.hygieneItems] : []
      const existing = nextItems[editingIndex] || {}
      nextItems[editingIndex] = normalizeItem({ ...existing, ...editItem })
      return { ...prev, hygieneItems: nextItems }
    })
    handleCancelEditItem()
  }

  const canAddItem = isValidItem(newItem)
  const canSaveEditItem = isValidItem(editItem)

  const handleAddItem = () => {
    if (!canAddItem) return

    setFormData((prev) => ({
      ...prev,
      hygieneItems: [
        ...(Array.isArray(prev.hygieneItems) ? prev.hygieneItems : []),
        normalizeItem({
          id: `additional-${Date.now()}`,
          ...newItem,
        }),
      ],
    }))
    resetNewItem()
    setIsAddingFee(false)
  }

  const renderItemFormRows = ({
    label,
    item,
    setItem,
    primaryLabel,
    primaryDisabled,
    onPrimary,
    onCancel,
  }) => (
    <React.Fragment>
      <CTableRow>
        <CTableDataCell>{label}</CTableDataCell>
        <CTableDataCell>
          <CFormInput
            value={item.item_description}
            onChange={(event) =>
              setItem((prev) => ({
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
            value={item.description}
            onChange={(event) => setItem((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Optional notes"
          />
        </CTableDataCell>
        <CTableDataCell>
          <CFormInput
            type="number"
            min="0"
            value={item.quantity}
            onChange={(event) => setItem((prev) => ({ ...prev, quantity: event.target.value }))}
          />
        </CTableDataCell>
        <CTableDataCell>
          <CFormInput
            value={item.unit}
            onChange={(event) => setItem((prev) => ({ ...prev, unit: event.target.value }))}
          />
        </CTableDataCell>
        <CTableDataCell>
          <CFormInput
            type="number"
            min="0"
            step="0.01"
            value={item.unit_price}
            onChange={(event) => setItem((prev) => ({ ...prev, unit_price: event.target.value }))}
          />
        </CTableDataCell>
        <CTableDataCell className="text-end">{getItemLineTotal(item).toFixed(2)}</CTableDataCell>
        <CTableDataCell className="record-action-cell text-center" />
      </CTableRow>
      <CTableRow>
        <CTableDataCell colSpan={8}>
          <div className="d-flex justify-content-end gap-2 flex-wrap">
            <CButton color="primary" size="sm" disabled={primaryDisabled} onClick={onPrimary}>
              {primaryLabel}
            </CButton>
            <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </CButton>
          </div>
        </CTableDataCell>
      </CTableRow>
    </React.Fragment>
  )

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
                <CFormLabel>SST (%)</CFormLabel>
                <CFormInput
                  name="sstPercent"
                  type="number"
                  value={sstPercent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sstPercent: e.target.value }))}
                />
              </CCol>
            </CRow>

            <div className="mt-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <strong>Additional Fees</strong>
                {!isAddingFee && (
                  <CButton color="primary" size="sm" onClick={handleStartAddItem}>
                    Add Miscellaneous Fee
                  </CButton>
                )}
              </div>

              <div className="records-table-shell quote-line-items-table-shell overflow-hidden">
                {/* datatable-exempt: compact embedded quotation line-item table */}
                <CTable hover className="align-middle mb-0 records-table-compact">
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
                      <CTableHeaderCell
                        className="text-end"
                        style={{ width: '48px' }}
                        aria-label="Row actions"
                      >
                        <span className="visually-hidden">Actions</span>
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {hygieneItems.map((item, index) => {
                      if (editingIndex === index) {
                        return (
                          <React.Fragment key={item.id || index}>
                            {renderItemFormRows({
                              label: index + 1,
                              item: editItem,
                              setItem: setEditItem,
                              primaryLabel: 'Save',
                              primaryDisabled: !canSaveEditItem,
                              onPrimary: handleSaveEditItem,
                              onCancel: handleCancelEditItem,
                            })}
                          </React.Fragment>
                        )
                      }

                      return (
                        <CTableRow key={item.id || index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>{item.item_description || '-'}</CTableDataCell>
                          <CTableDataCell>{item.description || '-'}</CTableDataCell>
                          <CTableDataCell>{Number(item.quantity) || 0}</CTableDataCell>
                          <CTableDataCell>{item.unit || '-'}</CTableDataCell>
                          <CTableDataCell>{Number(item.unit_price || 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            {getItemLineTotal(item).toFixed(2)}
                          </CTableDataCell>
                          <CTableDataCell
                            className="record-action-cell text-center"
                            data-no-row-open="true"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DataTableActionMenu
                              record={item}
                              actionKey={`hygiene-fee-${item.id || index}`}
                              ariaLabel={`Additional fee actions for ${item.item_description || index + 1}`}
                              actions={[
                                {
                                  key: 'edit',
                                  label: 'Edit',
                                  onClick: handleStartEditItem(index),
                                },
                                {
                                  key: 'delete',
                                  label: 'Delete',
                                  danger: true,
                                  onClick: handleRemoveItem(index),
                                },
                              ]}
                            />
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                    {hygieneItems.length === 0 && !isAddingFee && (
                      <CTableRow>
                        <CTableDataCell colSpan={8} className="text-muted">
                          No miscellaneous fees added.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                    {isAddingFee &&
                      renderItemFormRows({
                        label: 'New',
                        item: newItem,
                        setItem: setNewItem,
                        primaryLabel: 'Add',
                        primaryDisabled: !canAddItem,
                        onPrimary: handleAddItem,
                        onCancel: handleCancelNewItem,
                      })}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default PricingCard
