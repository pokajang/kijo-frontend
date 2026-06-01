import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CDropdown, CDropdownHeader, CDropdownMenu, CDropdownToggle, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell } from '@coreui/icons'

import { useAppNotifications } from '../../notifications/AppNotificationProvider'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const SEVERITY_DOT_COLOR = {
  danger: 'var(--cui-danger)',
  warning: 'var(--cui-warning)',
  success: 'var(--cui-success)',
  info: 'var(--cui-info)',
  primary: 'var(--cui-primary)',
  secondary: 'var(--cui-secondary)',
}

const isAbortLikeError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  return (
    error?.name === 'AbortError' ||
    error?.code === 20 ||
    message.includes('abort') ||
    message.includes('failed to fetch')
  )
}

const formatRelativeTime = (value) => {
  if (!value) return ''
  const then = new Date(String(value).replace(' ', 'T'))
  const ms = Date.now() - then.getTime()
  if (!Number.isFinite(ms)) return ''
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return then.toLocaleDateString()
}

const AppNotificationsDropdown = () => {
  const navigate = useNavigate()
  const { summary, isStale, consumeEntity } = useAppNotifications()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [errored, setErrored] = useState(false)

  // Use listable_total (stored rows the drawer can show), NOT the all-module
  // total, so the bell's count always matches the list it opens. Recompute-only
  // modules (vendor registrations, negotiations, etc.) are counted on the
  // sidebar/tab badges but have no stored content to list here.
  const unreadCount = Number(summary?.listable_total ?? 0)
  const hasUnread = unreadCount > 0

  const loadList = useCallback(async (signal) => {
    setLoading(true)
    setErrored(false)
    try {
      const res = await fetch(`${API_BASE}notifications/list?limit=20`, {
        credentials: 'include',
        silentError: true,
        signal,
      })
      const data = await res.json()
      if (data?.status === 'success') {
        setItems(Array.isArray(data.data?.items) ? data.data.items : [])
      } else {
        setErrored(true)
      }
    } catch (err) {
      if (!isAbortLikeError(err)) setErrored(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch the list only while the dropdown is open (pull, not push).
  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController()
    loadList(controller.signal)
    return () => controller.abort()
  }, [open, loadList])

  const handleItemClick = async (item) => {
    setOpen(false)
    if (item.module_key && item.entity_type && item.entity_id) {
      // Mark read via the existing consume endpoint (honors the D4
      // ACTION/FYI clearing taxonomy); badge refresh is handled by the
      // provider's consume() -> refresh().
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
      className="app-bottom-nav-entry"
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

        {isStale && <div className="app-notification-stale">Counts may be out of date.</div>}

        <div className="app-header-dropdown-scroll">
          {loading && items.length === 0 ? (
            <div className="app-notification-state">Loading…</div>
          ) : errored ? (
            <div className="app-notification-state">Could not load notifications.</div>
          ) : items.length === 0 ? (
            <div className="app-notification-state">You&apos;re all caught up.</div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="app-notification-row"
                onClick={() => handleItemClick(item)}
              >
                <span
                  className="app-notification-dot"
                  style={{
                    backgroundColor: SEVERITY_DOT_COLOR[item.severity] || 'var(--cui-secondary)',
                  }}
                  aria-hidden="true"
                />
                <span className="app-notification-body">
                  <span className="app-notification-title">{item.title}</span>
                  {item.message && <span className="app-notification-message">{item.message}</span>}
                  <span className="app-notification-time">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppNotificationsDropdown
