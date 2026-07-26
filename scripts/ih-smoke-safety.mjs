const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

export const validateSmokeTarget = (rawUrl) => {
  let target

  try {
    target = new URL(rawUrl)
  } catch {
    throw new Error(`FRONTEND_URL must be a valid absolute URL; received "${rawUrl}".`)
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new Error('FRONTEND_URL must use HTTP or HTTPS.')
  }

  if (!LOOPBACK_HOSTS.has(target.hostname)) {
    throw new Error(
      'The IH fixture smoke test is restricted to a loopback frontend paired with the local ' +
        'isolated backend. It must never target production or a remote environment.',
    )
  }

  target.pathname = target.pathname.replace(/\/+$/, '')
  return target.toString().replace(/\/$/, '')
}

export const redactEmail = (email) => {
  const [localPart, domain] = String(email).split('@')
  if (!domain) return '[redacted]'

  return `${localPart.slice(0, 1) || '*'}***@${domain}`
}
