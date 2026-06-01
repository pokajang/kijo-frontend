import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JD14CreatePage from './JD14CreatePage'
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

vi.mock('./create/JD14CreateFlow', () => ({
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
        <Route path="/commercial/jd14/create/:projectId" element={<JD14CreatePage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('JD14CreatePage origin handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('fetches full project details for jd14-list origin even when route state is present', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Full Training Project',
      project_type: 'Training',
      quote_id: 77,
    })

    renderCreatePage({
      pathname: '/commercial/jd14/create/12',
      search: '?from=jd14-list',
      state: {
        project: {
          id: 12,
          project_name: 'Lightweight Training Project',
          project_type: 'Training',
        },
      },
    })

    await waitFor(() =>
      expect(getProjectDetails).toHaveBeenCalledWith('12', {
        signal: expect.any(AbortSignal),
      }),
    )
    expect(await screen.findByText('Project: Full Training Project')).toBeInTheDocument()
    expect(screen.getByText('Quote: 77')).toBeInTheDocument()
  })

  it('keeps project-origin fast path by using route state when available', async () => {
    renderCreatePage({
      pathname: '/commercial/jd14/create/12',
      state: {
        project: {
          id: 12,
          project_name: 'State Training Project',
          project_type: 'Training',
          quote_id: 88,
        },
      },
    })

    expect(await screen.findByText('Project: State Training Project')).toBeInTheDocument()
    expect(screen.getByText('Quote: 88')).toBeInTheDocument()
    expect(getProjectDetails).not.toHaveBeenCalled()
  })

  it('returns to JD14 list for jd14-list origin', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Full Training Project',
      project_type: 'Training',
    })

    renderCreatePage({
      pathname: '/commercial/jd14/create/12',
      search: '?from=jd14-list',
    })

    await screen.findByText('Project: Full Training Project')
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))

    expect(navigateMock).toHaveBeenCalledWith('/commercial/jd14')
  })

  it('returns to manage project for project origin', async () => {
    renderCreatePage({
      pathname: '/commercial/jd14/create/12',
      state: {
        project: {
          id: 12,
          project_name: 'State Training Project',
          project_type: 'Training',
        },
      },
    })

    await screen.findByText('Project: State Training Project')
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))

    expect(navigateMock).toHaveBeenCalledWith('/project/manage/12')
  })
})
