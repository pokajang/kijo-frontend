import navItems from '../../_nav'

export const API_BASE = import.meta.env.VITE_API_BASE || '/'
export const MAX_KNOWLEDGE_IMAGES = 10
export const MAX_KNOWLEDGE_IMAGE_BYTES = 5 * 1024 * 1024
export const TARGET_KNOWLEDGE_IMAGE_BYTES = 500 * 1024
export const ALLOWED_KNOWLEDGE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const knowledgeCategories = [
  'Getting Started',
  'Leave & HR',
  'CRM',
  'Proposals',
  'Projects',
  'Commercial',
  'Vendors',
  'Catalog',
  'Support',
  'System',
]

const normalizePath = (path) => {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

const normalizeLabel = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (Array.isArray(value)) return value.map(normalizeLabel).filter(Boolean).join(' ').trim()

  const children = value?.props?.children
  if (children !== undefined) return normalizeLabel(children)

  return ''
}

const collectDestinations = (items = []) =>
  items.flatMap((item) => {
    const children = collectDestinations(item.items)
    const path = normalizePath(item.to)
    if (!path || path.includes(':')) return children

    return [{ label: normalizeLabel(item.name) || path, path }, ...children]
  })

export const relatedRouteOptions = Array.from(
  collectDestinations(navItems)
    .reduce((map, item) => {
      if (item.path && !map.has(item.path)) map.set(item.path, item)
      return map
    }, new Map())
    .values(),
).sort((a, b) => a.label.localeCompare(b.label))
