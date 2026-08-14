import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SupplierPoCreatePage from './SupplierPoCreatePage'

const navigateMock = vi.hoisted(() => vi.fn())
const supplierPoMock = vi.hoisted(() => vi.fn())
const choiceMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../catalog/supplier-po/SupplierPo', () => ({
  default: (props) => {
    supplierPoMock(props)
    return (
      <button type="button" onClick={() => props.onCreated({ poId: 99 })}>
        Mock Create Supplier PO
      </button>
    )
  },
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    choice: choiceMock,
  },
}))

const renderCreatePage = (entry) =>
  render(
    <MemoryRouter
      initialEntries={[
        entry || {
          pathname: '/commercial/supplier-po/create/12',
          search: '?from=supplier-po-list',
          state: {
            project: {
              id: 12,
              project_name: 'Project Alpha',
              project_type: 'Equipment Supply',
            },
          },
        },
      ]}
    >
      <Routes>
        <Route
          path="/commercial/supplier-po/create/:projectId"
          element={<SupplierPoCreatePage />}
        />
      </Routes>
    </MemoryRouter>,
  )

describe('SupplierPoCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    choiceMock.mockResolvedValue('list')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the shared Supplier PO form as a locked commercial project create page', () => {
    renderCreatePage()

    expect(supplierPoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'commercial',
        initialProjectId: 12,
        lockProject: true,
        initialProject: expect.objectContaining({
          id: 12,
          project_name: 'Project Alpha',
        }),
      }),
    )
  })

  it('shows the shared success choice and follows the selected action', async () => {
    renderCreatePage()

    fireEvent.click(screen.getByRole('button', { name: /mock create supplier po/i }))

    await waitFor(() => expect(choiceMock).toHaveBeenCalledTimes(1))
    expect(choiceMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ title: 'Supplier PO Created' }),
    )
    expect(navigateMock).toHaveBeenCalledWith('/commercial/supplier-po')
  })

  it('derives a stable project from the route when route state is missing', () => {
    renderCreatePage({
      pathname: '/commercial/supplier-po/create/88',
      search: '',
    })

    expect(supplierPoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialProjectId: '88',
        initialProject: expect.objectContaining({
          id: '88',
          project_id: '88',
          project_name: 'Project #88',
        }),
      }),
    )
  })
})
