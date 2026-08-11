export const MAX_FIRST_TOUCH_EVIDENCE_IMAGES = 3
export const MAX_FIRST_TOUCH_EVIDENCE_BYTES = 8 * 1024 * 1024

const acceptedEvidenceTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const validateEvidenceFiles = (fileList, { availableSlots, single = false } = {}) => {
  const files = Array.from(fileList || [])
  if (!files.length) return { files: [], error: '' }
  if (single && files.length !== 1) {
    return { files: [], error: 'Choose one image to replace this evidence item.' }
  }
  if (Number.isFinite(availableSlots) && files.length > availableSlots) {
    return {
      files: [],
      error: `Only ${availableSlots} evidence image${availableSlots === 1 ? '' : 's'} can be added.`,
    }
  }

  const unsupported = files.find((file) => !acceptedEvidenceTypes.has(file.type))
  if (unsupported) {
    return {
      files: [],
      error: `${unsupported.name} is not a supported image. Use JPG, PNG, WebP or GIF.`,
    }
  }

  const oversized = files.find((file) => file.size > MAX_FIRST_TOUCH_EVIDENCE_BYTES)
  if (oversized) {
    return { files: [], error: `${oversized.name} exceeds the 8 MB image limit.` }
  }

  return { files, error: '' }
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const createEvidenceProofs = async (files, { prefix = 'local', platform, author, date }) =>
  Promise.all(
    files.map(async (file, index) => ({
      id: `${prefix}-${Date.now()}-${index}-${file.name}`,
      platform,
      author,
      date,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      file,
      evidenceState: 'new',
      previewUrl: await readFileAsDataUrl(file),
    })),
  )

export const prepareEvidenceForSubmission = (proofs = []) =>
  proofs.map(({ evidenceState, ...proof }) => proof)
