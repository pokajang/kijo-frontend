const RAW_BASE = import.meta.env.VITE_API_BASE || ''
const API_ROOT = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`

export const KPI_API_BASE = `${API_ROOT}hr/kpi`
