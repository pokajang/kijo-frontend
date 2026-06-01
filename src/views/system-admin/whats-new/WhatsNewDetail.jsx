import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CRow,
} from '@coreui/react'
import { useAuth } from '../../../auth/AuthProvider'
import { DataTableLoadingState } from '../../../components/datatable'
import { extractRolesFromSession, hasAnyAllowedRole } from '../../../utils/roles'
import { fetchDetailJson } from '../../../utils/detailPages'
import { API_BASE } from './constants'
import NoticeAttachmentStrip from './NoticeAttachmentStrip'
import { formatDateTime, normalizeRichContent } from './whatsNewFormUtils'

const WhatsNewDetail = () => {
  const { noticeId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const markedReadRef = useRef(new Set())
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isSystemAdmin = hasAnyAllowedRole(extractRolesFromSession({ user }), ['System Admin'])
  const listPath = location.pathname.startsWith('/system-admin')
    ? '/system-admin/whats-new'
    : '/whats-new'
  const contentHtml = useMemo(
    () => DOMPurify.sanitize(normalizeRichContent(notice?.body)),
    [notice?.body],
  )

  const loadNotice = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const detailResult = await fetchDetailJson(`${API_BASE}whats-new/${noticeId}`, {
        notFoundMessage: "What's New notice not found.",
      })
      if (detailResult.notFound) {
        setNotice(null)
        return
      }
      const data = detailResult.data
      if (data?.status !== 'success') {
        throw new Error(data?.message || "Failed to load What's New notice.")
      }
      setNotice(data.data || null)
    } catch (err) {
      setError(err.message || "Failed to load What's New notice.")
    } finally {
      setLoading(false)
    }
  }, [noticeId])

  useEffect(() => {
    loadNotice()
  }, [loadNotice])

  useEffect(() => {
    if (!notice?.id || !notice.is_published || notice.is_read) return
    if (markedReadRef.current.has(notice.id)) return

    markedReadRef.current.add(notice.id)

    const markReadOnOpen = async () => {
      const res = await fetch(`${API_BASE}whats-new/${notice.id}/read`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to mark notice as read.')
      }
      setNotice((current) => ({
        ...current,
        is_read: true,
        read_at: new Date().toISOString(),
      }))
      window.dispatchEvent(new CustomEvent('kijo:whats-new-read'))
    }

    markReadOnOpen().catch((err) => {
      console.error("Failed to mark What's New notice as read:", err)
    })
  }, [notice?.id, notice?.is_published, notice?.is_read])

  const hasAction = Boolean(notice?.action_label && notice?.action_path)

  const navigateToAction = () => {
    if (!notice?.action_path) return
    navigate(notice.action_path)
  }

  const renderFooter = () => {
    if (!notice || !hasAction) return null

    return (
      <CCardFooter className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <CButton color="primary" variant="outline" size="sm" onClick={navigateToAction}>
            {notice.action_label}
          </CButton>
        </div>
      </CCardFooter>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>What&apos;s New Detail</strong>
            <div className="d-flex flex-wrap gap-2">
              {isSystemAdmin && notice?.id && (
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/system-admin/whats-new/${notice.id}/edit`)}
                >
                  Edit
                </CButton>
              )}
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => navigate(listPath)}
              >
                Back to notices
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}

            {loading ? (
              <DataTableLoadingState message="Loading notice..." />
            ) : !notice ? (
              <CAlert color="info" className="mb-0">
                Notice not found.
              </CAlert>
            ) : (
              <>
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <div className="text-body-secondary mb-1">
                      {formatDateTime(notice.published_at)}
                    </div>
                    <h4 className="mb-0">{notice.title}</h4>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {isSystemAdmin && (
                      <CBadge color={notice.is_published ? 'success' : 'secondary'}>
                        {notice.is_published ? 'Published' : 'Draft'}
                      </CBadge>
                    )}
                    <CBadge color={notice.is_read ? 'success' : 'warning'}>
                      {notice.is_read ? 'Seen' : 'New'}
                    </CBadge>
                  </div>
                </div>

                {notice.summary && <p className="text-body-secondary">{notice.summary}</p>}

                {Array.isArray(notice.items) && notice.items.length > 0 && (
                  <ul className="ps-3">
                    {notice.items.map((item, index) => (
                      <li key={`${notice.id}-item-${index}`} className="mb-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {contentHtml && <div dangerouslySetInnerHTML={{ __html: contentHtml }} />}

                <NoticeAttachmentStrip attachments={notice.attachments} />
              </>
            )}
          </CCardBody>
          {renderFooter()}
        </CCard>
      </CCol>
    </CRow>
  )
}

export default WhatsNewDetail
