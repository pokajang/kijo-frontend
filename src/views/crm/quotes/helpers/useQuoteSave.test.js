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

  it('delegates actionable failures without replacing them with a generic alert', async () => {
    const failure = {
      status: 'error',
      error_code: 'STALE_QUOTE_VERSION',
      message: 'A newer version is available.',
      remediation: {
        primary: 'reload_quote',
        secondary: 'review_unsaved_changes',
      },
    }
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(failure, { ok: false }))
    const dialogService = {
      alert: vi.fn(),
      confirm: vi.fn(),
    }
    const onRecoverableFailure = vi.fn().mockResolvedValue(true)

    const result = await saveQuote({
      serviceKey: 'ih',
      quoteId: 68,
      isEditMode: true,
      payload: { quote_version: 'a'.repeat(64) },
      fetcher,
      dialogService,
      navigate: vi.fn(),
      onRecoverableFailure,
    })

    expect(result.saved).toBe(false)
    expect(onRecoverableFailure).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'STALE_QUOTE_VERSION' }),
      expect.objectContaining({ response: expect.any(Object) }),
    )
    expect(dialogService.alert).not.toHaveBeenCalled()
  })

  it('prompts and retries when an awarded quote value decision is required', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: 'project_value_decision_required',
            project_value_decision: {
              old_quote_total: 1000,
              new_quote_total: 1200,
              project_id: 5,
              project_name: 'Project A',
              awarded_value: 1000,
              sync_allowed: true,
            },
          },
          { ok: false },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ status: 'success', quote_id: 55 }))
    const dialogService = {
      alert: vi.fn(),
      confirm: vi
        .fn()
        .mockResolvedValueOnce({ confirmed: true, value: 'sync' })
        .mockResolvedValueOnce(false),
    }

    const result = await saveQuote({
      serviceKey: 'ih',
      quoteId: 55,
      isEditMode: true,
      payload: { grand_total: 1200 },
      fetcher,
      dialogService,
      navigate: vi.fn(),
    })

    expect(result.saved).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(dialogService.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Project A'),
      expect.objectContaining({
        title: 'Awarded Quote Value Changed',
        select: expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ value: 'sync' }),
            expect.objectContaining({ value: 'keep' }),
          ]),
        }),
      }),
    )
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(
      expect.objectContaining({
        grand_total: 1200,
        project_value_sync_decision: 'sync',
      }),
    )
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
