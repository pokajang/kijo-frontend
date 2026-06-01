import { matchPath } from 'react-router-dom'
import { getAccessibleModuleSearchItems } from '../../../components/search/moduleSearchIndex'
import routes from '../../../routes'

const humanizePathSegment = (pathname) => {
  const segment = pathname.split('/').filter(Boolean).pop()
  if (!segment) return 'Home'

  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const getCurrentPageName = (pathname) => {
  const exactRoute = routes.find(
    (route) => route.name && route.path && matchPath({ path: route.path, end: true }, pathname),
  )

  if (exactRoute?.name) return exactRoute.name

  return humanizePathSegment(pathname)
}

export const normalizeInlineRouteTarget = (route) =>
  String(route || '')
    .split(/[?#]/)[0]
    .replace(/\/+$/g, '')

export const resolveInlineRouteRef = (routeRef, roles = []) => {
  const route = String(routeRef?.related_route || '')
  if (!route || route.startsWith('/knowledge')) return null

  const moduleItem = getAccessibleModuleSearchItems(roles).find((item) => item.to === route)
  if (!moduleItem) return null

  return {
    id: String(routeRef?.id || ''),
    label: moduleItem.label || String(routeRef?.label || route),
    route,
    moduleItem,
  }
}

export const inlineRouteRefMap = (routeRefs, roles = []) => {
  const refs = new Map()
  ;(Array.isArray(routeRefs) ? routeRefs : []).forEach((routeRef) => {
    const resolved = resolveInlineRouteRef(routeRef, roles)
    if (resolved?.id && !refs.has(resolved.id)) {
      refs.set(resolved.id, resolved)
    }
  })
  return refs
}

export const inlineRouteTargets = (routeRefs, roles = []) =>
  new Set(
    Array.from(inlineRouteRefMap(routeRefs, roles).values()).map((routeRef) =>
      normalizeInlineRouteTarget(routeRef.route),
    ),
  )
