import { describe, expect, it } from 'vitest'
import { getCurrentReturnTo, getDetailReturnTo, sanitizeInternalReturnTo } from '../returnTo'

describe('returnTo navigation helpers', () => {
  it('builds the current internal URL from path, query, and hash', () => {
    expect(
      getCurrentReturnTo({
        pathname: '/support/feedback',
        search: '?status=pending&page=2',
        hash: '#row-100',
      }),
    ).toBe('/support/feedback?status=pending&page=2#row-100')
  })

  it('accepts only internal return targets from detail route state', () => {
    expect(
      getDetailReturnTo(
        {
          state: {
            returnTo: '/support/feedback?status=pending',
          },
        },
        '/support/feedback',
      ),
    ).toBe('/support/feedback?status=pending')

    expect(sanitizeInternalReturnTo('https://example.test/support/feedback', '/fallback')).toBe(
      '/fallback',
    )
    expect(sanitizeInternalReturnTo('//example.test/support/feedback', '/fallback')).toBe(
      '/fallback',
    )
  })
})
