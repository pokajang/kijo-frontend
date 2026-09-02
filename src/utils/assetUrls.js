export const resolveAssetUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const apiBase = String(import.meta.env.VITE_API_BASE || '/').replace(/\/+$/, '')
  const apiBaseUrl = (() => {
    try {
      return /^https?:/i.test(apiBase) ? new URL(`${apiBase}/`) : null
    } catch {
      return null
    }
  })()
  const toApiAssetUrl = (path) => {
    const clean = String(path || '').replace(/^\/+/, '')
    if (!clean) return ''
    if (apiBaseUrl) {
      return new URL(clean, apiBaseUrl).toString()
    }

    const relativeApiBase = apiBase.replace(/^\/+/, '')
    const nextPath = `/${[relativeApiBase, clean].filter(Boolean).join('/')}`
    try {
      return new URL(nextPath, window.location.origin).toString()
    } catch {
      return nextPath
    }
  }

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

      if (
        apiBaseUrl &&
        typeof window !== 'undefined' &&
        url.origin === window.location.origin &&
        url.pathname.startsWith('/storage/')
      ) {
        return toApiAssetUrl(`${url.pathname.replace(/^\/+/, '')}${url.search}${url.hash}`)
      }
    } catch {
      return raw
    }

    return raw
  }

  if (/^(data:|blob:)/i.test(raw) || raw.startsWith('//')) return raw

  const cleanPath = raw.replace(/^\/+/, '')
  const privateApiRoute =
    /^\/?vendor-payments\/\d+\/(?:invoice|voucher\/(?:pdf|paid-pdf))(?:[?#].*)?$/i
  if (privateApiRoute.test(raw)) {
    return toApiAssetUrl(cleanPath)
  }

  const legacyUploadsPrefix = /^\/?(?:backend(?:-legacy)?\/)?uploads\//i
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
  return toApiAssetUrl(storagePath)
}
