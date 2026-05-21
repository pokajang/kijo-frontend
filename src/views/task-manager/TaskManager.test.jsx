import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import TaskManager from './TaskManager'

vi.mock('./TaskTable', () => ({
  default: ({ onCreateTask }) => (
    <button type="button" onClick={onCreateTask}>
      Open Create Task
    </button>
  ),
}))

vi.mock('./CreateTask', () => ({
  default: ({ onCancel }) => (
    <button type="button" onClick={onCancel}>
      Cancel Task
    </button>
  ),
}))

vi.mock('../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
    prompt: vi.fn(),
  },
}))

const LocationProbe = () => {
  const location = useLocation()

  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

const renderTaskManager = (initialEntry = '/task-manager') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/task-manager"
          element={
            <>
              <TaskManager />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

describe('TaskManager route actions', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ status: 'success', tasks: [] }),
      })),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens create task modal from action=create and clears the query when closed', async () => {
    renderTaskManager('/task-manager?action=create')

    expect(await screen.findByText('Create Task')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Task' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/task-manager')
    })
  })
})
