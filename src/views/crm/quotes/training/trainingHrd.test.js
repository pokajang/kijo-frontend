import { describe, expect, it } from 'vitest'

import { normalizeTrainingHrdCharge } from './trainingHrd'

describe('training HRD charge normalization', () => {
  it('does not apply an HRD rate when an HRD Grant rate is missing or zero', () => {
    expect(normalizeTrainingHrdCharge('HRD Grant', 0)).toBe(0)
    expect(normalizeTrainingHrdCharge('hrd grant', '')).toBe(0)
  })

  it('preserves explicit positive HRD Grant rates', () => {
    expect(normalizeTrainingHrdCharge('HRD Grant', 4)).toBe(4)
    expect(normalizeTrainingHrdCharge('HRD Grant', 6)).toBe(6)
  })

  it('clears HRD charge for non-HRD payment methods', () => {
    expect(normalizeTrainingHrdCharge('Self-Payment', 4)).toBe(0)
  })

  it('clears invalid and negative HRD rates', () => {
    expect(normalizeTrainingHrdCharge('HRD Grant', 'invalid')).toBe(0)
    expect(normalizeTrainingHrdCharge('HRD Grant', -4)).toBe(0)
  })
})
