export const resolveAssetUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const apiBase = String(import.meta.env.VITE_API_BASE || '/').replace(/\/+$/, '')

  if (/^https?:/i.test(raw)) {
    try {
      const url = new URL(raw)
      const shouldProxyPrivateFile =
        apiBase.startsWith('/') &&
        !apiBase.startsWith('//') &&
        url.pathname.startsWith('/files/private/')

      if (shouldProxyPrivateFile) {
        const path = `/${[apiBase.replace(/^\/+/, ''), url.pathname.replace(/^\/+/, '')]
          .filter(Boolean)
          .join('/')}${url.search}${url.hash}`
        return new URL(path, window.location.origin).toString()
      }
    } catch {
      return raw
    }

    return raw
  }

  if (/^(data:|blob:)/i.test(raw) || raw.startsWith('//')) return raw

  const legacyUploadsPrefix = /^\/?(?:backend(?:-legacy)?\/)?uploads\//i
  const cleanPath = raw.replace(/^\/+/, '')
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
