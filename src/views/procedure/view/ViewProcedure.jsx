// src/procedure/view/ViewProcedure.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner } from '@coreui/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import dialog from '../../../components/dialog/dialogService'
import { DataTableActionButtonGroup, DataTableStatusBadge } from '../../../components/datatable'
import { resolveAssetUrl } from '../../../utils/assetUrls'

const formatDate = (s) => {
  if (!s) return '-'
  const d = new Date(String(s).replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
}

export default function ViewProcedure() {
  const navigate = useNavigate()
  const { id: routeId } = useParams()
  const [params] = useSearchParams()
  const id = routeId || params.get('id')

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentStaffId, setCurrentStaffId] = useState(null)

  useEffect(() => {
    if (!id) {
      setError('Missing procedure id.')
      setLoading(false)
      return
    }

    const fetchOne = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}procedures/${id}`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || 'Failed to load procedure.')
        }
        const rec = data?.item || (Array.isArray(data?.items) ? data.items[0] : null)
        if (!rec) {
          throw new Error('Procedure not found.')
        }
        setItem(rec)
      } catch (e) {
        setError(e.message || 'Unexpected error while loading.')
        setItem(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOne()
  }, [id])

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}auth/session`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.status === 'success' && data?.user?.staff_id) {
          setCurrentStaffId(Number(data.user.staff_id))
        }
      } catch {
        // Backend enforces permissions.
      }
    }
    fetchMe()
  }, [])

  const pdfUrl = useMemo(() => {
    if (!item?.file_path) return ''
    return resolveAssetUrl(item.file_path)
  }, [item])

  const canModify = useMemo(() => {
    if (!item) return false
    return currentStaffId != null ? Number(item.created_by) === Number(currentStaffId) : false
  }, [item, currentStaffId])

  const handleDelete = async () => {
    if (!item?.id) return
    const ok = await dialog.confirm('Delete this procedure? This action cannot be undone.')
    if (!ok) return

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}procedures/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to delete procedure.')
      }
      navigate('/administration/procedures')
    } catch (e) {
      setError(e.message || 'Unexpected error while deleting.')
    }
  }

  const detailActions = item
    ? [
        {
          key: 'edit',
          label: 'Edit',
          buttonColor: 'secondary',
          disabled: !canModify,
          tooltip: canModify ? 'Edit this SOP' : 'Only the owner may edit this SOP',
          onClick: () => navigate(`/administration/procedures/edit/${item.id}`),
        },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          disabled: !canModify,
          tooltip: canModify ? 'Delete this SOP' : 'Only the owner may delete this SOP',
          onClick: handleDelete,
        },
      ]
    : []

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
            <strong>Procedure Details</strong>
            <CButton
              color="secondary"
              size="sm"
              variant="outline"
              onClick={() => navigate('/administration/procedures')}
            >
              Back
            </CButton>
          </CCardHeader>

          <CCardBody>
            {loading ? (
              <div className="py-5 text-center">
                <CSpinner /> Loading...
              </div>
            ) : error ? (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            ) : !item ? (
              <CAlert color="warning">Procedure not found.</CAlert>
            ) : (
              <>
                <CRow className="g-3 mb-4">
                  <CCol md={6}>
                    <div className="procedure-detail-field">
                      <small className="text-muted d-block">Procedure Title</small>
                      <div className="fw-semibold">{item.title || '-'}</div>
                    </div>
                  </CCol>
                  <CCol md={3}>
                    <div className="procedure-detail-field">
                      <small className="text-muted d-block">Type</small>
                      <div>
                        {item.category ? (
                          <DataTableStatusBadge tone="info">{item.category}</DataTableStatusBadge>
                        ) : (
                          '-'
                        )}
                      </div>
                    </div>
                  </CCol>
                  <CCol md={3}>
                    <div className="procedure-detail-field">
                      <small className="text-muted d-block">Date</small>
                      <div>{formatDate(item.created_at)}</div>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="procedure-detail-field">
                      <small className="text-muted d-block">Created By</small>
                      <div>
                        {item.created_name || '-'}
                        {item.created_code ? (
                          <>
                            {' '}
                            <DataTableStatusBadge tone="dark">
                              {item.created_code}
                            </DataTableStatusBadge>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="procedure-detail-field">
                      <small className="text-muted d-block">File</small>
                      <div>{item.file_name || '-'}</div>
                    </div>
                  </CCol>
                  <CCol xs={12}>
                    <div className="procedure-detail-field">
                      <small className="text-muted d-block">Description</small>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{item.description || '-'}</div>
                    </div>
                  </CCol>
                </CRow>

                {pdfUrl ? (
                  <CRow>
                    <CCol xs={12}>
                      <div className="border rounded" style={{ height: '80vh' }}>
                        <object data={pdfUrl} type="application/pdf" width="100%" height="100%">
                          <iframe
                            title="procedure-pdf"
                            src={pdfUrl}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                          />
                        </object>
                      </div>
                    </CCol>
                  </CRow>
                ) : (
                  <CRow>
                    <CCol>
                      <CAlert color="warning" className="mb-0">
                        No PDF attached to this procedure.
                      </CAlert>
                    </CCol>
                  </CRow>
                )}
              </>
            )}
          </CCardBody>

          {!loading && !error && item ? (
            <>
              <CCardHeader>
                <strong>Actions</strong>
              </CCardHeader>
              <CCardBody>
                <DataTableActionButtonGroup actions={detailActions} />
              </CCardBody>
            </>
          ) : null}
        </CCard>
      </CCol>
    </CRow>
  )
}
