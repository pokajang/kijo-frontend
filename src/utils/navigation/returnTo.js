export const getCurrentReturnTo = (location = {}) =>
  `${location.pathname || ''}${location.search || ''}${location.hash || ''}` || '/'

export const sanitizeInternalReturnTo = (value, fallback = '/') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback
  return trimmed
}

export const getDetailReturnTo = (location = {}, fallback = '/') =>
  sanitizeInternalReturnTo(location.state?.returnTo, fallback)
