import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCardBody,
  CCardHeader,
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
  DataTableRecordControls,
  DataTableRecordList,
  DataTableTextCell,
} from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../components/filters'
import { StatsStrip } from '../../../components/stats'
import { formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'
import { buildCsv, downloadCsv } from '../../../utils/datatable/csv'
import dialog from '../../../components/dialog/dialogService'
import { getDaysLapsedInfo, getStatusBadge, getStatusText } from './actionHandlers'
import TaskAchievement from './TaskAchievement'

const dataColumns = [
  {
    key: 'createdAt',
    label: 'Created On',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
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
    width: '240px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'statusText',
    label: 'Status',
    width: '170px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
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
    key: 'commentSummary',
    label: 'Comment Logs',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
]

const defaultVisibleColumns = {
  createdAt: true,
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
  if (statusText === 'Overdue') return 1
  if (statusText === 'Ongoing') return 2
  if (statusText === 'Completed') return 3
  if (statusText === 'Completed (On time)') return 3
  if (statusText.startsWith('Completed (Late')) return 4
  return 99
}

const AllTasks = () => {
  const navigate = useNavigate()
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

  useEffect(() => {
    setLoading(true)
    fetch(`${import.meta.env.VITE_API_BASE}tasks?year=${String(todayStr).slice(0, 4)}`, {
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
  }, [todayStr])

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
      const statusText = getStatusText(task, todayStr).toLowerCase()
      const statusMatch = statusText.includes(term)
      const commentMatch = (task.commentLogs || []).some((log) =>
        String(log.text || '')
          .toLowerCase()
          .includes(term),
      )
      const matchesSearch = term === '' || staffMatch || taskMatch || statusMatch || commentMatch

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

  const statsItems = useMemo(() => {
    const ongoingRows = normalizedTasks.filter((task) => task.statusText === 'Ongoing')
    const overdueRows = normalizedTasks.filter((task) => task.statusText === 'Overdue')
    const topStaff = getTopGroupByCount(normalizedTasks, getStaffCode)

    return [
      {
        key: 'tasks',
        label: 'Tasks',
        value: formatCount(normalizedTasks.length),
        tone: 'primary',
      },
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
        key: 'top-staff',
        label: 'Top Staff',
        value: topStaff.value,
        sublabel: `${formatCount(topStaff.count)} tasks`,
        tone: 'success',
      },
    ]
  }, [normalizedTasks])

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
    if (column.key === 'staffName' || column.key === 'title') {
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
      <CCardHeader>
        <strong>All Staff Tasks</strong>
      </CCardHeader>

      <CCardBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}

        <StatsStrip
          items={statsItems}
          loading={loading}
          scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
        />

        <DataTableRecordControls
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search staff, task, status, or comment..."
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
          storageKey="staff.tasks.all.visible-columns.v4"
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
              state: { record: task, returnTo: '/staff/tasks' },
            })
          }
          getMobileTitle={(task) => task.title}
          getMobileSubtitle={(task) => task.staffName}
          getMobileMeta={(task) => `${task.createdAt} | Due ${task.dueDate}`}
          getMobileStatus={(task) => task.statusText}
          getMobileStatusTone={(task) => {
            if (task.statusText.startsWith('Completed')) return 'success'
            if (task.statusText === 'Overdue') return 'danger'
            return 'info'
          }}
          mobileFieldKeys={{
            title: 'title',
            subtitle: 'staffName',
            meta: ['createdAt', 'dueDate'],
            status: 'statusText',
          }}
          initialSortField="createdAt"
          initialSortDir="desc"
          initialSortDirByField={{ createdAt: 'desc', dueDate: 'desc', daysLapsed: 'desc' }}
          getSortValue={(task, field) => (field === 'statusText' ? task.statusRank : task[field])}
          resetDeps={[filteredTasks, staffFilter, periodRange, searchTerm]}
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
            disabled={exporting}
            onClick={() => setShowExportModal(false)}
          >
            Cancel
          </CButton>
          <CButton color="primary" disabled={exporting} onClick={handleConfirmExport}>
            {exporting ? 'Exporting...' : `Export ${exportType.toUpperCase()}`}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AllTasks
