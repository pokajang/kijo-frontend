import { describe, expect, it } from 'vitest'

import { DEFAULT_HRD_CHARGE_RATE, normalizeTrainingHrdCharge } from './trainingHrd'

describe('training HRD charge normalization', () => {
  it('defaults HRD Grant quotes to the standard HRD charge rate when missing or zero', () => {
    expect(normalizeTrainingHrdCharge('HRD Grant', 0)).toBe(DEFAULT_HRD_CHARGE_RATE)
    expect(normalizeTrainingHrdCharge('hrd grant', '')).toBe(DEFAULT_HRD_CHARGE_RATE)
  })

  it('preserves explicit positive HRD Grant rates', () => {
    expect(normalizeTrainingHrdCharge('HRD Grant', 6)).toBe(6)
  })

  it('clears HRD charge for non-HRD payment methods', () => {
    expect(normalizeTrainingHrdCharge('Self-Payment', 4)).toBe(0)
  })
})
