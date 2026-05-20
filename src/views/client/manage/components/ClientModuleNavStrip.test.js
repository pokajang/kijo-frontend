import { describe, expect, it } from 'vitest'

import { buildClientModuleTabsWithVendorRegistrationBadge } from './ClientModuleNavStrip'

describe('buildClientModuleTabsWithVendorRegistrationBadge', () => {
  it('adds the expired count to the Vendor Registration tab', () => {
    const tabs = buildClientModuleTabsWithVendorRegistrationBadge(2)
    const vendorTab = tabs.find((tab) => tab.key === 'vendor-registration')

    expect(vendorTab.badge).toEqual({
      color: 'danger',
      text: '2',
      title: 'Expired vendor registrations',
    })
  })

  it('leaves the Vendor Registration tab unbadged when there are no expired rows', () => {
    const tabs = buildClientModuleTabsWithVendorRegistrationBadge(0)
    const vendorTab = tabs.find((tab) => tab.key === 'vendor-registration')

    expect(vendorTab.badge).toBeUndefined()
  })
})
