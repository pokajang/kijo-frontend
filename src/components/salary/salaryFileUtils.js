export const downloadBlob = (blob, filename) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const openPreparingPdfTab = (message = 'Preparing PDF...') => {
  if (typeof window === 'undefined') return null

  const tab = window.open('', '_blank')
  if (!tab) return null

  try {
    tab.opener = null
    tab.document.open()
    tab.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${message}</title>
  <style>
    body {
      align-items: center;
      color: #273142;
      display: flex;
      font-family: Arial, Helvetica, sans-serif;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
    }
    .message {
      border: 1px solid #d8dee8;
      border-radius: 6px;
      padding: 18px 22px;
    }
  </style>
</head>
<body>
  <div class="message">${message}</div>
</body>
</html>`)
    tab.document.close()
  } catch {
    // The tab still exists; the generated PDF can replace it when ready.
  }

  return tab
}

export const openBlobInNewTab = (blob, filename, pendingTab = null) => {
  if (typeof window === 'undefined') return

  const url = window.URL.createObjectURL(blob)
  const tab = pendingTab && !pendingTab.closed ? pendingTab : window.open(url, '_blank')

  if (tab) {
    try {
      tab.opener = null
    } catch {
      // Some browsers restrict access to opened windows; the PDF URL is already assigned.
    }
    try {
      tab.document.title = filename
    } catch {
      // Some browsers restrict document access on opened tabs; setting location is enough.
    }
    if (pendingTab && !pendingTab.closed) {
      tab.location.href = url
    }
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    return
  }

  window.location.href = url
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
}
