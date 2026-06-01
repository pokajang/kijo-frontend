import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VendorLoaCreatePage from './VendorLoaCreatePage'
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

vi.mock('./create/VendorLoaCreateFlow', () => ({
  default: ({ project, onBack }) => (
    <div>
      <div>Vendor card project: {project.project_name}</div>
      <div>Project type: {project.project_type || '-'}</div>
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
        <Route path="/commercial/vendor-loa/create/:projectId" element={<VendorLoaCreatePage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('VendorLoaCreatePage origin handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('fetches full project details for vendor-loa-list origin when route state is present', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Full Project',
      project_type: 'Equipment Supply',
    })

    renderCreatePage({
      pathname: '/commercial/vendor-loa/create/12',
      search: '?from=vendor-loa-list',
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
    expect(await screen.findByText('Vendor card project: Full Project')).toBeInTheDocument()
  })

  it('keeps project-origin fast path by using route state when available', async () => {
    renderCreatePage({
      pathname: '/commercial/vendor-loa/create/12',
      state: {
        project: {
          id: 12,
          project_name: 'State Project',
          project_type: 'Equipment Supply',
        },
      },
    })

    expect(await screen.findByText('Vendor card project: State Project')).toBeInTheDocument()
    expect(screen.getByText('Project type: Equipment Supply')).toBeInTheDocument()
    expect(getProjectDetails).not.toHaveBeenCalled()
  })

  it('returns to vendor LOA list for vendor-loa-list origin', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Full Project',
      project_type: 'Equipment Supply',
    })

    renderCreatePage({
      pathname: '/commercial/vendor-loa/create/12',
      search: '?from=vendor-loa-list',
    })

    await screen.findByText('Vendor card project: Full Project')
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))

    expect(navigateMock).toHaveBeenCalledWith('/commercial/vendor-loa')
  })

  it('returns to manage project for project origin', async () => {
    renderCreatePage({
      pathname: '/commercial/vendor-loa/create/12',
      state: {
        project: {
          id: 12,
          project_name: 'State Project',
          project_type: 'Equipment Supply',
        },
      },
    })

    await screen.findByText('Vendor card project: State Project')
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))

    expect(navigateMock).toHaveBeenCalledWith('/project/manage/12')
  })
})
