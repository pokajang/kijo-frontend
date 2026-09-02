import {
  formatCount as formatCanonicalCount,
  formatMoney as formatCanonicalMoney,
} from '../formatters/numberFormatters'

export const formatCount = (value) => formatCanonicalCount(value)

export const formatMoney = (value) => formatCanonicalMoney(value)

export const formatPercent = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? `${Math.round(number)}%` : '0%'
}

export const parseMoneyValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export const countByPredicate = (rows = [], predicate = () => false) =>
  rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0)

export const sumBy = (rows = [], getter = () => 0) =>
  rows.reduce((sum, row) => sum + parseMoneyValue(getter(row)), 0)

export const getMostCommonValue = (rows = [], getter = () => '') => {
  const counts = new Map()

  rows.forEach((row) => {
    const value = String(getter(row) || '').trim()
    if (!value || value === '-') return
    counts.set(value, (counts.get(value) || 0) + 1)
  })

  let bestValue = '-'
  let bestCount = 0

  counts.forEach((count, value) => {
    if (count > bestCount) {
      bestValue = value
      bestCount = count
    }
  })

  return { value: bestValue, count: bestCount }
}

export const normalizeGroupLabel = (value) => {
  const label = String(value ?? '').trim()
  const normalized = label.toLowerCase()

  if (!label || label === '-' || normalized === 'unknown' || normalized === 'n/a') return ''

  return label
}

export const getTopGroupByCount = (rows = [], groupGetter = () => '') => {
  const groups = new Map()

  rows.forEach((row) => {
    const label = normalizeGroupLabel(groupGetter(row))
    if (!label) return

    const current = groups.get(label) || { value: label, count: 0, total: 0 }
    groups.set(label, { ...current, count: current.count + 1 })
  })

  return Array.from(groups.values()).reduce(
    (best, group) => (group.count > best.count ? group : best),
    { value: '-', count: 0, total: 0 },
  )
}

export const getTopGroupBySum = (rows = [], groupGetter = () => '', valueGetter = () => 0) => {
  const groups = new Map()

  rows.forEach((row) => {
    const label = normalizeGroupLabel(groupGetter(row))
    if (!label) return

    const amount = parseMoneyValue(valueGetter(row))
    const current = groups.get(label) || { value: label, count: 0, total: 0 }
    groups.set(label, {
      ...current,
      count: current.count + 1,
      total: current.total + amount,
    })
  })

  return Array.from(groups.values()).reduce(
    (best, group) =>
      group.total > best.total || (group.total === best.total && group.count > best.count)
        ? group
        : best,
    { value: '-', count: 0, total: 0 },
  )
}
