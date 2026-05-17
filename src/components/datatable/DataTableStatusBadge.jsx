import React from 'react'
import { CBadge } from '@coreui/react'

const DataTableStatusBadge = ({
  children,
  tone = 'info',
  size = 'sm',
  shape = 'rounded',
  className = '',
}) => (
  <CBadge
    className={`data-table-status-badge data-table-status-badge--${tone} data-table-status-badge--${size} data-table-status-badge--${shape} records-status-badge records-status-badge--${tone} ${className}`.trim()}
  >
    {children}
  </CBadge>
)

export default DataTableStatusBadge
