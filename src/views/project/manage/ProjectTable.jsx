// src/views/project/ProjectTable.jsx

import React, { useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCloseButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { useAuth } from '../../../auth/AuthProvider'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableStatsToggle,
  DataTableTextCell,
  getAdvancedFilterCount,
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
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { projectRecordTabs } from '../../../components/navigation/moduleNavConfigs'
import {
  applyProjectFilters,
  getOwnerOptions,
  getProjectTypeOptions,
  getInquirySourceOptions,
  isProjectOwnedByUser,
} from './projectFilters'
import { getCurrentProjectValue } from './projectApi'
import { formatProjectMoney } from './projectDetailFormatters'
import { PROJECT_CLOSE_TYPES, getProjectStatusTone, isProjectActive } from './projectStatus'
import { buildProjectActions } from './projectActions'
import {
  actionColumnWidth,
  columnStorageKey,
  dataColumns,
  defaultVisibleColumns,
  requiredColumns,
} from './projectTableColumns'
import { emptyProjectTableValue, normalizeProjectTableRows } from './projectTableRows'
import { buildProjectTableStats } from './projectTableStats'

const emptyValue = emptyProjectTableValue
const maxUpdatePreviewChars = 34
const closeReminderDismissPrefix = 'kijo:project-close-reminder:dismissed'

const getDateOnlyText = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (text.includes('T')) return text.split('T')[0]
  if (text.includes(' ')) return text.split(' ')[0]
  return text
}

const parseDateOnly = (value) => {
  const dateOnly = getDateOnlyText(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly)
  if (!match) return null

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

const formatAgeLabel = (value, label) => {
  const date = parseDateOnly(value)
  if (!date) return ''

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.floor((todayStart.getTime() - date.getTime()) / 86400000)
  if (diffDays < 0) return ''
  if (diffDays === 0) return `${label} today`
  return `${label} ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
}

const getCloseReminderDismissKey = (project = {}, user = {}) => {
  const staffId = user?.staff_id ?? user?.staffId ?? user?.id ?? 'anonymous'
  const projectId = project?.id ?? project?.project_id
  const signature =
    project?.close_reminder_signature ||
    [getCurrentProjectValue(project, ''), project?.fully_invoiced_at || ''].join(':')

  if (!projectId || !signature) return ''
  return `${closeReminderDismissPrefix}:${staffId}:${projectId}:${signature}`
}

const readDismissedCloseReminder = (key, dismissedKeys = {}) => {
  if (!key) return false
  if (dismissedKeys[key]) return true
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

const ProjectCloseReminderAlerts = ({ projects, user, onDismiss, onClose }) => {
  if (!projects.length) return null

  return (
    <div className="d-flex flex-column gap-2 mb-3">
      {projects.map((project) => {
        const projectName = project?.project_name || 'Unnamed Project'
        const clientName = project?.client_name || 'Unassigned client'
        const details = [
          projectName,
          clientName,
          formatProjectMoney(getCurrentProjectValue(project, null)),
          formatAgeLabel(project?.award_date, 'Awarded'),
          formatAgeLabel(project?.fully_invoiced_at, 'Fully invoiced'),
        ].filter(Boolean)
        const dismissKey = getCloseReminderDismissKey(project, user)

        return (
          <CAlert color="warning" className="mb-0 py-2" key={dismissKey || project?.id}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="fw-semibold flex-shrink-0">
                Already invoiced? Close the project.
              </span>
              <span className="small text-body-secondary text-break flex-grow-1">
                {details.join(' | ')}
              </span>
              <CButton
                color="primary"
                size="sm"
                className="flex-shrink-0"
                onClick={() => onClose?.(project, PROJECT_CLOSE_TYPES.COMPLETED)}
              >
                Close Project
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => onDismiss(project)}
              >
                Dismiss for now
              </CButton>
              <CCloseButton
                className="flex-shrink-0"
                aria-label={`Dismiss close reminder for ${projectName}`}
                onClick={() => onDismiss(project)}
              />
            </div>
          </CAlert>
        )
      })}
    </div>
  )
}

const truncateUpdateText = (text = '', maxChars = maxUpdatePreviewChars) => {
  const raw = String(text || '').trim()
  if (raw.length <= maxChars) return raw
  return `${raw.slice(0, maxChars).trim()}...`
}

const ProjectUpdateCell = ({ text }) => {
  const [showModal, setShowModal] = useState(false)
  const fullText = String(text || '').trim()

  if (!fullText || fullText === emptyValue) return emptyValue

  const shouldShowSeeMore = fullText.length > maxUpdatePreviewChars

  return (
    <>
      <div className="d-flex align-items-center gap-1">
        <small
          className="text-body"
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
        >
          {truncateUpdateText(fullText)}
        </small>
        {shouldShowSeeMore && (
          <CButton
            color="light"
            size="sm"
            className="records-remarks-more records-remarks-more--compact flex-shrink-0"
            onClick={() => setShowModal(true)}
          >
            More
          </CButton>
        )}
      </div>

      <CModal visible={showModal} onClose={() => setShowModal(false)} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Latest Update</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <span>{fullText}</span>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setShowModal(false)}
          >
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default function ProjectTable({
  projects = [],
  loading,
  deletingProjectId,
  periodRange,
  onPeriodRangeChange,
  onManage,
  onClose,
  onReactivate,
  onGenerateJD14,
  onGenerateInvoice,
  onGenerateDO,
  onGenerateVendorLoa,
  onGenerateSupplierPo,
  onDelete,
  onCreateProject,
}) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all-tab')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectTypeFilter, setProjectTypeFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [inquirySourceFilter, setInquirySourceFilter] = useState('all')
  const [localPeriodRange, setLocalPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const selectedPeriodRange = periodRange || localPeriodRange
  const handlePeriodRangeChange = onPeriodRangeChange || setLocalPeriodRange
  const [hasUpdateFilter, setHasUpdateFilter] = useState('all')
  const [hasVendorFilter, setHasVendorFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dismissedCloseReminderKeys, setDismissedCloseReminderKeys] = useState({})
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('project.manage')

  const statusOptions = useMemo(() => {
    const statuses = new Set()
    projects.forEach((project) => {
      const status = String(project?.status || '').trim()
      if (status) statuses.add(status)
    })
    return Array.from(statuses).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const projectTypeOptions = useMemo(() => getProjectTypeOptions(projects), [projects])
  const ownerOptions = useMemo(() => getOwnerOptions(projects), [projects])
  const inquirySourceOptions = useMemo(() => getInquirySourceOptions(projects), [projects])

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setProjectTypeFilter('all')
    setOwnerFilter('all')
    setInquirySourceFilter('all')
    handlePeriodRangeChange(getPeriodRangePreset('ytd'))
    setHasUpdateFilter('all')
    setHasVendorFilter('all')
    setMinAmount('')
    setMaxAmount('')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') handlePeriodRangeChange(getPeriodRangePreset('ytd'))
    if (key === 'type') setProjectTypeFilter('all')
    if (key === 'owner') setOwnerFilter('all')
    if (key === 'status') setStatusFilter('all')
    if (key === 'inquirySource') setInquirySourceFilter('all')
    if (key === 'updates') setHasUpdateFilter('all')
    if (key === 'vendors') setHasVendorFilter('all')
    if (key === 'minAmount') setMinAmount('')
    if (key === 'maxAmount') setMaxAmount('')
  }

  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    selectedPeriodRange && !isDefaultPeriodRange(selectedPeriodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(selectedPeriodRange)}` }
      : null,
    projectTypeFilter !== 'all'
      ? { key: 'type', label: `Project Type: ${projectTypeFilter}` }
      : null,
    ownerFilter !== 'all' ? { key: 'owner', label: `Project Leader: ${ownerFilter}` } : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
    inquirySourceFilter !== 'all'
      ? { key: 'inquirySource', label: `Inquiry Source: ${inquirySourceFilter}` }
      : null,
    hasUpdateFilter !== 'all'
      ? { key: 'updates', label: `Has Update: ${hasUpdateFilter === 'yes' ? 'Yes' : 'No'}` }
      : null,
    hasVendorFilter !== 'all'
      ? { key: 'vendors', label: `Has Vendors: ${hasVendorFilter === 'yes' ? 'Yes' : 'No'}` }
      : null,
    minAmount ? { key: 'minAmount', label: `Min RM: ${minAmount}` } : null,
    maxAmount ? { key: 'maxAmount', label: `Max RM: ${maxAmount}` } : null,
  ].filter(Boolean)

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const filtered = useMemo(() => {
    const base = applyProjectFilters({
      projects,
      filters: {
        searchTerm,
        statusFilter,
        projectTypeFilter,
        ownerFilter,
        yearFilter: 'all',
        hasUpdateFilter,
        hasVendorFilter,
        minAmount,
        maxAmount,
        inquirySourceFilter,
      },
    })

    const scoped = base.filter((project) =>
      isDateInPeriodRange(project?.award_date, selectedPeriodRange),
    )

    if (activeTab === 'my-tab') {
      return scoped.filter((project) => isProjectOwnedByUser(project, user))
    }

    return scoped
  }, [
    projects,
    searchTerm,
    statusFilter,
    projectTypeFilter,
    ownerFilter,
    inquirySourceFilter,
    selectedPeriodRange,
    hasUpdateFilter,
    hasVendorFilter,
    minAmount,
    maxAmount,
    activeTab,
    user,
  ])

  const normalizedProjects = useMemo(() => normalizeProjectTableRows(filtered), [filtered])

  const statsItems = useMemo(() => buildProjectTableStats(normalizedProjects), [normalizedProjects])
  const showCloseReminders = activeTab === 'my-tab'

  const closeReminderScope = useMemo(() => {
    if (!showCloseReminders) return []

    const scoped = projects.filter((project) =>
      isDateInPeriodRange(project?.award_date, selectedPeriodRange),
    )

    return scoped.filter((project) => isProjectOwnedByUser(project, user))
  }, [projects, selectedPeriodRange, showCloseReminders, user])

  const closeReminderProjects = useMemo(
    () =>
      closeReminderScope.filter((project) => {
        if (!project?.close_reminder_ready) return false
        if (!isProjectActive(project)) return false
        if (!project?.fully_invoiced_at) return false

        const dismissKey = getCloseReminderDismissKey(project, user)
        return !readDismissedCloseReminder(dismissKey, dismissedCloseReminderKeys)
      }),
    [closeReminderScope, dismissedCloseReminderKeys, user],
  )

  const dismissCloseReminder = (project) => {
    const dismissKey = getCloseReminderDismissKey(project, user)
    if (!dismissKey) return

    try {
      window.localStorage.setItem(dismissKey, '1')
    } catch {
      // Ignore storage failures; local state still hides it for this render session.
    }
    setDismissedCloseReminderKeys((current) => ({ ...current, [dismissKey]: true }))
  }

  const getActions = (project) => {
    const generateHandlers = {
      jd14: onGenerateJD14,
      invoice: onGenerateInvoice,
      'delivery-order': onGenerateDO,
      'vendor-loa': onGenerateVendorLoa,
      'supplier-po': onGenerateSupplierPo,
    }

    return buildProjectActions({
      project,
      deleting: deletingProjectId != null,
      tableMode: true,
      onGenerateCommercialDocument: (documentType, selectedProject) => {
        generateHandlers[documentType]?.(selectedProject)
      },
      onCompleteProject: (selectedProject) =>
        onClose(selectedProject, PROJECT_CLOSE_TYPES.COMPLETED),
      onTerminateProject: (selectedProject) =>
        onClose(selectedProject, PROJECT_CLOSE_TYPES.TERMINATED),
      onReactivateProject: onReactivate,
      onDeleteProject: onDelete,
    })
  }

  const renderTextCell = (value) => (
    <DataTableTextCell value={value || emptyValue} maxWidth="180px" title="Project Detail" />
  )

  const renderCell = (project, column) => {
    if (column.key === 'client') return renderTextCell(project.client)
    if (column.key === 'project') return renderTextCell(project.project)
    if (column.key === 'projectType') return renderTextCell(project.projectType)
    if (column.key === 'value') return project.valueDisplay
    if (column.key === 'update') {
      return <ProjectUpdateCell text={project.updateFullText} />
    }
    if (column.key === 'owner') {
      return project.owner === emptyValue ? (
        <small className="text-muted">
          <i>Not assigned</i>
        </small>
      ) : (
        project.owner
      )
    }
    if (
      column.key === 'vendor' ||
      column.key === 'vendorContactName' ||
      column.key === 'vendorMobile' ||
      column.key === 'vendorEmail'
    ) {
      return project[column.key] === emptyValue ? (
        <small className="text-muted">
          <i>Not assigned</i>
        </small>
      ) : (
        renderTextCell(project[column.key])
      )
    }
    if (column.key === 'award') return project.awardDisplay
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getProjectStatusTone(project.status)}>
          {project.status}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'closed') return project.closedDisplay
    return project[column.key] || emptyValue
  }

  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip
          tabs={projectRecordTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel="Project record groups"
        />
        <CCard className="mb-4">
          <DataTableCardHeader
            title="Project Overview"
            scopeLabel={selectedPeriodRange ? getPeriodRangeScopeLabel(selectedPeriodRange) : ''}
          >
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
            <CButton size="sm" color="primary" onClick={onCreateProject}>
              <CIcon icon={cilPlus} className="me-1" />
              Create Project
            </CButton>
          </DataTableCardHeader>
          <CCardBody>
            {statsVisible && <StatsStrip loading={loading} items={statsItems} />}
            {showCloseReminders && (
              <ProjectCloseReminderAlerts
                projects={closeReminderProjects}
                user={user}
                onDismiss={dismissCloseReminder}
                onClose={onClose}
              />
            )}
            <DataTableRecordControls
              visible={controlsVisible}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search client, project, vendor, update"
              searchAriaLabel="Search projects"
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              activeFilterCount={activeFilterCount}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={resetFilters}
              loading={loading}
              desktopToolsId="project-manage-table-tools"
              mobileToolsId="project-manage-mobile-table-tools"
            >
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectTypeFilter">Project Type</CFormLabel>
                <CFormSelect
                  id="projectTypeFilter"
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {projectTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectOwnerFilter">Project Leader</CFormLabel>
                <CFormSelect
                  id="projectOwnerFilter"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {ownerOptions.map((ownerCode) => (
                    <option key={ownerCode} value={ownerCode}>
                      {ownerCode}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectStatusFilter">Status</CFormLabel>
                <CFormSelect
                  id="projectStatusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectInquirySourceFilter">Inquiry Source</CFormLabel>
                <CFormSelect
                  id="projectInquirySourceFilter"
                  value={inquirySourceFilter}
                  onChange={(e) => setInquirySourceFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {inquirySourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectHasUpdateFilter">Has Progress Update</CFormLabel>
                <CFormSelect
                  id="projectHasUpdateFilter"
                  value={hasUpdateFilter}
                  onChange={(e) => setHasUpdateFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectHasVendorFilter">Has Vendors</CFormLabel>
                <CFormSelect
                  id="projectHasVendorFilter"
                  value={hasVendorFilter}
                  onChange={(e) => setHasVendorFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectMinAmountFilter">Min Value (RM)</CFormLabel>
                <CFormInput
                  id="projectMinAmountFilter"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={4} lg={2}>
                <CFormLabel htmlFor="projectMaxAmountFilter">Max Value (RM)</CFormLabel>
                <CFormInput
                  id="projectMaxAmountFilter"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </CCol>
            </DataTableRecordControls>

            <DataTableRecordList
              rows={normalizedProjects}
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey={columnStorageKey}
              scrollStorageKey="project.manage.overview.scroll"
              idPrefix="project-manage-record"
              emptyMessage="No project records match current filters."
              exportFilename={`project-overview-${new Date().toISOString().slice(0, 10)}.csv`}
              loading={loading}
              loadingMessage="Loading projects..."
              showDesktopSummary={false}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="project-manage-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="project-manage-mobile-table-tools"
              showMobileUtilityRow={false}
              renderQuickFilters={() => (
                <PeriodRangeSelector
                  value={selectedPeriodRange}
                  onChange={handlePeriodRangeChange}
                  className="d-none d-lg-block"
                />
              )}
              actionColumnWidth={actionColumnWidth}
              getRowKey={(project, index) => project.id || index}
              renderCell={renderCell}
              getActions={getActions}
              onRowOpen={onManage}
              getMobileTitle={(project) => project.project}
              getMobileSubtitle={(project) => project.client}
              getMobileMeta={(project) =>
                `${project.projectType} | ${project.awardDisplay} | RM ${project.valueDisplay}`
              }
              getMobileStatus={(project) => project.status}
              getMobileStatusTone={(project) => getProjectStatusTone(project.status)}
              mobileFieldKeys={{
                title: 'project',
                subtitle: 'client',
                meta: ['projectType', 'award', 'value'],
                status: 'status',
              }}
              mobileRecord={{
                title: (project) => project.project,
                subtitle: (project) => project.client,
                meta: (project) =>
                  `${project.projectType} | ${project.awardDisplay} | RM ${project.valueDisplay}`,
                badges: (project) => [
                  {
                    key: 'status',
                    label: project.status,
                    tone: getProjectStatusTone(project.status),
                  },
                ],
                kv: (project) => [
                  { key: 'owner', label: 'Leader', value: project.owner },
                  { key: 'update', label: 'Update', value: project.updateFullText },
                ],
              }}
              initialSortField="award"
              initialSortDir="desc"
              initialSortDirByField={{
                value: 'desc',
                update: 'desc',
                award: 'desc',
                closed: 'desc',
              }}
              getSortValue={(project, field) => project[field]}
              resetDeps={[
                activeTab,
                searchTerm,
                statusFilter,
                projectTypeFilter,
                ownerFilter,
                inquirySourceFilter,
                selectedPeriodRange,
                hasUpdateFilter,
                hasVendorFilter,
                minAmount,
                maxAmount,
              ]}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
