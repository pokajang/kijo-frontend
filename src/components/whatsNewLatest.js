const API_BASE = import.meta.env.VITE_API_BASE || '/'

let requestInFlight = null

export const loadLatestWhatsNew = () => {
  if (requestInFlight) return requestInFlight

  requestInFlight = fetch(`${API_BASE}whats-new/latest`, {
    credentials: 'include',
    silentError: true,
  })
    .then(async (response) => ({
      ok: response.ok,
      data: await response.json(),
    }))
    .finally(() => {
      requestInFlight = null
    })

  return requestInFlight
}
