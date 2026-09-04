import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CDropdown, CDropdownHeader, CDropdownMenu, CDropdownToggle, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell } from '@coreui/icons'

import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import NotificationListContent from './notifications/NotificationListContent'
import { useNotificationList } from './notifications/useNotificationList'

const AppNotificationsDropdown = () => {
  const navigate = useNavigate()
  const { summary, isStale, consumeEntity } = useAppNotifications()
  const [open, setOpen] = useState(false)
  const { items, loading, errored } = useNotificationList({ enabled: open })
  const unreadCount = Number(summary?.listable_total ?? 0)
  const hasUnread = unreadCount > 0

  const handleItemClick = (item) => {
    setOpen(false)
    if (item.module_key && item.entity_type && item.entity_id) {
      consumeEntity({
        moduleKey: item.module_key,
        entityType: item.entity_type,
        entityId: item.entity_id,
      }).catch(() => {})
    }
    if (item.route) navigate(item.route)
  }

  const tooltip = hasUnread
    ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
    : 'Notifications'

  return (
    <CDropdown
      variant="nav-item"
      alignment="end"
      popper={false}
      className="app-bottom-nav-entry d-none d-md-flex"
      visible={open}
      onShow={() => setOpen(true)}
      onHide={() => setOpen(false)}
    >
      <CDropdownToggle
        className={`py-0 app-bottom-nav-link app-bottom-nav-dropdown-toggle${open ? ' active' : ''}`}
        caret={false}
        aria-label={tooltip}
      >
        <CTooltip content={tooltip} placement="bottom">
          <span
            className={`app-bottom-nav-icon${hasUnread ? ' app-bottom-nav-icon--with-badge' : ''}`}
            aria-hidden="true"
          >
            <CIcon icon={cilBell} />
            {hasUnread && <span className="app-bottom-nav-unread-dot" />}
          </span>
        </CTooltip>
        <span className="app-bottom-nav-label">Alerts</span>
      </CDropdownToggle>

      <CDropdownMenu as="div" className="app-header-dropdown-menu p-0">
        <CDropdownHeader className="app-header-dropdown-heading app-notification-heading">
          <span>Notifications</span>
          {hasUnread && (
            <span className="app-notification-heading-count">{unreadCount} unread</span>
          )}
        </CDropdownHeader>
        <NotificationListContent
          items={items}
          loading={loading}
          errored={errored}
          isStale={isStale}
          onSelect={handleItemClick}
        />
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppNotificationsDropdown
