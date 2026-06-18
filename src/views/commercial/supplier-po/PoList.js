import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCol, CFormLabel, CFormSelect, CRow } from '@coreui/react'

import ViewPoModal from './SupplierModal/ViewPoModal '
import MarkSupplierPaid from './SupplierModal/MarkSupplierPaid '
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
import { formatCount, formatMoney, getTopGroupBySum, sumBy } from '../../../utils/stats/formatStats'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'
import CommercialProjectPickerModal from '../shared/CommercialProjectPickerModal'

const emptyValue = '-'
const columnStorageKey = 'commercial.supplier-po.visible-columns.v4'

const defaultVisibleColumns = {
  po: true,
  supplier: true,
  createdBy: true,
  contact: true,
  contactPhone: false,
  items: false,
  issued: true,
  total: true,
  status: true,
}

const requiredColumns = new Set(['po', 'supplier', 'status'])

const dataColumns = [
  { key: 'po', label: 'PO', width: '130px', sortable: true, sortType: 'string', shrinkToFit: true },
  { key: 'supplier', label: 'Supplier', width: '210px', sortable: true, sortType: 'string' },
  {
    key: 'createdBy',
    label: 'PIC',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
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
    key: 'issued',
    label: 'Issued',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (po) => po.issuedDisplay,
  },
  {
    key: 'total',
    label: 'Total',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (po) => po.totalDisplay,
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

const toDateOnly = (value) => {
  if (!value) return '-'
  const s = String(value)
  if (s.includes('T')) return s.split('T')[0]
  if (s.includes(' ')) return s.split(' ')[0]
  return s
}

const getStatusTone = (status) => {
  if (status === 'Paid') return 'success'
  if (status === 'Pending') return 'warning'
  return 'info'
}

const getCreatedByDisplay = (po = {}) =>
  String(po?.created_by_code || po?.created_by_name || po?.created_by || '').trim()

const isPaidStatus = (status) => String(status || '').toLowerCase() === 'paid'

export default function SupplierPoRecords() {
  const navigate = useNavigate()
  const location = useLocation()
  const [poList, setPoList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [personInChargeFilter, setPersonInChargeFilter] = useState('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedPo, setSelectedPo] = useState(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [markPaidVisible, setMarkPaidVisible] = useState(false)
  const [projectPickerVisible, setProjectPickerVisible] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('commercial.supplier-po')

  const fetchAllPos = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true)
    try {
      const rows = await fetchAllPagedRecords({
        url: `${import.meta.env.VITE_API_BASE}catalog/purchase-orders`,
        dataKeys: ['data'],
        perPage: 100,
      })
      setPoList(rows)
    } catch (err) {
      console.error('PO list fetch error', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllPos()
  }, [fetchAllPos])

  const personInChargeOptions = useMemo(() => {
    const options = new Set()
    poList.forEach((po) => {
      const value = getCreatedByDisplay(po)
      if (value) options.add(value)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [poList])

  const serviceTypeOptions = useMemo(() => {
    const options = new Set()
    poList.forEach((po) => {
      const items = Array.isArray(po?.items) ? po.items : []
      items.forEach((item) => {
        const name = String(item?.item_name || '').trim()
        if (name) options.add(name)
      })
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [poList])

  const statusOptions = useMemo(() => {
    const options = new Set()
    poList.forEach((po) => {
      const status = String(po?.status || '').trim()
      if (status) options.add(status)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [poList])

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
    serviceTypeFilter !== 'all' ? { key: 'item', label: `Item: ${serviceTypeFilter}` } : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
  ].filter(Boolean)
  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'pic') setPersonInChargeFilter('all')
    if (key === 'item') setServiceTypeFilter('all')
    if (key === 'status') setStatusFilter('all')
  }

  const handleGeneratePdf = (po) => {
    const url = `${import.meta.env.VITE_API_BASE}catalog/purchase-orders/${po.po_id}/pdf`
    window.open(url, '_blank')
  }

  const handleViewPo = (po) => {
    navigate(`/commercial/supplier-po/${po.po_id}`, {
      state: { record: po, returnTo: getCurrentReturnTo(location) },
    })
  }

  const openSupplierPoCreateForProject = (project) => {
    const projectId = project?.id ?? project?.project_id
    if (!projectId) return

    setProjectPickerVisible(false)
    navigate(`/commercial/supplier-po/create/${projectId}?from=supplier-po-list`, {
      state: { project },
    })
  }

  const handleMarkPaid = (po) => {
    if (isPaidStatus(po?.status)) return
    setSelectedPo(po)
    setMarkPaidVisible(true)
  }

  const handleDeletePo = async (po) => {
    const confirmed = await dialog.confirm(`Are you sure you want to delete PO ${po.po_ref_no}?`, {
      confirmText: 'Delete',
      confirmColor: 'danger',
    })
    if (!confirmed) return

    fetch(`${import.meta.env.VITE_API_BASE}catalog/purchase-orders/${po.po_id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success') {
          showToast('Supplier PO deleted.')
          fetchAllPos({ showLoader: false })
        } else {
          dialog.alert('Failed to delete PO: ' + (result.message || 'Unknown error.'))
        }
      })
      .catch((err) => {
        console.error('Delete PO error:', err)
        dialog.alert('Network or server error while deleting PO.')
      })
  }

  const handleConfirmMarkPaid = (data) => {
    const payload = {
      po_id: data.po_id,
      payment_date: data.transactionDate,
      remarks: data.remarks,
    }

    fetch(`${import.meta.env.VITE_API_BASE}catalog/purchase-orders/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success') {
          showToast('Supplier PO marked as paid.')
          fetchAllPos({ showLoader: false })
          setMarkPaidVisible(false)
        } else {
          dialog.alert('Failed to mark as paid: ' + (result.message || 'Unknown error.'))
        }
      })
      .catch((err) => {
        console.error('Mark paid error:', err)
        dialog.alert('Network or server error.')
      })
  }

  const filteredPos = useMemo(
    () =>
      poList.filter((po) => {
        if (!isDateInPeriodRange(po?.created_at, periodRange)) return false

        if (personInChargeFilter !== 'all') {
          const code = String(po?.created_by_code || '')
            .trim()
            .toLowerCase()
          const name = String(po?.created_by_name || '')
            .trim()
            .toLowerCase()
          const id = po?.created_by != null ? String(po.created_by).trim().toLowerCase() : ''
          const chosen = String(personInChargeFilter).toLowerCase()
          if (chosen !== code && chosen !== name && chosen !== id) return false
        }

        if (serviceTypeFilter !== 'all') {
          const chosenType = String(serviceTypeFilter).toLowerCase()
          const items = Array.isArray(po?.items) ? po.items : []
          const hasType = items.some(
            (item) =>
              String(item?.item_name || '')
                .trim()
                .toLowerCase() === chosenType,
          )
          if (!hasType) return false
        }

        if (statusFilter !== 'all') {
          const poStatus = String(po?.status || '').toLowerCase()
          if (poStatus !== String(statusFilter).toLowerCase()) return false
        }

        const term = searchTerm.trim().toLowerCase()
        const itemsText = (Array.isArray(po?.items) ? po.items : [])
          .map((item) => `${item?.item_name || ''} ${item?.description || ''}`.trim())
          .join(' ')
          .toLowerCase()
        const personInCharge = getCreatedByDisplay(po).toLowerCase()

        return (
          String(po?.po_ref_no || '')
            .toLowerCase()
            .includes(term) ||
          String(po?.supplier_name || '')
            .toLowerCase()
            .includes(term) ||
          String(po?.supplier_contact_name || '')
            .toLowerCase()
            .includes(term) ||
          String(po?.supplier_contact_number || '')
            .toLowerCase()
            .includes(term) ||
          itemsText.includes(term) ||
          personInCharge.includes(term)
        )
      }),
    [poList, periodRange, personInChargeFilter, searchTerm, serviceTypeFilter, statusFilter],
  )

  const normalizedPos = useMemo(
    () =>
      filteredPos.map((po) => {
        const items = Array.isArray(po.items) ? po.items : []
        const itemsSummary = items
          .map((item) => `${item.item_name} (${item.quantity} ${item.unit})`)
          .join(', ')

        return {
          ...po,
          po: po.po_ref_no || emptyValue,
          supplier: po.supplier_name || emptyValue,
          createdBy: getCreatedByDisplay(po) || emptyValue,
          contact: po.supplier_contact_name || emptyValue,
          contactPhone: po.supplier_contact_number || emptyValue,
          items: itemsSummary || emptyValue,
          issued: po.created_at || '',
          issuedDisplay: toDateOnly(po.created_at),
          total: Number.parseFloat(po.grand_total || 0),
          totalDisplay: Number.parseFloat(po.grand_total || 0).toFixed(2),
          status: po.status || 'Unknown',
        }
      }),
    [filteredPos],
  )

  const statsItems = useMemo(() => {
    const pendingRows = normalizedPos.filter(
      (po) => String(po.status || '').toLowerCase() === 'pending',
    )
    const topCreator = getTopGroupBySum(
      normalizedPos,
      (po) => po.createdBy,
      (po) => po.total,
    )

    return [
      {
        key: 'pos',
        label: 'POs',
        value: formatCount(normalizedPos.length),
        tone: 'primary',
      },
      {
        key: 'total-value',
        label: 'Total Value',
        value: formatMoney(sumBy(normalizedPos, (po) => po.total)),
        tone: 'info',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: formatCount(pendingRows.length),
        sublabel: formatMoney(sumBy(pendingRows, (po) => po.total)),
        tone: 'warning',
        onClick: () => {
          setStatusFilter('Pending')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'top-creator',
        label: 'Top Creator',
        value: topCreator.value,
        sublabel: `${formatMoney(topCreator.total)} across ${formatCount(topCreator.count)} POs`,
        tone: 'secondary',
        onClick:
          topCreator.value && topCreator.value !== emptyValue
            ? () => {
                setPersonInChargeFilter(topCreator.value)
                setShowAdvancedFilters(true)
              }
            : undefined,
      },
    ]
  }, [normalizedPos])
  const statsScopeLabel = periodRange ? getPeriodRangeScopeLabel(periodRange) : ''

  const getActions = (po) => {
    const alreadyPaid = isPaidStatus(po?.status)

    return [
      {
        key: 'view',
        label: 'View',
        onClick: handleViewPo,
      },
      {
        key: 'preview',
        label: 'Preview',
        onClick: (record) => {
          setSelectedPo(record)
          setViewModalVisible(true)
        },
      },
      {
        key: 'export-pdf',
        label: 'PDF PO',
        onClick: handleGeneratePdf,
      },
      {
        key: 'mark-paid',
        label: 'Mark Paid',
        disabled: alreadyPaid,
        tooltip: alreadyPaid ? 'Supplier PO is already paid.' : undefined,
        onClick: handleMarkPaid,
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        dividerBefore: true,
        onClick: handleDeletePo,
      },
    ]
  }

  const renderCell = (po, column) => {
    if (column.key === 'issued') return po.issuedDisplay
    if (column.key === 'total') return po.totalDisplay
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(po.status)}>{po.status}</DataTableStatusBadge>
      )
    }

    return po[column.key] || emptyValue
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <ModuleNavStrip tabs={commercialModuleTabs} ariaLabel="Commercial sections" />
          <CCard className="mb-4">
            <DataTableCardHeader title="Supplier POs" scopeLabel={statsScopeLabel}>
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
              <CButton color="primary" size="sm" onClick={() => setProjectPickerVisible(true)}>
                Create Supplier PO
              </CButton>
            </DataTableCardHeader>
            <CCardBody>
              {statsVisible && <StatsStrip items={statsItems} loading={loading} />}
              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search PO, supplier, contact, item, PIC"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="supplier-po-table-tools"
                mobileToolsId="supplier-po-mobile-table-tools"
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
                  <CFormLabel>Item</CFormLabel>
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
                rows={normalizedPos}
                loading={loading}
                loadingMessage="Loading supplier PO records..."
                dataColumns={dataColumns}
                defaultVisibleColumns={defaultVisibleColumns}
                requiredColumns={requiredColumns}
                storageKey={columnStorageKey}
                scrollStorageKey="commercial.supplier-po.records.scroll"
                idPrefix="supplier-po-record"
                emptyMessage="No supplier PO records found."
                exportFilename={`supplier-po-records-${new Date().toISOString().slice(0, 10)}.csv`}
                showDesktopSummary={false}
                desktopUtilityPlacement="portal"
                desktopUtilityPortalId="supplier-po-table-tools"
                mobileUtilityPlacement="portal"
                mobileUtilityPortalId="supplier-po-mobile-table-tools"
                showMobileUtilityRow={false}
                renderQuickFilters={() => (
                  <PeriodRangeSelector
                    value={periodRange}
                    onChange={setPeriodRange}
                    className="d-none d-lg-block"
                  />
                )}
                getRowKey={(po, index) => po.po_id || po.po_ref_no || index}
                renderCell={renderCell}
                getActions={getActions}
                onRowOpen={handleViewPo}
                getMobileTitle={(po) => po.po}
                getMobileSubtitle={(po) => po.supplier}
                getMobileMeta={(po) => `${po.issuedDisplay} | RM ${po.totalDisplay}`}
                getMobileStatus={(po) => po.status}
                getMobileStatusTone={(po) => getStatusTone(po.status)}
                mobileFieldKeys={{
                  title: 'po',
                  subtitle: 'supplier',
                  meta: ['issued', 'total', 'createdBy'],
                  status: 'status',
                }}
                initialSortField="issued"
                initialSortDir="desc"
                initialSortDirByField={{ issued: 'desc', total: 'desc' }}
                getSortValue={(po, field) => po[field]}
                resetDeps={[
                  searchTerm,
                  periodRange,
                  personInChargeFilter,
                  serviceTypeFilter,
                  statusFilter,
                ]}
                actionColumnWidth="56px"
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <ViewPoModal
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        po={selectedPo}
      />

      <MarkSupplierPaid
        visible={markPaidVisible}
        onClose={() => setMarkPaidVisible(false)}
        onConfirm={handleConfirmMarkPaid}
        record={selectedPo}
      />

      <CommercialProjectPickerModal
        visible={projectPickerVisible}
        onClose={() => setProjectPickerVisible(false)}
        onContinue={openSupplierPoCreateForProject}
        title="Create Supplier PO"
        searchInputId="supplierPoProjectSearch"
        creationLabel="Supplier PO"
      />
    </>
  )
}
