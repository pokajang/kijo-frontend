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
})
