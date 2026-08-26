export const API_BASE = import.meta.env.VITE_API_BASE

export const TEMPLATE_TYPES = ['training', 'ih', 'manpower', 'special']

export const templateApiConfigs = {
  training: {
    basePath: 'proposal-templates/training',
    updateMethod: 'PUT',
  },
  ih: {
    basePath: 'proposal-templates/ih',
    updateMethod: 'PUT',
  },
  manpower: {
    basePath: 'proposal-templates/manpower',
    updateMethod: 'PUT',
  },
  special: {
    basePath: 'proposal-templates/special',
    updateMethod: 'POST',
  },
}

const getConfig = (type) => {
  const config = templateApiConfigs[type]
  if (!config) {
    throw new Error(`Unsupported template type: ${type}`)
  }
  return config
}

const buildApiUrl = (path) => `${API_BASE}${path}`

export const getTemplateBaseUrl = (type) => buildApiUrl(getConfig(type).basePath)

export const getTemplateResourceUrl = (type, id) =>
  `${getTemplateBaseUrl(type)}/${encodeURIComponent(id)}`

export const getTemplatePdfUrl = (type, id) => `${getTemplateResourceUrl(type, id)}/pdf`

export const getTemplateWordUrl = (type, id) => `${getTemplateResourceUrl(type, id)}/word`

export const getTemplateBmCopyUrl = (type, id) => `${getTemplateResourceUrl(type, id)}/bm-copy`

const parseResponsePayload = async (response) => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const isAbortError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  return error?.name === 'AbortError' || error?.code === 20 || message.includes('abort')
}

export const fetchTemplateJson = async (url, options = {}, signal) => {
  const response = await fetch(url, {
    ...options,
    credentials: options.credentials ?? 'include',
    signal: signal ?? options.signal,
  })
  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.notFound = response.status === 404
    error.data = payload
    throw error
  }

  return payload
}

const createBodyOptions = (payload, options = {}) => {
  if (payload instanceof FormData) {
    return {
      ...options,
      body: payload,
    }
  }

  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: JSON.stringify(payload),
  }
}

const getPaginationState = (payload) => {
  const currentPage = Number(
    payload?.current_page ?? payload?.pagination?.current_page ?? payload?.meta?.current_page,
  )
  const lastPage = Number(
    payload?.last_page ?? payload?.pagination?.last_page ?? payload?.meta?.last_page,
  )

  if (!Number.isFinite(currentPage) || !Number.isFinite(lastPage) || lastPage <= currentPage) {
    return null
  }

  return { currentPage, lastPage }
}

const setPageParam = (url, page) => {
  const parsed = new URL(url, window.location.origin)
  parsed.searchParams.set('page', String(page))
  return parsed.toString()
}

const mergePaginatedPayload = (firstPayload, pagePayloads) => {
  const rows = [
    ...(Array.isArray(firstPayload?.data) ? firstPayload.data : []),
    ...pagePayloads.flatMap((payload) => (Array.isArray(payload?.data) ? payload.data : [])),
  ]

  return {
    ...firstPayload,
    data: rows,
    current_page: 1,
    last_page: 1,
    pagination: firstPayload?.pagination
      ? {
          ...firstPayload.pagination,
          current_page: 1,
          last_page: 1,
        }
      : firstPayload?.pagination,
  }
}

const urlWithParams = (url, params = {}) => {
  const parsed = new URL(url, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      parsed.searchParams.set(key, String(value))
    }
  })
  return parsed.toString()
}

export const listTemplates = (type, options = {}) => {
  const { language, ...fetchOptions } = options
  const baseUrl = urlWithParams(getTemplateBaseUrl(type), { language })

  return fetchTemplateJson(baseUrl, fetchOptions, fetchOptions.signal).then(async (payload) => {
    const pagination = getPaginationState(payload)
    if (!pagination || !Array.isArray(payload?.data)) {
      return payload
    }

    const pagePayloads = await Promise.all(
      Array.from(
        { length: pagination.lastPage - pagination.currentPage },
        (_, index) => pagination.currentPage + index + 1,
      ).map((page) =>
        fetchTemplateJson(setPageParam(baseUrl, page), fetchOptions, fetchOptions.signal),
      ),
    )

    return mergePaginatedPayload(payload, pagePayloads)
  })
}

export const getTemplate = (type, id, options = {}) => {
  const query = new URLSearchParams({
    id: String(id),
    template_id: String(id),
  })
  return fetchTemplateJson(
    `${getTemplateBaseUrl(type)}?${query.toString()}`,
    { ...options, silentError: true },
    options.signal,
  )
}

export const createTemplate = (type, payload, options = {}) =>
  fetchTemplateJson(
    getTemplateBaseUrl(type),
    {
      method: 'POST',
      ...createBodyOptions(payload, options),
    },
    options.signal,
  )

export const updateTemplate = (type, id, payload, options = {}) => {
  const config = getConfig(type)

  return fetchTemplateJson(
    getTemplateResourceUrl(type, id),
    {
      method: options.method || config.updateMethod,
      ...createBodyOptions(payload, options),
    },
    options.signal,
  )
}

export const deleteTemplate = (type, id, options = {}) =>
  fetchTemplateJson(
    getTemplateResourceUrl(type, id),
    {
      method: 'DELETE',
      ...options,
    },
    options.signal,
  )

export const createBmCopy = (type, id, options = {}) =>
  fetchTemplateJson(
    getTemplateBmCopyUrl(type, id),
    {
      method: 'POST',
      ...options,
    },
    options.signal,
  )
