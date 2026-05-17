import navItems from '../../../_nav'

export const API_BASE = import.meta.env.VITE_API_BASE || '/'
export const MAX_NOTICE_IMAGES = 3
export const MAX_NOTICE_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_NOTICE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const CREATE_DRAFT_STORAGE_KEY = 'whats-new:create-draft'

const extraActionDestinations = [
  {
    label: 'Monitoring Dashboard',
    path: '/dashboard/monitoring',
    actionLabel: 'View Monitoring',
  },
]

const normalizePath = (path) => {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

const collectActionDestinations = (items = []) =>
  items.flatMap((item) => {
    const children = collectActionDestinations(item.items)
    const path = normalizePath(item.to)
    if (!path || path.includes(':')) return children

    return [
      {
        label: item.name,
        path,
        actionLabel: item.name?.startsWith('Create ') ? item.name : `View ${item.name}`,
      },
      ...children,
    ]
  })

export const actionDestinations = Array.from(
  [...extraActionDestinations, ...collectActionDestinations(navItems)]
    .reduce((map, destination) => {
      if (destination.path && !map.has(destination.path)) {
        map.set(destination.path, destination)
      }
      return map
    }, new Map())
    .values(),
).sort((a, b) => a.label.localeCompare(b.label))
