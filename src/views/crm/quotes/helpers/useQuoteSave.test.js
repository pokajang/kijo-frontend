import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getQuoteServiceDraftKey, LEGACY_QUOTE_SERVICE_DRAFT_KEYS } from '../quoteMainDrafts'

vi.mock('../quoteSuccessHandler', () => ({
  handleQuoteSuccess: vi.fn().mockResolvedValue({ saved: false, reason: 'no-inquiry' }),
}))

import { handleQuoteSuccess } from '../quoteSuccessHandler'
import { saveQuote } from './useQuoteSave'

const jsonResponse = (body, { ok = true } = {}) => ({
  ok,
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
})

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

describe('saveQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', storageWith())
    vi.stubGlobal('sessionStorage', storageWith())
  })

  it('creates quotes with POST, clears drafts, handles success, and navigates to records', async () => {
    const draftKey = getQuoteServiceDraftKey({
      serviceKey: 'training',
      clientId: 7,
      language: 'en',
    })
    const storage = storageWith({
      draftQuoteMain: '{}',
      'draftQuoteMain:training': '{}',
      [draftKey]: '{}',
      [LEGACY_QUOTE_SERVICE_DRAFT_KEYS.training]: '{}',
    })
    vi.stubGlobal('localStorage', storage)
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ status: 'success', quote_id: 123 }))
    const dialogService = {
      alert: vi.fn(),
      confirm: vi.fn().mockResolvedValue(true),
    }
    const navigate = vi.fn()

    await saveQuote({
      serviceKey: 'training',
      draftContext: { clientId: 7, language: 'en' },
      payload: { client_id: 7 },
      fetcher,
      dialogService,
      navigate,
    })

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/\/quotes\/training$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(handleQuoteSuccess).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    expect(storage.store.draftQuoteMain).toBeUndefined()
    expect(storage.store['draftQuoteMain:training']).toBeUndefined()
    expect(storage.store[draftKey]).toBeUndefined()
    expect(storage.store[LEGACY_QUOTE_SERVICE_DRAFT_KEYS.training]).toBeUndefined()
    expect(navigate).toHaveBeenCalledWith('/crm/records/training', { replace: true })
  })

  it('updates quotes with PUT and stays on the edit page when the dialog is cancelled', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ status: 'success', quote_id: 55 }))
    const dialogService = {
      alert: vi.fn(),
      confirm: vi.fn().mockResolvedValue(false),
    }
    const navigate = vi.fn()

    await saveQuote({
      serviceKey: 'ih',
      quoteId: 55,
      isEditMode: true,
      payload: { id: 55 },
      fetcher,
      dialogService,
      navigate,
    })

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/\/quotes\/ih\/55$/),
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('navigates through React Router for create-another flow', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ status: 'success', quote_id: 9 }))
    const dialogService = {
      alert: vi.fn(),
      confirm: vi.fn().mockResolvedValue(false),
    }
    const navigate = vi.fn()

    await saveQuote({
      serviceKey: 'special',
      payload: { client_id: 1 },
      fetcher,
      dialogService,
      navigate,
    })

    expect(navigate).toHaveBeenCalledWith(
      '/crm/quotes',
      expect.objectContaining({
        replace: true,
        state: expect.objectContaining({ quoteResetToken: expect.any(Number) }),
      }),
    )
  })

  it('alerts server messages on failed responses', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ status: 'error', message: 'Validation failed' }, { ok: false }),
      )
    const dialogService = {
      alert: vi.fn(),
      confirm: vi.fn(),
    }

    await saveQuote({
      serviceKey: 'manpower',
      payload: {},
      fetcher,
      dialogService,
      navigate: vi.fn(),
    })

    expect(dialogService.alert).toHaveBeenCalledWith('Validation failed')
    expect(dialogService.confirm).not.toHaveBeenCalled()
  })

  it('alerts invalid non-JSON responses', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('<html>error</html>'),
    })
    const dialogService = {
      alert: vi.fn(),
      confirm: vi.fn(),
    }

    await saveQuote({
      serviceKey: 'equipment',
      payload: {},
      fetcher,
      dialogService,
      navigate: vi.fn(),
    })

    expect(dialogService.alert).toHaveBeenCalledWith(
      'Server returned an invalid response while saving the quotation.',
    )
  })

  it('uses the friendly network error message for fetch failures', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const dialogService = {
      alert: vi.fn(),
      confirm: vi.fn(),
    }

    await saveQuote({
      serviceKey: 'equipment',
      payload: {},
      fetcher,
      dialogService,
      navigate: vi.fn(),
      networkErrorMessage: 'Error: Network or server error while saving quotation.',
    })

    expect(dialogService.alert).toHaveBeenCalledWith(
      'Error: Network or server error while saving quotation.',
    )
  })
})
