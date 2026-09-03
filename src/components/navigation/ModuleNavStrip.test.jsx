import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import ModuleNavStrip, { isModuleTabNestedRoute } from './ModuleNavStrip'
import AppNotificationProvider from '../../notifications/AppNotificationProvider'
import WorkflowSetupStatusProvider from '../../workflows/WorkflowSetupStatusProvider'
import { AuthContext } from '../../auth/AuthProvider'

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

  it('renders workflow setup warning badges for workflow tabs', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'success',
        data: {
          total_missing: 2,
          templates: {
            'salary-application': { missing: 0 },
            'vendor-payment': { missing: 0 },
            'leave-application': { missing: 2 },
            'quote-price-exception': { missing: 0 },
          },
        },
      }),
    })

    render(
      <MemoryRouter initialEntries={['/workflows/leave-application']}>
        <WorkflowSetupStatusProvider>
          <ModuleNavStrip
            ariaLabel="Workflow sections"
            tabs={[
              {
                key: 'salary-application',
                label: 'Salary',
                to: '/workflows/salary-application',
                workflowSetupKey: 'salary-application',
              },
              {
                key: 'leave-application',
                label: 'Leave Application',
                to: '/workflows/leave-application',
                workflowSetupKey: 'leave-application',
              },
            ]}
          />
        </WorkflowSetupStatusProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('2')).toHaveAttribute('title', 'Workflow recipients not configured')
    })
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('prefers explicit tab badges over workflow setup badges', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'success',
        data: {
          total_missing: 3,
          templates: {
            'leave-application': { missing: 3 },
          },
        },
      }),
    })

    render(
      <MemoryRouter initialEntries={['/workflows/leave-application']}>
        <WorkflowSetupStatusProvider>
          <ModuleNavStrip
            ariaLabel="Workflow sections"
            tabs={[
              {
                key: 'leave-application',
                label: 'Leave Application',
                to: '/workflows/leave-application',
                workflowSetupKey: 'leave-application',
                badge: {
                  color: 'danger',
                  text: 'A',
                  title: 'Explicit badge',
                },
              },
            ]}
          />
        </WorkflowSetupStatusProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('A')).toHaveAttribute('title', 'Explicit badge')
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    expect(screen.queryByText('3')).not.toBeInTheDocument()
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

  it('shows role-protected tabs for allowed roles', () => {
    render(
      <MemoryRouter initialEntries={['/vendor/payment-records']}>
        <AuthContext.Provider value={{ user: { roles: ['Manager'] } }}>
          <ModuleNavStrip
            ariaLabel="Vendor sections"
            tabs={[
              { key: 'queue', label: 'Payment Queue', to: '/vendor/payment-records' },
              {
                key: 'workflow',
                label: 'Workflow Settings',
                to: '/workflows/vendor-payment',
                allowedRoles: ['Manager', 'System Admin'],
              },
            ]}
          />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /workflow settings/i })).toBeInTheDocument()
  })

  it('hides role-protected tabs for other roles', () => {
    render(
      <MemoryRouter initialEntries={['/vendor/payment-records']}>
        <AuthContext.Provider value={{ user: { roles: ['Staff'] } }}>
          <ModuleNavStrip
            ariaLabel="Vendor sections"
            tabs={[
              { key: 'queue', label: 'Payment Queue', to: '/vendor/payment-records' },
              {
                key: 'workflow',
                label: 'Workflow Settings',
                to: '/workflows/vendor-payment',
                allowedRoles: ['Manager', 'System Admin'],
              },
            ]}
          />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /payment queue/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /workflow settings/i })).not.toBeInTheDocument()
  })

  it('detects nested tab routes without treating exact routes as nested', () => {
    const tab = { key: 'records', label: 'Records', to: '/pipeline/call-records' }

    expect(isModuleTabNestedRoute(tab, '/pipeline/call-records')).toBe(false)
    expect(isModuleTabNestedRoute(tab, '/pipeline/call-records/42')).toBe(true)
  })

  it('provides accessible buttons for overflowing tab lists', async () => {
    render(
      <ModuleNavStrip
        ariaLabel="Quotation categories"
        showScrollButtons
        tabs={[
          { key: 'all', label: 'All' },
          { key: 'environment', label: 'Environment' },
          { key: 'engineering', label: 'Engineering' },
        ]}
      />,
    )

    const tabs = screen.getByRole('tablist', { name: 'Quotation categories' })
    Object.defineProperties(tabs, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 720 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    })
    tabs.scrollBy = vi.fn()
    fireEvent(window, new Event('resize'))

    const nextButton = await screen.findByRole('button', {
      name: 'Scroll tabs right',
    })
    expect(nextButton).toBeEnabled()
    fireEvent.click(nextButton)
    expect(tabs.scrollBy).toHaveBeenCalledWith({ left: 180, behavior: 'smooth' })

    tabs.scrollLeft = 200
    fireEvent.scroll(tabs)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Scroll tabs left' })).toBeEnabled(),
    )
  })
})
