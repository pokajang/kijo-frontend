import { getRouteNotificationBadge } from '../notifications/notificationRegistry'

const routeKeysForItem = (item = {}) =>
  Array.from(
    new Set(
      [
        item.to,
        ...(Array.isArray(item.notificationRouteGroups) ? item.notificationRouteGroups : []),
      ].filter(Boolean),
    ),
  )

export const applySidebarBadges = (items, { getRouteGroupCount = () => 0 } = {}) =>
  items.map((item) => {
    const routeKeys = routeKeysForItem(item)
    const count = routeKeys.reduce(
      (total, routeKey) => total + Number(getRouteGroupCount(routeKey) || 0),
      0,
    )
    const badgeConfig = routeKeys.map(getRouteNotificationBadge).find(Boolean)

    if (count <= 0 || !badgeConfig) {
      return item
    }

    return {
      ...item,
      badge: {
        color: badgeConfig.color,
        text: String(count),
        title: badgeConfig.title,
      },
    }
  })
