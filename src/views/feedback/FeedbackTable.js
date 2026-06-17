// src/views/feedback/FeedbackTable.jsx
import React, { useMemo, useState } from 'react'
import { CCard, CCardBody, CCol, CFormLabel, CFormSelect } from '@coreui/react'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableStatsToggle,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../components/filters'
import { StatsStrip } from '../../components/stats'
import { useDataTableStatsVisibility } from '../../hooks/datatable'
import { countByPredicate, formatCount, getTopGroupByCount } from '../../utils/stats/formatStats'
import { RESOLUTION_TRACK_OPTIONS } from './AdminFixModal'

const normalize = (value) => (value ?? '').toString().trim().toLowerCase()

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'fixed pending pushed', label: 'Fixed Pending Pushed' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'fixed completed', label: 'Fixed Completed' },
  { value: 'resolved', label: 'Resolved' },
]

const RESOLUTION_TRACK_FILTER_OPTIONS = [
  { value: 'all', label: 'All tracks' },
  ...RESOLUTION_TRACK_OPTIONS.map((track) => ({ value: normalize(track), label: track })),
]

const dataColumns = [
  {
    key: 'feedbackText',
    label: 'Feedback',
    width: '180px',
    sortable: true,
    sortType: 'string',
    getExportValue: (feedback) => feedback.feedbackText || '-',
    textMode: 'expandable',
    cellMaxWidth: '180px',
    previewCharThreshold: 32,
  },
  {
    key: 'reportedBy',
    label: 'Reported by',
    width: '130px',
    sortable: true,
    sortType: 'string',
    getExportValue: (feedback) => feedback.reportedBy || '-',
    shrinkToFit: true,
    textMode: 'plain',
    cellMaxWidth: '130px',
  },
  {
    key: 'dateReported',
    label: 'Date Reported',
    width: '112px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    getExportValue: (feedback) => feedback.dateReported || '-',
    shrinkToFit: true,
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    getExportValue: (feedback) => feedback.status || '-',
    shrinkToFit: true,
  },
  {
    key: 'resolutionTrack',
    label: 'Resolution Track',
    width: '150px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    getExportValue: (feedback) => feedback.resolutionTrack || 'Needs Triage',
    shrinkToFit: true,
  },
  {
    key: 'actionDate',
    label: 'Action Date',
    width: '112px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    getExportValue: (feedback) => feedback.actionDate || '-',
    shrinkToFit: true,
  },
  {
    key: 'remarks',
    label: 'Remarks',
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (feedback) => feedback.remarks || '-',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
]

const defaultVisibleColumns = {
  feedbackText: true,
  reportedBy: true,
  dateReported: true,
  status: true,
  resolutionTrack: true,
  actionDate: true,
  remarks: false,
}

const requiredColumns = new Set(['feedbackText', 'status'])

const isCompletedStatus = (status) => normalize(status) === 'fixed completed'
const isPendingStatus = (status) => normalize(status) === 'pending'
const isThirtyDayFixTrack = (track) => normalize(track) === '30-day fix'

const getStatusTone = (status) => {
  const normalized = normalize(status)
  if (isCompletedStatus(normalized)) return 'success'
  if (isPendingStatus(normalized) || normalized === 'fixed pending pushed') return 'warning'
  if (normalized === 'resolved') return 'secondary'
  return 'info'
}

const getResolutionTrackTone = (track) => {
  const normalized = normalize(track)
  if (normalized === '30-day fix') return 'primary'
  if (normalized === 'needs triage') return 'warning'
  if (normalized === 'rejected') return 'danger'
  if (normalized === 'not actionable') return 'secondary'
  return 'info'
}

const FeedbackTable = ({
  allFeedbacks,
  loading = false,
  isAdmin,
  currentStaffId,
  onEditFeedback,
  onUpdateFix,
  onDeleteFeedback,
  onViewFeedback,
}) => {
  const desktopToolsId = 'feedback-table-tools'
  const mobileToolsId = 'feedback-mobile-table-tools'

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [resolutionTrackFilter, setResolutionTrackFilter] = useState('all')
  const [reportedByFilter, setReportedByFilter] = useState('all')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('support.feedback')

  const isOwnerFeedback = (feedback) => {
    const ownerId = Number(feedback?.reported_by_id)
    const myId = Number(currentStaffId)
    return Number.isFinite(ownerId) && Number.isFinite(myId) && ownerId === myId
  }

  const reporterOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        (allFeedbacks || [])
          .map((feedback) => feedback?.reported_by)
          .filter(Boolean)
          .map((name) => name.toString().trim()),
      ),
    ).sort((left, right) => left.localeCompare(right))
    return ['all', ...names]
  }, [allFeedbacks])

  const statusLabel =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label || statusFilter
  const resolutionTrackLabel =
    RESOLUTION_TRACK_FILTER_OPTIONS.find((option) => option.value === resolutionTrackFilter)
      ?.label || resolutionTrackFilter

  const activeChips = useMemo(
    () =>
      [
        searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
        statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusLabel}` } : null,
        resolutionTrackFilter !== 'all'
          ? { key: 'resolutionTrack', label: `Track: ${resolutionTrackLabel}` }
          : null,
        reportedByFilter !== 'all'
          ? { key: 'reportedBy', label: `Reported by: ${reportedByFilter}` }
          : null,
        periodRange && !isDefaultPeriodRange(periodRange)
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
          : null,
      ].filter(Boolean),
    [
      periodRange,
      reportedByFilter,
      resolutionTrackFilter,
      resolutionTrackLabel,
      searchTerm,
      statusFilter,
      statusLabel,
    ],
  )

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'status') setStatusFilter('all')
    if (key === 'resolutionTrack') setResolutionTrackFilter('all')
    if (key === 'reportedBy') setReportedByFilter('all')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const filteredFeedbacks = useMemo(
    () =>
      (allFeedbacks || []).filter((feedback) => {
        const term = searchTerm.trim().toLowerCase()
        const status = normalize(feedback?.status)
        const resolutionTrack = normalize(feedback?.resolution_track || 'Needs Triage')
        const reporter = normalize(feedback?.reported_by)
        const searchableText = [
          feedback?.feedback,
          feedback?.reported_by,
          feedback?.date_reported,
          feedback?.status,
          feedback?.resolution_track,
          feedback?.action_date,
          feedback?.remarks,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ')

        let passStatus = true
        if (statusFilter !== 'all') passStatus = status === statusFilter

        let passResolutionTrack = true
        if (resolutionTrackFilter !== 'all') {
          passResolutionTrack = resolutionTrack === resolutionTrackFilter
        }

        let passReporter = true
        if (reportedByFilter !== 'all') {
          passReporter = reporter === normalize(reportedByFilter)
        }

        const passSearch = term === '' || searchableText.includes(term)
        const passPeriod = isDateInPeriodRange(feedback?.date_reported, periodRange)

        return passSearch && passStatus && passResolutionTrack && passReporter && passPeriod
      }),
    [allFeedbacks, searchTerm, statusFilter, resolutionTrackFilter, reportedByFilter, periodRange],
  )

  const rows = useMemo(
    () =>
      filteredFeedbacks.map((feedback) => ({
        ...feedback,
        feedbackText: feedback.feedback || '',
        reportedBy: feedback.reported_by || '-',
        dateReported: feedback.date_reported || '',
        status: feedback.status || '-',
        resolutionTrack: feedback.resolution_track || 'Needs Triage',
        actionDate: feedback.action_date || '',
        remarks: feedback.remarks || '',
      })),
    [filteredFeedbacks],
  )

  const statsItems = useMemo(() => {
    const pendingCount = countByPredicate(rows, (feedback) => isPendingStatus(feedback.status))
    const fixedRows = rows.filter((feedback) => isCompletedStatus(feedback.status))
    const thirtyDayFixCount = countByPredicate(rows, (feedback) =>
      isThirtyDayFixTrack(feedback.resolutionTrack),
    )
    const topReporter = getTopGroupByCount(rows, (feedback) => feedback.reportedBy)

    return [
      {
        key: 'feedback',
        label: 'Feedback',
        value: formatCount(rows.length),
        tone: 'primary',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: formatCount(pendingCount),
        tone: pendingCount ? 'warning' : 'secondary',
        onClick: () => {
          setStatusFilter('pending')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'fixed',
        label: 'Fixed',
        value: formatCount(fixedRows.length),
        tone: 'success',
        onClick: () => {
          setStatusFilter('fixed completed')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'thirty-day-fix',
        label: '30-Day Fix',
        value: formatCount(thirtyDayFixCount),
        tone: thirtyDayFixCount ? 'primary' : 'secondary',
        onClick: () => {
          setResolutionTrackFilter('30-day fix')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'top-reporter',
        label: 'Top Reporter',
        value: topReporter.value,
        sublabel: `${formatCount(topReporter.count)} reports`,
        tone: 'secondary',
        onClick:
          topReporter.value &&
          topReporter.value !== '-' &&
          reporterOptions.includes(topReporter.value)
            ? () => {
                setReportedByFilter(topReporter.value)
                setShowAdvancedFilters(true)
              }
            : undefined,
      },
    ]
  }, [reporterOptions, rows])

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setResolutionTrackFilter('all')
    setReportedByFilter('all')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const getActions = (feedback) => {
    if (isAdmin) {
      return [
        { key: 'edit', label: 'Edit', onClick: () => onEditFeedback?.(feedback) },
        { key: 'update-fix', label: 'Update Fix', onClick: () => onUpdateFix?.(feedback) },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          dividerBefore: true,
          onClick: () => onDeleteFeedback?.(feedback),
        },
      ]
    }

    const isOwner = isOwnerFeedback(feedback)
    return [
      {
        key: 'edit',
        label: 'Edit',
        disabled: !isOwner,
        tooltip: !isOwner ? 'You can only edit your own feedback.' : undefined,
        onClick: isOwner ? () => onEditFeedback?.(feedback) : undefined,
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        disabled: !isOwner,
        tooltip: !isOwner ? 'You can only delete your own feedback.' : undefined,
        dividerBefore: true,
        onClick: isOwner ? () => onDeleteFeedback?.(feedback) : undefined,
      },
    ]
  }

  const renderCell = (feedback, column) => {
    if (column.key === 'feedbackText') {
      return (
        <DataTableTextCell
          value={feedback.feedbackText}
          emptyText="-"
          maxWidth="180px"
          title="Feedback"
          mode="expandable"
          previewCharThreshold={32}
        />
      )
    }
    if (column.key === 'remarks') {
      return (
        <DataTableTextCell
          value={feedback.remarks}
          maxWidth="220px"
          title="Remarks"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(feedback.status)}>
          {feedback.status}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'resolutionTrack') {
      return (
        <DataTableStatusBadge tone={getResolutionTrackTone(feedback.resolutionTrack)}>
          {feedback.resolutionTrack}
        </DataTableStatusBadge>
      )
    }
    return feedback[column.key] || '-'
  }

  return (
    <CCard className="mt-4">
      <DataTableCardHeader
        title="All Feedbacks"
        scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
      >
        <DataTableStatsToggle
          visible={statsVisible}
          onToggle={toggleStatsVisible}
          controlsVisible={controlsVisible}
          onControlsToggle={toggleControlsVisible}
        />
      </DataTableCardHeader>
      <CCardBody>
        {statsVisible && <StatsStrip loading={loading} items={statsItems} />}
        <DataTableRecordControls
          visible={controlsVisible}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search feedback, reporter, status, track, remarks..."
          searchAriaLabel="Search feedback records"
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          activeFilterCount={activeFilterCount}
          activeChips={activeChips}
          clearChip={clearChip}
          resetFilters={resetFilters}
          loading={loading}
          desktopToolsId={desktopToolsId}
          mobileToolsId={mobileToolsId}
        >
          <CCol xs={12} md={3} lg={2}>
            <CFormLabel htmlFor="feedback-filter-status">Status</CFormLabel>
            <CFormSelect
              id="feedback-filter-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>

          <CCol xs={12} md={3} lg={2}>
            <CFormLabel htmlFor="feedback-filter-resolution-track">Resolution Track</CFormLabel>
            <CFormSelect
              id="feedback-filter-resolution-track"
              value={resolutionTrackFilter}
              onChange={(event) => setResolutionTrackFilter(event.target.value)}
            >
              {RESOLUTION_TRACK_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>

          <CCol xs={12} md={3} lg={2}>
            <CFormLabel htmlFor="feedback-filter-reporter">Reported by</CFormLabel>
            <CFormSelect
              id="feedback-filter-reporter"
              value={reportedByFilter}
              onChange={(event) => setReportedByFilter(event.target.value)}
            >
              {reporterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All reporters' : option}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </DataTableRecordControls>

        <DataTableRecordList
          rows={rows}
          dataColumns={dataColumns}
          defaultVisibleColumns={defaultVisibleColumns}
          requiredColumns={requiredColumns}
          storageKey="feedback.records.visible-columns.v4"
          scrollStorageKey="feedback.records.scroll"
          idPrefix="feedback-record"
          emptyMessage="No feedbacks match the current filters."
          exportFilename={`feedback-records-${new Date().toISOString().slice(0, 10)}.csv`}
          loading={loading}
          loadingMessage="Loading feedback records..."
          getRowKey={(feedback, index) => feedback.id || index}
          renderCell={renderCell}
          getActions={getActions}
          onRowOpen={onViewFeedback}
          getMobileTitle={(feedback) => feedback.feedbackText || '-'}
          getMobileSubtitle={(feedback) => `${feedback.reportedBy} | ${feedback.resolutionTrack}`}
          getMobileMeta={(feedback) => feedback.dateReported || '-'}
          getMobileStatus={(feedback) => feedback.status}
          getMobileStatusTone={(feedback) => getStatusTone(feedback.status)}
          mobileFieldKeys={{
            title: 'feedbackText',
            subtitle: 'reportedBy',
            meta: 'dateReported',
            status: 'status',
          }}
          initialSortField="dateReported"
          initialSortDir="desc"
          initialSortDirByField={{ dateReported: 'desc', actionDate: 'desc' }}
          renderQuickFilters={() => (
            <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
          )}
          resetDeps={[
            searchTerm,
            statusFilter,
            resolutionTrackFilter,
            reportedByFilter,
            periodRange,
          ]}
          actionColumnWidth="56px"
          desktopUtilityPlacement="portal"
          desktopUtilityPortalId={desktopToolsId}
          mobileUtilityPlacement="portal"
          mobileUtilityPortalId={mobileToolsId}
          showMobileUtilityRow={false}
        />
      </CCardBody>
    </CCard>
  )
}

export default FeedbackTable
