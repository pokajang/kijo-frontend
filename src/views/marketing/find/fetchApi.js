import { API_BASE } from './constants'

export const fetchApi = {
  async loadGrid() {
    const res = await fetch(`${API_BASE}google/places/unregistered?_=${Date.now()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Failed to load places.')
    return Array.isArray(data?.rows) ? data.rows : []
  },

  async generatePlaces(params) {
    const { q, stateFilter, limit } = params
    const searchParams = new URLSearchParams({
      q,
      region: stateFilter || 'Malaysia',
      limit: String(limit || 10),
    })
    const res = await fetch(`${API_BASE}google/places/seed?` + searchParams.toString(), {
      method: 'POST',
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to generate places.')
    return data
  },

  async fetchPlaceDetails(place_id) {
    const res = await fetch(
      `${API_BASE}google/place-details?place_id=${encodeURIComponent(place_id)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.success === false || data?.error) {
      throw new Error(data?.message || data?.error || 'Unable to fetch phone details right now.')
    }
    return data
  },

  async registerContact(formData = {}) {
    const {
      name = '',
      phone = '',
      address = '',
      place_id = '',
      note = '',
      website = '',
    } = formData || {}

    const body = new FormData()
    body.append('name', name)
    body.append('phone', phone)
    body.append('address', address)
    if (place_id) body.append('place_id', place_id)
    if (note) body.append('note', note)
    if (website) body.append('website', website)

    const res = await fetch(`${API_BASE}google/contacts`, {
      method: 'POST',
      credentials: 'include',
      body,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || 'Failed to register contact.')
    }

    // always return full payload so UI can show backend message
    return data
  },
}
