import { describe, expect, it } from 'vitest'
import { formatTrainingDurationLabel, getPricingDurationDefaults } from './trainingDuration'

describe('trainingDuration', () => {
  it('formats hour and day proposal duration tokens for quote selection', () => {
    expect(formatTrainingDurationLabel('2hour')).toBe('2 hours')
    expect(formatTrainingDurationLabel('1hour')).toBe('1 hour')
    expect(formatTrainingDurationLabel('2day')).toBe('2 days')
  })

  it('sets hourly pricing defaults for non full-day training topics', () => {
    expect(getPricingDurationDefaults('2hour')).toEqual({
      trainingDuration: 2,
      durationUnit: 'hour(s)',
    })
    expect(getPricingDurationDefaults('halfday_am')).toEqual({
      trainingDuration: 4,
      durationUnit: 'hour(s)',
    })
  })

  it('sets day pricing defaults for full-day training topics', () => {
    expect(getPricingDurationDefaults('1day')).toEqual({
      trainingDuration: 1,
      durationUnit: 'day(s)',
    })
    expect(getPricingDurationDefaults('3day')).toEqual({
      trainingDuration: 3,
      durationUnit: 'day(s)',
    })
  })
})
