import { KPI_API_BASE } from './kpiApiBase'

/**
 * Capitalize the first letter of each word in a string
 * @param {string} str - The string to transform
 * @returns {string} The transformed string with each word capitalized
 */
export function capitalizeWords(str = '') {
  return String(str)
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ')
}

async function fetchStaffKpiJSON(url) {
  const response = await fetch(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status}: ${text || 'Request failed'}`)
  }

  let json
  try {
    json = await response.json()
  } catch {
    throw new Error('Invalid JSON response')
  }

  if (json.status !== 'success') {
    throw new Error(json.message || 'Request failed')
  }

  return json
}

function mapKpiParameter(kpi) {
  return {
    value: kpi.id,
    label: capitalizeWords(kpi.parameter_name),
    annual_target: kpi.annual_target,
    unit: kpi.unit,
    weightage: kpi.weightage,
    color: kpi.color,
    description: kpi.description,
    year: kpi.year,
  }
}

/**
 * Fetch KPI parameters for a given staff member (HR view)
 * - If `year` is provided, the server should filter by that year.
 * - If omitted, the server should return all years (so you can build a year dropdown).
 *
 * @param {number|string} staffId
 * @param {number|string} [year]
 * @returns {Promise<Array<{value:number,label:string,annual_target:number,unit:string,color?:string,description?:string,year?:number}>>}
 */
export async function getAllKpiParameters(staffId, year) {
  const params = new URLSearchParams({ staff_id: staffId })
  if (year != null) params.set('year', year)

  const json = await fetchStaffKpiJSON(`${KPI_API_BASE}/parameters?${params}`)
  const data = json.data || []
  return data.map(mapKpiParameter)
}

/**
 * Convenience: fetch all parameters (no year filter) and return both items + distinct years (DESC).
 * If backend returns `years`, we use it; otherwise we derive from the items.
 *
 * @param {number|string} staffId
 * @returns {Promise<{items: ReturnType<typeof getAllKpiParameters>, years: number[]}>}
 */
export async function getAllKpiParametersWithYears(staffId) {
  const params = new URLSearchParams({ staff_id: staffId })

  const json = await fetchStaffKpiJSON(`${KPI_API_BASE}/parameters?${params}`)
  const items = (json.data || []).map(mapKpiParameter)

  // Prefer backend-provided years if present; else derive
  const years = Array.isArray(json.years)
    ? json.years
        .map((y) => Number(y))
        .filter(Number.isFinite)
        .sort((a, b) => b - a)
    : Array.from(new Set(items.map((k) => Number(k.year)).filter(Number.isFinite))).sort(
        (a, b) => b - a,
      )

  return { items, years }
}

/**
 * Fetch all KPI tracker rows for a given staff, KPI, and year (HR view)
 * @param {number|string} staffId
 * @param {number|string} kpiId
 * @param {number|string} year
 * @returns {Promise<Array<Object>>}
 */
export async function getAllKpiTracker(staffId, kpiId, year) {
  const params = new URLSearchParams({ staff_id: staffId, kpi_id: kpiId, year })
  const json = await fetchStaffKpiJSON(`${KPI_API_BASE}/tracker?${params}`)

  return json.data || []
}

// Optional alias (useful if some files import the plural form)
export const getAllKpiTrackers = getAllKpiTracker
