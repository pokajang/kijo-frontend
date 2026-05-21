const rawApiBase = import.meta.env.VITE_API_BASE || '/'

export const apiUrl = (path = '') => {
  const base = String(rawApiBase || '/').replace(/\/+$/, '')
  const cleanPath = String(path || '').replace(/^\/+/, '')

  if (!cleanPath) {
    return base || '/'
  }

  return `${base || ''}/${cleanPath}`
}
