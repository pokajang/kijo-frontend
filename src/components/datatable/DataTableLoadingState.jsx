import React from 'react'
import { CSpinner } from '@coreui/react'

const DataTableLoadingState = ({ message = 'Loading records...' }) => (
  <div className="text-center py-4 text-muted">
    <CSpinner size="sm" className="me-2" />
    {message}
  </div>
)

export default DataTableLoadingState
