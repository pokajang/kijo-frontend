import { describe, expect, it } from 'vitest'

import { calculateHRD } from './calculations'

describe('training HRD calculation', () => {
  it('does not apply HRD when the explicit rate is zero', () => {
    expect(calculateHRD(4500, 300, 0)).toBe(0)
  })

  it('applies an explicit HRD rate to net training cost only', () => {
    expect(calculateHRD(4500, 300, 4)).toBe(168)
  })

  it('does not produce a negative HRD amount when discount exceeds training cost', () => {
    expect(calculateHRD(1000, 1200, 4)).toBe(0)
  })

  it('does not produce a negative HRD amount from an invalid negative rate', () => {
    expect(calculateHRD(1000, 0, -4)).toBe(0)
  })
})
