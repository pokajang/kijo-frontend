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
            <div className="small text-muted">{label}</div>
            <div>{children ?? value ?? '-'}</div>
          </CCol>
        )
      })}
  </CRow>
)

export default DataTableDetailFields
