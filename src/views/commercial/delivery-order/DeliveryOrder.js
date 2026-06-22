// src/components/DeliveryOrder.js

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCol, CFormLabel, CFormSelect, CRow } from '@coreui/react'
import DoViewModal from './DoModal/DoViewModal'
import DoEditModalMain from './DoModal/DoEditModalMain'
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableStatsToggle,
} from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { commercialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
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
import { countByPredicate, formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'
import CommercialProjectPickerModal from '../shared/CommercialProjectPickerModal'
import { buildDeliveryOrderUpdatePayload } from './deliveryOrderUpdatePayload'

const emptyValue = '-'
const columnStorageKey = 'commercial.delivery-orders.visible-columns.v3'

const defaultVisibleColumns = {
  do: true,
  project: true,
  client: true,
  contact: true,
  contactPhone: false,
  servicePeriod: false,
  issued: true,
  issuer: false,
  items: false,
  status: true,
}

const requiredColumns = new Set(['do', 'project', 'status'])

const dataColumns = [
  { key: 'do', label: 'DO', width: '130px', sortable: true, sortType: 'string', shrinkToFit: true },
  { key: 'project', label: 'Project', width: '230px', sortable: true, sortType: 'string' },
  { key: 'client', label: 'Client', width: '200px', sortable: true, sortType: 'string' },
  { key: 'contact', label: 'Contact', width: '180px', sortable: true, sortType: 'string' },
  {
    key: 'contactPhone',
    label: 'Phone',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'servicePeriod',
    label: 'Service Period',
    width: '210px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'issued',
    label: 'Issued',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (doItem) => doItem.issuedDisplay,
  },
  { key: 'issuer', label: 'Issuer', width: '170px', sortable: true, sortType: 'string' },
  {
    key: 'items',
    label: 'Items',
    width: '240px',
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
]

const parseLocalDate = (value) => {
  if (!value) return null

  const raw = String(value).trim()
  const ymd = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0]
  const parts = ymd.split('-')
  if (parts.length !== 3) return null

  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!year || !month || !day) return null

  const dateObj = new Date(year, month - 1, day)
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return null
  }

  return dateObj
}

const toDateOnly = (value) => {
  if (!value) return '-'
  const s = String(value)
  if (s.includes('T')) return s.split('T')[0]
  if (s.includes(' ')) return s.split(' ')[0]
  return s
}

const getDoStatus = (doItem) => {
  const raw = String(doItem?.status || '').trim()
  if (raw) return raw

  const issued = parseLocalDate(doItem?.project_award_date)
  if (!issued) return 'Issued'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return issued > today ? 'Upcoming' : 'Issued'
}

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'issued') return 'success'
  if (normalized === 'upcoming') return 'warning'
  if (normalized === 'cancelled') return 'danger'
  return 'info'
}

const normalizeDeliveryOrder = (order = {}) => {
  const normalizedItems = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.breakdown)
      ? order.breakdown
      : []

  return {
    ...order,
    do_id: order?.do_id ?? order?.id ?? null,
    breakdown: normalizedItems.map((item) => ({
      item_name: item?.item_name || item?.name || '',
      description: item?.description || '',
      quantity: item?.quantity,
      unit: item?.unit,
    })),
  }
}

const DeliveryOrder = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [personInChargeFilter, setPersonInChargeFilter] = useState('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('commercial.delivery-order')
  const [selectedDo, setSelectedDo] = useState(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [projectPickerVisible, setProjectPickerVisible] = useState(false)

  const fetchAllDos = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true)
    try {
      const rows = await fetchAllPagedRecords({
        url: `${import.meta.env.VITE_API_BASE}delivery-orders`,
        dataKeys: ['orders', 'data'],
        perPage: 100,
      })
      setDeliveryOrders(rows.map(normalizeDeliveryOrder))
    } catch (err) {
      console.error('Error fetching delivery orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllDos()
  }, [fetchAllDos])

  const personInChargeOptions = useMemo(() => {
    const options = new Set()
    deliveryOrders.forEach((doItem) => {
      const person = String(doItem?.company_contact_name || '').trim()
      if (person) options.add(person)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [deliveryOrders])

  const serviceTypeOptions = useMemo(() => {
    const options = new Set()
    deliveryOrders.forEach((doItem) => {
      const type = String(doItem?.project_type || '').trim()
      if (type) options.add(type)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [deliveryOrders])

  const statusOptions = useMemo(() => {
    const options = new Set()
    deliveryOrders.forEach((doItem) => {
      const status = getDoStatus(doItem)
      if (status) options.add(status)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [deliveryOrders])

  const resetFilters = () => {
    setSearchTerm('')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setPersonInChargeFilter('all')
    setServiceTypeFilter('all')
    setStatusFilter('all')
    setShowAdvancedFilters(false)
  }
  const activeFilterCount = [
    personInChargeFilter !== 'all',
    serviceTypeFilter !== 'all',
    statusFilter !== 'all',
  ].filter(Boolean).length
  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
    personInChargeFilter !== 'all' ? { key: 'pic', label: `PIC: ${personInChargeFilter}` } : null,
    serviceTypeFilter !== 'all' ? { key: 'service', label: `Service: ${serviceTypeFilter}` } : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
  ].filter(Boolean)
  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'pic') setPersonInChargeFilter('all')
    if (key === 'service') setServiceTypeFilter('all')
    if (key === 'status') setStatusFilter('all')
  }

  const handleUpdateDo = async (updatedData) => {
    const doId = updatedData?.do_id ?? updatedData?.id
    if (!doId) {
      dialog.alert('Missing delivery order ID.')
      return
    }

    const payload = buildDeliveryOrderUpdatePayload(updatedData, selectedDo)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}delivery-orders/${doId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.status === 'success') {
        showToast('Delivery Order updated.')
        setEditModalVisible(false)
        fetchAllDos({ showLoader: false })
      } else {
        dialog.alert(`Failed to update: ${result.message}`)
      }
    } catch (err) {
      console.error('Update error:', err)
      dialog.alert('Server error. Please try again.')
    }
  }

  const handleDeleteDo = async (doId) => {
    if (
      !(await dialog.confirm('Are you sure you want to delete this delivery order?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}delivery-orders/${doId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status === 'success') {
        showToast('Delivery Order deleted.')
        fetchAllDos({ showLoader: false })
      } else {
        dialog.alert('Failed to delete delivery order.')
      }
    } catch (err) {
      console.error('Error deleting DO:', err)
      dialog.alert('An error occurred while deleting the delivery order.')
    }
  }

  const handleGeneratePdf = (doItem) => {
    if (!doItem?.do_id) return
    window.open(`${import.meta.env.VITE_API_BASE}delivery-orders/${doItem.do_id}/pdf`, '_blank')
  }

  const filteredDos = useMemo(
    () =>
      deliveryOrders.filter((doItem) => {
        if (!isDateInPeriodRange(doItem?.project_award_date, periodRange)) return false

        if (personInChargeFilter !== 'all') {
          const person = String(doItem?.company_contact_name || '').toLowerCase()
          if (person !== String(personInChargeFilter).toLowerCase()) return false
        }

        if (serviceTypeFilter !== 'all') {
          const serviceType = String(doItem?.project_type || '').toLowerCase()
          if (serviceType !== String(serviceTypeFilter).toLowerCase()) return false
        }

        if (statusFilter !== 'all') {
          const status = getDoStatus(doItem).toLowerCase()
          if (status !== String(statusFilter).toLowerCase()) return false
        }

        const term = searchTerm.trim().toLowerCase()
        const itemsText = Array.isArray(doItem?.breakdown)
          ? doItem.breakdown
              .map((item) => `${item?.item_name || ''} ${item?.description || ''}`.trim())
              .join(' ')
          : ''

        return (
          String(doItem?.do_number || '')
            .toLowerCase()
            .includes(term) ||
          String(doItem?.project_name || '')
            .toLowerCase()
            .includes(term) ||
          String(doItem?.client_name || '')
            .toLowerCase()
            .includes(term) ||
          String(doItem?.client_contact_name || '')
            .toLowerCase()
            .includes(term) ||
          String(doItem?.company_contact_name || '')
            .toLowerCase()
            .includes(term) ||
          String(doItem?.project_type || '')
            .toLowerCase()
            .includes(term) ||
          itemsText.toLowerCase().includes(term)
        )
      }),
    [
      deliveryOrders,
      periodRange,
      personInChargeFilter,
      searchTerm,
      serviceTypeFilter,
      statusFilter,
    ],
  )

  const normalizedDos = useMemo(
    () =>
      filteredDos.map((doItem) => {
        const itemsSummary = Array.isArray(doItem.breakdown)
          ? doItem.breakdown.map((item) => `${item.item_name} x${item.quantity}`).join(', ')
          : emptyValue
        const status = getDoStatus(doItem)

        return {
          ...doItem,
          do: doItem.do_number || emptyValue,
          project: doItem.project_name || emptyValue,
          client: doItem.client_name || emptyValue,
          contact: doItem.client_contact_name || emptyValue,
          contactPhone: doItem.client_contact_phone || emptyValue,
          servicePeriod: doItem.project_service_period || emptyValue,
          issued: doItem.project_award_date || '',
          issuedDisplay: toDateOnly(doItem.project_award_date),
          issuer: doItem.company_contact_name || emptyValue,
          items: itemsSummary || emptyValue,
          status,
        }
      }),
    [filteredDos],
  )

  const statsItems = useMemo(() => {
    const topPic = getTopGroupByCount(normalizedDos, (doItem) => doItem.issuer)

    return [
      {
        key: 'delivery-orders',
        label: 'Delivery Orders',
        value: formatCount(normalizedDos.length),
        tone: 'primary',
      },
      {
        key: 'issued',
        label: 'Issued',
        value: formatCount(
          countByPredicate(
            normalizedDos,
            (doItem) => String(doItem.status || '').toLowerCase() === 'issued',
          ),
        ),
        tone: 'success',
        onClick: () => {
          setStatusFilter('Issued')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        value: formatCount(
          countByPredicate(
            normalizedDos,
            (doItem) => String(doItem.status || '').toLowerCase() === 'upcoming',
          ),
        ),
        tone: 'warning',
        onClick: () => {
          setStatusFilter('Upcoming')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'top-pic',
        label: 'Top PIC',
        value: topPic.value,
        sublabel: `${formatCount(topPic.count)} delivery orders`,
        tone: 'secondary',
        onClick:
          topPic.value && topPic.value !== emptyValue
            ? () => {
                setPersonInChargeFilter(topPic.value)
                setShowAdvancedFilters(true)
              }
            : undefined,
      },
    ]
  }, [normalizedDos])
  const statsScopeLabel = periodRange ? getPeriodRangeScopeLabel(periodRange) : ''

  const handleOpenDetail = (doItem) => {
    navigate(`/commercial/delivery-order/${doItem.do_id}`, {
      state: { record: doItem, returnTo: getCurrentReturnTo(location) },
    })
  }

  const openDeliveryOrderCreateForProject = (project) => {
    const projectId = project?.id ?? project?.project_id
    if (!projectId) return

    setProjectPickerVisible(false)
    navigate(`/commercial/delivery-order/create/${projectId}?from=delivery-order-list`, {
      state: { project },
    })
  }

  const getActions = (doItem) => [
    {
      key: 'view',
      label: 'View',
      onClick: handleOpenDetail,
    },
    {
      key: 'preview',
      label: 'Preview Modal',
      onClick: (record) => {
        setSelectedDo(record)
        setViewModalVisible(true)
      },
    },
    {
      key: 'edit',
      label: 'Edit',
      onClick: (record) => {
        setSelectedDo(record)
        setEditModalVisible(true)
      },
    },
    {
      key: 'generate-pdf',
      label: 'Generate PDF',
      onClick: handleGeneratePdf,
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: (record) => handleDeleteDo(record.do_id),
    },
  ]

  const renderCell = (doItem, column) => {
    if (column.key === 'issued') return doItem.issuedDisplay
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(doItem.status)}>
          {doItem.status}
        </DataTableStatusBadge>
      )
    }

    return doItem[column.key] || emptyValue
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <ModuleNavStrip tabs={commercialModuleTabs} ariaLabel="Commercial sections" />
          <CCard className="mb-4">
            <DataTableCardHeader title="Delivery Orders" scopeLabel={statsScopeLabel}>
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
              <CButton color="primary" size="sm" onClick={() => setProjectPickerVisible(true)}>
                Create Delivery Order
              </CButton>
            </DataTableCardHeader>
            <CCardBody>
              <>
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
                  desktopToolsId="delivery-order-table-tools"
                  mobileToolsId="delivery-order-mobile-table-tools"
                  loading={loading}
                >
                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Person In Charge</CFormLabel>
                    <CFormSelect
                      value={personInChargeFilter}
                      onChange={(e) => setPersonInChargeFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {personInChargeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Type of Service</CFormLabel>
                    <CFormSelect
                      value={serviceTypeFilter}
                      onChange={(e) => setServiceTypeFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {serviceTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={4} lg={3}>
                    <CFormLabel>Status</CFormLabel>
                    <CFormSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </DataTableRecordControls>

                <DataTableRecordList
                  rows={normalizedDos}
                  loading={loading}
                  loadingMessage="Loading delivery orders..."
                  dataColumns={dataColumns}
                  defaultVisibleColumns={defaultVisibleColumns}
                  requiredColumns={requiredColumns}
                  storageKey={columnStorageKey}
                  scrollStorageKey="commercial.delivery-order.records.scroll"
                  idPrefix="delivery-order-record"
                  emptyMessage="No delivery order records found."
                  exportFilename={`delivery-orders-${new Date().toISOString().slice(0, 10)}.csv`}
                  showDesktopSummary={false}
                  desktopUtilityPlacement="portal"
                  desktopUtilityPortalId="delivery-order-table-tools"
                  mobileUtilityPlacement="portal"
                  mobileUtilityPortalId="delivery-order-mobile-table-tools"
                  showMobileUtilityRow={false}
                  renderQuickFilters={() => (
                    <PeriodRangeSelector
                      value={periodRange}
                      onChange={setPeriodRange}
                      className="d-none d-lg-block"
                    />
                  )}
                  getRowKey={(doItem, index) => doItem.do_id || doItem.do_number || index}
                  renderCell={renderCell}
                  getActions={getActions}
                  onRowOpen={handleOpenDetail}
                  getMobileTitle={(doItem) => doItem.do}
                  getMobileSubtitle={(doItem) => doItem.project}
                  getMobileMeta={(doItem) => `${doItem.issuedDisplay} | ${doItem.client}`}
                  getMobileStatus={(doItem) => doItem.status}
                  getMobileStatusTone={(doItem) => getStatusTone(doItem.status)}
                  mobileFieldKeys={{
                    title: 'do',
                    subtitle: 'project',
                    meta: ['issued', 'client'],
                    status: 'status',
                  }}
                  initialSortField="issued"
                  initialSortDir="desc"
                  initialSortDirByField={{ issued: 'desc' }}
                  getSortValue={(doItem, field) => doItem[field]}
                  resetDeps={[
                    searchTerm,
                    periodRange,
                    personInChargeFilter,
                    serviceTypeFilter,
                    statusFilter,
                  ]}
                  actionColumnWidth="56px"
                />
              </>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <DoViewModal
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        data={selectedDo}
      />
      <DoEditModalMain
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        data={selectedDo}
        onSave={handleUpdateDo}
      />
      <CommercialProjectPickerModal
        visible={projectPickerVisible}
        onClose={() => setProjectPickerVisible(false)}
        onContinue={openDeliveryOrderCreateForProject}
        title="Create Delivery Order"
        searchInputId="deliveryOrderProjectSearch"
        creationLabel="delivery order"
      />
    </>
  )
}

export default DeliveryOrder
