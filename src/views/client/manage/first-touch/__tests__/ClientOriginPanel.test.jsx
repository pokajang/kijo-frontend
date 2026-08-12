import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ClientOriginPanel from '../components/ClientOriginPanel'

describe('ClientOriginPanel submission permissions', () => {
  afterEach(() => {
    cleanup()
  })

  it('offers evidence submission for an authorized undocumented client', () => {
    const onSubmit = vi.fn()
    render(<ClientOriginPanel firstTouch={null} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Submit evidence' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('renders a read-only empty state when submission is not permitted', () => {
    render(<ClientOriginPanel firstTouch={null} />)

    expect(screen.queryByRole('button', { name: 'Submit evidence' })).not.toBeInTheDocument()
    expect(screen.getByText(/do not have permission to submit evidence/i)).toBeInTheDocument()
  })

  it('hides competing submission for a documented read-only client', () => {
    render(
      <ClientOriginPanel
        firstTouch={{
          status: 'current',
          source: 'Phone call',
          occurredAt: '2024-03-01',
          proofCount: 0,
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Submit evidence' })).not.toBeInTheDocument()
  })
})
