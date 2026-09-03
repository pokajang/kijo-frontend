import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTrustedAssetUrl, resolveAssetUrl } from './assetUrls'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('resolveAssetUrl vendor payment invoices', () => {
  it('routes a backend-relative invoice endpoint through the configured API base', () => {
    expect(resolveAssetUrl('/vendor-payments/42/invoice')).toBe(
      `${window.location.origin}/proxy/vendor-payments/42/invoice`,
    )
  })
})

describe('isTrustedAssetUrl', () => {
  it('allows assets served by the configured backend origin', () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test/')

    expect(isTrustedAssetUrl('https://api.example.test/files/private/signed-token')).toBe(true)
  })

  it('rejects unconfigured origins and unsafe URL schemes', () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test/')

    expect(isTrustedAssetUrl('https://attacker.example/files/private/signed-token')).toBe(false)
    expect(isTrustedAssetUrl('javascript:alert(1)')).toBe(false)
    expect(isTrustedAssetUrl('data:application/pdf;base64,JVBERi0=')).toBe(false)
  })
})
