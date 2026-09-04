import { applySidebarBadges } from '../appSidebarBadges'
import { hasAnyAllowedRole } from '../../utils/roles'

export const filterNavigationByRole = (items, roles) =>
  items.reduce((result, item) => {
    if (Array.isArray(item.allowedRoles) && !hasAnyAllowedRole(roles, item.allowedRoles)) {
      return result
    }

    const { allowedRoles, notificationRouteGroups, workflowSetupBadge, ...cleanItem } = item
    const normalizedItem = { ...cleanItem }

    if (Array.isArray(cleanItem.items)) {
      normalizedItem.items = filterNavigationByRole(cleanItem.items, roles)
      if (normalizedItem.items.length === 0) return result
    }

    result.push(normalizedItem)
    return result
  }, [])

export const buildAppNavigation = ({
  navigation,
  roles,
  getRouteGroupCount,
  getWorkflowSetupTotal,
}) => {
  const navigationWithBadges = applySidebarBadges(navigation, {
    getRouteGroupCount,
    getWorkflowSetupTotal,
  })

  return filterNavigationByRole(navigationWithBadges, roles)
}
