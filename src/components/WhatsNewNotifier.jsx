import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCloseButton } from '@coreui/react'

import { useAuth } from '../auth/AuthProvider'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const getDismissalKey = (staffId, noticeId) =>
  staffId && noticeId ? `kijo:whats-new:dismissed:${staffId}:${noticeId}` : null

const hasDismissedNotice = (staffId, noticeId) => {
  const key = getDismissalKey(staffId, noticeId)
  if (!key || typeof window === 'undefined') return false
  return window.sessionStorage.getItem(key) === '1'
}

const dismissNoticeForSession = (staffId, noticeId) => {
  const key = getDismissalKey(staffId, noticeId)
  if (!key || typeof window === 'undefined') return
  window.sessionStorage.setItem(key, '1')
}

const resolveUnreadCount = (data) => {
  const metaCount = Number(data?.meta?.unread_count)
  if (Number.isFinite(metaCount)) return Math.max(0, metaCount)
  return data?.data && data.data.is_read !== true ? 1 : 0
}

const WhatsNewNotifier = () => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [notice, setNotice] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.staff_id) return

    let cancelled = false

    const loadNotice = async () => {
      try {
        const res = await fetch(`${API_BASE}whats-new/latest`, {
          credentials: 'include',
          silentError: true,
        })
        const data = await res.json()

        if (cancelled || data?.status !== 'success' || !data.data) return

        const latestNotice = data.data
        const nextUnreadCount = resolveUnreadCount(data)
        if (nextUnreadCount <= 0 || latestNotice.is_read === true) return
        if (hasDismissedNotice(user.staff_id, latestNotice.id)) return

        setNotice(latestNotice)
        setUnreadCount(nextUnreadCount)
        setVisible(true)
      } catch (err) {
        console.error("Failed to load What's New notice:", err)
      }
    }

    loadNotice()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.staff_id])

  const dismissNotice = () => {
    dismissNoticeForSession(user?.staff_id, notice?.id)
    setVisible(false)
  }

  const goToNoticeDetails = () => {
    setVisible(false)
    navigate(notice?.id ? `/whats-new/${notice.id}` : '/whats-new')
  }

  const goToAllUpdates = () => {
    setVisible(false)
    navigate('/whats-new')
  }

  if (!notice || !visible) return null

  const hasMultipleUnread = unreadCount > 1

  return (
    <div
      className="whats-new-notifier position-fixed end-0 p-3"
      style={{ top: '4.25rem', zIndex: 1040, maxWidth: '420px', width: '100%' }}
      data-testid="whats-new-notifier"
    >
      <CAlert color="info" className="mb-0 shadow-sm">
        <div className="d-flex align-items-start gap-3">
          <div className="min-w-0 flex-grow-1">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <strong>{hasMultipleUnread ? 'New updates are available' : "What's New"}</strong>
              <CCloseButton onClick={dismissNotice} aria-label="Dismiss update notice" />
            </div>
            {hasMultipleUnread && (
              <p className="small text-body-secondary mb-1">
                You have {unreadCount} unread updates. Here&apos;s the latest one.
              </p>
            )}
            <p className="fw-semibold mb-1">{notice.title || "What's New"}</p>
            <p className="small text-body-secondary mb-3">
              {notice.summary || 'A new update is available. Open the notice to read the details.'}
            </p>
            <div className="d-flex flex-wrap gap-2">
              <CButton color="primary" size="sm" onClick={goToNoticeDetails}>
                View details
              </CButton>
              <CButton color="secondary" size="sm" variant="outline" onClick={goToAllUpdates}>
                See all updates
              </CButton>
              <CButton color="secondary" size="sm" variant="ghost" onClick={dismissNotice}>
                Later
              </CButton>
            </div>
          </div>
        </div>
      </CAlert>
    </div>
  )
}

export default WhatsNewNotifier
