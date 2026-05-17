export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024

export const ACCEPTED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
])

export const ACCEPTED_ATTACHMENT_INPUT =
  '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png'

const ACCEPTED_EXTENSION_TYPES = {
  pdf: new Set(['application/pdf']),
  doc: new Set(['application/msword']),
  docx: new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ppt: new Set(['application/vnd.ms-powerpoint']),
  pptx: new Set(['application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  jpg: new Set(['image/jpeg']),
  jpeg: new Set(['image/jpeg']),
  png: new Set(['image/png']),
}

const getExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || ''

export const isAcceptedAttachmentFile = (file) => {
  const acceptedTypes = ACCEPTED_EXTENSION_TYPES[getExtension(file.name)]
  if (!acceptedTypes) return false
  if (!file.type) return true
  return acceptedTypes.has(file.type)
}

export const validateAttachmentName = (name = '') => {
  const trimmed = String(name || '').trim()
  if (!trimmed) return null
  if (trimmed.length > 120) return 'Attachment name must be 120 characters or fewer.'
  if (/[\\/]/.test(trimmed)) return 'Attachment name cannot contain path separators.'
  return null
}

export const validateNewAttachments = (files = [], existing = []) => {
  const accepted = []
  const rejected = []
  const seenNames = new Set(
    existing
      .map((item) => item?.file?.name || item?.fileName || item?.name)
      .filter(Boolean)
      .map((name) => String(name).toLowerCase()),
  )

  files.forEach((file) => {
    const lowerName = String(file.name || '').toLowerCase()
    if (!isAcceptedAttachmentFile(file)) {
      rejected.push({ fileName: file.name, reason: 'Unsupported file type.' })
      return
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      rejected.push({ fileName: file.name, reason: 'File exceeds the 15 MB size limit.' })
      return
    }

    if (seenNames.has(lowerName)) {
      rejected.push({ fileName: file.name, reason: 'Duplicate file name.' })
      return
    }

    seenNames.add(lowerName)
    accepted.push({ file, customName: '' })
  })

  return { accepted, rejected }
}

export const validateAttachmentCustomNames = (attachments = []) =>
  attachments
    .map((item, index) => ({
      index,
      message: validateAttachmentName(item.customName),
    }))
    .filter((result) => result.message)
