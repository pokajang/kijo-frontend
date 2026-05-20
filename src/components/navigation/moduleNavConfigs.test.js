import { describe, expect, it } from 'vitest'
import { clientModuleTabs, systemAdminModuleTabs } from './moduleNavConfigs'

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
