// src/views/crm/quotes/special/LineItem.jsx

import React from 'react'
import { CRow, CCol, CFormTextarea, CFormSelect, CButton } from '@coreui/react'

// You can extend this list or fetch it from your API
const units = ['Per Item', 'Lump Sum', 'Hour', 'Day', 'Location']

/**
 * A single editable line item row.
 */
export default function LineItem({ item, index, onChange, onRemove }) {
  return (
    <CRow className="my-3 align-items-center">
      {/* Title */}
      <CCol md={3}>
        <CFormTextarea
          placeholder="e.g. Site Audit – Basic"
          rows={2}
          value={item.title}
          onChange={(e) => onChange(index, 'title', e.target.value)}
        />
      </CCol>

      {/* Description */}
      <CCol md={5}>
        <CFormTextarea
          placeholder="Short description of this line item"
          rows={2}
          value={item.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
        />
      </CCol>

      {/* Unit */}
      <CCol md={2}>
        <CFormSelect value={item.unit} onChange={(e) => onChange(index, 'unit', e.target.value)}>
          <option value="">Unit</option>
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </CFormSelect>
      </CCol>

      {/* Remove button */}
      <CCol md={2} className="text-center">
        <CButton color="danger" variant="outline" size="sm" onClick={() => onRemove(index)}>
          Remove
        </CButton>
      </CCol>
    </CRow>
  )
}
