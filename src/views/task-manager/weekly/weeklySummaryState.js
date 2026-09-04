import { getWeekStart, shiftWeekStart } from './taskWeekUtils'

const validStaffId = (value) => /^\d+$/.test(String(value || ''))

export const getWeeklyReviewState = (search, currentWeek = getWeekStart()) => {
  const params = new URLSearchParams(search)
  const weekStart = getWeekStart(params.get('week') || '') || currentWeek
  const requestedStaffId = params.get('staff_id') || 'all'
  const staffId = validStaffId(requestedStaffId) ? requestedStaffId : 'all'
  const compareEnabled = params.get('compare') === '1' && staffId !== 'all'
  const requestedCompareWeek = getWeekStart(params.get('compare_week') || '')
  const compareWeekStart =
    requestedCompareWeek && requestedCompareWeek < weekStart
      ? requestedCompareWeek
      : shiftWeekStart(weekStart, -1)

  return { weekStart, staffId, compareEnabled, compareWeekStart }
}

export const applyWeeklyReviewState = (search, state) => {
  const params = new URLSearchParams(search)
  params.set('view', 'weekly')
  params.set('week', state.weekStart)

  if (state.staffId && state.staffId !== 'all') params.set('staff_id', state.staffId)
  else params.delete('staff_id')

  if (state.compareEnabled && state.staffId && state.staffId !== 'all') {
    params.set('compare', '1')
    params.set('compare_week', state.compareWeekStart)
  } else {
    params.delete('compare')
    params.delete('compare_week')
  }

  return params.toString()
}
