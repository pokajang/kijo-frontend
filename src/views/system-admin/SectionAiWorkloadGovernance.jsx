import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CCollapse,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { apiJson } from '../../api/apiClient'
import { apiUrl } from '../../api/apiUrl'
import {
  DataTableFooter,
  DataTableLoadingState,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
  DataTableToolbar,
} from '../../components/datatable'
import { showToast } from '../../components/toast/toastService'
import { useColumnPreferences } from '../../hooks/datatable'
import { workloadWorkTypes } from '../dashboard/workload/components/workTypes'
import SummaryTile from './schema-sync/SummaryTile'

const PAGE_SIZES = [25, 50, 100]
const COLUMN_STORAGE_KEY = 'system-admin.ai-workload-governance.visible-columns.v1'
const COLUMN_LABELS = {
  normalizedTitle: 'Normalized Title',
  sampleTitle: 'Sample Title',
  taskCategoryLabel: 'Category',
  workTypeLabel: 'Work Type',
  usageCount: 'Usage',
  affectedTaskCount: 'Affected',
  lastSeenAt: 'Last Seen',
}
const TOGGLABLE_COLUMN_ORDER = [
  'normalizedTitle',
  'sampleTitle',
  'taskCategoryLabel',
  'workTypeLabel',
  'usageCount',
  'affectedTaskCount',
  'lastSeenAt',
]
const learnedColumns = [
  {
    key: 'normalizedTitle',
    label: COLUMN_LABELS.normalizedTitle,
    width: '260px',
    sortable: true,
    cellMaxWidth: '260px',
    previewCharThreshold: 48,
  },
  {
    key: 'sampleTitle',
    label: COLUMN_LABELS.sampleTitle,
    width: '240px',
    sortable: true,
    cellMaxWidth: '240px',
    previewCharThreshold: 44,
  },
  {
    key: 'taskCategoryLabel',
    label: COLUMN_LABELS.taskCategoryLabel,
    width: '190px',
    sortable: true,
  },
  {
    key: 'workTypeLabel',
    label: COLUMN_LABELS.workTypeLabel,
    width: '190px',
    sortable: true,
  },
  {
    key: 'usageCount',
    label: COLUMN_LABELS.usageCount,
    width: '90px',
    align: 'center',
    sortable: true,
    sortType: 'number',
    noWrap: true,
  },
  {
    key: 'affectedTaskCount',
    label: COLUMN_LABELS.affectedTaskCount,
    width: '100px',
    align: 'center',
    sortable: true,
    sortType: 'number',
    noWrap: true,
  },
  {
    key: 'lastSeenAt',
    label: COLUMN_LABELS.lastSeenAt,
    width: '180px',
    sortable: true,
    sortType: 'date',
    noWrap: true,
  },
]

const requiredLearnedColumns = new Set(['normalizedTitle', 'taskCategoryLabel', 'workTypeLabel'])
const defaultLearnedVisibleColumns = {
  normalizedTitle: true,
  sampleTitle: true,
  taskCategoryLabel: true,
  workTypeLabel: true,
  usageCount: true,
  affectedTaskCount: true,
  lastSeenAt: true,
}
const noop = () => {}
const TASK_CATEGORY_OPTIONS = [
  { value: 'unclear_unrated', label: 'Unclear / Not graded' },
  { value: 'non_work', label: 'Non-work' },
  { value: 'pending_waiting', label: 'Pending / Waiting' },
  { value: 'administrative', label: 'Administrative / General' },
  { value: 'uncategorised', label: 'General Task' },
  { value: 'coordination_follow_up', label: 'Coordination / Follow-up' },
  { value: 'real_effort', label: 'Real Effort' },
  { value: 'deep_work', label: 'Deep Work' },
  { value: 'critical_escalation', label: 'Critical / Escalation' },
]
const CONFIDENCE_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const SOURCE_OPTIONS = [
  { value: 'ai', label: 'AI classified' },
  { value: 'ai_cache', label: 'Learned cache' },
  { value: 'system', label: 'System/local' },
]
const AFFECTED_OPTIONS = [
  { value: 'with', label: 'Has matching tasks' },
  { value: 'without', label: 'No matching tasks' },
]

const displayValue = (value) => {
  const text = String(value ?? '').trim()
  return text || '-'
}

const countValue = (value) => Number(value || 0)

const formatDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'

  return parsed.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizeHealth = (payload) => {
  const data = payload?.data || {}

  return {
    available: data.available !== false,
    totalClassifiedTasks: countValue(data.totalClassifiedTasks ?? data.total_classified_tasks),
    unclearUnratedTasks: countValue(data.unclearUnratedTasks ?? data.unclear_unrated_tasks),
    nonWorkTasks: countValue(data.nonWorkTasks ?? data.non_work_tasks),
    lowConfidenceTasks: countValue(data.lowConfidenceTasks ?? data.low_confidence_tasks),
    aiClassifiedTasks: countValue(data.aiClassifiedTasks ?? data.ai_classified_tasks),
    learnedCacheTasks: countValue(data.learnedCacheTasks ?? data.learned_cache_tasks),
    learnedCacheRows: countValue(data.learnedCacheRows ?? data.learned_cache_rows),
    learnedCacheUsage: countValue(data.learnedCacheUsage ?? data.learned_cache_usage),
  }
}

const normalizeSnapshotHealth = (payload) => {
  const data = payload?.data || {}
  const latest = data.latestSnapshot || data.latest_snapshot || null
  const checkCounts = data.checkCounts || data.check_counts || {}
  const retention = data.retention || {}

  return {
    available: data.available !== false,
    captureStatus: displayValue(data.captureStatus ?? data.capture_status ?? 'unavailable'),
    expectedCaptureDate: displayValue(data.expectedCaptureDate ?? data.expected_capture_date),
    latestSnapshot: latest
      ? {
          snapshotDate: displayValue(latest.snapshotDate ?? latest.snapshot_date),
          staffCount: countValue(latest.staffCount ?? latest.staff_count),
          totalScore: countValue(latest.totalScore ?? latest.total_score),
          avgScore: countValue(latest.avgScore ?? latest.avg_score),
          totalActiveTasks: countValue(latest.totalActiveTasks ?? latest.total_active_tasks),
          totalOverdueTasks: countValue(latest.totalOverdueTasks ?? latest.total_overdue_tasks),
          totalDueSoonTasks: countValue(latest.totalDueSoonTasks ?? latest.total_due_soon_tasks),
        }
      : null,
    warningCount: countValue(checkCounts.warning),
    criticalCount: countValue(checkCounts.critical),
    capturedSnapshotsLast31Days: countValue(
      data.capturedSnapshotsLast31Days ?? data.captured_snapshots_last_31_days,
    ),
    reconstructedSnapshotsLast31Days: countValue(
      data.reconstructedSnapshotsLast31Days ?? data.reconstructed_snapshots_last_31_days,
    ),
    retention: {
      aggregatePayloadsRetainedBeyondCutoff: countValue(
        retention.aggregatePayloadsRetainedBeyondCutoff ??
          retention.aggregate_payloads_retained_beyond_cutoff,
      ),
      staffPayloadsRetainedBeyondCutoff: countValue(
        retention.staffPayloadsRetainedBeyondCutoff ??
          retention.staff_payloads_retained_beyond_cutoff,
      ),
      lastPrunedAt: retention.lastPrunedAt ?? retention.last_pruned_at ?? null,
      lastPruneState: displayValue(retention.lastPruneState ?? retention.last_prune_state),
    },
  }
}

const normalizeRows = (payload) => {
  const rows = Array.isArray(payload?.data?.examples) ? payload.data.examples : []
  return rows.map((row) => ({
    id: row.id,
    normalizedTitle: displayValue(row.normalizedTitle ?? row.normalized_title),
    sampleTitle: displayValue(row.sampleTitle ?? row.sample_title),
    taskCategoryLabel: displayValue(row.taskCategoryLabel ?? row.task_category_label),
    taskCategory: displayValue(row.taskCategory ?? row.task_category),
    effortScore: countValue(row.effortScore ?? row.effort_score),
    classificationConfidence: displayValue(
      row.classificationConfidence ?? row.classification_confidence,
    ),
    classificationSource: displayValue(row.classificationSource ?? row.classification_source),
    matchedPattern: displayValue(row.matchedPattern ?? row.matched_pattern),
    workTypeLabel: displayValue(row.workTypeLabel ?? row.work_type_label),
    workType: displayValue(row.workType ?? row.work_type),
    workTypeConfidence: displayValue(row.workTypeConfidence ?? row.work_type_confidence),
    usageCount: countValue(row.usageCount ?? row.usage_count),
    affectedTaskCount: countValue(row.affectedTaskCount ?? row.affected_task_count),
    lastSeenAt: row.lastSeenAt ?? row.last_seen_at,
  }))
}

const normalizePageMeta = (payload, fallback = {}) => {
  const data = payload?.data || {}
  return {
    available: data.available !== false,
    total: countValue(data.total),
    page: countValue(data.page) || fallback.page || 1,
    perPage: countValue(data.perPage ?? data.per_page) || fallback.perPage || 25,
    lastPage: countValue(data.lastPage ?? data.last_page) || 1,
  }
}

const confidenceTone = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'high') return 'success'
  if (normalized === 'medium') return 'warning'
  if (normalized === 'low') return 'danger'
  return 'secondary'
}

const sourceTone = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'ai') return 'info'
  if (normalized === 'ai_cache') return 'success'
  return 'secondary'
}

const snapshotStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ok') return 'success'
  if (normalized === 'missing') return 'danger'
  if (normalized === 'warning') return 'warning'
  return 'secondary'
}

const renderTextCell = (value, title, maxWidth = '260px') => (
  <DataTableTextCell
    value={displayValue(value)}
    title={title}
    maxWidth={maxWidth}
    mode="expandable"
    previewCharThreshold={48}
  />
)

const SectionAiWorkloadGovernance = () => {
  const [snapshotHealth, setSnapshotHealth] = useState(null)
  const [snapshotHealthLoading, setSnapshotHealthLoading] = useState(true)
  const [snapshotHealthError, setSnapshotHealthError] = useState('')
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState('')
  const [rows, setRows] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all')
  const [workTypeFilter, setWorkTypeFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [affectedFilter, setAffectedFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [pageMeta, setPageMeta] = useState({
    available: true,
    total: 0,
    page: 1,
    perPage: 25,
    lastPage: 1,
  })
  const [rowsLoading, setRowsLoading] = useState(true)
  const [rowsError, setRowsError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const { isColumnVisible, toggleColumnVisibility, resetColumnVisibility } = useColumnPreferences({
    storageKey: COLUMN_STORAGE_KEY,
    defaultVisibleColumns: defaultLearnedVisibleColumns,
    requiredColumns: requiredLearnedColumns,
  })

  const rowsEndpoint = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    })
    if (search.trim()) {
      params.set('search', search.trim())
    }
    if (taskCategoryFilter !== 'all') {
      params.set('taskCategory', taskCategoryFilter)
    }
    if (workTypeFilter !== 'all') {
      params.set('workType', workTypeFilter)
    }
    if (confidenceFilter !== 'all') {
      params.set('confidence', confidenceFilter)
    }
    if (sourceFilter !== 'all') {
      params.set('source', sourceFilter)
    }
    if (affectedFilter !== 'all') {
      params.set('affected', affectedFilter)
    }
    return apiUrl(`admin/task-classification-examples?${params.toString()}`)
  }, [
    affectedFilter,
    confidenceFilter,
    page,
    perPage,
    search,
    sourceFilter,
    taskCategoryFilter,
    workTypeFilter,
  ])

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    setHealthError('')
    try {
      const payload = await apiJson(apiUrl('admin/task-classification-health'), {
        credentials: 'include',
        silentError: true,
      })
      setHealth(normalizeHealth(payload))
    } catch (err) {
      setHealthError(err.message || 'Failed to load AI workload health.')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const loadSnapshotHealth = useCallback(async () => {
    setSnapshotHealthLoading(true)
    setSnapshotHealthError('')
    try {
      const payload = await apiJson(apiUrl('stats/workload/snapshot-health'), {
        credentials: 'include',
        silentError: true,
      })
      setSnapshotHealth(normalizeSnapshotHealth(payload))
    } catch (err) {
      setSnapshotHealthError(err.message || 'Failed to load daily snapshot health.')
    } finally {
      setSnapshotHealthLoading(false)
    }
  }, [])

  const loadRows = useCallback(async () => {
    setRowsLoading(true)
    setRowsError('')
    try {
      const payload = await apiJson(rowsEndpoint, {
        credentials: 'include',
        silentError: true,
      })
      setRows(normalizeRows(payload))
      setPageMeta(normalizePageMeta(payload, { page, perPage }))
    } catch (err) {
      setRowsError(err.message || 'Failed to load learned classifications.')
    } finally {
      setRowsLoading(false)
    }
  }, [page, perPage, rowsEndpoint])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  useEffect(() => {
    loadSnapshotHealth()
  }, [loadSnapshotHealth])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const refreshAll = useCallback(() => {
    loadSnapshotHealth()
    loadHealth()
    loadRows()
  }, [loadHealth, loadRows, loadSnapshotHealth])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 220)

    return () => clearTimeout(timer)
  }, [searchInput])

  const resetFilters = useCallback(() => {
    setSearchInput('')
    setSearch('')
    setTaskCategoryFilter('all')
    setWorkTypeFilter('all')
    setConfidenceFilter('all')
    setSourceFilter('all')
    setAffectedFilter('all')
    setPage(1)
  }, [])

  const updateFilter = useCallback((setter) => {
    return (event) => {
      setter(event.target.value)
      setPage(1)
    }
  }, [])

  const handleDelete = useCallback(
    async (row) => {
      if (!row?.id) return
      const confirmed = window.confirm(
        `Delete learned classification for "${row.normalizedTitle}"? This only prevents future local reuse and will not rewrite existing tasks.`,
      )
      if (!confirmed) return

      setDeletingId(row.id)
      try {
        await apiJson(apiUrl(`admin/task-classification-examples/${row.id}`), {
          method: 'DELETE',
          credentials: 'include',
        })
        setRows((current) => current.filter((item) => item.id !== row.id))
        setPageMeta((current) => ({
          ...current,
          total: Math.max(0, current.total - 1),
        }))
        showToast('Learned classification deleted.')
        loadHealth()
      } catch (err) {
        setRowsError(err.message || 'Failed to delete learned classification.')
      } finally {
        setDeletingId(null)
      }
    },
    [loadHealth],
  )

  const renderLearnedCell = useCallback((row, column) => {
    if (column.key === 'normalizedTitle') {
      return (
        <div>
          {renderTextCell(row.normalizedTitle, 'Normalized Title')}
          <div className="small text-muted mt-1">{row.matchedPattern}</div>
        </div>
      )
    }
    if (column.key === 'sampleTitle') {
      return renderTextCell(row.sampleTitle, 'Sample Title', '240px')
    }
    if (column.key === 'taskCategoryLabel') {
      return (
        <div className="d-flex flex-column gap-1 align-items-start">
          <DataTableStatusBadge tone={confidenceTone(row.classificationConfidence)}>
            {row.taskCategoryLabel}
          </DataTableStatusBadge>
          <span className="small text-muted">
            {row.taskCategory} / {row.effortScore} pts / {row.classificationConfidence}
          </span>
        </div>
      )
    }
    if (column.key === 'workTypeLabel') {
      return (
        <div className="d-flex flex-column gap-1 align-items-start">
          <DataTableStatusBadge tone={sourceTone(row.classificationSource)}>
            {row.workTypeLabel}
          </DataTableStatusBadge>
          <span className="small text-muted">
            {row.workType} / {row.workTypeConfidence}
          </span>
        </div>
      )
    }
    if (column.key === 'lastSeenAt') return formatDate(row.lastSeenAt)
    return row[column.key]
  }, [])

  const getLearnedActions = useCallback(
    (row) => [
      {
        key: 'delete',
        label: 'Delete learned classification',
        danger: true,
        disabled: deletingId === row.id,
        onClick: () => handleDelete(row),
      },
    ],
    [deletingId, handleDelete],
  )

  const renderColumnMenu = useCallback(
    () => (
      <CDropdown alignment="end" autoClose="outside" className="d-none d-lg-block">
        <CDropdownToggle size="sm" color="secondary" variant="outline">
          Columns
        </CDropdownToggle>
        <CDropdownMenu className="p-2" style={{ minWidth: '220px' }}>
          <div className="small text-muted mb-2">Show/Hide Columns</div>
          {TOGGLABLE_COLUMN_ORDER.map((key) => (
            <div key={key} className="mb-1">
              <CFormCheck
                id={`ai-workload-col-${key}`}
                label={COLUMN_LABELS[key] || key}
                checked={isColumnVisible(key)}
                disabled={requiredLearnedColumns.has(key)}
                onChange={() => toggleColumnVisibility(key)}
              />
            </div>
          ))}
          <div className="d-flex justify-content-end mt-2">
            <CButton size="sm" color="secondary" variant="outline" onClick={resetColumnVisibility}>
              Reset
            </CButton>
          </div>
        </CDropdownMenu>
      </CDropdown>
    ),
    [isColumnVisible, resetColumnVisibility, toggleColumnVisibility],
  )

  const isRowsUnavailable = pageMeta.available === false
  const pageStart = pageMeta.total === 0 ? 0 : (pageMeta.page - 1) * perPage
  const pageEnd = Math.min(pageStart + rows.length, pageMeta.total)
  const filterLabels = useMemo(
    () => ({
      taskCategory: Object.fromEntries(
        TASK_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
      ),
      workType: Object.fromEntries(workloadWorkTypes.map((option) => [option.key, option.label])),
      confidence: Object.fromEntries(
        CONFIDENCE_OPTIONS.map((option) => [option.value, option.label]),
      ),
      source: Object.fromEntries(SOURCE_OPTIONS.map((option) => [option.value, option.label])),
      affected: Object.fromEntries(AFFECTED_OPTIONS.map((option) => [option.value, option.label])),
    }),
    [],
  )
  const activeChips = [
    search ? { key: 'search', label: `Search: ${search}` } : null,
    taskCategoryFilter !== 'all'
      ? {
          key: 'taskCategory',
          label: `Category: ${filterLabels.taskCategory[taskCategoryFilter] || taskCategoryFilter}`,
        }
      : null,
    workTypeFilter !== 'all'
      ? {
          key: 'workType',
          label: `Work type: ${filterLabels.workType[workTypeFilter] || workTypeFilter}`,
        }
      : null,
    confidenceFilter !== 'all'
      ? {
          key: 'confidence',
          label: `Confidence: ${filterLabels.confidence[confidenceFilter] || confidenceFilter}`,
        }
      : null,
    sourceFilter !== 'all'
      ? { key: 'source', label: `Source: ${filterLabels.source[sourceFilter] || sourceFilter}` }
      : null,
    affectedFilter !== 'all'
      ? {
          key: 'affected',
          label: `Affected: ${filterLabels.affected[affectedFilter] || affectedFilter}`,
        }
      : null,
  ].filter(Boolean)
  const activeFilterCount = activeChips.length
  const clearChip = useCallback((key) => {
    if (key === 'search') {
      setSearchInput('')
      setSearch('')
    }
    if (key === 'taskCategory') setTaskCategoryFilter('all')
    if (key === 'workType') setWorkTypeFilter('all')
    if (key === 'confidence') setConfidenceFilter('all')
    if (key === 'source') setSourceFilter('all')
    if (key === 'affected') setAffectedFilter('all')
    setPage(1)
  }, [])

  return (
    <>
      <CRow>
        <CCol xl={12}>
          <CCard className="mb-4 records-page-card">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap records-page-card-header">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong>Daily Snapshot Health</strong>
                {snapshotHealth ? (
                  <CBadge color={snapshotStatusTone(snapshotHealth.captureStatus)}>
                    {snapshotHealth.captureStatus}
                  </CBadge>
                ) : null}
              </div>
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                onClick={loadSnapshotHealth}
                disabled={snapshotHealthLoading}
              >
                Refresh
              </CButton>
            </CCardHeader>
            <CCardBody className="records-page-card-body">
              {snapshotHealthError ? <CAlert color="danger">{snapshotHealthError}</CAlert> : null}
              {snapshotHealthLoading ? (
                <DataTableLoadingState message="Loading daily snapshot health..." />
              ) : !snapshotHealth ? (
                <div className="text-center text-muted py-4">
                  Daily snapshot health is unavailable.
                </div>
              ) : !snapshotHealth.available ? (
                <CAlert color="warning">
                  Daily workload snapshot storage is not available. Run migrations before relying on
                  capture monitoring.
                </CAlert>
              ) : (
                <CRow className="g-2">
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Latest Snapshot"
                      value={snapshotHealth.latestSnapshot?.snapshotDate || '-'}
                      color="secondary"
                    />
                  </CCol>
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Staff Rows"
                      value={snapshotHealth.latestSnapshot?.staffCount ?? 0}
                      color="info"
                    />
                  </CCol>
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Avg Score"
                      value={snapshotHealth.latestSnapshot?.avgScore ?? 0}
                      color="primary"
                    />
                  </CCol>
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Active Tasks"
                      value={snapshotHealth.latestSnapshot?.totalActiveTasks ?? 0}
                      color="success"
                    />
                  </CCol>
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Captured 31d"
                      value={snapshotHealth.capturedSnapshotsLast31Days}
                      color="success"
                    />
                  </CCol>
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Replayed 31d"
                      value={snapshotHealth.reconstructedSnapshotsLast31Days}
                      color={
                        snapshotHealth.reconstructedSnapshotsLast31Days > 0
                          ? 'warning'
                          : 'secondary'
                      }
                    />
                  </CCol>
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Warning Checks"
                      value={snapshotHealth.warningCount}
                      color={snapshotHealth.warningCount > 0 ? 'warning' : 'secondary'}
                    />
                  </CCol>
                  <CCol xs={6} md={4} lg={2}>
                    <SummaryTile
                      label="Last Prune"
                      value={
                        snapshotHealth.retention.lastPrunedAt
                          ? formatDate(snapshotHealth.retention.lastPrunedAt)
                          : snapshotHealth.retention.lastPruneState === 'not_run'
                            ? 'Not run'
                            : snapshotHealth.retention.lastPruneState
                      }
                      color="secondary"
                    />
                  </CCol>
                </CRow>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol xl={12}>
          <CCard className="mb-4 records-page-card">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap records-page-card-header">
              <strong>Classification Health</strong>
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                onClick={refreshAll}
                disabled={healthLoading || rowsLoading}
              >
                Refresh
              </CButton>
            </CCardHeader>
            <CCardBody className="records-page-card-body">
              {healthError ? <CAlert color="danger">{healthError}</CAlert> : null}
              {healthLoading ? (
                <DataTableLoadingState message="Loading AI workload health..." />
              ) : !health ? (
                <div className="text-center text-muted py-4">
                  AI workload health is unavailable.
                </div>
              ) : (
                <>
                  {!health.available ? (
                    <CAlert color="warning">
                      Learned classification storage is not available. Run migrations before using
                      learned-cache governance.
                    </CAlert>
                  ) : null}
                  <CRow className="g-2">
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile
                        label="Classified Tasks"
                        value={health.totalClassifiedTasks}
                        color="secondary"
                      />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile
                        label="Unclear / Not Graded"
                        value={health.unclearUnratedTasks}
                        color="warning"
                      />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile label="Non-work" value={health.nonWorkTasks} color="secondary" />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile
                        label="Low Confidence"
                        value={health.lowConfidenceTasks}
                        color="danger"
                      />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile
                        label="AI Classified"
                        value={health.aiClassifiedTasks}
                        color="info"
                      />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile
                        label="Learned-cache Tasks"
                        value={health.learnedCacheTasks}
                        color="info"
                      />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile
                        label="Learned Rows"
                        value={health.learnedCacheRows}
                        color="info"
                      />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                      <SummaryTile
                        label="Learned Usage"
                        value={health.learnedCacheUsage}
                        color="success"
                      />
                    </CCol>
                  </CRow>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol xl={12}>
          <CCard className="mb-4 records-page-card">
            <CCardHeader className="records-page-card-header">
              <strong>Learned Classifications</strong>
            </CCardHeader>
            <CCardBody className="records-page-card-body">
              <DataTableToolbar
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Search title, category, work type, or pattern"
                searchAriaLabel="Search learned classifications"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                onResetFilters={resetFilters}
                renderColumnMenu={renderColumnMenu}
              />

              <CCollapse visible={showAdvancedFilters}>
                <CRow className="records-filter-advanced mb-3 g-3">
                  <CCol xs={6} md={3} lg={2}>
                    <CFormLabel htmlFor="ai-workload-category-filter">Category</CFormLabel>
                    <CFormSelect
                      id="ai-workload-category-filter"
                      aria-label="Filter learned classifications by category"
                      value={taskCategoryFilter}
                      onChange={updateFilter(setTaskCategoryFilter)}
                    >
                      <option value="all">All</option>
                      {TASK_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={6} md={3} lg={2}>
                    <CFormLabel htmlFor="ai-workload-work-type-filter">Work Type</CFormLabel>
                    <CFormSelect
                      id="ai-workload-work-type-filter"
                      aria-label="Filter learned classifications by work type"
                      value={workTypeFilter}
                      onChange={updateFilter(setWorkTypeFilter)}
                    >
                      <option value="all">All</option>
                      {workloadWorkTypes.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={6} md={3} lg={2}>
                    <CFormLabel htmlFor="ai-workload-confidence-filter">Confidence</CFormLabel>
                    <CFormSelect
                      id="ai-workload-confidence-filter"
                      aria-label="Filter learned classifications by confidence"
                      value={confidenceFilter}
                      onChange={updateFilter(setConfidenceFilter)}
                    >
                      <option value="all">All</option>
                      {CONFIDENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={6} md={3} lg={2}>
                    <CFormLabel htmlFor="ai-workload-source-filter">Source</CFormLabel>
                    <CFormSelect
                      id="ai-workload-source-filter"
                      aria-label="Filter learned classifications by source"
                      value={sourceFilter}
                      onChange={updateFilter(setSourceFilter)}
                    >
                      <option value="all">All</option>
                      {SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={6} md={3} lg={2}>
                    <CFormLabel htmlFor="ai-workload-affected-filter">Affected Tasks</CFormLabel>
                    <CFormSelect
                      id="ai-workload-affected-filter"
                      aria-label="Filter learned classifications by affected task count"
                      value={affectedFilter}
                      onChange={updateFilter(setAffectedFilter)}
                    >
                      <option value="all">All</option>
                      {AFFECTED_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
              </CCollapse>

              {activeChips.length > 0 ? (
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  {activeChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="badge rounded-pill text-bg-light border fw-normal d-inline-flex align-items-center gap-1"
                    >
                      {chip.label}
                      <button
                        type="button"
                        className="btn btn-sm p-0 border-0 bg-transparent lh-1"
                        aria-label={`Clear ${chip.label}`}
                        onClick={() => clearChip(chip.key)}
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={resetFilters}
                  >
                    Clear all
                  </button>
                </div>
              ) : null}

              {isRowsUnavailable ? (
                <CAlert color="warning">
                  Learned classification storage is not available. Run migrations before using this
                  section.
                </CAlert>
              ) : null}
              {rowsError ? <CAlert color="danger">{rowsError}</CAlert> : null}

              {rowsLoading ? (
                <DataTableLoadingState message="Loading learned classifications..." />
              ) : (
                <DataTableRecordList
                  rows={rows}
                  dataColumns={learnedColumns}
                  defaultVisibleColumns={defaultLearnedVisibleColumns}
                  requiredColumns={requiredLearnedColumns}
                  columnVisibilityController={{
                    isColumnVisible,
                    toggleColumnVisibility,
                    resetColumnVisibility,
                  }}
                  scrollStorageKey="system-admin.ai-workload.scroll"
                  idPrefix="system-admin-ai-workload"
                  emptyMessage="No learned workload classifications found."
                  initialSortField="lastSeenAt"
                  initialSortDir="desc"
                  showColumnMenu={false}
                  showExport={false}
                  showDesktopSummary={false}
                  desktopUtilityPlacement="hidden"
                  showMobileUtilityRow={false}
                  showMobileTopFooter={false}
                  showScrollTip={false}
                  showFooter={false}
                  controlledPageSize={perPage}
                  controlledCurrentPage={1}
                  controlledSetPageSize={noop}
                  controlledSetCurrentPage={noop}
                  getRowKey={(row) => row.id}
                  getSortValue={(row, field) => {
                    if (field === 'lastSeenAt') return row.lastSeenAt
                    return row[field]
                  }}
                  renderCell={renderLearnedCell}
                  getActions={getLearnedActions}
                  actionColumnWidth="56px"
                  getMobileTitle={(row) => row.normalizedTitle}
                  getMobileSubtitle={(row) => row.sampleTitle}
                  getMobileMeta={(row) =>
                    `${row.taskCategoryLabel} | ${row.workTypeLabel} | ${row.usageCount} uses`
                  }
                  getMobileStatus={(row) => row.classificationConfidence}
                  getMobileStatusTone={(row) => confidenceTone(row.classificationConfidence)}
                  mobileFieldKeys={{
                    title: 'normalizedTitle',
                    subtitle: 'sampleTitle',
                    meta: ['taskCategoryLabel', 'workTypeLabel', 'usageCount'],
                    status: 'taskCategoryLabel',
                  }}
                />
              )}

              <DataTableFooter
                pageSizeOptions={PAGE_SIZES}
                showScrollTip={false}
                pageSize={perPage}
                setPageSize={(value) => {
                  setPerPage(Number(value) || 25)
                  setPage(1)
                }}
                totalRows={pageMeta.total}
                pageStart={pageStart}
                pageEnd={pageEnd}
                safeCurrentPage={pageMeta.page}
                totalPages={pageMeta.lastPage}
                setCurrentPage={setPage}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default SectionAiWorkloadGovernance
