export const salaryAttachmentAccept = '.pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf'

export const maxSalaryAttachmentBytes = 2 * 1024 * 1024

const imageTypes = new Set(['image/jpeg', 'image/png'])
const allowedExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg'])

const getExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || ''

const isSupportedAttachment = (file) => {
  const extension = getExtension(file.name)
  return (
    allowedExtensions.has(extension) || imageTypes.has(file.type) || file.type === 'application/pdf'
  )
}

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read image attachment.'))
    }

    image.src = objectUrl
  })

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Could not compress image attachment.'))
      },
      type,
      quality,
    )
  })

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read attachment.'))
    reader.readAsDataURL(file)
  })

const compressImageFile = async (file) => {
  const image = await loadImage(file)
  const maxDimension = 1600
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  const outputType = 'image/jpeg'
  let quality = 0.82
  let blob = await canvasToBlob(canvas, outputType, quality)

  while (blob.size > maxSalaryAttachmentBytes && quality > 0.45) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, outputType, quality)
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'attachment'
  return new File([blob], `${baseName}.jpg`, {
    type: outputType,
    lastModified: Date.now(),
  })
}

export const formatAttachmentSize = (bytes = 0) => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const prepareSalaryAttachment = async (file) => {
  if (!file) return null

  if (!isSupportedAttachment(file)) {
    throw new Error('Upload a PDF, JPG, JPEG, or PNG file.')
  }

  const isImage =
    imageTypes.has(file.type) || ['jpg', 'jpeg', 'png'].includes(getExtension(file.name))
  const shouldCompress = isImage && file.size > maxSalaryAttachmentBytes
  const preparedFile = shouldCompress ? await compressImageFile(file) : file
  const dataUrl = await fileToDataUrl(preparedFile)

  return {
    file: preparedFile,
    name: preparedFile.name,
    size: preparedFile.size,
    type: preparedFile.type || file.type,
    dataUrl,
    originalName: file.name,
    originalSize: file.size,
    compressed: preparedFile.size < file.size,
  }
}

export const openSalaryAttachment = (attachment) => {
  const url = attachment?.dataUrl || attachment?.url || attachment?.downloadUrl
  if (!url || typeof window === 'undefined') return

  const view = window.open(url, '_blank')
  if (view) {
    view.opener = null
    return
  }

  window.location.href = url
}
