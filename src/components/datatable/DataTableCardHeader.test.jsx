import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import DataTableCardHeader from './DataTableCardHeader'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-30T12:00:00+08:00'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('DataTableCardHeader', () => {
  it('renders the title', () => {
    render(<DataTableCardHeader title="Quotes" />)

    expect(screen.getByText('Quotes')).toBeInTheDocument()
  })

  it('can render a semantic heading without changing the shared title class', () => {
    render(<DataTableCardHeader title="Weekly Summary" titleAs="h1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Weekly Summary' })).toHaveClass(
      'data-table-card-header__title',
    )
  })

  it('renders a formatted YTD scope label', () => {
    render(<DataTableCardHeader title="Quotes" scopeLabel="YTD 2026" />)

    expect(screen.getByText('1 Jan - 30 May 2026')).toBeInTheDocument()
  })

  it('renders action children on the right', () => {
    render(
      <DataTableCardHeader title="Quotes">
        <button type="button">Create Quotation</button>
      </DataTableCardHeader>,
    )

    expect(screen.getByRole('button', { name: 'Create Quotation' })).toBeInTheDocument()
    expect(screen.getByRole('button').closest('.data-table-card-header__actions')).toBeTruthy()
  })

  it('omits the scope element for an empty label', () => {
    const { container } = render(<DataTableCardHeader title="Quotes" scopeLabel="" />)

    expect(container.querySelector('.data-table-card-header__scope')).toBeNull()
  })

  it('passes extra props through to the card header', () => {
    render(<DataTableCardHeader title="Quotes" data-testid="quotes-header" />)

    expect(screen.getByTestId('quotes-header')).toHaveClass('data-table-card-header')
  })
})
