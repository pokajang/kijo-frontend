export const formatTrainingDurationLabel = (raw) => {
  const token = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const hourMatch = token.match(/^(\d+)\s*hour$/)

  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }

  switch (token) {
    case 'halfday_am':
      return 'half day (AM)'
    case 'halfday_pm':
      return 'half day (PM)'
    case '1day':
    case 'full_day':
      return '1 day'
    case '2day':
      return '2 days'
    case '3day':
      return '3 days'
    default:
      return token || raw || ''
  }
}

export const getPricingDurationDefaults = (raw) => {
  const token = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const hourMatch = token.match(/^(\d+)\s*hour$/)
  const dayMatch = token.match(/^(\d+)\s*day$/)

  if (hourMatch) {
    return {
      trainingDuration: parseInt(hourMatch[1], 10),
      durationUnit: 'hour(s)',
    }
  }

  if (token === 'halfday_am' || token === 'halfday_pm') {
    return {
      trainingDuration: 4,
      durationUnit: 'hour(s)',
    }
  }

  if (dayMatch) {
    return {
      trainingDuration: parseInt(dayMatch[1], 10),
      durationUnit: 'day(s)',
    }
  }

  if (token === 'full_day') {
    return {
      trainingDuration: 1,
      durationUnit: 'day(s)',
    }
  }

  return {}
}
