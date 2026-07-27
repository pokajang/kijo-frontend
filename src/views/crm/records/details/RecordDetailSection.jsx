import React from 'react'
import { CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

const hasDisplayValue = (value) => value !== null && value !== undefined && value !== ''

export const RecordDetailField = ({
  label,
  value,
  children,
  md = 6,
  lg = 4,
  valueClassName = '',
}) => {
  const content = children ?? (hasDisplayValue(value) ? value : 'Not provided')

  return (
    <CCol xs={12} md={md} lg={lg}>
      <div className="records-detail-field records-detail-field--inline">
        <div className="small text-muted records-detail-label">{label}</div>
        <div className={`records-detail-value ${valueClassName}`.trim()}>{content}</div>
      </div>
    </CCol>
  )
}

const RecordDetailSection = ({ title, children, bodyClassName = '' }) => (
  <>
    <CCardHeader className="records-detail-section-header">
      <h2 className="h6 mb-0">{title}</h2>
    </CCardHeader>
    <CCardBody className={bodyClassName}>
      <CRow className="g-3">{children}</CRow>
    </CCardBody>
  </>
)

export default RecordDetailSection
