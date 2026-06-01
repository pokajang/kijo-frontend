import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

import WhatsNewRecords from './WhatsNewRecords'

vi.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { staff_id: 7, full_name: 'QA User', roles: ['System Admin'] },
  }),
}))

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => payload,
})

const LocationProbe = () => {
  const location = useLocation()
  return <span data-testid="location-path">{location.pathname}</span>
}

describe('WhatsNewRecords', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens kebab actions without activating the notice row', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          status: 'success',
          data: [
            {
              id: 42,
              title: 'makan nasi',
              summary: 'asdfasdf',
              published_at: '2026-05-14T15:43:54',
              is_published: true,
            },
          ],
          meta: { can_manage: true },
        }),
      ),
    )

    render(
      <MemoryRouter initialEntries={['/system-admin/whats-new']}>
        <WhatsNewRecords />
        <LocationProbe />
      </MemoryRouter>,
    )

    expect(await screen.findByText('makan nasi')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Manage notice' }))

    expect(await screen.findByText('Edit')).toBeInTheDocument()
    expect(screen.getByTestId('location-path')).toHaveTextContent('/system-admin/whats-new')

    fireEvent.click(screen.getByText('Edit'))

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent(
        '/system-admin/whats-new/42/edit',
      )
    })
  })
})
