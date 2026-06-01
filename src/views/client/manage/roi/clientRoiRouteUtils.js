import { getPeriodRangePreset } from '../../../../components/filters'

const datedPresetKeys = [
  'ytd',
  'this-month',
  'last-month',
  'last-30-days',
  'last-3-months',
  'last-6-months',
]

export const buildClientRoiDetailSearch = (periodRange) => {
  const params = new URLSearchParams()
  if (periodRange?.preset === 'all') params.set('period', 'all')
  if (periodRange?.startDate) params.set('start', periodRange.startDate)
  if (periodRange?.endDate) params.set('end', periodRange.endDate)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const buildClientRoiListPath = (periodRange) =>
  `/client/roi${buildClientRoiDetailSearch(periodRange)}`

export const getPeriodRangeFromSearchParams = (
  searchParams,
  fallbackPreset = 'all',
  today = new Date(),
) => {
  if (searchParams.get('period') === 'all') {
    return getPeriodRangePreset('all', today)
  }

  const startDate = searchParams.get('start') || ''
  const endDate = searchParams.get('end') || ''

  if (!startDate && !endDate) {
    return getPeriodRangePreset(fallbackPreset, today)
  }

  const matchingPreset = datedPresetKeys
    .map((preset) => getPeriodRangePreset(preset, today))
    .find((preset) => preset.startDate === startDate && preset.endDate === endDate)

  if (matchingPreset) return matchingPreset

  return {
    preset: 'custom',
    startDate,
    endDate,
  }
}
