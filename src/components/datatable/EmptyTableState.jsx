import React from 'react'

const EmptyTableState = ({ message = 'No records to display.', compact = false }) => (
  <div
    className={`data-table-empty-state${compact ? ' data-table-empty-state--compact' : ''}`}
    role="status"
    aria-live="polite"
  >
    {message}
  </div>
)

export default EmptyTableState
