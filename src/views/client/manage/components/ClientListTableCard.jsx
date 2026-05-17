import React, { useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDateInPeriodRange,
} from '../../../../components/filters'
import { StatsStrip } from '../../../../components/stats'
import { formatCount, getTopGroupByCount } from '../../../../utils/stats/formatStats'

const emptyValue = '-'
const columnStorageKey = 'client.manage.list.visible-columns.v4'
const actionColumnWidth = '56px'

const defaultVisibleColumns = {
  company: true,
  status: true,
  ssmNumber: false,
  taxIdTin: false,
  address: false,
  zip: false,
  city: true,
  state: false,
  branchCount: true,
  picName: true,
  picPosition: false,
  picEmail: false,
  picMobile: true,
}

const requiredColumns = new Set(['company'])

const dataColumns = [
  {
    key: 'company',
    label: 'Company',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
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
  { key: 'ssmNumber', label: 'SSM', width: '160px', sortable: true, sortType: 'string' },
  { key: 'taxIdTin', label: 'TIN', width: '170px', sortable: true, sortType: 'string' },
  {
    key: 'address',
    label: 'Address',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  { key: 'zip', label: 'Zip', width: '100px', sortable: true, sortType: 'string' },
  {
    key: 'city',
    label: 'City',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'state',
    label: 'State',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'branchCount',
    label: 'Branches',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'picName',
    label: 'PIC Name',
    width: '180px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '180px',
    previewCharThreshold: 30,
  },
  {
    key: 'picPosition',
    label: 'PIC Position',
    width: '170px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '170px',
    previewCharThreshold: 28,
  },
  {
    key: 'picEmail',
    label: 'PIC Email',
    width: '230px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '230px',
    previewCharThreshold: 34,
  },
  {
    key: 'picMobile',
    label: 'PIC Mobile',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
]

const getStatusTone = (status) => {
  if (status === 'New') return 'success'
  if (status === 'Old') return 'info'
  return 'danger'
}

const normalizeStatus = (status) => {
  const value = String(status || '').trim()
  if (!value) return 'No Status'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const getPreviewPics = (client) =>
  Array.isArray(client.pic_preview) ? client.pic_preview.slice(0, 2) : []

const joinPicValues = (pics, key) =>
  pics
    .map((pic) => String(pic?.[key] || '').trim())
    .filter(Boolean)
    .join(', ') || emptyValue

const getClientScopeDate = (client) =>
  client?.created_at || client?.createdAt || client?.date_created || client?.updated_at || ''

const defaultPeriodRange = getPeriodRangePreset('all')

const renderTruncated = (value, column, fallbackTitle = 'Details', fallbackMaxWidth = '180px') => (
  <DataTableTextCell
    value={value || emptyValue}
    maxWidth={column?.cellMaxWidth || column?.width || fallbackMaxWidth}
    title={column?.label || fallbackTitle}
    mode={column?.textMode || 'expandable'}
    previewCharThreshold={column?.previewCharThreshold}
    truncateCharThreshold={column?.truncateCharThreshold}
  />
)

const renderPicValueCell = (client, key, column) => {
  if (!client.previewPics.length) return <small className="text-muted">{emptyValue}</small>

  return (
    <div className="d-flex flex-column gap-1">
      {client.previewPics.map((pic, index) => {
        const value = pic?.[key] || emptyValue
        const rowKey = `${client.company_id}-${key}-${pic?.pic_id || index}`
        return (
          <DataTableTextCell
            key={rowKey}
            value={value}
            maxWidth={column?.cellMaxWidth || column?.width || '180px'}
            title={column?.label || 'PIC'}
            mode={column?.textMode || 'expandable'}
            previewCharThreshold={column?.previewCharThreshold}
            truncateCharThreshold={column?.truncateCharThreshold}
          />
        )
      })}
    </div>
  )
}

const ClientListTableCard = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  branchFilter,
  onBranchFilterChange,
  filteredClients = [],
  loading = false,
  onViewCompany,
  onEditCompany,
  onDeleteCompany,
  onSeeBranches,
  onSeePics,
  onCreateClient,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [periodRange, setPeriodRange] = useState(() => defaultPeriodRange)

  const periodFilteredClients = useMemo(
    () =>
      filteredClients.filter((client) =>
        isDateInPeriodRange(getClientScopeDate(client), periodRange),
      ),
    [filteredClients, periodRange],
  )

  const normalizedClients = useMemo(
    () =>
      periodFilteredClients.map((client) => {
        const previewPics = getPreviewPics(client)
        const status = normalizeStatus(client.client_status)
        const branchCount = Number(client.branch_count || 0)
        const picCount = Number(client.pic_count || previewPics.length || 0)
        const cityState = [client.city, client.state].filter(Boolean).join(', ') || emptyValue

        return {
          ...client,
          company: client.company_name || emptyValue,
          status,
          ssmNumber: client.ssm_number || emptyValue,
          taxIdTin: client.tax_id_no_tin || emptyValue,
          address: client.address || emptyValue,
          zip: client.zip || emptyValue,
          city: client.city || emptyValue,
          state: client.state || emptyValue,
          cityState,
          branchCount,
          branchCountDisplay: String(branchCount),
          picCount,
          picName: joinPicValues(previewPics, 'full_name'),
          picPosition: joinPicValues(previewPics, 'position'),
          picEmail: joinPicValues(previewPics, 'email'),
          picMobile: joinPicValues(previewPics, 'mobile_number'),
          previewPics,
          hasMorePics: picCount > 2,
        }
      }),
    [periodFilteredClients],
  )

  const statsItems = useMemo(() => {
    const newRows = normalizedClients.filter((client) => client.status === 'New')
    const oldRows = normalizedClients.filter((client) => client.status === 'Old')
    const topState = getTopGroupByCount(normalizedClients, (client) => client.state)
    const topCity = getTopGroupByCount(normalizedClients, (client) => client.city)

    return [
      {
        key: 'companies',
        label: 'Companies',
        value: formatCount(normalizedClients.length),
        tone: 'primary',
        size: 'sm',
      },
      {
        key: 'new-old',
        label: 'New / Old',
        value: `${formatCount(newRows.length)} / ${formatCount(oldRows.length)}`,
        tone: 'info',
        size: 'sm',
      },
      {
        key: 'top-state',
        label: 'Top State',
        value: topState.value,
        sublabel: `${formatCount(topState.count)} companies`,
        tone: 'success',
        size: 'lg',
      },
      {
        key: 'top-city',
        label: 'Top City',
        value: topCity.value,
        sublabel: `${formatCount(topCity.count)} companies`,
        tone: 'secondary',
        size: 'lg',
      },
    ]
  }, [normalizedClients])

  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    statusFilter ? { key: 'status', label: `Status: ${statusFilterLabel(statusFilter)}` } : null,
    branchFilter ? { key: 'branch', label: `Branches: ${branchFilterLabel(branchFilter)}` } : null,
    periodRange && periodRange.preset !== defaultPeriodRange.preset
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
  ].filter(Boolean)
  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const resetFilters = () => {
    onSearchChange('')
    onStatusFilterChange('')
    onBranchFilterChange('')
    setPeriodRange(defaultPeriodRange)
  }

  const clearChip = (key) => {
    if (key === 'search') onSearchChange('')
    if (key === 'status') onStatusFilterChange('')
    if (key === 'branch') onBranchFilterChange('')
    if (key === 'period') setPeriodRange(defaultPeriodRange)
  }

  const getActions = (client) => [
    {
      key: 'view',
      label: 'View',
      onClick: () => onViewCompany(client),
    },
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => onEditCompany(client),
    },
    {
      key: 'branches',
      label: 'See Branches',
      disabled: client.branchCount <= 0,
      tooltip: client.branchCount <= 0 ? 'No branches for this client.' : undefined,
      onClick: () => onSeeBranches(client),
    },
    {
      key: 'pics',
      label: 'See PICs',
      disabled: client.picCount <= 0,
      tooltip: client.picCount <= 0 ? 'No PICs for this client.' : undefined,
      onClick: () => onSeePics(client),
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: () => onDeleteCompany(client),
    },
  ]

  const renderCell = (client, column) => {
    if (column.key === 'company') return renderTruncated(client.company, column)
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(client.status)}>
          {client.status}
        </DataTableStatusBadge>
      )
    }
    if (['ssmNumber', 'taxIdTin', 'address', 'city', 'state', 'zip'].includes(column.key)) {
      return renderTruncated(client[column.key], column)
    }
    if (column.key === 'branchCount') {
      if (client.branchCount <= 0) return <span className="text-muted">0</span>
      return (
        <button
          type="button"
          className="btn btn-sm p-0 border-0 bg-transparent text-info text-decoration-none"
          data-no-row-open="true"
          onClick={(event) => {
            event.stopPropagation()
            onSeeBranches(client)
          }}
        >
          {client.branchCount}
        </button>
      )
    }
    if (column.key === 'picName') {
      return (
        <>
          {renderPicValueCell(client, 'full_name', column)}
          {client.hasMorePics && (
            <button
              type="button"
              className="btn btn-sm p-0 mt-1 border-0 bg-transparent text-info text-decoration-none"
              data-no-row-open="true"
              onClick={(event) => {
                event.stopPropagation()
                onSeePics(client)
              }}
            >
              +{client.picCount - 2} more
            </button>
          )}
        </>
      )
    }
    if (column.key === 'picPosition') return renderPicValueCell(client, 'position', column)
    if (column.key === 'picEmail') return renderPicValueCell(client, 'email', column)
    if (column.key === 'picMobile') return renderPicValueCell(client, 'mobile_number', column)
    return client[column.key] || emptyValue
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <strong>Clients List</strong>
              <CButton size="sm" color="primary" onClick={onCreateClient}>
                <CIcon icon={cilPlus} className="me-1" />
                Create Client
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <StatsStrip
              items={statsItems}
              loading={loading}
              layout="balanced"
              scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
            />

            <DataTableRecordControls
              searchValue={searchTerm}
              onSearchChange={onSearchChange}
              searchPlaceholder="Search company, PIC, email, mobile, address"
              searchAriaLabel="Search clients"
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              activeFilterCount={activeFilterCount}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={resetFilters}
              loading={loading}
              desktopToolsId="client-manage-table-tools"
              mobileToolsId="client-manage-mobile-table-tools"
            >
              <CCol xs={12} md={4} lg={3}>
                <CFormLabel htmlFor="clientStatusFilter">Status</CFormLabel>
                <CFormSelect
                  id="clientStatusFilter"
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="old">Old</option>
                  <option value="new">New</option>
                  <option value="no_status">No Status</option>
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={4} lg={3}>
                <CFormLabel htmlFor="clientBranchFilter">Branches</CFormLabel>
                <CFormSelect
                  id="clientBranchFilter"
                  value={branchFilter}
                  onChange={(e) => onBranchFilterChange(e.target.value)}
                >
                  <option value="">All Branches</option>
                  <option value="with_branches">With Branches</option>
                  <option value="without_branches">Without Branches</option>
                </CFormSelect>
              </CCol>
            </DataTableRecordControls>

            <DataTableRecordList
              rows={normalizedClients}
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey={columnStorageKey}
              idPrefix="client-manage-record"
              emptyMessage="No clients found."
              exportFilename={`clients-${new Date().toISOString().slice(0, 10)}.csv`}
              loading={loading}
              loadingMessage="Loading clients..."
              showDesktopSummary={false}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="client-manage-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="client-manage-mobile-table-tools"
              showMobileUtilityRow={false}
              actionColumnWidth={actionColumnWidth}
              getRowKey={(client, index) => client.company_id || index}
              renderCell={renderCell}
              onRowOpen={onViewCompany}
              getActions={getActions}
              getMobileTitle={(client) => client.company}
              getMobileSubtitle={(client) => client.picName}
              getMobileMeta={(client) =>
                [client.picEmail, client.picMobile, client.cityState]
                  .filter((value) => value && value !== emptyValue)
                  .join(' | ') || emptyValue
              }
              getMobileStatus={(client) => client.status}
              getMobileStatusTone={(client) => getStatusTone(client.status)}
              mobileFieldKeys={{
                title: 'company',
                subtitle: 'picName',
                meta: ['picEmail', 'picMobile', 'city'],
                status: 'status',
              }}
              initialSortField="company"
              getSortValue={(client, field) => client[field]}
              renderQuickFilters={() => (
                <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
              )}
              resetDeps={[
                periodFilteredClients,
                searchTerm,
                statusFilter,
                branchFilter,
                periodRange,
              ]}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

const statusFilterLabel = (value) => {
  if (value === 'no_status') return 'No Status'
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'All Status'
}

const branchFilterLabel = (value) => {
  if (value === 'with_branches') return 'With Branches'
  if (value === 'without_branches') return 'Without Branches'
  return 'All Branches'
}

export default ClientListTableCard
