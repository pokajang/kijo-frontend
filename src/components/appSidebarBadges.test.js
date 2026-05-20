import { describe, expect, it } from 'vitest'

import { applySidebarBadges } from './appSidebarBadges'

describe('applySidebarBadges', () => {
  it('adds a danger badge to Clients for expired vendor registrations', () => {
    const rows = applySidebarBadges(
      [
        { name: 'Clients', to: '/client/manage' },
        { name: 'Negotiations', to: '/crm/price-exceptions' },
      ],
      { getRouteGroupCount: (route) => (route === '/client/manage' ? 3 : 0) },
    )

    expect(rows[0].badge).toEqual({
      color: 'danger',
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
})
