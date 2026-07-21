import React from 'react'
import { CBadge } from '@coreui/react'

const zoneColors = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
}

const QuoteApprovalBadge = ({ approval }) => {
  if (!approval?.zone) return null

  const zone = String(approval.zone).toLowerCase()

  return (
    <CBadge color={zoneColors[zone] || 'secondary'}>
      {zone.toUpperCase()} · {approval.status || 'unknown'}
    </CBadge>
  )
}

export default QuoteApprovalBadge
