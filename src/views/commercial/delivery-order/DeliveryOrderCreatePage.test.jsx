import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import DeliveryOrderCreatePage from './DeliveryOrderCreatePage'
import { getProjectDetails } from '../../project/manage/projectApi'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../project/manage/projectApi', () => ({
  getProjectDetails: vi.fn(),
}))

vi.mock('./create/DeliveryOrderCreateFlow', () => ({
  default: ({ project, onBack }) => (
    <div>
      <div>Project: {project.project_name}</div>
      <div>Quote: {project.quote_id || '-'}</div>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}))

const renderCreatePage = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/commercial/delivery-order/create/:projectId"
          element={<DeliveryOrderCreatePage />}
        />
      </Routes>
    </MemoryRouter>,
  )

const createDeferred = () => {
  let resolve
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

describe('DeliveryOrderCreatePage origin handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('fetches full project details for delivery-order-list origin when route state is present', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Full Project',
      project_type: 'Equipment Supply',
      quote_id: 77,
    })

    renderCreatePage({
      pathname: '/commercial/delivery-order/create/12',
      search: '?from=delivery-order-list',
      state: {
        project: {
          id: 12,
          project_name: 'Lightweight Project',
          project_type: 'Equipment Supply',
        },
      },
    })

    await waitFor(() =>
      expect(getProjectDetails).toHaveBeenCalledWith('12', {
        signal: expect.any(AbortSignal),
      }),
    )
    expect(await screen.findByText('Project: Full Project')).toBeInTheDocument()
    expect(screen.getByText('Quote: 77')).toBeInTheDocument()
  })

  it('renders route state immediately and refreshes it for project-origin navigation', async () => {
    const detailRequest = createDeferred()
    getProjectDetails.mockReturnValue(detailRequest.promise)
    const freshProject = {
      id: 12,
      project_name: 'Fresh Project',
      project_type: 'Equipment Supply',
      quote_id: 99,
    }

    renderCreatePage({
      pathname: '/commercial/delivery-order/create/12',
      state: {
        project: {
          id: 12,
          project_name: 'State Project',
          project_type: 'Equipment Supply',
          quote_id: 88,
        },
      },
    })

    expect(await screen.findByText('Project: State Project')).toBeInTheDocument()
    expect(screen.getByText('Quote: 88')).toBeInTheDocument()
    await waitFor(() =>
      expect(getProjectDetails).toHaveBeenCalledWith('12', {
        signal: expect.any(AbortSignal),
      }),
    )
    detailRequest.resolve(freshProject)
    expect(await screen.findByText('Project: Fresh Project')).toBeInTheDocument()
    expect(screen.getByText('Quote: 99')).toBeInTheDocument()
  })

  it('returns to delivery order list for delivery-order-list origin', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Full Project',
      project_type: 'Equipment Supply',
    })

    renderCreatePage({
      pathname: '/commercial/delivery-order/create/12',
      search: '?from=delivery-order-list',
    })

    await screen.findByText('Project: Full Project')
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))

    expect(navigateMock).toHaveBeenCalledWith('/commercial/delivery-order')
  })

  it('returns to manage project for project origin', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Fresh Project',
      project_type: 'Equipment Supply',
    })

    renderCreatePage({
      pathname: '/commercial/delivery-order/create/12',
      state: {
        project: {
          id: 12,
          project_name: 'State Project',
          project_type: 'Equipment Supply',
        },
      },
    })

    await screen.findByText('Project: State Project')
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))

    expect(navigateMock).toHaveBeenCalledWith('/project/manage/12')
  })
})
