import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import ModuleNavStrip, { isModuleTabNestedRoute } from './ModuleNavStrip'
import AppNotificationProvider from '../../notifications/AppNotificationProvider'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ModuleNavStrip', () => {
  it('renders a badge when a tab includes badge metadata', () => {
    render(
      <ModuleNavStrip
        ariaLabel="Client sections"
        tabs={[
          {
            key: 'vendor-registration',
            label: 'Vendor Registration',
            to: '/client/vendor-registration',
            badge: {
              color: 'danger',
              text: '4',
              title: 'Expired vendor registrations',
            },
          },
        ]}
      />,
    )

    expect(screen.getByRole('tab', { name: /vendor registration/i })).toBeInTheDocument()
    expect(screen.getByText('4')).toHaveAttribute('title', 'Expired vendor registrations')
  })

  it('renders notificationTabKey counts from the app notification summary', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'success',
        data: {
          total: 1,
          by_module: { 'staff.leaves': 1 },
          by_route_group: { '/staff/leaves': 1 },
          by_tab: { 'staff.leaves': 1 },
        },
      }),
    })

    render(
      <MemoryRouter initialEntries={['/staff/leaves']}>
        <AppNotificationProvider>
          <ModuleNavStrip
            ariaLabel="Staff sections"
            tabs={[
              {
                key: 'leaves',
                label: 'Leave Records',
                to: '/staff/leaves',
                notificationTabKey: 'staff.leaves',
              },
            ]}
          />
        </AppNotificationProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('1')).toHaveAttribute('title', 'Leave requests need attention')
    })
  })

  it('does not render on routes nested below a module tab path', () => {
    render(
      <MemoryRouter initialEntries={['/client/vendor-registration/create']}>
        <ModuleNavStrip
          ariaLabel="Client sections"
          tabs={[
            {
              key: 'vendor-registration',
              label: 'Vendor Registration',
              to: '/client/vendor-registration',
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('tab', { name: /vendor registration/i })).not.toBeInTheDocument()
  })

  it('still renders on exact module tab routes', () => {
    render(
      <MemoryRouter initialEntries={['/client/vendor-registration']}>
        <ModuleNavStrip
          ariaLabel="Client sections"
          tabs={[
            {
              key: 'vendor-registration',
              label: 'Vendor Registration',
              to: '/client/vendor-registration',
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /vendor registration/i })).toBeInTheDocument()
  })

  it('keeps controlled in-page tabs visible on nested routes', () => {
    render(
      <MemoryRouter initialEntries={['/project/manage/123']}>
        <ModuleNavStrip
          ariaLabel="Project record groups"
          activeTab="all-tab"
          onTabChange={vi.fn()}
          tabs={[
            { key: 'all-tab', label: 'All' },
            { key: 'my-tab', label: 'My Project' },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /^all$/i })).toBeInTheDocument()
  })

  it('detects nested tab routes without treating exact routes as nested', () => {
    const tab = { key: 'records', label: 'Records', to: '/pipeline/call-records' }

    expect(isModuleTabNestedRoute(tab, '/pipeline/call-records')).toBe(false)
    expect(isModuleTabNestedRoute(tab, '/pipeline/call-records/42')).toBe(true)
  })
})
