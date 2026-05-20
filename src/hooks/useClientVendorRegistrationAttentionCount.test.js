import { describe, expect, it, vi } from 'vitest'

import {
  CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT,
  dispatchClientVendorRegistrationChanged,
} from './useClientVendorRegistrationAttentionCount'

describe('dispatchClientVendorRegistrationChanged', () => {
  it('dispatches the shared vendor registration changed event', () => {
    const listener = vi.fn()
    window.addEventListener(CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT, listener)

    dispatchClientVendorRegistrationChanged()

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(CLIENT_VENDOR_REGISTRATION_CHANGED_EVENT, listener)
  })
})
