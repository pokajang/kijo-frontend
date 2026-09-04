import React from 'react'
import PropTypes from 'prop-types'

export const SEVERITY_DOT_COLOR = {
  danger: 'var(--cui-danger)',
  warning: 'var(--cui-warning)',
  success: 'var(--cui-success)',
  info: 'var(--cui-info)',
  primary: 'var(--cui-primary)',
  secondary: 'var(--cui-secondary)',
}

export const formatRelativeTime = (value) => {
  if (!value) return ''
  const then = new Date(String(value).replace(' ', 'T'))
  const milliseconds = Date.now() - then.getTime()
  if (!Number.isFinite(milliseconds)) return ''
  const minutes = Math.round(milliseconds / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return then.toLocaleDateString()
}

const NotificationListContent = ({ items, loading, errored, isStale, onSelect }) => (
  <>
    {isStale && <div className="app-notification-stale">Counts may be out of date.</div>}
    <div className="app-header-dropdown-scroll app-mobile-notification-list">
      {loading && items.length === 0 ? (
        <div className="app-notification-state">Loading...</div>
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
            onClick={() => onSelect(item)}
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
              <span className="app-notification-time">{formatRelativeTime(item.created_at)}</span>
            </span>
          </button>
        ))
      )}
    </div>
  </>
)

NotificationListContent.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  errored: PropTypes.bool.isRequired,
  isStale: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

export default NotificationListContent
