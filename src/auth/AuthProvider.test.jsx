import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AuthProvider, { useAuth } from './AuthProvider'

const apiMocks = vi.hoisted(() => ({
  installApiClient: vi.fn(() => () => {}),
  setCsrfToken: vi.fn(),
}))

vi.mock('../api/apiClient', () => apiMocks)

const authenticatedSessionResponse = () => ({
  status: 200,
  json: async () => ({
    status: 'success',
    csrf_token: 'csrf-token',
    user: { staff_id: 7, roles: ['Staff'] },
  }),
})

const Probe = () => {
  const { status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="path">{location.pathname}</span>
      <button type="button" onClick={() => navigate('/records')}>
        Open records
      </button>
    </div>
  )
}

describe('AuthProvider session refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.installApiClient.mockImplementation(() => () => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(authenticatedSessionResponse()))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not revalidate the session when navigating between protected routes', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(fetch).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Open records' }))
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/records'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('validates the session when moving from a public route to a protected route', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Open records' }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
