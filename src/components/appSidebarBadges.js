export const applySidebarBadges = (
  items,
  {
    priceExceptionPendingCount = 0,
    priceExceptionBadgeScope = '',
    vendorRegistrationExpiredCount = 0,
  } = {},
) =>
  items.map((item) => {
    if (item.to === '/crm/price-exceptions' && priceExceptionPendingCount > 0) {
      return {
        ...item,
        badge: {
          color: 'primary',
          text: String(priceExceptionPendingCount),
          title:
            priceExceptionBadgeScope === 'ready_to_apply'
              ? 'Negotiations ready to apply'
              : 'Negotiations pending approval',
        },
      }
    }

    if (item.to === '/client/manage' && vendorRegistrationExpiredCount > 0) {
      return {
        ...item,
        badge: {
          color: 'danger',
          text: String(vendorRegistrationExpiredCount),
          title: 'Expired vendor registrations',
        },
      }
    }

    return item
  })
