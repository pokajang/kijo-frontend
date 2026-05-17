import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { DataTableLoadingState } from '../../components/datatable'
import { API_BASE } from './schema-sync/constants'
import SchemaScriptsTable from './schema-sync/SchemaScriptsTable'
import { normalizeScripts } from './schema-sync/schemaSyncUtils'
import SummaryTile from './schema-sync/SummaryTile'

const SystemAdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}admin/migration-status`, {
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to load Laravel migration status.')
      }
      setData({
        user: result.user || { authorized: true, can_run: false, read_only: true },
        summary: result.summary || { total_files: 0, synced_count: 0, pending_count: 0 },
        environment: result.environment || {
          migration_source: '',
        },
        pending: Array.isArray(result.pending) ? result.pending : [],
        missing_files: Array.isArray(result.missing_files) ? result.missing_files : [],
        files: Array.isArray(result.files) ? result.files : [],
      })
    } catch (err) {
      setError(err.message || 'Failed to load Laravel migration status.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const pendingCount = data?.summary?.pending_count || 0
  const syncedCount = data?.summary?.synced_count ?? data?.summary?.applied_count ?? 0
  const missingFileCount = data?.summary?.missing_file_count || 0
  const totalCount = data?.summary?.total_known ?? data?.summary?.total_files ?? 0
  const sortedFiles = useMemo(
    () =>
      (Array.isArray(data?.files) ? [...data.files] : []).sort(
        (a, b) => Number(Boolean(a.synced)) - Number(Boolean(b.synced)),
      ),
    [data?.files],
  )
  const isBusy = loading
  const normalizedScripts = useMemo(() => normalizeScripts(sortedFiles), [sortedFiles])

  return (
    <CRow>
      <CCol xl={12}>
        <CCard className="mb-4 records-page-card">
          <CCardHeader className="d-flex align-items-center gap-2 flex-wrap records-page-card-header">
            <strong>Laravel Migration Status</strong>
            <CBadge color="secondary" className="rounded-pill">
              Read-only
            </CBadge>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm ms-auto"
              onClick={loadStatus}
              disabled={isBusy}
            >
              Refresh
            </button>
          </CCardHeader>
          <CCardBody className="records-page-card-body">
            {loading ? (
              <DataTableLoadingState message="Loading Laravel migration status..." />
            ) : (
              <>
                {error && (
                  <CAlert color={data ? 'warning' : 'danger'}>
                    {error}
                    {data ? ' Showing the last successful migration status.' : ''}
                  </CAlert>
                )}

                {!data ? (
                  <div className="text-center py-4 text-muted">
                    Migration status is unavailable. Refresh to try again.
                  </div>
                ) : (
                  <>
                    <div className="d-flex flex-wrap align-items-center gap-4 mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-uppercase text-muted small">Access</span>
                        <CBadge color="secondary" className="rounded-pill px-3">
                          System Admin, status only
                        </CBadge>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-uppercase text-muted small">Source</span>
                        <span className="fw-semibold">
                          {data.environment?.migration_source === 'laravel'
                            ? 'Laravel migrations'
                            : '-'}
                        </span>
                      </div>
                    </div>

                    <CAlert color="info">
                      Laravel migrations should run through deployment or server terminal using{' '}
                      <code>php artisan migrate</code>. This page is read-only and shows whether the
                      database matches the migration files in this codebase.
                    </CAlert>

                    <CRow className="g-2 align-items-stretch mb-4">
                      <CCol xs={6} md={4} lg={3}>
                        <SummaryTile
                          label="Pending Migrations"
                          value={pendingCount}
                          color="danger"
                        />
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <SummaryTile label="Applied" value={syncedCount} color="success" />
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <SummaryTile
                          label="Missing Files"
                          value={missingFileCount}
                          color="warning"
                        />
                      </CCol>
                      <CCol xs={6} md={4} lg={3}>
                        <SummaryTile label="Total Known" value={totalCount} color="secondary" />
                      </CCol>
                    </CRow>

                    <SchemaScriptsTable rows={normalizedScripts} dataFiles={data.files} />
                  </>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default SystemAdminDashboard
