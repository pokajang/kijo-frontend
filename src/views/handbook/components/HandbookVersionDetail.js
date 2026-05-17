import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CButton, CCol, CRow } from '@coreui/react'
import { useNavigate, useParams } from 'react-router-dom'
import { DataTableLoadingState } from '../../../components/datatable'
import { getHandbookVersion } from '../api/handbookApi'
import HandbookContent from './HandbookContent'

const emptyValue = 'N/A'

const formatDateTime = (value) => {
  if (!value) return emptyValue

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? emptyValue : date.toLocaleString()
}

const HandbookVersionDetail = () => {
  const navigate = useNavigate()
  const { versionId } = useParams()
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadVersion = async () => {
      setLoading(true)
      setError(null)

      try {
        const json = await getHandbookVersion({ versionId, signal: controller.signal })

        if (json.success) {
          setVersion(json.data || null)
        } else {
          setVersion(null)
          setError(json.message)
        }
      } catch (err) {
        if (err.name === 'AbortError') return

        setVersion(null)
        setError('Network error')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadVersion()

    return () => controller.abort()
  }, [versionId])

  const metaItems = useMemo(
    () =>
      version
        ? [
            {
              key: 'publishedAt',
              label: 'Published At',
              value: formatDateTime(version.published_at),
            },
            {
              key: 'publishedBy',
              label: 'Published By',
              value: version.published_by_name_code || emptyValue,
            },
            {
              key: 'signatures',
              label: 'Signatures',
              value: `${Number(version.signature_count || 0)}`,
            },
          ]
        : [],
    [version],
  )

  return (
    <>
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <strong>{version?.version_label || 'Handbook Version'}</strong>
          {version &&
            (version.is_current ? (
              <CBadge color="success" shape="rounded-pill">
                Current
              </CBadge>
            ) : (
              <CBadge color="secondary" shape="rounded-pill">
                Historical
              </CBadge>
            ))}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate('/handbook/versions')}
          >
            Version History
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate('/handbook')}
          >
            Back to Handbook
          </CButton>
        </div>
      </div>

      {loading && <DataTableLoadingState message="Loading handbook version..." />}
      {error && <CAlert color="danger">{error}</CAlert>}
      {!loading && !error && version && (
        <>
          <div className="handbook-version-detail-meta mb-3">
            <CRow className="g-2">
              {metaItems.map((item) => (
                <CCol xs={12} md={4} key={item.key}>
                  <div className="handbook-version-detail-meta-item">
                    <small className="text-muted d-block">{item.label}</small>
                    <span>{item.value}</span>
                  </div>
                </CCol>
              ))}
            </CRow>
            {version.change_summary && (
              <div className="mt-2">
                <small className="text-muted d-block">Summary</small>
                <span>{version.change_summary}</span>
              </div>
            )}
          </div>

          <HandbookContent content={version.content} canManage={false} />
        </>
      )}
    </>
  )
}

export default HandbookVersionDetail
