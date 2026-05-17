export const sanitizeName = (value) => (value || '').trim().replace(/\s+/g, ' ')

export const isEditorContentEmpty = (value) => {
  const plain = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain === ''
}

export const normalizeGuestAttendees = (value) =>
  String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
