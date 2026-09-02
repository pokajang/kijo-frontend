import { apiFetch } from '../api/apiClient'

const safeFilename = (value, fallback) => {
  const clean = String(value || '')
    .replace(/^.*[\\/]/, '')
    .replace(/[^A-Za-z0-9._ -]+/g, '_')
    .trim()
  return clean || fallback
}

export const filenameFromDisposition = (header, fallback = 'download') => {
  const encoded = String(header || '').match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plain = String(header || '').match(/filename="?([^";]+)"?/i)?.[1]
  let value = encoded || plain || fallback
  try {
    value = decodeURIComponent(value)
  } catch {
    // Keep the server value when it is not URI encoded.
  }
  return safeFilename(value, fallback)
}

const validateFile = async (blob, contentType, expectedType) => {
  if (expectedType === 'pdf') {
    if (contentType !== 'application/pdf' || (await blob.slice(0, 5).text()) !== '%PDF-') {
      throw new Error('The server did not return a valid PDF document.')
    }
  }
  if (expectedType === 'zip') {
    const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
    const valid =
      signature[0] === 0x50 && signature[1] === 0x4b && [0x03, 0x05, 0x07].includes(signature[2])
    if (contentType !== 'application/zip' || !valid) {
      throw new Error('The server did not return a valid ZIP archive.')
    }
  }
}

export const downloadAuthenticatedFile = async ({
  url,
  init,
  expectedType = 'pdf',
  fallbackFilename,
}) => {
  const response = await apiFetch(url, {
    credentials: 'include',
    silentError: true,
    ...init,
  })
  if (!response.ok) {
    const payload = await response
      .clone()
      .json()
      .catch(() => ({}))
    throw new Error(payload?.message || 'The document could not be downloaded.')
  }
  const contentType = String(response.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const blob = await response.blob()
  await validateFile(blob, contentType, expectedType)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filenameFromDisposition(
    response.headers.get('content-disposition'),
    fallbackFilename || `download.${expectedType}`,
  )
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  return anchor.download
}
