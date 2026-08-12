import { describe, expect, it } from 'vitest'
import { hasFirstTouchEvidenceHistory } from '../firstTouchEvidenceHistory'

describe('first-touch evidence history', () => {
  it('only exposes history when evidence has changed or been challenged', () => {
    expect(hasFirstTouchEvidenceHistory({ claims: [{ id: 1, revisions: [] }] })).toBe(false)
    expect(hasFirstTouchEvidenceHistory({ claims: [{ id: 1 }, { id: 2 }] })).toBe(true)
    expect(hasFirstTouchEvidenceHistory({ firstTouch: { revisions: [{ id: 11 }] } })).toBe(true)
    expect(hasFirstTouchEvidenceHistory({ conflict: { id: 1 } })).toBe(true)
  })
})
