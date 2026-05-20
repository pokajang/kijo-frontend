import { describe, expect, it, vi } from 'vitest'

import {
  CAME_FROM_QUOTE_KEY,
  LAST_CREATED_CLIENT_ID_KEY,
  LAST_CREATED_CLIENT_NAME_KEY,
  clearPendingCreatedClient,
  hasPendingCreatedClient,
  markCameFromQuote,
  readPendingCreatedClient,
} from './quoteClientHandoff'

const storageWith = (initial = {}) => {
  const store = { ...initial }
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    store,
  }
}

describe('quote client handoff storage', () => {
  it('reads pending created client handoff keys', () => {
    const storage = storageWith({
      [LAST_CREATED_CLIENT_ID_KEY]: '122',
      [LAST_CREATED_CLIENT_NAME_KEY]: 'Test Client',
    })

    expect(readPendingCreatedClient(storage)).toEqual({
      id: '122',
      name: 'Test Client',
    })
    expect(hasPendingCreatedClient(storage)).toBe(true)
  })

  it('clears pending created client handoff keys', () => {
    const storage = storageWith({
      [LAST_CREATED_CLIENT_ID_KEY]: '122',
      [LAST_CREATED_CLIENT_NAME_KEY]: 'Test Client',
    })

    clearPendingCreatedClient(storage)

    expect(storage.store).toEqual({})
    expect(storage.removeItem).toHaveBeenCalledWith(LAST_CREATED_CLIENT_ID_KEY)
    expect(storage.removeItem).toHaveBeenCalledWith(LAST_CREATED_CLIENT_NAME_KEY)
  })

  it('marks the create-client flow as originating from quotes', () => {
    const storage = storageWith()

    expect(markCameFromQuote(storage)).toBe(true)
    expect(storage.store[CAME_FROM_QUOTE_KEY]).toBe('true')
  })
})
