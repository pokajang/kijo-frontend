import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ItemsTable } from './CommercialDetailFields'

describe('ItemsTable responsive sizing', () => {
  afterEach(cleanup)

  it('preserves readable columns for wide commercial breakdowns', () => {
    const columns = Array.from({ length: 7 }, (_, index) => ({
      key: `column_${index}`,
      label: `Column ${index}`,
    }))

    render(<ItemsTable items={[{ id: 1, column_0: 'Industrial Hygiene' }]} columns={columns} />)

    expect(screen.getByRole('table')).toHaveStyle({ minWidth: '48rem' })
  })

  it('does not force horizontal scrolling for compact tables', () => {
    render(
      <ItemsTable
        items={[{ id: 1, description: 'Compact item' }]}
        columns={[{ key: 'description', label: 'Description' }]}
      />,
    )

    expect(screen.getByRole('table')).not.toHaveStyle({ minWidth: '48rem' })
  })

  it('renders optional summary rows across the table footer columns', () => {
    render(
      <ItemsTable
        items={[{ id: 1, description: 'Service', subtotal: '3000.00' }]}
        columns={[
          { key: 'description', label: 'Description' },
          { key: 'subtotal', label: 'Subtotal' },
        ]}
        summaryRows={[
          { key: 'subtotal', label: 'Subtotal (Before SST)', value: 'RM 2,950.00' },
          { key: 'grand-total', label: 'Grand Total', value: 'RM 2,950.00', strong: true },
        ]}
      />,
    )

    expect(screen.getByText('Subtotal (Before SST)')).toBeInTheDocument()
    expect(screen.getByText('Grand Total').closest('tr')).toHaveClass('fw-semibold')
    expect(screen.getAllByText('RM 2,950.00')).toHaveLength(2)
  })
})
