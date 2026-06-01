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

const readJsonPayload = (res) => res.json().catch(() => null)

export class DetailFetchError extends Error {
  constructor(message, { status = 0, data = null, notFound = false } = {}) {
    super(message)
    this.name = 'DetailFetchError'
    this.status = status
    this.data = data
    this.notFound = notFound
  }
}

export const fetchJson = async (url, options = {}) => {
  let res
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    })
  } catch (err) {
    if (options?.signal?.aborted) {
      const abortError = new DOMException('The operation was aborted.', 'AbortError')
      abortError.cause = err
      throw abortError
    }
    throw err
  }

  const data = await readJsonPayload(res)
  if (!res.ok) {
    throw new DetailFetchError(data?.message || `Request failed with HTTP ${res.status}`, {
      status: res.status,
      data,
      notFound: res.status === 404,
    })
  }

  return data
}

export const fetchDetailJson = async (url, options = {}) => {
  const { notFoundMessage = 'Record not found.', ...fetchOptions } = options
  const data = await fetchJson(url, {
    ...fetchOptions,
    silentError: true,
  }).catch((err) => {
    if (err?.notFound || err?.status === 404) {
      return {
        __detailFetchResult: true,
        ok: false,
        notFound: true,
        status: 404,
        data: err.data || null,
        message: err.data?.message || notFoundMessage,
      }
    }
    throw err
  })

  if (data?.__detailFetchResult) {
    const { __detailFetchResult, ...result } = data
    return result
  }

  if (data?.status === 'error') {
    throw new DetailFetchError(data?.message || 'Request failed.', {
      status: 200,
      data,
    })
  }

  return {
    ok: true,
    data,
    status: 200,
  }
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
