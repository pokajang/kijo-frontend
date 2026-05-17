import { describe, expect, it, vi } from 'vitest'
import { QUOTE_MAIN_DRAFT_KEY, readQuoteMainDraft } from './quoteMainDrafts'
import { loadTrainingQuoteDraft, TRAINING_QUOTE_DRAFT_KEY } from './training/TrainingQuotationForm'
import { loadSpecialQuoteDraft, SPECIAL_QUOTE_DRAFT_KEY } from './special/SpecialQuotationForm'

const storageWith = (key, value) => ({
  getItem: vi.fn((requestedKey) => (requestedKey === key ? value : null)),
  removeItem: vi.fn(),
})

describe('quote draft loaders', () => {
  it('loads valid training quote drafts', () => {
    const storage = storageWith(TRAINING_QUOTE_DRAFT_KEY, '{"trainingTitle":"Safety"}')

    expect(loadTrainingQuoteDraft(storage)).toEqual({ trainingTitle: 'Safety' })
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it('removes corrupt training quote drafts and falls back to null', () => {
    const storage = storageWith(TRAINING_QUOTE_DRAFT_KEY, '{bad-json')

    expect(loadTrainingQuoteDraft(storage)).toBeNull()
    expect(storage.removeItem).toHaveBeenCalledWith(TRAINING_QUOTE_DRAFT_KEY)
  })

  it('loads valid special quote drafts', () => {
    const storage = storageWith(SPECIAL_QUOTE_DRAFT_KEY, '{"serviceTitle":"Inspection"}')

    expect(loadSpecialQuoteDraft(storage)).toEqual({ serviceTitle: 'Inspection' })
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it('removes corrupt special quote drafts and falls back to null', () => {
    const storage = storageWith(SPECIAL_QUOTE_DRAFT_KEY, '{bad-json')

    expect(loadSpecialQuoteDraft(storage)).toBeNull()
    expect(storage.removeItem).toHaveBeenCalledWith(SPECIAL_QUOTE_DRAFT_KEY)
  })

  it('removes non-object quote main drafts and falls back to null', () => {
    const values = { [QUOTE_MAIN_DRAFT_KEY]: '"bad-draft"' }
    const storage = {
      getItem: vi.fn((key) => values[key] ?? null),
      removeItem: vi.fn((key) => {
        delete values[key]
      }),
    }

    vi.stubGlobal('localStorage', storage)

    expect(readQuoteMainDraft()).toBeNull()
    expect(storage.removeItem).toHaveBeenCalledWith(QUOTE_MAIN_DRAFT_KEY)
    vi.unstubAllGlobals()
  })
})
