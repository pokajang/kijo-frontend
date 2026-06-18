import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCardBody,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatsToggle,
  DataTableTextCell,
} from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodDateParams,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../components/filters'
import { StatsStrip } from '../../../components/stats'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import { formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'
import { buildCsv, downloadCsv } from '../../../utils/datatable/csv'
import dialog from '../../../components/dialog/dialogService'
import { appendQueryParams } from '../../../utils/detailPages'
import { getDaysLapsedInfo, getStatusBadge, getStatusText } from './actionHandlers'
import TaskAchievement from './TaskAchievement'
import { compareTaskPriority } from '../../task-manager/taskPrioritySort'
import TaskTitleProjectCell from '../../task-manager/TaskTitleProjectCell'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'

export const buildAllTasksUrl = (apiBase, periodRange) =>
  appendQueryParams(`${apiBase}tasks`, {
    ...getPeriodDateParams(periodRange),
  })

const dataColumns = [
  {
    key: 'dueDate',
    label: 'Due Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  { key: 'staffName', label: 'Staff', width: '180px', sortable: true, sortType: 'string' },
  {
    key: 'title',
    label: 'Task',
    width: '320px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '300px',
    previewCharThreshold: 34,
  },
  {
    key: 'daysLapsed',
    label: 'Days Lapsed',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'statusText',
    label: 'Status',
    width: '210px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'commentSummary',
    label: 'Comment Logs',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'createdAt',
    label: 'Created On',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
]

const defaultVisibleColumns = {
  createdAt: false,
  dueDate: true,
  staffName: true,
  title: true,
  statusText: true,
  daysLapsed: true,
  commentSummary: true,
}

const requiredColumns = new Set(['staffName', 'title', 'statusText'])

const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getCurrentWeekRange = (todayStr) => {
  const curr = new Date(`${todayStr}T00:00:00`)
  const diff = (curr.getDay() + 6) % 7
  const monday = new Date(curr)
  monday.setDate(curr.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: formatDateLocal(monday),
    end: formatDateLocal(sunday),
  }
}

const exportPeriodOptions = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Period' },
]

const getExportPeriodRange = (period, todayStr) => {
  const today = new Date(`${todayStr}T00:00:00`)
  const end = formatDateLocal(today)

  if (period === 'this_week') return getCurrentWeekRange(todayStr)
  if (period === 'this_month') {
    return { start: formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 1)), end }
  }
  if (period === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
    return { start: formatDateLocal(start), end: formatDateLocal(lastDay) }
  }
  if (period === 'last_30_days') {
    const start = new Date(today)
    start.setDate(start.getDate() - 30)
    return { start: formatDateLocal(start), end }
  }
  if (period === 'last_3_months') {
    const start = new Date(today)
    start.setMonth(start.getMonth() - 3)
    return { start: formatDateLocal(start), end }
  }
  if (period === 'last_6_months') {
    const start = new Date(today)
    start.setMonth(start.getMonth() - 6)
    return { start: formatDateLocal(start), end }
  }
  if (period === 'this_year') {
    return { start: `${today.getFullYear()}-01-01`, end }
  }
  if (period === 'all_time') {
    return { start: '', end: '' }
  }

  return { start: '', end: '' }
}

const inferExportPeriod = (startDate, endDate, todayStr) =>
  exportPeriodOptions.find((option) => {
    if (option.value === 'custom') return false
    const range = getExportPeriodRange(option.value, todayStr)
    return range.start === startDate && range.end === endDate
  })?.value || 'custom'

const toDateOnly = (value) => String(value || '').slice(0, 10)
const getStaffCode = (task) =>
  task?.staffCode || task?.staff_code || task?.nameCode || task?.staffName
const getTaskStaffId = (task) => String(task?.staffId || task?.staff_id || '').trim()
const mapTaskToExportRow = (task, todayStr) => {
  const statusText = getStatusText(task, todayStr)
  const daysLapsed = getDaysLapsedInfo(task, todayStr)
  return {
    createdAt: task.createdAt || '-',
    dueDate: task.dueDate || '-',
    staffCode: getStaffCode(task) || '-',
    staffName: task.staffName || '-',
    title: task.title || '-',
    project: task.projectName || '-',
    statusText,
    daysLapsed: daysLapsed.value ?? '',
    daysLapsedBasis: daysLapsed.basis,
    completedAt: task.completedAt || '-',
    comments: (task.commentLogs || [])
      .map((log) => `${log.text} (${new Date(log.timestamp).toLocaleString()})`)
      .join('\n'),
  }
}

const getStatusRank = (statusText) => {
  if (statusText.startsWith('Overdue')) return 1
  if (statusText === 'Ongoing') return 2
  if (statusText === 'Completed') return 3
  if (statusText === 'Completed (On time)') return 3
  if (statusText.startsWith('Completed but late')) return 4
  return 99
}

export const buildAllTaskStatsItems = (normalizedTasks = []) => {
  const ongoingRows = normalizedTasks.filter((task) => task.statusText === 'Ongoing')
  const overdueRows = normalizedTasks.filter((task) => task.statusText.startsWith('Overdue'))
  const onTimeRows = normalizedTasks.filter((task) => task.statusText === 'Completed (On time)')
  const topOverdueStaff = getTopGroupByCount(overdueRows, getStaffCode)
  const topOnTimeStaff = getTopGroupByCount(onTimeRows, getStaffCode)

  return [
    {
      key: 'ongoing',
      label: 'Ongoing',
      value: formatCount(ongoingRows.length),
      tone: 'info',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: formatCount(overdueRows.length),
      tone: overdueRows.length ? 'danger' : 'secondary',
    },
    {
      key: 'top-overdue',
      label: 'Most Overdue',
      value: topOverdueStaff.value,
      sublabel: `${formatCount(topOverdueStaff.count)} overdue`,
      tone: topOverdueStaff.count ? 'danger' : 'secondary',
    },
    {
      key: 'top-on-time',
      label: 'Top On Time',
      value: topOnTimeStaff.value,
      sublabel: `${formatCount(topOnTimeStaff.count)} on time`,
      tone: topOnTimeStaff.count ? 'success' : 'secondary',
    },
  ]
}

const AllTasks = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const todayStr = formatDateLocal(new Date())
  const currentWeek = useMemo(() => getCurrentWeekRange(todayStr), [todayStr])
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [searchTerm, setSearchTerm] = useState('')
  const [staffFilter, setStaffFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [exportType, setExportType] = useState('csv')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportStaffId, setExportStaffId] = useState('all')
  const [exportPeriod, setExportPeriod] = useState('this_week')
  const [exportStartDate, setExportStartDate] = useState(currentWeek.start)
  const [exportEndDate, setExportEndDate] = useState(currentWeek.end)
  const [exporting, setExporting] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('staff.tasks')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildAllTasksUrl(import.meta.env.VITE_API_BASE, periodRange), {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'success') {
          setTasks(Array.isArray(json.tasks) ? json.tasks : [])
          return
        }
        throw new Error(json.message)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [periodRange])

  const staffOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.staffName).filter(Boolean))].sort(),
    [tasks],
  )

  const exportStaffOptions = useMemo(() => {
    const staffById = new Map()

    tasks.forEach((task) => {
      const staffId = getTaskStaffId(task)
      if (!staffId || staffById.has(staffId)) return

      const code = getStaffCode(task)
      const name = task.staffName || '-'
      staffById.set(staffId, {
        value: staffId,
        label: code && code !== name ? `${code} - ${name}` : name,
      })
    })

    return Array.from(staffById.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [tasks])

  const staffTasks = useMemo(
    () => (staffFilter === 'all' ? [] : tasks.filter((t) => t.staffName === staffFilter)),
    [tasks, staffFilter],
  )

  const filteredTasks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesStaff = staffFilter === 'all' || task.staffName === staffFilter

      const staffMatch = String(task.staffName || '')
        .toLowerCase()
        .includes(term)
      const taskMatch = String(task.title || '')
        .toLowerCase()
        .includes(term)
      const projectMatch = String(task.projectName || '')
        .toLowerCase()
        .includes(term)
      const statusText = getStatusText(task, todayStr).toLowerCase()
      const statusMatch = statusText.includes(term)
      const commentMatch = (task.commentLogs || []).some((log) =>
        String(log.text || '')
          .toLowerCase()
          .includes(term),
      )
      const matchesSearch =
        term === '' || staffMatch || taskMatch || projectMatch || statusMatch || commentMatch

      const inPeriod = isDateInPeriodRange(toDateOnly(task.createdAt), periodRange)

      return matchesStaff && matchesSearch && inPeriod
    })
  }, [tasks, searchTerm, staffFilter, periodRange, todayStr])

  const normalizedTasks = useMemo(
    () =>
      filteredTasks.map((task) => {
        const statusText = getStatusText(task, todayStr)
        const commentSummary = (task.commentLogs || [])
          .map((log) => `${log.text} (${new Date(log.timestamp).toLocaleString()})`)
          .join('\n')
        const daysLapsed = getDaysLapsedInfo(task, todayStr)
        return {
          ...task,
          statusText,
          statusRank: getStatusRank(statusText),
          daysLapsed: daysLapsed.value ?? 0,
          daysLapsedDisplay: daysLapsed.display,
          daysLapsedBasis: daysLapsed.basis,
          commentSummary,
        }
      }),
    [filteredTasks, todayStr],
  )

  const statsItems = useMemo(() => buildAllTaskStatsItems(normalizedTasks), [normalizedTasks])

  const hasCustomPeriod = periodRange && !isDefaultPeriodRange(periodRange)
  const activeFilterCount = 0

  const activeChips = useMemo(
    () =>
      [
        searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
        staffFilter !== 'all' ? { key: 'staff', label: `Staff: ${staffFilter}` } : null,
        hasCustomPeriod
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
          : null,
      ].filter(Boolean),
    [searchTerm, staffFilter, hasCustomPeriod, periodRange],
  )

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'staff') setStaffFilter('all')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStaffFilter('all')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const handleExportCsv = () => {
    const rows = normalizedTasks.map((task) => mapTaskToExportRow(task, todayStr))
    const selectedStaffLabel = staffFilter === 'all' ? 'all-staff' : staffFilter
    const csv = buildCsv({
      rows,
      columns: [
        { key: 'createdAt', label: 'Created On' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'staffCode', label: 'Staff Code' },
        { key: 'staffName', label: 'Staff' },
        { key: 'title', label: 'Task' },
        { key: 'project', label: 'Project' },
        { key: 'statusText', label: 'Status' },
        { key: 'daysLapsed', label: 'Days Lapsed' },
        { key: 'daysLapsedBasis', label: 'Lapsed Basis' },
        { key: 'completedAt', label: 'Completed At' },
        { key: 'comments', label: 'Comment Logs' },
      ],
    })

    downloadCsv(
      `all-staff-tasks-${selectedStaffLabel.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    )
    setShowExportModal(false)
  }

  const openExportPrompt = (type) => {
    if (type === 'csv') {
      handleExportCsv()
      return
    }

    const selectedStaff =
      staffFilter === 'all' ? null : tasks.find((task) => task.staffName === staffFilter)

    setExportType(type)
    setExportStaffId(selectedStaff ? getTaskStaffId(selectedStaff) || 'all' : 'all')
    setExportPeriod(
      inferExportPeriod(periodRange?.startDate || '', periodRange?.endDate || '', todayStr),
    )
    setExportStartDate(periodRange?.startDate || '')
    setExportEndDate(periodRange?.endDate || '')
    setShowExportModal(true)
  }

  const handleExportPeriodChange = (value) => {
    setExportPeriod(value)
    if (value === 'custom') return

    const range = getExportPeriodRange(value, todayStr)
    setExportStartDate(range.start)
    setExportEndDate(range.end)
  }

  const handleExportPdf = () => {
    const params = new URLSearchParams()
    if (exportStartDate) params.set('start', exportStartDate)
    if (exportEndDate) params.set('end', exportEndDate)
    if (exportStaffId !== 'all') params.set('staff_id', exportStaffId)

    window.open(`${import.meta.env.VITE_API_BASE}tasks/export/pdf?${params.toString()}`, '_blank')
    setShowExportModal(false)
  }

  const handleConfirmExport = async () => {
    setExporting(true)
    try {
      if (exportType === 'pdf') {
        handleExportPdf()
        return
      }

      handleExportCsv()
    } catch (err) {
      dialog.alert(err?.message || 'Unable to export tasks.')
    } finally {
      setExporting(false)
    }
  }

  const renderExportDropdown = () => (
    <CDropdown>
      <CDropdownToggle size="sm" color="secondary" variant="outline">
        Export
      </CDropdownToggle>
      <CDropdownMenu>
        <CDropdownItem onClick={() => openExportPrompt('csv')}>CSV</CDropdownItem>
        <CDropdownItem onClick={() => openExportPrompt('pdf')}>PDF</CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )

  const renderCell = (task, column) => {
    if (column.key === 'title') {
      return <TaskTitleProjectCell task={task} maxWidth={column.cellMaxWidth} />
    }
    if (column.key === 'staffName') {
      return (
        <DataTableTextCell
          value={task[column.key] || '-'}
          maxWidth={column.width}
          title={column.label}
        />
      )
    }
    if (column.key === 'statusText') return getStatusBadge(task, todayStr)
    if (column.key === 'daysLapsed') return task.daysLapsedDisplay
    if (column.key === 'commentSummary') {
      return (
        <DataTableTextCell
          value={task.commentSummary || '-'}
          maxWidth="220px"
          title="Comment Logs"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    return task[column.key] || '-'
  }

  return (
    <>
      <DataTableCardHeader
        title="All Staff Tasks"
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
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}

        {statsVisible && <StatsStrip items={statsItems} loading={loading} />}

        <DataTableRecordControls
          visible={controlsVisible}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search staff, task, project, status, or comment..."
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          activeFilterCount={activeFilterCount}
          activeChips={activeChips}
          clearChip={clearChip}
          resetFilters={resetFilters}
          loading={loading}
          desktopToolsId="all-staff-tasks-table-tools"
          mobileToolsId="all-staff-tasks-mobile-table-tools"
          extraTools={renderExportDropdown()}
          mobileExtraTools={renderExportDropdown()}
          inlineFilter={
            <CFormSelect
              id="all-tasks-filter-staff"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Staff</option>
              {staffOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </CFormSelect>
          }
        />
      </CCardBody>

      {staffFilter !== 'all' && <TaskAchievement tasks={staffTasks} todayStr={todayStr} />}

      <CCardBody>
        <DataTableRecordList
          rows={normalizedTasks}
          dataColumns={dataColumns}
          defaultVisibleColumns={defaultVisibleColumns}
          requiredColumns={requiredColumns}
          storageKey="staff.tasks.all.visible-columns.v7"
          scrollStorageKey="staff.tasks.all.scroll"
          idPrefix="all-staff-task"
          emptyMessage="No staff tasks found."
          exportFilename={`all-staff-tasks-${new Date().toISOString().slice(0, 10)}.csv`}
          loading={loading}
          loadingMessage="Loading staff tasks..."
          showDesktopSummary={false}
          showExport={false}
          desktopUtilityPlacement="portal"
          desktopUtilityPortalId="all-staff-tasks-table-tools"
          mobileUtilityPlacement="portal"
          mobileUtilityPortalId="all-staff-tasks-mobile-table-tools"
          showMobileUtilityRow={false}
          renderQuickFilters={() => (
            <PeriodRangeSelector
              value={periodRange}
              onChange={setPeriodRange}
              className="d-none d-lg-block"
            />
          )}
          getRowKey={(task, index) => task.id || index}
          renderCell={renderCell}
          onRowOpen={(task) =>
            navigate(`/staff/tasks/${task.id}`, {
              state: { record: task, returnTo: getCurrentReturnTo(location) },
            })
          }
          getMobileTitle={(task) => task.title}
          getMobileSubtitle={(task) => task.staffName}
          getMobileMeta={(task) => `Due ${task.dueDate || '-'}`}
          getMobileStatus={(task) => task.statusText}
          getMobileStatusTone={(task) => {
            if (task.statusText.startsWith('Completed')) return 'success'
            if (task.statusText.startsWith('Overdue')) return 'danger'
            return 'info'
          }}
          mobileFieldKeys={{
            title: 'title',
            subtitle: 'staffName',
            meta: 'dueDate',
            status: 'statusText',
          }}
          initialSortField="statusText"
          initialSortDir="asc"
          initialSortDirByField={{
            statusText: 'asc',
            createdAt: 'desc',
            dueDate: 'asc',
            daysLapsed: 'desc',
          }}
          getSortValue={(task, field) => (field === 'statusText' ? task.statusRank : task[field])}
          sortComparators={{ statusText: compareTaskPriority }}
          resetDeps={[staffFilter, periodRange, searchTerm]}
        />
      </CCardBody>

      <CModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        alignment="center"
      >
        <CModalHeader closeButton>
          <CModalTitle>Export All Staff Tasks</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CCol xs={12} className="mb-3">
            <CFormLabel htmlFor="all-tasks-export-staff">Staff</CFormLabel>
            <CFormSelect
              id="all-tasks-export-staff"
              value={exportStaffId}
              onChange={(event) => setExportStaffId(event.target.value)}
            >
              <option value="all">All Staff</option>
              {exportStaffOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} className="mb-3">
            <CFormLabel htmlFor="all-tasks-export-period">Period</CFormLabel>
            <CFormSelect
              id="all-tasks-export-period"
              value={exportPeriod}
              onChange={(event) => handleExportPeriodChange(event.target.value)}
            >
              {exportPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          {exportPeriod === 'custom' ? (
            <>
              <CCol xs={12} className="mb-3">
                <CFormLabel htmlFor="all-tasks-export-start">Start Date</CFormLabel>
                <CFormInput
                  id="all-tasks-export-start"
                  type="date"
                  value={exportStartDate}
                  onChange={(event) => setExportStartDate(event.target.value)}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="all-tasks-export-end">End Date</CFormLabel>
                <CFormInput
                  id="all-tasks-export-end"
                  type="date"
                  value={exportEndDate}
                  onChange={(event) => setExportEndDate(event.target.value)}
                />
              </CCol>
            </>
          ) : null}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => setShowExportModal(false)}
          >
            Cancel
          </CButton>
          <CButton color="primary" size="sm" disabled={exporting} onClick={handleConfirmExport}>
            {exporting ? 'Exporting...' : `Export ${exportType.toUpperCase()}`}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AllTasks
