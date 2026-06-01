import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InvoiceCreatePage from './InvoiceCreatePage'
import { getProjectDetails } from '../../project/manage/projectApi'

vi.mock('../../project/manage/projectApi', () => ({
  getProjectDetails: vi.fn(),
}))

vi.mock('./create/InvoiceCreateFlow', () => ({
  default: ({ project, origin }) => (
    <div>
      <div>Origin: {origin}</div>
      <div>Project: {project.project_name}</div>
      <div>Quote: {project.quote_id || '-'}</div>
    </div>
  ),
}))

const renderCreatePage = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/commercial/invoice/create/:projectId" element={<InvoiceCreatePage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('InvoiceCreatePage origin handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('fetches full project details for invoice-list origin even when route state is present', async () => {
    getProjectDetails.mockResolvedValue({
      id: 12,
      project_name: 'Full Project',
      project_type: 'Training',
      quote_id: 77,
    })

    renderCreatePage({
      pathname: '/commercial/invoice/create/12',
      search: '?from=invoice-list',
      state: {
        project: {
          id: 12,
          project_name: 'Lightweight Project',
          project_type: 'Training',
        },
      },
    })

    await waitFor(() =>
      expect(getProjectDetails).toHaveBeenCalledWith('12', {
        signal: expect.any(AbortSignal),
      }),
    )
    expect(await screen.findByText('Origin: invoice-list')).toBeInTheDocument()
    expect(screen.getByText('Project: Full Project')).toBeInTheDocument()
    expect(screen.getByText('Quote: 77')).toBeInTheDocument()
  })

  it('keeps project-origin fast path by using route state when available', async () => {
    renderCreatePage({
      pathname: '/commercial/invoice/create/12',
      state: {
        project: {
          id: 12,
          project_name: 'State Project',
          project_type: 'Training',
          quote_id: 88,
        },
      },
    })

    expect(await screen.findByText('Origin: project')).toBeInTheDocument()
    expect(screen.getByText('Project: State Project')).toBeInTheDocument()
    expect(getProjectDetails).not.toHaveBeenCalled()
  })
})
