import { describe, expect, it, vi } from 'vitest'
import {
  LEGACY_QUOTE_SERVICE_DRAFT_KEYS,
  QUOTE_MAIN_DRAFT_KEY,
  clearQuoteServiceDraft,
  getQuoteServiceDraftKey,
  readQuoteMainDraft,
  readQuoteServiceDraft,
  writeQuoteServiceDraft,
} from './quoteMainDrafts'

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
    key: vi.fn((index) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length
    },
    store,
  }
}

describe('quote draft loaders', () => {
  it('removes non-object quote main drafts and falls back to null', () => {
    const storage = storageWith({ [QUOTE_MAIN_DRAFT_KEY]: '"bad-draft"' })

    vi.stubGlobal('localStorage', storage)

    expect(readQuoteMainDraft()).toBeNull()
    expect(storage.removeItem).toHaveBeenCalledWith(QUOTE_MAIN_DRAFT_KEY)
    vi.unstubAllGlobals()
  })

  it('writes and reads service drafts by service, client, and language', () => {
    const storage = storageWith()
    const scope = { serviceKey: 'training', clientId: 42, language: 'ms-MY', storage }

    expect(writeQuoteServiceDraft({ ...scope, draft: { trainingTitle: 'Safety' } })).toBe(true)
    expect(readQuoteServiceDraft(scope)).toEqual({ trainingTitle: 'Safety' })

    const key = getQuoteServiceDraftKey(scope)
    expect(storage.setItem).toHaveBeenCalledWith(key, JSON.stringify({ trainingTitle: 'Safety' }))
  })

  it('does not load another client or language scoped draft', () => {
    const storage = storageWith({
      [getQuoteServiceDraftKey({ serviceKey: 'ih', clientId: 10, language: 'en' })]: JSON.stringify(
        {
          serviceTitle: 'Noise Monitoring',
        },
      ),
    })

    expect(
      readQuoteServiceDraft({ serviceKey: 'ih', clientId: 11, language: 'en', storage }),
    ).toBeNull()
    expect(
      readQuoteServiceDraft({ serviceKey: 'ih', clientId: 10, language: 'ms-MY', storage }),
    ).toBeNull()
  })

  it('migrates legacy drafts only when no specific client is selected', () => {
    const storage = storageWith({
      [LEGACY_QUOTE_SERVICE_DRAFT_KEYS.special]: JSON.stringify({ serviceTitle: 'Inspection' }),
    })

    expect(readQuoteServiceDraft({ serviceKey: 'special', language: 'en', storage })).toEqual({
      serviceTitle: 'Inspection',
    })
    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_QUOTE_SERVICE_DRAFT_KEYS.special)
    expect(storage.store[getQuoteServiceDraftKey({ serviceKey: 'special', language: 'en' })]).toBe(
      JSON.stringify({ serviceTitle: 'Inspection' }),
    )
  })

  it('migrates legacy drafts for a selected client only when the main draft matches', () => {
    const storage = storageWith({
      [QUOTE_MAIN_DRAFT_KEY]: JSON.stringify({
        selectedClient: { company_id: 99 },
        selectedService: 'manpower',
        proposalLanguage: 'en',
      }),
      [LEGACY_QUOTE_SERVICE_DRAFT_KEYS.manpower]: JSON.stringify({ serviceTitle: 'Guarding' }),
    })

    expect(
      readQuoteServiceDraft({ serviceKey: 'manpower', clientId: 99, language: 'en', storage }),
    ).toEqual({ serviceTitle: 'Guarding' })
    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_QUOTE_SERVICE_DRAFT_KEYS.manpower)
  })

  it('does not migrate legacy drafts for an unrelated selected client', () => {
    const storage = storageWith({
      [QUOTE_MAIN_DRAFT_KEY]: JSON.stringify({
        selectedClient: { company_id: 42 },
        selectedService: 'manpower',
        proposalLanguage: 'en',
      }),
      [LEGACY_QUOTE_SERVICE_DRAFT_KEYS.manpower]: JSON.stringify({ serviceTitle: 'Guarding' }),
    })

    expect(
      readQuoteServiceDraft({ serviceKey: 'manpower', clientId: 99, language: 'en', storage }),
    ).toBeNull()
    expect(storage.removeItem).not.toHaveBeenCalledWith(LEGACY_QUOTE_SERVICE_DRAFT_KEYS.manpower)
  })

  it('removes corrupt service drafts and falls back to null', () => {
    const key = getQuoteServiceDraftKey({ serviceKey: 'training', clientId: 1, language: 'en' })
    const storage = storageWith({ [key]: '{bad-json' })

    expect(
      readQuoteServiceDraft({ serviceKey: 'training', clientId: 1, language: 'en', storage }),
    ).toBeNull()
    expect(storage.removeItem).toHaveBeenCalledWith(key)
  })

  it('clears service quote drafts by exact scope, service, or all services', () => {
    const trainingKey = getQuoteServiceDraftKey({
      serviceKey: 'training',
      clientId: 7,
      language: 'en',
    })
    const trainingBmKey = getQuoteServiceDraftKey({
      serviceKey: 'training',
      clientId: 7,
      language: 'ms-MY',
    })
    const hygieneKey = getQuoteServiceDraftKey({ serviceKey: 'ih', clientId: 7, language: 'en' })
    const storage = storageWith({
      [trainingKey]: '{}',
      [trainingBmKey]: '{}',
      [hygieneKey]: '{}',
      [LEGACY_QUOTE_SERVICE_DRAFT_KEYS.training]: '{}',
    })

    clearQuoteServiceDraft({
      serviceKey: 'training',
      clientId: 7,
      language: 'en',
      storage,
    })
    expect(storage.store[trainingKey]).toBeUndefined()
    expect(storage.store[trainingBmKey]).toBe('{}')
    expect(storage.store[hygieneKey]).toBe('{}')

    clearQuoteServiceDraft({ serviceKey: 'training', storage })
    expect(storage.store[trainingBmKey]).toBeUndefined()
    expect(storage.store[hygieneKey]).toBe('{}')
    expect(storage.store[LEGACY_QUOTE_SERVICE_DRAFT_KEYS.training]).toBeUndefined()

    clearQuoteServiceDraft({ storage })
    expect(storage.store[hygieneKey]).toBeUndefined()
  })
})
