const handbookEndpoint = (path) => `${import.meta.env.VITE_API_BASE}hr/${path}`

const defaultErrorMessage = 'Request failed.'

const parseJsonResponse = async (res) => {
  const text = await res.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const normalizeApiResponse = (res, json) => {
  if (json === null) {
    return {
      success: false,
      message: 'Invalid server response.',
      data: [],
      status: res.status,
    }
  }

  const success = json?.success === true || json?.status === 'success'
  const message =
    json?.message ||
    json?.error ||
    (res.ok ? defaultErrorMessage : `Request failed (${res.status}).`)

  return {
    ...json,
    success: res.ok && success,
    message,
    data: json?.data ?? [],
    status: res.status,
  }
}

const requestHandbookJson = async (path, options = {}) => {
  const res = await fetch(handbookEndpoint(path), {
    credentials: 'include',
    ...options,
  })
  const json = await parseJsonResponse(res)

  return normalizeApiResponse(res, json)
}

export const getCurrentHandbook = async ({ signal } = {}) =>
  requestHandbookJson('handbook/current', { signal })

export const getHandbookAcknowledgementStatus = async ({ signal } = {}) =>
  requestHandbookJson('handbook/acknowledgement-status', { signal })

export const getHandbookChangeLogs = async ({ signal } = {}) =>
  requestHandbookJson('handbook/change-logs', { signal })

export const getHandbookVersions = async ({ signal } = {}) =>
  requestHandbookJson('handbook/versions', { signal })

export const getHandbookVersion = async ({ versionId, signal } = {}) =>
  requestHandbookJson(`handbook/versions/${encodeURIComponent(versionId)}`, { signal })

export const reactivateHandbookVersion = async ({ versionId, changeSummary }) =>
  requestHandbookJson(`handbook/versions/${encodeURIComponent(versionId)}/reactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      change_summary: changeSummary,
    }),
  })

export const getHandbookSignatures = async ({ signal, versionId } = {}) => {
  const params = new URLSearchParams()
  if (versionId) {
    params.set('version_id', versionId)
  }

  const query = params.toString()
  return requestHandbookJson(`handbook/signatures${query ? `?${query}` : ''}`, { signal })
}

export const publishHandbook = async ({ content, changeSummary, sectionId, sectionTitle }) =>
  requestHandbookJson('handbook/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      change_summary: changeSummary,
      section_id: sectionId,
      section_title: sectionTitle,
    }),
  })

export const saveHandbookDraftSection = async ({
  baseHandbookVersionId,
  changeSummary,
  sectionId,
  sectionTitle,
  bodyHtml,
}) =>
  requestHandbookJson('handbook/draft-section', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_handbook_version_id: baseHandbookVersionId,
      change_summary: changeSummary,
      section_id: sectionId,
      section_title: sectionTitle,
      body_html: bodyHtml,
    }),
  })

export const publishHandbookDraft = async ({ changeSummary }) =>
  requestHandbookJson('handbook/publish-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      change_summary: changeSummary,
    }),
  })

export const discardHandbookDraft = async () =>
  requestHandbookJson('handbook/draft', {
    method: 'DELETE',
  })

export const signHandbook = async ({ fullName, icNumber, versionId }) => {
  const formData = new FormData()
  formData.append('full_name', fullName)
  formData.append('ic_number', icNumber)
  if (versionId) {
    formData.append('handbook_version_id', versionId)
  }

  return requestHandbookJson('handbook/sign', {
    method: 'POST',
    body: formData,
  })
}
