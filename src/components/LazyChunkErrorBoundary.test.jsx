import { describe, expect, it } from 'vitest'

import { isLazyChunkError } from './LazyChunkErrorBoundary'

describe('LazyChunkErrorBoundary', () => {
  it('detects Vite dynamic import failures from stale deployed assets', () => {
    expect(isLazyChunkError(new TypeError('Failed to fetch dynamically imported module'))).toBe(
      true,
    )
    expect(isLazyChunkError(new Error('Importing a module script failed.'))).toBe(true)
  })

  it('does not classify ordinary runtime errors as chunk failures', () => {
    expect(isLazyChunkError(new Error('Cannot read properties of undefined'))).toBe(false)
  })
})
