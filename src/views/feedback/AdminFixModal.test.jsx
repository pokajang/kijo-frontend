import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AdminFixModal from './AdminFixModal'

afterEach(() => {
  cleanup()
})

describe('AdminFixModal', () => {
  it('renders status and resolution track as separate admin fields', () => {
    const onChangeField = vi.fn()

    render(
      <AdminFixModal
        visible
        data={{
          id: 1,
          status: 'Pending',
          resolution_track: 'Needs Triage',
          action_date: '2026-06-17',
          remarks: '',
        }}
        onClose={vi.fn()}
        onChangeField={onChangeField}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Resolution Track')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pending')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Needs Triage')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Needs Triage'), {
      target: { value: '30-Day Fix' },
    })

    expect(onChangeField).toHaveBeenCalledWith('resolution_track', '30-Day Fix')
  })
})
