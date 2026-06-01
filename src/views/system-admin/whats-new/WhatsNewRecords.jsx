import React, { useCallback, useEffect, useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
} from '@coreui/react'
import { useAuth } from '../../../auth/AuthProvider'
import { DataTableLoadingState } from '../../../components/datatable'
import { extractRolesFromSession, hasAnyAllowedRole } from '../../../utils/roles'
import { API_BASE } from './constants'
import { formatDateTime, stripHtml } from './whatsNewFormUtils'

const WhatsNewRecords = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const fetchSeqRef = useRef(0)
  const abortControllerRef = useRef(null)
  const [notices, setNotices] = useState([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [openActionId, setOpenActionId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const detailBasePath = location.pathname.startsWith('/system-admin')
    ? '/system-admin/whats-new'
    : '/whats-new'

  const loadNotices = useCallback(async (options = {}) => {
    const { showLoader = true } = options
    const requestId = ++fetchSeqRef.current
    if (showLoader) setLoading(true)
    setError('')

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}whats-new`, {
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      })
      const data = await res.json()
      if (data?.status !== 'success') {
        throw new Error(data?.message || "Failed to load What's New notices.")
      }
      if (requestId === fetchSeqRef.current && !abortControllerRef.current.signal.aborted) {
        setNotices(Array.isArray(data.data) ? data.data : [])
        setCanManage(Boolean(data?.meta?.can_manage))
        setLoading(false)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error("Failed to load What's New notices:", err)
      if (requestId === fetchSeqRef.current) {
        setNotices([])
        setCanManage(false)
        setError(err.message || "Failed to load What's New notices.")
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchSeqRef.current += 1
    setNotices([])
    setLoading(true)
    loadNotices({ showLoader: true })
  }, [loadNotices])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const isSystemAdmin =
    canManage || hasAnyAllowedRole(extractRolesFromSession({ user }), ['System Admin'])

  const setPublished = async (notice, published) => {
    setOpenActionId(null)
    setActionId(notice.id)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(
        `${API_BASE}whats-new/${notice.id}/${published ? 'publish' : 'unpublish'}`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )
      const data = await res.json()
      if (data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to update publish status.')
      }
      setSuccess(data.message || 'Publish status updated.')
      await loadNotices()
    } catch (err) {
      setError(err.message || 'Failed to update publish status.')
    } finally {
      setActionId(null)
    }
  }

  const deleteNotice = async (notice) => {
    setOpenActionId(null)
    if (!window.confirm(`Delete What's New notice "${notice.version}"?`)) return

    setActionId(notice.id)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${API_BASE}whats-new/${notice.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to delete notice.')
      }
      setSuccess(data.message || "What's New notice deleted.")
      await loadNotices()
    } catch (err) {
      setError(err.message || 'Failed to delete notice.')
    } finally {
      setActionId(null)
    }
  }

  const openNotice = (notice) => {
    navigate(`${detailBasePath}/${notice.id}`)
  }

  const handleNoticeKeyDown = (event, notice) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    openNotice(notice)
  }

  const stopRowActivation = (event) => {
    event.stopPropagation()
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>What&apos;s New Notices</strong>
            <div className="d-flex gap-2">
              {isSystemAdmin && (
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => navigate('/system-admin/whats-new/create')}
                >
                  Create Notice
                </CButton>
              )}
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => loadNotices()}
                disabled={loading}
              >
                Refresh
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{success}</CAlert>}

            {loading ? (
              <DataTableLoadingState message="Loading notices..." />
            ) : notices.length === 0 ? (
              <p className="text-body-secondary mb-0">No What&apos;s New notices yet.</p>
            ) : (
              <div className="d-grid gap-2">
                {notices.map((notice) => {
                  const busy = actionId === notice.id
                  const preview =
                    notice.summary ||
                    (Array.isArray(notice.items) && notice.items.length > 0
                      ? notice.items[0]
                      : stripHtml(notice.body))

                  return (
                    <div
                      key={notice.id}
                      className="whats-new-record-row d-flex flex-wrap justify-content-between align-items-center gap-3 bg-body-tertiary rounded px-3 py-3"
                      role="button"
                      tabIndex={0}
                      onClick={() => openNotice(notice)}
                      onKeyDown={(event) => handleNoticeKeyDown(event, notice)}
                    >
                      <div className="min-w-0 flex-grow-1">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <span>{formatDateTime(notice.published_at)}</span>
                          {isSystemAdmin && (
                            <CBadge color={notice.is_published ? 'success' : 'secondary'}>
                              {notice.is_published ? 'Published' : 'Draft'}
                            </CBadge>
                          )}
                          {!isSystemAdmin && (
                            <CBadge color={notice.is_read ? 'success' : 'warning'}>
                              {notice.is_read ? 'Seen' : 'New'}
                            </CBadge>
                          )}
                        </div>
                        <div>{notice.title}</div>
                        {preview && <div className="text-body-secondary mt-1">{preview}</div>}
                      </div>

                      <div className="d-flex align-items-center gap-2 ms-auto">
                        {isSystemAdmin && (
                          <CDropdown
                            portal
                            alignment="end"
                            visible={openActionId === notice.id}
                            onShow={() => setOpenActionId(notice.id)}
                            onHide={() => setOpenActionId(null)}
                            onMouseDown={stopRowActivation}
                            onClick={stopRowActivation}
                            onKeyDown={stopRowActivation}
                          >
                            <CDropdownToggle
                              color="transparent"
                              size="sm"
                              caret={false}
                              className="border-0"
                              disabled={busy}
                              aria-label="Manage notice"
                              onMouseDown={stopRowActivation}
                              onClick={(event) => {
                                event.stopPropagation()
                                setOpenActionId(openActionId === notice.id ? null : notice.id)
                              }}
                            >
                              <CIcon icon={cilOptions} />
                            </CDropdownToggle>
                            <CDropdownMenu
                              style={{ zIndex: 1080 }}
                              onMouseDown={stopRowActivation}
                              onClick={stopRowActivation}
                            >
                              <CDropdownItem
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setOpenActionId(null)
                                  navigate(`/system-admin/whats-new/${notice.id}/edit`)
                                }}
                              >
                                Edit
                              </CDropdownItem>
                              <CDropdownItem
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setPublished(notice, !notice.is_published)
                                }}
                              >
                                {notice.is_published ? 'Unpublish' : 'Publish'}
                              </CDropdownItem>
                              <CDropdownItem
                                className="text-danger"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  deleteNotice(notice)
                                }}
                              >
                                Delete
                              </CDropdownItem>
                            </CDropdownMenu>
                          </CDropdown>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default WhatsNewRecords
