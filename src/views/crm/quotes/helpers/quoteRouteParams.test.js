import { describe, expect, it } from 'vitest'

import { readQuoteRouteParams } from './quoteRouteParams'

describe('readQuoteRouteParams', () => {
  it('returns safe defaults for an empty search string', () => {
    expect(readQuoteRouteParams('')).toEqual({
      quoteId: '',
      isEditMode: false,
      isRevision: false,
      priceExceptionRequestId: '',
      service: '',
      categoryId: '',
    })
  })

  it('normalizes boolean and quote query params', () => {
    expect(
      readQuoteRouteParams('?edit=true&isRevision=true&quoteId=12&service=training'),
    ).toMatchObject({
      quoteId: '12',
      isEditMode: true,
      isRevision: true,
      service: 'training',
    })
  })

  it('preserves price exception request id only when present', () => {
    expect(readQuoteRouteParams('?priceExceptionRequestId=88').priceExceptionRequestId).toBe('88')
    expect(readQuoteRouteParams('?unrelated=value').priceExceptionRequestId).toBe('')
  })

  it('treats malformed boolean values as false', () => {
    expect(readQuoteRouteParams('?edit=maybe&isRevision=nope')).toMatchObject({
      isEditMode: false,
      isRevision: false,
    })
  })
})
