import React from 'react'
import { CCard, CCardBody } from '@coreui/react'

const SummaryTile = ({ label, value, color }) => (
  <CCard className={`border-${color} h-100`}>
    <CCardBody className="py-2">
      <div className="text-uppercase text-muted small">{label}</div>
      <div className={`h4 mb-0 text-${color}`}>{value}</div>
    </CCardBody>
  </CCard>
)

export default SummaryTile
