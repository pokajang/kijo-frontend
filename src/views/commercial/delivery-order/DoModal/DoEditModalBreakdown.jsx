import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CButton,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'

const DoEditModalBreakdown = ({ formData, setFormData }) => {
  // ─────────────────────────────────────────────────────────────
  // 1) Central change handler with debug logging
  // ─────────────────────────────────────────────────────────────
  const handleNewItemChange = (key, value) => {
    console.log(`handleNewItemChange('${key}') →`, value)
    setFormData((prev) => ({
      ...prev,
      newItem: { ...prev.newItem, [key]: value },
    }))
  }

  // ─────────────────────────────────────────────────────────────
  // 2) Add-item logic with debug before you build the payload
  // ─────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    console.log('About to add:', formData.newItem)
    const { item_name, description, quantity, unit } = formData.newItem || {}
    if (item_name && description && Number(quantity) > 0) {
      const newItem = {
        item_name,
        description,
        quantity: Number(quantity),
        unit: unit || 'pcs',
        id: Date.now(),
      }
      setFormData((prev) => ({
        ...prev,
        breakdown: [...prev.breakdown, newItem],
        newItem: {
          item_name: '',
          description: '',
          quantity: 1,
          unit: 'pcs', // reset with a default
        },
      }))
    }
  }

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      breakdown: prev.breakdown.filter((_, i) => i !== index),
    }))
  }

  const { newItem = {} } = formData
  const isValid =
    newItem.item_name?.trim() && newItem.description?.trim() && Number(newItem.quantity) > 0

  // set of units
  const units = [
    { unit: 'pcs', info: 'pieces of individual items' },
    { unit: 'set', info: 'set of grouped items' },
    { unit: 'box', info: 'boxed items for delivery' },
    { unit: 'pack', info: 'packaged units' },
    { unit: 'carton', info: 'bulk carton packaging' },
    { unit: 'roll', info: 'rolled items like fabric or wire' },
    { unit: 'kg', info: 'weight in kilograms' },
    { unit: 'g', info: 'weight in grams' },
    { unit: 'ton', info: 'metric tons of goods' },
    { unit: 'l', info: 'volume in liters' },
    { unit: 'ml', info: 'volume in milliliters' },
    { unit: 'bottle', info: 'bottled items' },
    { unit: 'can', info: 'canned goods' },
    { unit: 'tube', info: 'tubed items like ointments' },
    { unit: 'copy', info: 'printed documents or reports' },
    { unit: 'sheet', info: 'individual pages or metal sheets' },
    { unit: 'm', info: 'length in meters' },
    { unit: 'cm', info: 'length in centimeters' },
    { unit: 'inch', info: 'length in inches' },
    { unit: 'foot', info: 'length in feet' },
    { unit: 'pair', info: 'pair of items (2 pcs)' },
    { unit: 'dozen', info: '12 items' },
    { unit: 'reel', info: 'rolled materials like cable' },
    { unit: 'bundle', info: 'grouped materials' },
    { unit: 'bag', info: 'bagged items' },
  ]

  return (
    <CCard className="mt-4">
      <CCardHeader>
        <strong>Item Breakdown</strong>
      </CCardHeader>
      <CCardBody>
        {formData.breakdown?.length > 0 && (
          /* datatable-exempt: existing embedded/layout table */
          <CTable striped className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>#</CTableHeaderCell>
                <CTableHeaderCell>Item</CTableHeaderCell>
                <CTableHeaderCell>Description</CTableHeaderCell>
                <CTableHeaderCell>Quantity</CTableHeaderCell>
                <CTableHeaderCell>Unit</CTableHeaderCell>
                <CTableHeaderCell>Action</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {formData.breakdown.map((item, idx) => (
                <CTableRow key={item.id || `${item.item_name}-${idx}`}>
                  <CTableDataCell>{idx + 1}</CTableDataCell>
                  <CTableDataCell>{item.item_name}</CTableDataCell>
                  <CTableDataCell>{item.description}</CTableDataCell>
                  <CTableDataCell>{item.quantity}</CTableDataCell>
                  <CTableDataCell>{item.unit || 'pcs'}</CTableDataCell>
                  <CTableDataCell>
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      Remove
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}

        <CRow className="mt-4">
          <CCol md={3}>
            <CFormLabel>Item</CFormLabel>
            <CFormInput
              value={newItem.item_name || ''}
              onChange={(e) => handleNewItemChange('item_name', e.target.value)}
              placeholder="E.g. Hard copy report"
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel>Description</CFormLabel>
            <CFormTextarea
              rows={1}
              value={newItem.description || ''}
              onChange={(e) => handleNewItemChange('description', e.target.value)}
              placeholder="E.g. Full report of Chemical Health Risk Assessment..."
            />
          </CCol>

          <CCol md={2}>
            <CFormLabel>Quantity</CFormLabel>
            <CFormInput
              type="number"
              min="1"
              value={newItem.quantity ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                handleNewItemChange('quantity', isNaN(v) ? '' : v)
              }}
            />
          </CCol>

          <CCol md={2}>
            <CFormLabel>Unit</CFormLabel>
            <CFormSelect
              value={newItem.unit}
              onChange={(e) => handleNewItemChange('unit', e.target.value)}
            >
              <option value="">Select Unit</option>
              {units.map((u, i) => (
                <option key={i} value={u.unit}>
                  {`${u.unit} - ${u.info}`}
                </option>
              ))}
            </CFormSelect>
          </CCol>

          <CCol md={1} className="d-flex align-items-end">
            <CButton color="primary" size="sm" onClick={handleAddItem} disabled={!isValid}>
              Add
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default DoEditModalBreakdown
