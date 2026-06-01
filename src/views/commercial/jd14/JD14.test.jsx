import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JD14 from './JD14'
import { listActiveProjectOptions } from '../../project/manage/projectApi'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({
  default: () => null,
}))

vi.mock('./JD14Table', () => ({
  default: () => <div data-testid="jd14-table">JD14 table</div>,
}))

vi.mock('../../project/manage/projectApi', () => ({
  listActiveProjectOptions: vi.fn(),
}))

const renderJD14 = () =>
  render(
    <MemoryRouter>
      <JD14 />
    </MemoryRouter>,
  )

describe('JD14 create flow entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 'success', forms: [] }),
      }),
    )
    listActiveProjectOptions.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders Create JD14 as a card header action', () => {
    renderJD14()

    expect(screen.getByRole('button', { name: /create jd14/i })).toBeInTheDocument()
  })

  it('opens a project picker and loads active user-scoped training projects', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Training Alpha',
        client_name: 'Client A',
        project_type: 'Training',
      },
      {
        id: 13,
        project_name: 'Manpower Beta',
        client_name: 'Client B',
        project_type: 'Manpower Supply',
      },
    ])

    renderJD14()

    fireEvent.click(screen.getByRole('button', { name: /create jd14/i }))

    expect(await screen.findByText('Training Alpha for Client A')).toBeInTheDocument()
    expect(screen.queryByText('Manpower Beta for Client B')).not.toBeInTheDocument()
    expect(screen.getByText('Training')).toBeInTheDocument()
    expect(screen.queryByText(/ID 12/i)).not.toBeInTheDocument()
    expect(listActiveProjectOptions).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    })
  })

  it('shows an empty state when no active training projects are available', async () => {
    renderJD14()

    fireEvent.click(screen.getByRole('button', { name: /create jd14/i }))

    expect(
      await screen.findByText(/No active training projects are available for JD14 creation/i),
    ).toBeInTheDocument()
  })

  it('shows project loading errors in the picker', async () => {
    listActiveProjectOptions.mockRejectedValue(new Error('Unable to load training projects now.'))

    renderJD14()

    fireEvent.click(screen.getByRole('button', { name: /create jd14/i }))

    expect(await screen.findByText('Unable to load training projects now.')).toBeInTheDocument()
  })

  it('navigates to JD14 creation for the selected project', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Training Alpha',
        client_name: 'Client A',
        project_type: 'Training',
      },
    ])

    renderJD14()

    fireEvent.click(screen.getByRole('button', { name: /create jd14/i }))
    fireEvent.click(await screen.findByText('Training Alpha for Client A'))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/commercial/jd14/create/12?from=jd14-list', {
        state: {
          project: expect.objectContaining({
            id: 12,
            project_name: 'Training Alpha',
            project_type: 'Training',
          }),
        },
      }),
    )
  })
})
