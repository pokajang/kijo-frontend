import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import AppNotificationsDropdown from './AppNotificationsDropdown'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockConsumeEntity = vi.fn().mockResolvedValue(1)
let mockContext = {
  summary: { total: 0, listable_total: 0 },
  isStale: false,
  consumeEntity: mockConsumeEntity,
}
vi.mock('../../notifications/AppNotificationProvider', () => ({
  useAppNotifications: () => mockContext,
}))

const renderDropdown = () =>
  render(
    <MemoryRouter>
      <AppNotificationsDropdown />
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockContext = {
    summary: { total: 0, listable_total: 0 },
    isStale: false,
    consumeEntity: mockConsumeEntity,
  }
})

describe('AppNotificationsDropdown', () => {
  it('shows an unread dot and count from listable_total', () => {
    mockContext = {
      summary: { total: 5, listable_total: 3 },
      isStale: false,
      consumeEntity: mockConsumeEntity,
    }
    renderDropdown()

    // Badge reflects listable_total (3), not the all-module total (5).
    expect(screen.getByRole('button', { name: /3 unread notifications/i })).toBeInTheDocument()
  })

  it('shows no unread badge when listable_total is 0 even if total is positive', () => {
    // Regression: badge must match the list. Recompute-only modules can make
    // total>0 with nothing listable -> bell must NOT claim unread.
    mockContext = {
      summary: { total: 1, listable_total: 0 },
      isStale: false,
      consumeEntity: mockConsumeEntity,
    }
    renderDropdown()

    expect(screen.getByRole('button', { name: /^notifications$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unread notification/i })).not.toBeInTheDocument()
  })

  it('fetches and lists notifications when opened, then consumes and navigates on click', async () => {
    mockContext = {
      summary: { total: 1, listable_total: 1 },
      isStale: false,
      consumeEntity: mockConsumeEntity,
    }
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          items: [
            {
              id: 7,
              module_key: 'my.leaves',
              entity_type: 'leave_application',
              entity_id: 42,
              type: 'leave.approved',
              title: 'Leave approved',
              message: 'Your leave request has been approved.',
              route: '/my/leaves/records/42',
              severity: 'success',
              created_at: '2026-06-01 08:00:00',
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        },
      }),
    })

    renderDropdown()

    fireEvent.click(screen.getByRole('button', { name: /1 unread notification/i }))

    await waitFor(() => expect(screen.getByText('Leave approved')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('notifications/list?limit=20'),
      expect.objectContaining({ credentials: 'include' }),
    )

    fireEvent.click(screen.getByText('Leave approved'))

    expect(mockConsumeEntity).toHaveBeenCalledWith({
      moduleKey: 'my.leaves',
      entityType: 'leave_application',
      entityId: 42,
    })
    expect(mockNavigate).toHaveBeenCalledWith('/my/leaves/records/42')
  })

  it('shows the empty state when there are no notifications', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: { items: [], total: 0 } }),
    })

    renderDropdown()
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument())
  })

  it('surfaces the stale indicator from the provider', () => {
    mockContext = { summary: { total: 2 }, isStale: true, consumeEntity: mockConsumeEntity }
    renderDropdown()

    expect(screen.getByText(/counts may be out of date/i)).toBeInTheDocument()
  })
})
