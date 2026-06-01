import React from 'react'
import { CCol, CRow } from '@coreui/react'

const DataTableDetailFields = ({ fields = [], className = '' }) => (
  <CRow className={`g-3 ${className}`.trim()}>
    {fields
      .filter((field) => field && !field.hidden)
      .map((field) => {
        const {
          key,
          label,
          value,
          children,
          xs = 12,
          md = 6,
          className: fieldClassName = '',
        } = field
        return (
          <CCol key={key || label} xs={xs} md={md} className={fieldClassName}>
            <div className="data-table-detail-field">
              <div className="small text-muted data-table-detail-label">{label}</div>
              <div className="data-table-detail-value">{children ?? value ?? '-'}</div>
            </div>
          </CCol>
        )
      })}
  </CRow>
)

export default DataTableDetailFields
