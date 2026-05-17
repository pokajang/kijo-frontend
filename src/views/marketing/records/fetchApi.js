const API_BASE = import.meta.env.VITE_API_BASE

export const fetchApi = {
  listContactsWithCalls: async ({ q = '', limit = 100, year = '', all = false } = {}) => {
    const params = new URLSearchParams({ q, limit: String(limit) })
    if (year) params.set('year', String(year))
    if (all) params.set('all', '1')
    const res = await fetch(`${API_BASE}google/contacts-with-calls?${params.toString()}`, {
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load call records.')
    return Array.isArray(data?.rows) ? data.rows : []
  },

  listContacts: async ({ q = '', limit = 100, year = '', all = false } = {}) => {
    const params = new URLSearchParams({ q, limit: String(limit) })
    if (year) params.set('year', String(year))
    if (all) params.set('all', '1')
    const res = await fetch(`${API_BASE}google/contacts?${params.toString()}`, {
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load contacts.')
    return data.rows
  },

  listCalls: async (contactId) => {
    const res = await fetch(`${API_BASE}google/contacts/${encodeURIComponent(contactId)}/calls`, {
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load call logs.')
    return data.rows
  },

  createCallRecord: async (payload = {}) => {
    const contactId = payload.contact_id ?? payload.contactId ?? payload.id
    const res = await fetch(`${API_BASE}google/contacts/${encodeURIComponent(contactId)}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to save call record.')
    return data
  },

  registerContact: async (payload = {}) => {
    const { name = '', phone = '', address = '', website = '' } = payload || {}
    const res = await fetch(`${API_BASE}google/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: String(name || '').trim(),
        phone: String(phone || '').trim(),
        address: String(address || '').trim(),
        website: String(website || '').trim(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to add contact.')
    return data
  },

  updateContact: async (payload = {}) => {
    const { id, name = '', phone = '', address = '', website = '' } = payload || {}
    const res = await fetch(`${API_BASE}google/contacts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
      body: JSON.stringify({
        id,
        name: String(name || '').trim(),
        phone: String(phone || '').trim(),
        address: String(address || '').trim(),
        website: String(website || '').trim(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to update contact.')
    return data
  },

  deleteContact: async (id) => {
    const res = await fetch(`${API_BASE}google/contacts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to delete contact.')
    return data
  },

  deleteCall: async (id) => {
    const res = await fetch(`${API_BASE}google/calls/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to delete call log.')
    }
    return data
  },
}
