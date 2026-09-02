import { beforeEach, describe, expect, it } from 'vitest'
import {
  TEMPLATE_DRAFT_TTL_MS,
  TEMPLATE_DRAFT_VERSION,
  clearTemplateDraft,
  createTemplateDraftRecord,
  readTemplateDraft,
  readTemplateDraftRecord,
  writeTemplateDraft,
} from './templateDrafts'

const key = 'templateDraft.test'

describe('templateDrafts', () => {
  beforeEach(() => {
    const store = new Map()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (itemKey) => (store.has(itemKey) ? store.get(itemKey) : null),
        setItem: (itemKey, value) => store.set(itemKey, String(value)),
        removeItem: (itemKey) => store.delete(itemKey),
        clear: () => store.clear(),
      },
    })
  })

  it('writes, reads, and clears a versioned draft', () => {
    writeTemplateDraft('training', { title: 'Draft' }, key)

    expect(readTemplateDraft('training', key)).toEqual({ title: 'Draft' })
    expect(readTemplateDraftRecord('training', key)).toMatchObject({
      version: TEMPLATE_DRAFT_VERSION,
      type: 'training',
      payload: { title: 'Draft' },
    })

    clearTemplateDraft('training', key)
    expect(readTemplateDraft('training', key)).toBeNull()
  })

  it('ignores corrupt, wrong type, and wrong version drafts', () => {
    window.localStorage.setItem(key, '{bad')
    expect(readTemplateDraft('training', key)).toBeNull()

    window.localStorage.setItem(
      key,
      JSON.stringify(createTemplateDraftRecord('ih', { title: 'Wrong type' })),
    )
    expect(readTemplateDraft('training', key)).toBeNull()

    window.localStorage.setItem(
      key,
      JSON.stringify({ version: TEMPLATE_DRAFT_VERSION + 1, type: 'training', payload: {} }),
    )
    expect(readTemplateDraft('training', key)).toBeNull()
  })

  it('ignores expired drafts', () => {
    const expiredDate = new Date(Date.now() - TEMPLATE_DRAFT_TTL_MS - 1000).toISOString()
    window.localStorage.setItem(
      key,
      JSON.stringify(createTemplateDraftRecord('training', { title: 'Old' }, expiredDate)),
    )

    expect(readTemplateDraft('training', key)).toBeNull()
  })
})
