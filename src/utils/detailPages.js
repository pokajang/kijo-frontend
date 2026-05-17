export const sameId = (left, right) => String(left ?? '') === String(right ?? '')

export const findRecordById = (records = [], id, keys = ['id']) =>
  records.find((record) => keys.some((key) => sameId(record?.[key], id))) || null

export const getArrayFromPayload = (payload, keys = []) => {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], payload)
    if (Array.isArray(value)) return value
  }
  if (Array.isArray(payload)) return payload
  return []
}

export const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || `Request failed with HTTP ${res.status}`)
  }

  return data
}

export const appendQueryParams = (url, params = {}) => {
  const [base, query = ''] = String(url).split('?')
  const searchParams = new URLSearchParams(query)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${base}?${queryString}` : base
}

export const fetchAllPagedRecords = async ({
  url,
  dataKeys = ['data'],
  perPage = 100,
  params = {},
  options,
  normalizeRecords,
  onPage,
}) => {
  let page = 1
  let lastPage = 1
  const allRecords = []

  do {
    const data = await fetchJson(
      appendQueryParams(url, {
        ...params,
        page,
        per_page: perPage,
      }),
      options,
    )
    const records = getArrayFromPayload(data, dataKeys)
    const normalizedRecords = normalizeRecords ? normalizeRecords(records) : records
    allRecords.push(...normalizedRecords)
    onPage?.(data, normalizedRecords)

    lastPage = Number(data?.pagination?.last_page || data?.meta?.last_page || 1)
    page += 1
  } while (page <= lastPage)

  return allRecords
}

export const findRecordByPagedEndpoint = async ({
  url,
  id,
  keys = ['id'],
  dataKeys = ['data'],
  perPage = 100,
  options,
  normalizeRecords,
  onPage,
}) => {
  let page = 1
  let lastPage = 1

  do {
    const data = await fetchJson(appendQueryParams(url, { page, per_page: perPage }), options)
    const records = getArrayFromPayload(data, dataKeys)
    const normalizedRecords = normalizeRecords ? normalizeRecords(records) : records
    onPage?.(data, normalizedRecords)
    const found = findRecordById(normalizedRecords, id, keys)
    if (found) return found

    lastPage = Number(data?.pagination?.last_page || data?.meta?.last_page || 1)
    page += 1
  } while (page <= lastPage)

  return null
}
