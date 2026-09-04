import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CarryForwardModal from './CarryForwardModal'

const api = vi.hoisted(() => ({ carryTaskForward: vi.fn() }))

vi.mock('./taskUpdateApi', () => ({ carryTaskForward: api.carryTaskForward }))

describe('CarryForwardModal', () => {
  it('carries the existing task to a later due date', async () => {
    api.carryTaskForward.mockResolvedValueOnce({
      status: 'success',
      message: 'Task carried forward.',
    })
    const onSaved = vi.fn()

    render(
      <CarryForwardModal
        visible
        task={{ id: 42, title: 'Deploy application', dueDate: '2026-08-21' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    )

    fireEvent.change(screen.getByLabelText('New due date'), { target: { value: '2026-08-28' } })
    fireEvent.click(screen.getByRole('button', { name: 'Carry Forward' }))

    await waitFor(() => {
      expect(api.carryTaskForward).toHaveBeenCalledWith(42, '2026-08-28')
      expect(onSaved).toHaveBeenCalled()
    })
  })
})
