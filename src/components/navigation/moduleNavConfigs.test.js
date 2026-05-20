import { describe, expect, it } from 'vitest'
import { clientModuleTabs } from './moduleNavConfigs'

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
