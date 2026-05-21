import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import StatCard from './StatCard'

afterEach(() => {
  cleanup()
})

describe('StatCard', () => {
  it('renders actionable stat cards with click and keyboard affordances', async () => {
    const onClick = vi.fn()

    render(
      <StatCard
        label="Pending"
        value="3"
        tone="warning"
        onClick={onClick}
        actionTooltip="Drill in"
      />,
    )

    const card = screen.getByRole('button')
    expect(card).toHaveClass('stats-strip-widget--action')

    fireEvent.click(card)
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.keyDown(card, { key: ' ' })

    expect(onClick).toHaveBeenCalledTimes(3)

    fireEvent.mouseOver(card)
    expect(await screen.findByText('Drill in')).toBeInTheDocument()
  })

  it('does not render non-actionable cards as buttons', () => {
    render(<StatCard label="Total" value="10" tone="primary" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Total').closest('.stats-strip-widget')).not.toHaveClass(
      'stats-strip-widget--action',
    )
  })
})
