import { describe, expect, it } from 'vitest'
import { clientModuleTabs, systemAdminModuleTabs, vendorModuleTabs } from './moduleNavConfigs'

describe('clientModuleTabs', () => {
  it('includes the ROI per Client tab', () => {
    expect(clientModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'roi',
          label: 'ROI per Client',
          to: '/client/roi',
        }),
      ]),
    )
  })

  it('includes the Vendor Registration tab', () => {
    expect(clientModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'vendor-registration',
          label: 'Vendor Registration',
          to: '/client/vendor-registration',
        }),
      ]),
    )
  })
})

describe('systemAdminModuleTabs', () => {
  it('includes the Email Test tab', () => {
    expect(systemAdminModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'email-test',
          label: 'Email Test',
        }),
      ]),
    )
  })
})

describe('vendorModuleTabs', () => {
  it('includes the Frozen Vendors tab', () => {
    expect(vendorModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'frozen',
          label: 'Frozen Vendors',
          to: '/vendor/frozen',
        }),
      ]),
    )
  })

  it('does not include Pay Vendors as a top-level tab', () => {
    expect(vendorModuleTabs).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'pay',
          to: '/vendor/pay',
        }),
      ]),
    )
  })
})
