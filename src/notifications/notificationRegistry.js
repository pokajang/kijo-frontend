const notificationCountBadgeColor = 'warning'

export const routeNotificationBadges = {
  '/crm/price-exceptions': {
    color: notificationCountBadgeColor,
    title: 'Negotiations need attention',
  },
  '/client/manage': {
    color: notificationCountBadgeColor,
    title: 'Vendor registrations need attention',
  },
  '/staff/leaves': {
    color: notificationCountBadgeColor,
    title: 'Leave requests need attention',
  },
  '/vendor/payment-records': {
    color: notificationCountBadgeColor,
    title: 'Vendor payments need attention',
  },
  '/financial/salary-records': {
    color: notificationCountBadgeColor,
    title: 'Salary/claim requests need attention',
  },
  '/financial/other-claim-records': {
    color: notificationCountBadgeColor,
    title: 'Other claims need attention',
  },
  '/my/leaves': {
    color: notificationCountBadgeColor,
    title: 'Leave updates available',
  },
  '/my/salary': {
    color: notificationCountBadgeColor,
    title: 'Salary/claim updates available',
  },
  '/my/salary/records': {
    color: notificationCountBadgeColor,
    title: 'Salary updates available',
  },
  '/my/salary/other-claims/records': {
    color: notificationCountBadgeColor,
    title: 'Other claim updates available',
  },
}

export const tabNotificationBadges = {
  'client.vendor-registration': {
    color: notificationCountBadgeColor,
    title: 'Vendor registrations need attention',
  },
  'staff.leaves': {
    color: notificationCountBadgeColor,
    title: 'Leave requests need attention',
  },
  'vendor.payment-records': {
    color: notificationCountBadgeColor,
    title: 'Vendor payments need attention',
  },
  'financial.salary-records': {
    color: notificationCountBadgeColor,
    title: 'Salary requests need attention',
  },
  'financial.other-claim-records': {
    color: notificationCountBadgeColor,
    title: 'Other claim requests need attention',
  },
  'my.leaves': {
    color: notificationCountBadgeColor,
    title: 'Leave updates available',
  },
  'my.salary.records': {
    color: notificationCountBadgeColor,
    title: 'Salary updates available',
  },
  'my.salary.other-claim-records': {
    color: notificationCountBadgeColor,
    title: 'Other claim updates available',
  },
  'crm.negotiations': {
    color: notificationCountBadgeColor,
    title: 'Negotiations need attention',
  },
}

export const getRouteNotificationBadge = (route) => routeNotificationBadges[route] || null

export const getTabNotificationBadge = (tabKey) => tabNotificationBadges[tabKey] || null
