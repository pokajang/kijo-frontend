import { describe, expect, it, vi } from 'vitest'

import {
  CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT,
  dispatchClientVendorRegistrationChanged,
} from './useClientVendorRegistrationAttentionCount'
import { APP_NOTIFICATIONS_CHANGED_EVENT } from '../notifications/appNotificationEvents'

describe('dispatchClientVendorRegistrationChanged', () => {
  it('dispatches the shared vendor registration changed event', () => {
    const listener = vi.fn()
    const appListener = vi.fn()
    window.addEventListener(CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT, listener)
    window.addEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, appListener)

    dispatchClientVendorRegistrationChanged()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(appListener).toHaveBeenCalledTimes(1)
    window.removeEventListener(CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT, listener)
    window.removeEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, appListener)
  })
})
