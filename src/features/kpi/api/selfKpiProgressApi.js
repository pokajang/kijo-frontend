import { KPI_API_BASE } from './kpiApiBase'

/**
 * Capitalize the first letter of each word in a string
 */
export function capitalizeWords(str = '') {
  return String(str)
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
}

/* ------------------------------------------------------------------ *
 * Simple in-memory caches to reduce redundant network calls
 * ------------------------------------------------------------------ */
const paramsCache = new Map() // key: year || 'all'  -> mapped array
const trackerCache = new Map() // key: `${kpiId}-${year}` -> rows array

/**
 * Clear all KPI-related caches (use after create/update/delete)
 */
export function clearKpiCaches() {
  paramsCache.clear()
  trackerCache.clear()
}

/**
 * Clear only a specific year's caches (parameters and per-KPI trackers for that year).
 */
export function clearYearCaches(year) {
  if (year == null) return
  paramsCache.delete(year)

  // Drop all tracker keys that end with `-year`
  const suffix = `-${year}`
  for (const key of trackerCache.keys()) {
    if (key.endsWith(suffix)) trackerCache.delete(key)
  }
}

/* ------------------------------------------------------------------ *
 * Internal fetch helper with consistent options & error handling
 * ------------------------------------------------------------------ */
async function fetchJSON(url) {
  const res = await fetch(url, {
    credentials: 'include',
  })

  // Network / HTTP guard
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || 'Request failed'}`)
  }

  // JSON guard
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error('Invalid JSON response')
  }

  if (json.status !== 'success') {
    throw new Error(json.message || 'Request failed')
  }

  return json.data ?? []
}

/* ------------------------------------------------------------------ *
 * 1) Load KPI Parameters (optionally by year)
 *
 * Backend expected fields:
 *   id, parameter_name, description, annual_target, unit, weightage, year, (optional) color
 *
 * Returns mapped items:
 *   { value, label, annual_target, unit, color, description, weightage, year }
 * ------------------------------------------------------------------ */
export async function getKpiParameters(year) {
  const key = year ?? 'all'
  if (paramsCache.has(key)) return paramsCache.get(key)

  const params = new URLSearchParams()
  if (year != null) params.set('year', year)

  const data = await fetchJSON(`${KPI_API_BASE}/parameters/mine${params.size ? `?${params}` : ''}`)

  // Map to UI-friendly shape
  let mapped = (data || []).map((k) => ({
    value: k.id,
    label: capitalizeWords(k.parameter_name),
    annual_target: k.annual_target,
    unit: k.unit,
    color: k.color,
    description: k.description,
    weightage: k.weightage,
    year: k.year,
  }))

  // Client-side guard: if backend ignored the year, filter here.
  if (year != null) {
    mapped = mapped.filter((k) => Number(k.year) === Number(year))
  }

  paramsCache.set(key, mapped)
  return mapped
}

/* ------------------------------------------------------------------ *
 * 2) Load KPI Tracker rows for a given KPI & year
 *
 * Returns rows like:
 *   { id, kpi_id, staff_id, for_month, actual_value, remarks, ... }
 * ------------------------------------------------------------------ */
export async function getKpiTracker(kpiId, year) {
  const key = `${kpiId}-${year}`
  if (trackerCache.has(key)) return trackerCache.get(key)

  const params = new URLSearchParams({ kpi_id: kpiId, year })
  const rows = await fetchJSON(`${KPI_API_BASE}/tracker/mine?${params}`)

  trackerCache.set(key, rows)
  return rows
}

/* ------------------------------------------------------------------ *
 * Optional: seed/prime caches if you already have payloads
 * (handy for SSR or when you preload lists elsewhere)
 * ------------------------------------------------------------------ */
export function primeParametersCache(year, items) {
  const key = year ?? 'all'
  if (!paramsCache.has(key)) paramsCache.set(key, items || [])
}

export function primeTrackerCache(kpiId, year, rows) {
  const key = `${kpiId}-${year}`
  if (!trackerCache.has(key)) trackerCache.set(key, rows || [])
}
