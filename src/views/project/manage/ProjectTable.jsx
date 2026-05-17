// src/views/project/ProjectTable.jsx

import React, { useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
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
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { projectRecordTabs } from '../../../components/navigation/moduleNavConfigs'
import { formatCount, formatMoney, getTopGroupBySum, sumBy } from '../../../utils/stats/formatStats'
import { getBadgeColor } from './actionHandlers'
import {
  applyProjectFilters,
  getDateOnly,
  getLatestProgressUpdate,
  getOwnerOptions,
  getProjectLeaderCode,
  getProjectTypeOptions,
  isProjectOwnedByUser,
} from './projectFilters'

const emptyValue = '-'
const columnStorageKey = 'project.manage.visible-columns.v5'
const actionColumnWidth = '56px'
const maxUpdatePreviewChars = 34

const defaultVisibleColumns = {
  client: true,
  projectType: true,
  project: true,
  value: true,
  update: true,
  owner: true,
  vendor: false,
  vendorContactName: false,
  vendorMobile: false,
  vendorEmail: false,
  award: true,
  status: true,
}

const requiredColumns = new Set(['client', 'project', 'status'])

const dataColumns = [
  { key: 'client', label: 'Client', width: '220px', sortable: true, sortType: 'string' },
  { key: 'projectType', label: 'Project Type', width: '160px', sortable: true, sortType: 'string' },
  {
    key: 'project',
    label: 'Project',
    width: '240px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'value',
    label: 'Value',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (project) => project.valueDisplay,
  },
  {
    key: 'update',
    label: 'Latest Update',
    width: '220px',
    sortable: true,
    sortType: 'date',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (project) => project.updateFullText,
  },
  {
    key: 'owner',
    label: 'Project Leader',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  { key: 'vendor', label: 'Vendor', width: '220px', sortable: true, sortType: 'string' },
  {
    key: 'vendorContactName',
    label: 'Vendor Contact',
    width: '170px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'vendorMobile',
    label: 'Vendor Mobile',
    width: '150px',
    sortable: true,
    sortType: 'string',
  },
  { key: 'vendorEmail', label: 'Vendor Email', width: '220px', sortable: true, sortType: 'string' },
  {
    key: 'award',
    label: 'Award',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (project) => project.awardDisplay,
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'closed',
    label: 'Closed',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (project) => project.closedDisplay,
  },
]

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
          <CButton color="secondary" onClick={() => setShowModal(false)}>
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
  onManage,
  onClose,
  onGenerateJD14,
  onGenerateInvoice,
  onGenerateDO,
  onDelete,
  onCreateProject,
}) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all-tab')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectTypeFilter, setProjectTypeFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [hasUpdateFilter, setHasUpdateFilter] = useState('all')
  const [hasVendorFilter, setHasVendorFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

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

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setProjectTypeFilter('all')
    setOwnerFilter('all')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setHasUpdateFilter('all')
    setHasVendorFilter('all')
    setMinAmount('')
    setMaxAmount('')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'type') setProjectTypeFilter('all')
    if (key === 'owner') setOwnerFilter('all')
    if (key === 'status') setStatusFilter('all')
    if (key === 'updates') setHasUpdateFilter('all')
    if (key === 'vendors') setHasVendorFilter('all')
    if (key === 'minAmount') setMinAmount('')
    if (key === 'maxAmount') setMaxAmount('')
  }

  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
    projectTypeFilter !== 'all'
      ? { key: 'type', label: `Project Type: ${projectTypeFilter}` }
      : null,
    ownerFilter !== 'all' ? { key: 'owner', label: `Project Leader: ${ownerFilter}` } : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
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
      },
    })

    const scoped = base.filter((project) => isDateInPeriodRange(project?.award_date, periodRange))

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
    periodRange,
    hasUpdateFilter,
    hasVendorFilter,
    minAmount,
    maxAmount,
    activeTab,
    user,
  ])

  const normalizedProjects = useMemo(
    () =>
      filtered.map((project) => {
        const latest = getLatestProgressUpdate(project)
        const ownerCode = getProjectLeaderCode(project)
        const valueNumber =
          project?.quote_value != null && String(project.quote_value).trim() !== ''
            ? Number(project.quote_value)
            : null
        const valueDisplay =
          valueNumber !== null && Number.isFinite(valueNumber)
            ? valueNumber.toLocaleString('en-MY', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : emptyValue
        const vendors = Array.isArray(project.vendors) ? project.vendors : []
        const vendorNames =
          vendors
            .map((vendor) => String(vendor?.vendor_name || '').trim())
            .filter(Boolean)
            .join(', ') || emptyValue
        const vendorContactNames =
          vendors
            .map((vendor) => String(vendor?.contact_person_name || '').trim())
            .filter(Boolean)
            .join(', ') || emptyValue
        const vendorMobiles =
          vendors
            .map((vendor) => String(vendor?.mobile_number || '').trim())
            .filter(Boolean)
            .join(', ') || emptyValue
        const vendorEmails =
          vendors
            .map((vendor) => String(vendor?.email || '').trim())
            .filter(Boolean)
            .join(', ') || emptyValue
        const updateDisplay = getDateOnly(latest?.progress_date || latest?.updated_on) || emptyValue
        const updateText = String(latest?.progress_text || '').trim()
        const updateFullText =
          [updateDisplay !== emptyValue ? updateDisplay : '', updateText]
            .filter(Boolean)
            .join(' ') || emptyValue

        return {
          ...project,
          client: project.client_name || emptyValue,
          project: project.project_name || emptyValue,
          projectType: project.project_type || emptyValue,
          value: valueNumber,
          valueDisplay,
          update: latest?.progress_date || latest?.updated_on || '',
          updateDisplay,
          updateText: updateText || emptyValue,
          updateFullText,
          owner: ownerCode || emptyValue,
          vendor: vendorNames,
          vendorContactName: vendorContactNames,
          vendorMobile: vendorMobiles,
          vendorEmail: vendorEmails,
          award: project.award_date || '',
          awardDisplay: getDateOnly(project.award_date) || emptyValue,
          status: project.status || emptyValue,
          closed: project.closing_details?.close_date || '',
          closedDisplay: getDateOnly(project.closing_details?.close_date) || emptyValue,
        }
      }),
    [filtered],
  )

  const statsItems = useMemo(() => {
    const nowTime = Date.now()
    const activeRows = normalizedProjects.filter((project) => {
      const status = String(project.status || '').toLowerCase()
      return !status.includes('closed') && !status.includes('cancel') && !project.closed
    })
    const needsUpdateRows = normalizedProjects.filter((project) => {
      if (!project.update) return true
      const updateDate = new Date(project.update)
      if (Number.isNaN(updateDate.getTime())) return true
      return nowTime - updateDate.getTime() > 14 * 86400000
    })
    const missingUpdateRows = normalizedProjects.filter((project) => !project.update)
    const topLeader = getTopGroupBySum(
      normalizedProjects,
      (project) => project.owner,
      (project) => project.value,
    )

    return [
      {
        key: 'total-value',
        label: 'Total Value',
        value: formatMoney(sumBy(normalizedProjects, (project) => project.value)),
        tone: 'primary',
      },
      {
        key: 'active',
        label: 'Active',
        value: formatCount(activeRows.length),
        tone: 'info',
      },
      {
        key: 'needs-update',
        label: 'Needs Update',
        value: formatCount(needsUpdateRows.length),
        sublabel: `${formatCount(missingUpdateRows.length)} missing update`,
        tone: needsUpdateRows.length ? 'warning' : 'success',
      },
      {
        key: 'top-leader',
        label: 'Top Leader',
        value: topLeader.value,
        sublabel: `${formatMoney(topLeader.total)} across ${formatCount(topLeader.count)} projects`,
        tone: 'secondary',
      },
    ]
  }, [normalizedProjects])

  const getStatusTone = (status) => {
    const color = getBadgeColor(status)
    if (['success', 'danger', 'dark', 'info'].includes(color)) return color
    return 'info'
  }

  const getActions = (project) =>
    [
      project.project_type === 'Training'
        ? {
            key: 'jd14',
            label: 'Generate JD14',
            onClick: () => onGenerateJD14(project),
          }
        : null,
      {
        key: 'invoice',
        label: 'Generate Invoice',
        onClick: () => onGenerateInvoice(project),
      },
      {
        key: 'delivery-order',
        label: 'Generate DO',
        onClick: () => onGenerateDO(project),
      },
      {
        key: 'close',
        label: 'Close Project',
        disabled: project.status === 'Closed',
        tooltip: project.status === 'Closed' ? 'Project is already closed.' : undefined,
        onClick: () => onClose(project),
      },
      {
        key: 'delete',
        label: 'Delete Project',
        danger: true,
        dividerBefore: true,
        onClick: () => onDelete(project),
      },
    ].filter(Boolean)

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
        <DataTableStatusBadge tone={getStatusTone(project.status)}>
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
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <strong>Project Overview</strong>
            <CButton size="sm" color="primary" onClick={onCreateProject}>
              <CIcon icon={cilPlus} className="me-1" />
              Create Project
            </CButton>
          </CCardHeader>
          <CCardBody>
            <StatsStrip
              loading={loading}
              items={statsItems}
              scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
            />
            <DataTableRecordControls
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
                  value={periodRange}
                  onChange={setPeriodRange}
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
              getMobileStatusTone={(project) => getStatusTone(project.status)}
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
                    tone: getStatusTone(project.status),
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
                filtered,
                activeTab,
                searchTerm,
                statusFilter,
                projectTypeFilter,
                ownerFilter,
                periodRange,
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
