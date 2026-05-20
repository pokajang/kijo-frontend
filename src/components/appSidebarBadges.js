import { getRouteNotificationBadge } from '../notifications/notificationRegistry'

export const applySidebarBadges = (items, { getRouteGroupCount = () => 0 } = {}) =>
  items.map((item) => {
    const count = Number(getRouteGroupCount(item.to) || 0)
    const badgeConfig = getRouteNotificationBadge(item.to)

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
