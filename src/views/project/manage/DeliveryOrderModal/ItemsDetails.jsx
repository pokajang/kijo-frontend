// src/views/project/ItemsDetails.jsx
import React, { useState } from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'

const units = [
  'pcs',
  'set',
  'box',
  'pack',
  'carton',
  'roll',
  'kg',
  'g',
  'ton',
  'l',
  'ml',
  'bottle',
  'can',
  'tube',
  'copy',
  'sheet',
  'm',
  'cm',
  'inch',
  'foot',
  'pair',
  'dozen',
  'reel',
  'bundle',
  'bag',
]

const ItemsDetails = ({ items, setItems }) => {
  const [currentItem, setCurrentItem] = useState({
    name: '',
    description: '',
    item_remarks: '',
    quantity: 1,
    unit: '',
  })

  const handleAddItem = () => {
    if (!currentItem.name || currentItem.quantity < 1) return
    setItems([...items, { ...currentItem, id: Date.now() }])
    setCurrentItem({ name: '', description: '', item_remarks: '', quantity: 1, unit: '' })
  }

  const handleRemoveItem = (id) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleItemChange = (id, field) => (e) => {
    const value = field === 'quantity' ? parseInt(e.target.value, 10) || 0 : e.target.value
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <>
      <CCardHeader>
        <strong>Items Details</strong>
      </CCardHeader>
      <CCardBody>
        {/* Add New Item */}
        <CRow className="mb-3">
          <CCol md={2}>
            <CFormLabel>Item</CFormLabel>
            <CFormInput
              type="text"
              value={currentItem.name}
              onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
              placeholder="E.g. Hard copy report"
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Description</CFormLabel>
            <CFormTextarea
              rows={1}
              value={currentItem.description}
              onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
              placeholder="E.g. Full report..."
            />
            <CFormTextarea
              rows={2}
              maxLength={2000}
              className="mt-2"
              value={currentItem.item_remarks}
              onChange={(e) => setCurrentItem({ ...currentItem, item_remarks: e.target.value })}
              placeholder="Client specifications / item remarks"
            />
          </CCol>
          <CCol md={2}>
            <CFormLabel>Quantity</CFormLabel>
            <CFormInput
              type="number"
              min="1"
              value={currentItem.quantity}
              onChange={(e) =>
                setCurrentItem({
                  ...currentItem,
                  quantity: parseInt(e.target.value, 10) || 1,
                })
              }
            />
          </CCol>
          <CCol md={2}>
            <CFormLabel>Unit</CFormLabel>
            <select
              className="form-select"
              value={currentItem.unit}
              onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </CCol>
          <CCol md={2} className="d-flex align-items-end">
            <CButton color="primary" size="sm" onClick={handleAddItem}>
              Add Item
            </CButton>
          </CCol>
        </CRow>

        {/* Editable Items Table */}
        {items.length > 0 && (
          /* datatable-exempt: existing embedded/layout table */
          <CTable striped className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>#</CTableHeaderCell>
                <CTableHeaderCell>Item</CTableHeaderCell>
                <CTableHeaderCell>Description</CTableHeaderCell>
                <CTableHeaderCell>Specifications / Remarks</CTableHeaderCell>
                <CTableHeaderCell>Quantity</CTableHeaderCell>
                <CTableHeaderCell>Unit</CTableHeaderCell>
                <CTableHeaderCell>Action</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {items.map((item, idx) => (
                <CTableRow key={item.id}>
                  <CTableHeaderCell>{idx + 1}</CTableHeaderCell>
                  <CTableDataCell>
                    <CFormInput
                      type="text"
                      value={item.name}
                      onChange={handleItemChange(item.id, 'name')}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CFormTextarea
                      rows={2}
                      maxLength={5000}
                      value={item.description}
                      onChange={handleItemChange(item.id, 'description')}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CFormTextarea
                      rows={2}
                      maxLength={2000}
                      value={item.item_remarks || ''}
                      onChange={handleItemChange(item.id, 'item_remarks')}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CFormInput
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={handleItemChange(item.id, 'quantity')}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <select
                      className="form-select"
                      value={item.unit}
                      onChange={handleItemChange(item.id, 'unit')}
                    >
                      <option value="">Select unit</option>
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      Remove
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </>
  )
}

export default ItemsDetails
