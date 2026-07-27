const API_BASE = import.meta.env.VITE_API_BASE || '/'

export const ACCEPTED_SIGNATURE_TYPES = ['image/jpeg', 'image/png']
export const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024

export const getPersonalSignatureFileUrl = (sha256 = '') => {
  const version = String(sha256).trim().slice(0, 16)
  return `${API_BASE}signature/file${version ? `?v=${encodeURIComponent(version)}` : ''}`
}

const parseResponse = async (response) => {
  const data = await response.json()
  if (!response.ok || data.status !== 'success') {
    throw new Error(data.message || 'Signature request failed.')
  }

  const available = data.data?.available === true || Boolean(data.url)
  const sha256 = data.data?.sha256 || null

  return {
    available,
    url: available ? getPersonalSignatureFileUrl(sha256) : null,
    sha256,
    updatedAt: data.data?.updated_at || null,
  }
}

export const getPersonalSignature = async ({ signal } = {}) => {
  const response = await fetch(`${API_BASE}signature`, {
    credentials: 'include',
    signal,
  })

  return parseResponse(response)
}

export const uploadPersonalSignature = async (file) => {
  const formData = new FormData()
  formData.append('signature', file)
  const response = await fetch(`${API_BASE}signature`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  return parseResponse(response)
}

export const validateSignatureFile = (file) => {
  if (!file) return ''
  if (!ACCEPTED_SIGNATURE_TYPES.includes(file.type)) {
    return 'Please select a JPEG or PNG image.'
  }
  if (file.size > MAX_SIGNATURE_SIZE) {
    return `Signature image must be 2 MB or smaller. Selected file is ${(
      file.size /
      (1024 * 1024)
    ).toFixed(1)} MB.`
  }

  return ''
}
