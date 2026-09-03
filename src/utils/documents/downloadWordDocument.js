import dialog from '../../components/dialog/dialogService'

const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const filenameFromDisposition = (value, fallback) => {
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (utf8) {
    try {
      return decodeURIComponent(utf8)
    } catch {
      // Fall through to the standard filename parameter.
    }
  }
  return value.match(/filename="?([^";]+)"?/i)?.[1] || fallback
}

export const downloadWordDocument = async (url, fallbackFilename, { errorSuffix = '' } = {}) => {
  try {
    const response = await fetch(url, { credentials: 'include', headers: { Accept: MIME } })
    if (!response.ok) {
      let payload = null
      try {
        payload = await response.json()
      } catch {
        // A non-JSON response uses the status-based fallback.
      }
      throw new Error(payload?.message || `Word generation failed (HTTP ${response.status}).`)
    }
    if (!(response.headers.get('content-type') || '').toLowerCase().includes(MIME)) {
      throw new Error('The Word document response was invalid.')
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filenameFromDisposition(
      response.headers.get('content-disposition') || '',
      fallbackFilename,
    )
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (error) {
    const message =
      error?.message === 'Failed to fetch'
        ? 'Unable to reach the document service. Please retry. If the problem continues, contact support.'
        : error?.message || 'The Word document could not be downloaded.'
    await dialog.alert(`${message}${errorSuffix}`)
  }
}
