import { describe, expect, it } from 'vitest'

import { applySidebarBadges } from './appSidebarBadges'

describe('applySidebarBadges', () => {
  it('adds a standard notification badge to Clients for expired vendor registrations', () => {
    const rows = applySidebarBadges(
      [
        { name: 'Clients', to: '/client/manage' },
        { name: 'Negotiations', to: '/crm/price-exceptions' },
      ],
      { getRouteGroupCount: (route) => (route === '/client/manage' ? 3 : 0) },
    )

    expect(rows[0].badge).toEqual({
      color: 'warning',
      text: '3',
      title: 'Vendor registrations need attention',
    })
    expect(rows[1].badge).toBeUndefined()
  })

  it('does not add the Clients badge when only expiring-soon rows exist upstream', () => {
    const rows = applySidebarBadges([{ name: 'Clients', to: '/client/manage' }], {
      getRouteGroupCount: () => 0,
    })

    expect(rows[0].badge).toBeUndefined()
  })

  it('adds the workflow action badge to Staff Management', () => {
    const rows = applySidebarBadges([{ name: 'Staff Management', to: '/staff/leaves' }], {
      getRouteGroupCount: (route) => (route === '/staff/leaves' ? 1 : 0),
    })

    expect(rows[0].badge).toEqual({
      color: 'warning',
      text: '1',
      title: 'Leave requests need attention',
    })
  })

  it('adds the workflow action badge to Vendors', () => {
    const rows = applySidebarBadges([{ name: 'Vendors', to: '/vendor/payment-records' }], {
      getRouteGroupCount: (route) => (route === '/vendor/payment-records' ? 4 : 0),
    })

    expect(rows[0].badge).toEqual({
      color: 'warning',
      text: '4',
      title: 'Vendor payments need attention',
    })
  })

  it('adds the workflow setup warning badge only to the Workflows item', () => {
    const rows = applySidebarBadges(
      [
        { name: 'Financial', to: '/financial/salary-records' },
        { name: 'Workflows', to: '/workflows/salary-application', workflowSetupBadge: true },
      ],
      {
        getWorkflowSetupTotal: () => 5,
      },
    )

    expect(rows[0].badge).toBeUndefined()
    expect(rows[1].badge).toEqual({
      color: 'warning',
      text: '5',
      title: 'Workflow recipients not configured',
    })
  })
})
