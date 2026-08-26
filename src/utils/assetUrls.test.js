import { describe, expect, it } from 'vitest'
import { resolveAssetUrl } from './assetUrls'

describe('resolveAssetUrl vendor payment invoices', () => {
  it('routes a backend-relative invoice endpoint through the configured API base', () => {
    expect(resolveAssetUrl('/vendor-payments/42/invoice')).toBe(
      `${window.location.origin}/proxy/vendor-payments/42/invoice`,
    )
  })
})
