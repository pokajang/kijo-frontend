import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCol, CFormLabel, CFormSelect, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'

import dialog from '../../../../components/dialog/dialogService'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatsToggle,
  DataTableStatusBadge,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../../../components/datatable'
import { StatsStrip } from '../../../../components/stats'
import { useDataTableStatsVisibility } from '../../../../hooks/datatable'
import { dispatchClientVendorRegistrationChanged } from '../../../../hooks/useClientVendorRegistrationAttentionCount'
import { formatCount } from '../../../../utils/stats/formatStats'
import ClientModuleNavStrip from '../components/ClientModuleNavStrip'
import {
  buildVendorRegistrationDetailPath,
  buildVendorRegistrationEditPath,
  getVendorRegistrationEditActionLabel,
  normalizeVendorRegistrationRows,
} from './vendorRegistrationUtils'

const emptyValue = '-'
const actionColumnWidth = '56px'
const columnStorageKey = 'client.vendor-registration.visible-columns.v1'

const defaultVisibleColumns = {
  client: true,
  validFrom: true,
  validUntil: true,
  daysLeft: true,
  status: true,
  recipients: true,
  certificate: true,
  portalUrl: false,
  portalUsername: false,
  remarks: false,
  updatedAt: true,
}

const requiredColumns = new Set(['client'])

const dataColumns = [
  {
    key: 'client',
    label: 'Client',
    width: '240px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '240px',
    previewCharThreshold: 34,
  },
  dateColumn('validFrom', 'Valid From'),
  dateColumn('validUntil', 'Valid Until'),
  {
    key: 'daysLeft',
    label: 'Days Left',
    width: '110px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'status',
    label: 'Status',
    width: '150px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'recipients',
    label: 'Notification Recipients',
    width: '260px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '260px',
    previewCharThreshold: 38,
  },
  {
    key: 'certificate',
    label: 'Certificate',
    width: '180px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'portalUrl',
    label: 'Portal URL',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'portalUsername',
    label: 'Username or Email',
    width: '180px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '180px',
    previewCharThreshold: 28,
  },
  {
    key: 'remarks',
    label: 'Registration Remarks',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  dateColumn('updatedAt', 'Updated At', '130px'),
]

function dateColumn(key, label, width = '120px') {
  return {
    key,
    label,
    width,
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  }
}

const statusLabels = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  missing_certificate: 'Missing Certificate',
  unknown: 'Unknown',
}

const statusTones = {
  active: 'success',
  expiring_soon: 'warning',
  expired: 'danger',
  missing_certificate: 'secondary',
  unknown: 'secondary',
}

const renderText = (value, column) => (
  <DataTableTextCell
    value={value || emptyValue}
    maxWidth={column?.cellMaxWidth || column?.width || '180px'}
    title={column?.label || 'Details'}
    mode={column?.textMode || 'expandable'}
    previewCharThreshold={column?.previewCharThreshold}
  />
)

const parseApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return {
      status: 'error',
      message: response.ok ? '' : `Request failed with HTTP ${response.status}.`,
    }
  }

  return response.json()
}

const ClientVendorRegistrationPage = () => {
  const navigate = useNavigate()
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('client.vendor-registration')
  const [rows, setRows] = useState([])
  const [staffOptions, setStaffOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [recipientFilter, setRecipientFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const fetchRows = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}client-vendor-registrations`, {
        credentials: 'include',
      })
      const result = await parseApiResponse(res)
      setRows(
        result.status === 'success' && Array.isArray(result.data?.rows) ? result.data.rows : [],
      )
    } catch (err) {
      console.error('Failed to fetch vendor registrations:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}staff/list?per_page=500`, {
          credentials: 'include',
        })
        const result = await parseApiResponse(res)
        const staff = Array.isArray(result.data?.items)
          ? result.data.items
          : Array.isArray(result.staff)
            ? result.staff
            : []
        setStaffOptions(
          staff
            .filter((item) => {
              const status = String(item.status || '')
                .trim()
                .toLowerCase()
              return item.email && (!status || status === 'active')
            })
            .map((item) => ({
              value: Number(item.staff_id),
              label: `${item.full_name || item.name_code || item.email}${item.name_code ? ` (${item.name_code})` : ''}`,
              email: item.email,
            })),
        )
      } catch (err) {
        console.error('Failed to fetch staff options:', err)
        setStaffOptions([])
      }
    }

    loadStaff()
  }, [])

  const normalizedRows = useMemo(() => normalizeVendorRegistrationRows(rows), [rows])

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return normalizedRows.filter((row) => {
      if (statusFilter === 'missing_certificate' && row.has_certificate) return false
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'missing_certificate' &&
        row.status !== statusFilter
      ) {
        return false
      }
      if (recipientFilter !== 'all' && !row.recipientStaffIds.includes(Number(recipientFilter)))
        return false
      if (!term) return true
      return [
        row.client,
        row.recipientsText,
        row.certificate,
        row.portalUrl,
        row.portalUsername,
        row.remarks,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [normalizedRows, recipientFilter, searchTerm, statusFilter])

  const statsItems = useMemo(
    () => [
      {
        key: 'total',
        label: 'Total Registrations',
        value: formatCount(normalizedRows.length),
        tone: 'primary',
      },
      {
        key: 'active',
        label: 'Active',
        value: formatCount(normalizedRows.filter((row) => row.status === 'active').length),
        tone: 'success',
        onClick: () => {
          setStatusFilter('active')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'expiring',
        label: 'Expiring Soon',
        value: formatCount(normalizedRows.filter((row) => row.status === 'expiring_soon').length),
        tone: 'warning',
        onClick: () => {
          setStatusFilter('expiring_soon')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'expired',
        label: 'Expired',
        value: formatCount(normalizedRows.filter((row) => row.status === 'expired').length),
        tone: 'danger',
        onClick: () => {
          setStatusFilter('expired')
          setShowAdvancedFilters(true)
        },
      },
    ],
    [normalizedRows],
  )

  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    statusFilter !== 'all'
      ? { key: 'status', label: `Status: ${statusLabels[statusFilter]}` }
      : null,
    recipientFilter !== 'all'
      ? {
          key: 'recipient',
          label: `Recipient: ${
            staffOptions.find((option) => String(option.value) === String(recipientFilter))
              ?.label || recipientFilter
          }`,
        }
      : null,
  ].filter(Boolean)

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setRecipientFilter('all')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'status') setStatusFilter('all')
    if (key === 'recipient') setRecipientFilter('all')
  }

  const openCreatePage = () => {
    navigate('/client/vendor-registration/create')
  }

  const openDetailPage = (row) => {
    navigate(buildVendorRegistrationDetailPath(row.id))
  }

  const openEditPage = (row) => {
    navigate(buildVendorRegistrationEditPath(row.id))
  }

  const deleteRow = async (row) => {
    const ok = await dialog.confirm(`Delete vendor registration for ${row.client}?`, {
      confirmText: 'Delete',
      confirmColor: 'danger',
    })
    if (!ok) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}client-vendor-registrations/${row.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )
      const result = await parseApiResponse(res)
      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to delete vendor registration.')
      }
      dispatchClientVendorRegistrationChanged()
      await fetchRows()
    } catch (err) {
      dialog.alert(err.message || 'Server error. Please try again later.')
    }
  }

  const renderCell = (row, column) => {
    if (column.key === 'client' || column.key === 'recipients') {
      return renderText(column.key === 'client' ? row.client : row.recipientsText, column)
    }
    if (column.key === 'portalUrl') {
      if (!row.portalUrl) return <span className="text-muted">{emptyValue}</span>
      return (
        <a href={row.portalUrl} target="_blank" rel="noreferrer" data-no-row-open="true">
          {row.portalUrl}
        </a>
      )
    }
    if (column.key === 'portalUsername' || column.key === 'remarks') {
      return renderText(row[column.key], column)
    }
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={statusTones[row.status] || 'secondary'}>
          {row.statusLabel}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'daysLeft') {
      return row.daysLeft === null ? emptyValue : formatCount(row.daysLeft)
    }
    if (column.key === 'certificate') {
      if (!row.certificateUrl) return <span className="text-muted">{emptyValue}</span>
      return (
        <a href={row.certificateUrl} target="_blank" rel="noreferrer" data-no-row-open="true">
          {row.certificate}
        </a>
      )
    }
    return row[column.key] || emptyValue
  }

  return (
    <>
      <ClientModuleNavStrip />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <DataTableCardHeader title="Vendor Registration">
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
              <CButton size="sm" color="primary" onClick={openCreatePage}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Registration
              </CButton>
            </DataTableCardHeader>
            <CCardBody>
              {statsVisible && (
                <StatsStrip
                  items={statsItems}
                  loading={loading}
                  layout="balanced"
                  className="client-vendor-registration-stats"
                />
              )}

              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search client, recipient, certificate, portal, remarks"
                searchAriaLabel="Search vendor registrations"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={getAdvancedFilterCount(activeChips)}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                loading={loading}
                desktopToolsId="client-vendor-registration-table-tools"
                mobileToolsId="client-vendor-registration-mobile-table-tools"
              >
                <CCol xs={12} md={4} lg={3}>
                  <CFormLabel htmlFor="vendorRegistrationStatusFilter">Status</CFormLabel>
                  <CFormSelect
                    id="vendorRegistrationStatusFilter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="expired">Expired</option>
                    <option value="missing_certificate">Missing Certificate</option>
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={4} lg={3}>
                  <CFormLabel htmlFor="vendorRegistrationRecipientFilter">Recipient</CFormLabel>
                  <CFormSelect
                    id="vendorRegistrationRecipientFilter"
                    value={recipientFilter}
                    onChange={(event) => setRecipientFilter(event.target.value)}
                  >
                    <option value="all">All Recipients</option>
                    {staffOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </DataTableRecordControls>

              <DataTableRecordList
                rows={filteredRows}
                dataColumns={dataColumns}
                defaultVisibleColumns={defaultVisibleColumns}
                requiredColumns={requiredColumns}
                storageKey={columnStorageKey}
                idPrefix="client-vendor-registration-record"
                emptyMessage="No vendor registration records found."
                exportFilename={`client-vendor-registrations-${new Date().toISOString().slice(0, 10)}.csv`}
                loading={loading}
                loadingMessage="Loading vendor registrations..."
                showDesktopSummary={false}
                desktopUtilityPlacement="portal"
                desktopUtilityPortalId="client-vendor-registration-table-tools"
                mobileUtilityPlacement="portal"
                mobileUtilityPortalId="client-vendor-registration-mobile-table-tools"
                showMobileUtilityRow={false}
                actionColumnWidth={actionColumnWidth}
                getRowKey={(row) => row.id}
                renderCell={renderCell}
                onRowOpen={openDetailPage}
                getActions={(row) =>
                  [
                    {
                      key: 'edit',
                      label: getVendorRegistrationEditActionLabel(row.status),
                      onClick: () => openEditPage(row),
                    },
                    row.certificateUrl
                      ? {
                          key: 'certificate',
                          label: 'Open Certificate',
                          onClick: () =>
                            window.open(row.certificateUrl, '_blank', 'noopener,noreferrer'),
                        }
                      : null,
                    {
                      key: 'delete',
                      label: 'Delete',
                      danger: true,
                      dividerBefore: true,
                      onClick: () => deleteRow(row),
                    },
                  ].filter(Boolean)
                }
                getMobileTitle={(row) => row.client}
                getMobileSubtitle={(row) => `${row.validFrom} - ${row.validUntil}`}
                getMobileMeta={(row) => row.recipientsText}
                getMobileStatus={(row) => row.statusLabel}
                getMobileStatusTone={(row) => statusTones[row.status] || 'secondary'}
                mobileFieldKeys={{
                  title: 'client',
                  subtitle: ['validFrom', 'validUntil'],
                  meta: 'recipientsText',
                  status: 'statusLabel',
                }}
                initialSortField="validUntil"
                initialSortDir="asc"
                getSortValue={(row, field) => row[field]}
                resetDeps={[filteredRows, searchTerm, statusFilter, recipientFilter]}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default ClientVendorRegistrationPage
