import { describe, expect, it } from 'vitest'

import { clientModuleTabs } from '../../../../components/navigation/moduleNavConfigs'

describe('ClientModuleNavStrip notification config', () => {
  it('uses the centralized notification tab key for Vendor Registration', () => {
    const vendorTab = clientModuleTabs.find((tab) => tab.key === 'vendor-registration')

    expect(vendorTab).toEqual(
      expect.objectContaining({
        notificationTabKey: 'client.vendor-registration',
      }),
    )
  })
})
