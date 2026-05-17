export const resolveAssetUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/i.test(raw) || raw.startsWith('//')) return raw

  const legacyUploadsPrefix = /^\/?(?:backend(?:-legacy)?\/)?uploads\//i
  const cleanPath = raw.replace(/^\/+/, '')
  const apiBase = String(import.meta.env.VITE_API_BASE || '/').replace(/\/+$/, '')
  const apiBasePath = apiBase.replace(/^\/+/, '')
  if (raw.startsWith('/') && apiBasePath && cleanPath.startsWith(`${apiBasePath}/`)) {
    try {
      return new URL(`/${cleanPath}`, window.location.origin).toString()
    } catch {
      return `/${cleanPath}`
    }
  }

  const storagePath = legacyUploadsPrefix.test(cleanPath)
    ? `storage/legacy-uploads/${cleanPath.replace(legacyUploadsPrefix, '')}`
    : cleanPath.startsWith('storage/')
      ? cleanPath
      : raw.startsWith('/')
        ? cleanPath
        : `storage/${cleanPath}`
  const path = `/${[apiBase.replace(/^\/+/, ''), storagePath].filter(Boolean).join('/')}`

  try {
    return new URL(path, window.location.origin).toString()
  } catch {
    return path
  }
}
