import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WeeklyUpdateModal from './WeeklyUpdateModal'

const api = vi.hoisted(() => ({ createTaskUpdate: vi.fn() }))

vi.mock('./taskUpdateApi', () => ({ createTaskUpdate: api.createTaskUpdate }))

describe('WeeklyUpdateModal', () => {
  it('submits a typed hiccup for the selected reporting week', async () => {
    api.createTaskUpdate.mockResolvedValueOnce({ status: 'success', message: 'Hiccup reported.' })
    const onSaved = vi.fn()
    const onClose = vi.fn()

    render(
      <WeeklyUpdateModal
        visible
        task={{ id: 42, title: 'Deploy application', dueDate: '2026-08-21' }}
        onClose={onClose}
        onSaved={onSaved}
      />,
    )

    fireEvent.click(screen.getByLabelText('Hiccup'))
    fireEvent.change(screen.getByLabelText('Update'), {
      target: { value: 'Waiting for payment approval.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Report Hiccup' }))

    await waitFor(() => {
      expect(api.createTaskUpdate).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          update_type: 'hiccup',
          note: 'Waiting for payment approval.',
        }),
      )
      expect(onSaved).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('keeps the modal open and explains when the note is empty', () => {
    render(
      <WeeklyUpdateModal
        visible
        task={{ id: 42, title: 'Deploy application', dueDate: '2026-08-21' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save Update' }))

    expect(screen.getByText('Enter a short update before saving.')).toBeInTheDocument()
  })
})
