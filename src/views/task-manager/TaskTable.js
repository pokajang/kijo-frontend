// src/components/tasks/TaskTable.js
import React, { useMemo, useState } from 'react'
import {
  CButton,
  CCard,
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
  DataTableActionMenu,
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatsToggle,
  DataTableTextCell,
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
import { countByPredicate, formatCount, sumBy } from '../../utils/stats/formatStats'
import { buildCsv, downloadCsv } from '../../utils/datatable/csv'
import dialog from '../../components/dialog/dialogService'
import { getDaysLapsedInfo, getStatusText } from './actionHandlers'
import { compareTaskPriority } from './taskPrioritySort'
import TaskTitleProjectCell from './TaskTitleProjectCell'

const onTimeBadge = String.fromCodePoint(0x1f407)
const lateBadge = String.fromCodePoint(0x1f40c)

const dataColumns = [
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
    width: '130px',
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
    key: 'dueDate',
    label: 'Due Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
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
  title: true,
  statusText: true,
  createdAt: false,
  dueDate: true,
  daysLapsed: true,
  commentSummary: true,
}

const requiredColumns = new Set(['title', 'statusText'])

const getDateOnly = (value) => String(value || '').slice(0, 10)
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

const mapTaskToExportRow = (task, todayStr) => {
  const statusText = getStatusText(task, todayStr)
  const daysLapsed = getDaysLapsedInfo(task, todayStr)
  return {
    createdAt: task.createdAt || '-',
    dueDate: task.dueDate || '-',
    staffCode: task.staffCode || '-',
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

const TaskTable = ({
  tasks = [],
  todayStr,
  periodRange,
  onPeriodRangeChange,
  getStatusBadge,
  handleAddComment,
  handleAddWeeklyUpdate,
  handleCarryForward,
  handleMarkCompleted,
  handleDeleteTask,
  onCreateTask,
  onView,
}) => {
  const currentWeek = useMemo(() => getCurrentWeekRange(todayStr), [todayStr])
  const [localPeriodRange, setLocalPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const selectedPeriodRange = periodRange || localPeriodRange
  const handlePeriodRangeChange = onPeriodRangeChange || setLocalPeriodRange
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [exportType, setExportType] = useState('csv')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportPeriod, setExportPeriod] = useState('this_week')
  const [exportStartDate, setExportStartDate] = useState(currentWeek.start)
  const [exportEndDate, setExportEndDate] = useState(currentWeek.end)
  const [exporting, setExporting] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('task-manager.tasks')

  const filteredTasks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return tasks.filter((task) => {
      const titleMatch = String(task.title || '')
        .toLowerCase()
        .includes(term)
      const projectMatch = String(task.projectName || '')
        .toLowerCase()
        .includes(term)
      const commentMatch = (task.commentLogs || []).some((log) =>
        String(log.text || '')
          .toLowerCase()
          .includes(term),
      )
      const statusText = getStatusText(task, todayStr).toLowerCase()
      const statusMatch = statusText.includes(term)
      const matchesSearch = term === '' || titleMatch || projectMatch || commentMatch || statusMatch

      const inPeriod = isDateInPeriodRange(getDateOnly(task.createdAt), selectedPeriodRange)

      return matchesSearch && inPeriod
    })
  }, [tasks, searchTerm, selectedPeriodRange, todayStr])

  const normalizedTasks = useMemo(
    () =>
      filteredTasks.map((task) => {
        const statusText = getStatusText(task, todayStr)
        const daysLapsed = getDaysLapsedInfo(task, todayStr)
        const commentSummary = (task.commentLogs || [])
          .map((log) => `${log.text} (${new Date(log.timestamp).toLocaleString()})`)
          .join('\n')

        return {
          ...task,
          title: task.title || '-',
          statusText,
          daysLapsed: daysLapsed.value ?? 0,
          daysLapsedHasValue: daysLapsed.value != null,
          daysLapsedDisplay: daysLapsed.display,
          daysLapsedBasis: daysLapsed.basis,
          statusRank: getStatusRank(statusText),
          commentSummary,
        }
      }),
    [filteredTasks, todayStr],
  )

  const statsItems = useMemo(() => {
    const completedRows = normalizedTasks.filter((task) => task.statusText.startsWith('Completed'))
    const overdueRows = normalizedTasks.filter((task) => task.statusText.startsWith('Overdue'))
    const lapsedRows = normalizedTasks.filter((task) => task.daysLapsedHasValue)
    const averageDaysLapsed = lapsedRows.length
      ? Math.round(sumBy(lapsedRows, (task) => task.daysLapsed) / lapsedRows.length)
      : 0

    return [
      {
        key: 'tasks',
        label: 'Tasks',
        value: formatCount(normalizedTasks.length),
        tone: 'primary',
      },
      {
        key: 'completed',
        label: 'Completed',
        value: formatCount(completedRows.length),
        sublabel: `${formatCount(
          countByPredicate(completedRows, (task) => task.statusText.includes('On time')),
        )} on time`,
        tone: 'success',
      },
      {
        key: 'overdue',
        label: 'Overdue',
        value: formatCount(overdueRows.length),
        tone: overdueRows.length ? 'danger' : 'secondary',
      },
      {
        key: 'average-days',
        label: 'Avg Days Lapsed',
        value: `${averageDaysLapsed}d`,
        tone: 'warning',
      },
    ]
  }, [normalizedTasks])

  const resetFilters = () => {
    setSearchTerm('')
    handlePeriodRangeChange(getPeriodRangePreset('ytd'))
  }

  const hasCustomPeriod = selectedPeriodRange && !isDefaultPeriodRange(selectedPeriodRange)
  const activeFilterCount = 0

  const activeChips = useMemo(
    () =>
      [
        searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
        hasCustomPeriod
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(selectedPeriodRange)}` }
          : null,
      ].filter(Boolean),
    [hasCustomPeriod, selectedPeriodRange, searchTerm],
  )

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') handlePeriodRangeChange(getPeriodRangePreset('ytd'))
  }

  const handleExportCsv = () => {
    const rows = normalizedTasks.map((task) => mapTaskToExportRow(task, todayStr))
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

    downloadCsv(`my-tasks-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    setShowExportModal(false)
  }

  const openExportPrompt = (type) => {
    if (type === 'csv') {
      handleExportCsv()
      return
    }

    setExportType(type)
    setExportPeriod(
      inferExportPeriod(
        selectedPeriodRange?.startDate || '',
        selectedPeriodRange?.endDate || '',
        todayStr,
      ),
    )
    setExportStartDate(selectedPeriodRange?.startDate || '')
    setExportEndDate(selectedPeriodRange?.endDate || '')
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

    window.open(
      `${import.meta.env.VITE_API_BASE}tasks/personal/export/pdf?${params.toString()}`,
      '_blank',
    )
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

  const getActions = (task) => {
    const isCompleted = task.statusText.startsWith('Completed')
    const canDelete = task.statusText === 'Ongoing'
    if (isCompleted) return []

    return [
      {
        key: 'add-weekly-update',
        label: 'Add Weekly Update',
        onClick: () => handleAddWeeklyUpdate?.(task),
      },
      {
        key: 'add-comment',
        label: 'Add Comment',
        onClick: () => handleAddComment(task.id),
      },
      {
        key: 'carry-forward',
        label: 'Carry Forward',
        onClick: () => handleCarryForward?.(task),
      },
      {
        key: 'mark-completed',
        label: 'Mark Completed',
        onClick: () => handleMarkCompleted(task.id),
      },
      canDelete
        ? {
            key: 'delete',
            label: 'Delete',
            danger: true,
            dividerBefore: true,
            onClick: () => handleDeleteTask(task.id),
          }
        : null,
    ].filter(Boolean)
  }

  const renderActions = (task, key) => {
    const isCompleted = task.statusText.startsWith('Completed')
    if (!isCompleted)
      return <DataTableActionMenu record={task} actions={getActions(task)} actionKey={key} />

    return (
      <span
        className={
          task.statusText.startsWith('Completed (On time)') ? 'text-danger' : 'text-warning'
        }
        title={
          task.statusText.startsWith('Completed (On time)')
            ? 'Great job - completed on time!'
            : 'Completed late - better late than never!'
        }
        style={{ fontSize: '1.25rem' }}
      >
        {task.statusText.startsWith('Completed (On time)') ? onTimeBadge : lateBadge}
      </span>
    )
  }

  const renderCell = (task, column) => {
    if (column.key === 'title') {
      return <TaskTitleProjectCell task={task} maxWidth={column.cellMaxWidth} />
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
    <CCard>
      <DataTableCardHeader
        title="My Tasks"
        scopeLabel={selectedPeriodRange ? getPeriodRangeScopeLabel(selectedPeriodRange) : ''}
      >
        <DataTableStatsToggle
          visible={statsVisible}
          onToggle={toggleStatsVisible}
          controlsVisible={controlsVisible}
          onControlsToggle={toggleControlsVisible}
        />
        <CButton color="primary" size="sm" onClick={onCreateTask}>
          Create Task
        </CButton>
      </DataTableCardHeader>
      <CCardBody>
        {statsVisible && <StatsStrip items={statsItems} />}

        <DataTableRecordControls
          visible={controlsVisible}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Type to search..."
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          activeFilterCount={activeFilterCount}
          activeChips={activeChips}
          clearChip={clearChip}
          resetFilters={resetFilters}
          desktopToolsId="task-manager-tasks-table-tools"
          mobileToolsId="task-manager-tasks-mobile-table-tools"
          extraTools={renderExportDropdown()}
          mobileExtraTools={renderExportDropdown()}
        />

        <DataTableRecordList
          rows={normalizedTasks}
          dataColumns={dataColumns}
          defaultVisibleColumns={defaultVisibleColumns}
          requiredColumns={requiredColumns}
          storageKey="task-manager.tasks.visible-columns.v7"
          scrollStorageKey="task-manager.tasks.scroll"
          apiKey="task-manager-tasks-visible-columns-v7"
          idPrefix="task-manager-task"
          emptyMessage="No tasks data"
          exportFilename={`task-manager-tasks-${new Date().toISOString().slice(0, 10)}.csv`}
          showExport={false}
          showDesktopSummary={false}
          desktopUtilityPlacement="portal"
          desktopUtilityPortalId="task-manager-tasks-table-tools"
          mobileUtilityPlacement="portal"
          mobileUtilityPortalId="task-manager-tasks-mobile-table-tools"
          showMobileUtilityRow={false}
          renderQuickFilters={() => (
            <PeriodRangeSelector
              value={selectedPeriodRange}
              onChange={handlePeriodRangeChange}
              className="d-none d-lg-block"
            />
          )}
          getRowKey={(task, index) => task.id || index}
          renderCell={renderCell}
          getActions={getActions}
          renderActions={renderActions}
          onRowOpen={onView}
          getMobileTitle={(task) => task.title}
          getMobileSubtitle={(task) => task.statusText}
          getMobileMeta={(task) => `Due ${task.dueDate || '-'}`}
          mobileFieldKeys={{
            title: 'title',
            subtitle: 'statusText',
            meta: 'dueDate',
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
          resetDeps={[searchTerm, selectedPeriodRange]}
        />
      </CCardBody>
      <CModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        alignment="center"
      >
        <CModalHeader closeButton>
          <CModalTitle>Export My Tasks</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CCol xs={12} className="mb-3">
            <CFormLabel htmlFor="task-manager-export-period">Period</CFormLabel>
            <CFormSelect
              id="task-manager-export-period"
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
                <CFormLabel htmlFor="task-manager-export-start">Start Date</CFormLabel>
                <CFormInput
                  id="task-manager-export-start"
                  type="date"
                  value={exportStartDate}
                  onChange={(event) => setExportStartDate(event.target.value)}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="task-manager-export-end">End Date</CFormLabel>
                <CFormInput
                  id="task-manager-export-end"
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
    </CCard>
  )
}

export default TaskTable
