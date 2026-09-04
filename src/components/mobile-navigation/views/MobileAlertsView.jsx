import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton } from '@coreui/react'

import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import {
  formatRelativeTime,
  SEVERITY_DOT_COLOR,
} from '../../header/notifications/NotificationListContent'
import { useNotificationList } from '../../header/notifications/useNotificationList'
import MobileSheetItemCard from '../MobileSheetItemCard'
import { useMobileNavSheet } from '../MobileNavSheetContext'

const MobileAlertsView = () => {
  const navigate = useNavigate()
  const { summary, isStale, consumeEntity } = useAppNotifications()
  const { resetAfterRoute } = useMobileNavSheet()
  const {
    items,
    total,
    loading,
    loadingMore,
    errored,
    loadMoreErrored,
    hasLoaded,
    hasMore,
    loadMore,
  } = useNotificationList({ enabled: true })
  const unreadCount = Number(summary?.listable_total ?? 0)
  const stateCard =
    loading || !hasLoaded
      ? { title: 'Loading notifications…' }
      : errored
        ? { title: 'Could not load notifications.', description: 'Please try again later.' }
        : { title: "You're all caught up." }

  const handleSelect = (item) => {
    if (item.module_key && item.entity_type && item.entity_id) {
      consumeEntity({
        moduleKey: item.module_key,
        entityType: item.entity_type,
        entityId: item.entity_id,
      }).catch(() => {})
    }
    if (item.route) {
      resetAfterRoute()
      navigate(item.route)
    }
  }

  return (
    <div className="app-mobile-alerts-view">
      {(unreadCount > 0 || total > 0) && (
        <div className="app-mobile-sheet-meta">
          {unreadCount > 0 ? `${unreadCount} unread` : `${total} notifications`}
          {total > items.length ? ` · showing ${items.length} of ${total}` : ''}
        </div>
      )}
      {isStale && <div className="app-notification-stale">Counts may be out of date.</div>}
      <div className="app-mobile-alerts-grid">
        {items.length === 0 ? (
          <MobileSheetItemCard
            title={stateCard.title}
            description={stateCard.description}
            fullWidth
            disabled
          />
        ) : (
          items.map((item) => (
            <MobileSheetItemCard
              key={item.id}
              title={item.title}
              description={item.message}
              meta={formatRelativeTime(item.created_at)}
              icon={
                <span
                  className="app-mobile-alert-card__dot"
                  style={{
                    backgroundColor: SEVERITY_DOT_COLOR[item.severity] || 'var(--cui-secondary)',
                  }}
                  aria-hidden="true"
                />
              }
              fullWidth
              onClick={() => handleSelect(item)}
            />
          ))
        )}
      </div>
      {loadMoreErrored && (
        <div className="app-notification-stale" role="status">
          Could not load more notifications. Please try again.
        </div>
      )}
      {hasMore && (
        <CButton
          type="button"
          color="primary"
          variant="outline"
          className="app-mobile-alerts-load-more"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore ? 'Loading more…' : `Load more (${items.length} of ${total})`}
        </CButton>
      )}
    </div>
  )
}

export default MobileAlertsView
