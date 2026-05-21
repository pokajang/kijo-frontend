export const routeNotificationBadges = {
  '/crm/price-exceptions': {
    color: 'primary',
    title: 'Negotiations need attention',
  },
  '/client/manage': {
    color: 'danger',
    title: 'Vendor registrations need attention',
  },
  '/staff/leaves': {
    color: 'warning',
    title: 'Leave requests need attention',
  },
  '/my/leaves': {
    color: 'success',
    title: 'Leave updates available',
  },
}

export const tabNotificationBadges = {
  'client.vendor-registration': {
    color: 'danger',
    title: 'Vendor registrations need attention',
  },
  'staff.leaves': {
    color: 'warning',
    title: 'Leave requests need attention',
  },
  'my.leaves': {
    color: 'success',
    title: 'Leave updates available',
  },
  'crm.negotiations': {
    color: 'primary',
    title: 'Negotiations need attention',
  },
}

export const getRouteNotificationBadge = (route) => routeNotificationBadges[route] || null

export const getTabNotificationBadge = (tabKey) => tabNotificationBadges[tabKey] || null
