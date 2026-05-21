import DOMPurify from 'dompurify'
import { TARGET_KNOWLEDGE_IMAGE_BYTES } from './constants'

export const stripHtml = (value = '') =>
  String(value || '')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const sanitizeKnowledgeHtml = (raw) =>
  DOMPurify.sanitize(String(raw || ''), {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ol',
      'ul',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'h2',
      'h3',
      'h4',
      'blockquote',
      'pre',
      'code',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const normalizeTags = (value) => {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean)
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export const canManageArticle = (article, meta = {}) =>
  Boolean(meta.can_moderate) || Number(meta.staff_id || 0) > 0

const blobFromCanvas = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality))

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to read image.'))
    }
    image.src = url
  })

const outputName = (name) => `${String(name || 'knowledge-image').replace(/\.[^.]+$/, '')}.webp`

export const compressKnowledgeImage = async (file, targetBytes = TARGET_KNOWLEDGE_IMAGE_BYTES) => {
  if (!file || file.size <= targetBytes) return file

  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return file

  const maxSourceSide = Math.max(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
  )
  let maxSide = Math.min(maxSourceSide, 1800)
  let bestBlob = null

  for (let scaleAttempt = 0; scaleAttempt < 6; scaleAttempt += 1) {
    const ratio = maxSourceSide > maxSide ? maxSide / maxSourceSide : 1
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio))
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio))
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.44]) {
      const blob = await blobFromCanvas(canvas, 'image/webp', quality)
      if (!blob) continue
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob
      if (blob.size <= targetBytes) {
        return new File([blob], outputName(file.name), {
          type: 'image/webp',
          lastModified: Date.now(),
        })
      }
    }

    maxSide = Math.max(480, Math.round(maxSide * 0.78))
  }

  if (bestBlob && bestBlob.size < file.size) {
    return new File([bestBlob], outputName(file.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  }

  return file
}
