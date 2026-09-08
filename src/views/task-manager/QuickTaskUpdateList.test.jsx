import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import QuickTaskUpdateList, { QUICK_UPDATE_DISMISSED_KEY } from './QuickTaskUpdateList'

const openTask = {
  id: 42,
  title: 'Prepare management report',
  status: 'Ongoing',
  createdAt: '2026-08-01 09:00:00',
  dueDate: '2026-09-10',
}

beforeEach(() => window.localStorage.clear())

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('QuickTaskUpdateList', () => {
  it('lists only ongoing tasks', () => {
    render(
      <QuickTaskUpdateList
        tasks={[openTask, { ...openTask, id: 43, title: 'Closed task', status: 'Completed' }]}
      />,
    )

    expect(screen.getByText('Prepare management report')).toBeInTheDocument()
    expect(screen.queryByText('Closed task')).not.toBeInTheDocument()
  })

  it('persists dismissed tasks so they do not return to the quick list', () => {
    const { unmount } = render(<QuickTaskUpdateList tasks={[openTask]} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss Prepare management report from quick updates' }),
    )
    expect(screen.queryByText('Prepare management report')).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(QUICK_UPDATE_DISMISSED_KEY))).toEqual(['42'])

    unmount()
    render(<QuickTaskUpdateList tasks={[openTask]} />)
    expect(screen.queryByText('Prepare management report')).not.toBeInTheDocument()
  })

  it('allows an accidental dismissal to be undone in the current modal', () => {
    render(<QuickTaskUpdateList tasks={[openTask]} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss Prepare management report from quick updates' }),
    )
    expect(screen.getByText('Task removed from Quick Update.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Prepare management report')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(QUICK_UPDATE_DISMISSED_KEY))).toEqual([])
  })

  it('orders open tasks by the nearest due date', () => {
    render(
      <QuickTaskUpdateList
        tasks={[openTask, { ...openTask, id: 44, title: 'Earlier task', dueDate: '2026-09-08' }]}
      />,
    )

    const taskTitles = screen
      .getAllByRole('article')
      .map((article) => article.querySelector('.fw-semibold')?.textContent)
    expect(taskTitles).toEqual(['Earlier task', 'Prepare management report'])
  })

  it('shows an intentional empty state when no open tasks remain', () => {
    render(<QuickTaskUpdateList tasks={[{ ...openTask, status: 'Completed' }]} />)
    expect(screen.getByText('No open tasks available for a quick update.')).toBeInTheDocument()
  })

  it('saves a dated progress update and clears the handled card', async () => {
    const onSaveUpdate = vi.fn().mockResolvedValue({ status: 'success' })
    render(<QuickTaskUpdateList tasks={[openTask]} onSaveUpdate={onSaveUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    fireEvent.change(screen.getByPlaceholderText('What changed or moved forward?'), {
      target: { value: 'Draft completed for management review.' },
    })
    fireEvent.change(screen.getByLabelText('Reporting date'), {
      target: { value: '2026-09-04' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save update' }))

    await waitFor(() =>
      expect(onSaveUpdate).toHaveBeenCalledWith(42, {
        update_type: 'progress',
        reporting_date: '2026-09-04',
        note: 'Draft completed for management review.',
      }),
    )
    expect(screen.queryByText('Prepare management report')).not.toBeInTheDocument()
  })

  it('sends the selected completion date through the quick completion action', async () => {
    const onCompleteTask = vi.fn().mockResolvedValue({ status: 'success' })
    render(<QuickTaskUpdateList tasks={[openTask]} onCompleteTask={onCompleteTask} />)

    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))
    fireEvent.change(screen.getByLabelText('Completion date'), {
      target: { value: '2026-09-05' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Complete task' }))

    await waitFor(() => expect(onCompleteTask).toHaveBeenCalledWith(42, '2026-09-05'))
    expect(screen.queryByText('Prepare management report')).not.toBeInTheDocument()
  })

  it('keeps the editor open and focuses an inline error when an update is empty', async () => {
    const onSaveUpdate = vi.fn()
    render(<QuickTaskUpdateList tasks={[openTask]} onSaveUpdate={onSaveUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save update' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Add a short update before saving.')
    expect(onSaveUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Prepare management report')).toBeInTheDocument()
  })
})
