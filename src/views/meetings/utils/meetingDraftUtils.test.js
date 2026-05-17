import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildRecordDraftStorageKey,
  generateMeetingDraftKey,
  readMeetingDraft,
  removeMeetingDraft,
  writeMeetingDraft,
} from './meetingDraftUtils'

describe('meetingDraftUtils', () => {
  let store

  beforeEach(() => {
    store = {}
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => {
          store[key] = String(value)
        }),
        removeItem: vi.fn((key) => {
          delete store[key]
        }),
        clear: vi.fn(() => {
          store = {}
        }),
      },
    })
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('generates browser UUID draft keys when available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'draft-uuid' })

    expect(generateMeetingDraftKey()).toBe('draft-uuid')
  })

  it('persists and reads normalized meeting drafts', () => {
    const key = buildRecordDraftStorageKey(123)

    writeMeetingDraft(key, {
      draftKey: 'draft-key-123',
      recordId: 123,
      currentStep: 2,
      form: {
        meetingTitle: '  Ops  Sync  ',
        meetingType: 'Weekly',
        meetingDateTime: '2026-05-17 09:30:00',
        attendeeIds: ['42', 42, 'bad'],
      },
    })

    const restored = readMeetingDraft(key)
    expect(restored.recordId).toBe(123)
    expect(restored.currentStep).toBe(2)
    expect(restored.draftKey).toBe('draft-key-123')
    expect(restored.form.meetingType).toBe('Weekly')
    expect(restored.form.meetingDateTime).toBe('2026-05-17T09:30')
    expect(restored.form.attendeeIds).toEqual([42])
    expect(restored.savedAt).toBeTruthy()
  })

  it('removes stored drafts', () => {
    const key = buildRecordDraftStorageKey(8)
    writeMeetingDraft(key, { form: {}, recordId: 8 })

    removeMeetingDraft(key)

    expect(readMeetingDraft(key)).toBeNull()
  })
})
