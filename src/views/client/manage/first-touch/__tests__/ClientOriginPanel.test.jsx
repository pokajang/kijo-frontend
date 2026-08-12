import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ClientOriginPanel from '../components/ClientOriginPanel'

describe('ClientOriginPanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a concise empty state', () => {
    render(<ClientOriginPanel firstTouch={null} />)

    expect(screen.getByText('No first-touch evidence recorded.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows factual first-touch fields without icon-led presentation', () => {
    render(
      <ClientOriginPanel
        firstTouch={{
          status: 'current',
          source: 'Phone call',
          occurredAt: '2024-03-01',
          clientContact: 'Ms Lim',
          amioshContact: 'Daniel Lee',
          proofCount: 0,
        }}
      />,
    )

    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('Client contact')).toBeInTheDocument()
    expect(screen.getByText('Daniel Lee')).toBeInTheDocument()
  })

  it('places conflict review next to the contested marker for authorized reviewers', () => {
    const onReviewConflict = vi.fn()
    render(
      <ClientOriginPanel
        firstTouch={{ status: 'contested', source: 'Phone call', occurredAt: '2024-03-01' }}
        onReviewConflict={onReviewConflict}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Review conflict' }))

    expect(onReviewConflict).toHaveBeenCalledOnce()
  })
})
