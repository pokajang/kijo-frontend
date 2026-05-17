// src/procedures/ProceduresList.jsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import dialog from '../../components/dialog/dialogService'
import {
  DataTableActionMenu,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../components/filters'
import ModuleNavStrip from '../../components/navigation/ModuleNavStrip'
import { administrationModuleTabs } from '../../components/navigation/moduleNavConfigs'

const dataColumns = [
  { key: 'title', label: 'Title', width: '220px', sortable: true, sortType: 'string' },
  {
    key: 'category',
    label: 'Category',
    width: '112px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'description',
    label: 'Brief Description',
    width: '200px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '200px',
    previewCharThreshold: 34,
  },
  {
    key: 'date',
    label: 'Date',
    width: '112px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'createdBy',
    label: 'Created By',
    width: '96px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
]

const defaultVisibleColumns = {
  title: true,
  category: true,
  description: true,
  date: true,
  createdBy: true,
}

const requiredColumns = new Set(['title', 'category'])

const formatDate = (s) => {
  if (!s) return '-'
  const d = new Date(String(s).replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString()
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'IT', label: 'IT' },
  { value: 'OSH', label: 'OSH' },
  { value: 'HR', label: 'HR' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATION', label: 'Operation' },
  { value: 'SALES', label: 'Sales' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHERS', label: 'Others' },
]

const displayCategory = (cat) => {
  if (!cat) return '-'
  const found = CATEGORY_OPTIONS.find((option) => option.value === String(cat).toUpperCase())
  return found?.label ?? cat
}

export default function ProceduresList() {
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [currentStaffId, setCurrentStaffId] = useState(null)

  const activeChips = [
    q.trim() ? { key: 'search', label: `Search: ${q.trim()}` } : null,
    createdByFilter.trim()
      ? { key: 'createdBy', label: `Created By: ${createdByFilter.trim()}` }
      : null,
    categoryFilter
      ? { key: 'category', label: `Category: ${displayCategory(categoryFilter)}` }
      : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
  ].filter(Boolean)
  const activeFilterCount = getAdvancedFilterCount(activeChips)
  const resetFilters = () => {
    setQ('')
    setCreatedByFilter('')
    setCategoryFilter('')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }
  const clearChip = (key) => {
    if (key === 'search') setQ('')
    if (key === 'createdBy') setCreatedByFilter('')
    if (key === 'category') setCategoryFilter('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const fetchList = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}procedures`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to load procedures.')
      }
      setRows(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      setError(e.message || 'Unexpected error while loading procedures.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMe = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}auth/session`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.status === 'success' && data?.user?.staff_id) {
        setCurrentStaffId(Number(data.user.staff_id))
      }
    } catch {
      /* backend enforces permissions */
    }
  }

  useEffect(() => {
    fetchList()
    fetchMe()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const creator = createdByFilter.trim().toLowerCase()
    const cat = (categoryFilter || '').toUpperCase()

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        (row.title || '').toLowerCase().includes(term) ||
        (row.description || '').toLowerCase().includes(term) ||
        (row.created_name || '').toLowerCase().includes(term) ||
        (row.created_code || row.created_by_code || '').toLowerCase().includes(term)

      const matchesCreator =
        !creator ||
        (row.created_name || '').toLowerCase().includes(creator) ||
        (row.created_code || row.created_by_code || '').toLowerCase().includes(creator)

      const matchesCategory = !cat || String(row.category || '').toUpperCase() === cat
      const matchesPeriod = isDateInPeriodRange(row.created_at, periodRange)

      return matchesSearch && matchesCreator && matchesCategory && matchesPeriod
    })
  }, [rows, q, createdByFilter, categoryFilter, periodRange])

  const normalizedRows = useMemo(
    () =>
      filtered.map((item) => ({
        ...item,
        title: item.title || '-',
        category: displayCategory(item.category),
        description: item.description || '-',
        date: item.created_at || '',
        dateDisplay: formatDate(item.created_at),
        createdBy: item.created_code || item.created_by_code || '-',
      })),
    [filtered],
  )

  const onDelete = async (id) => {
    if (!id) return
    const ok = await dialog.confirm('Delete this procedure? This action cannot be undone.')
    if (!ok) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}procedures/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to delete procedure.')
      }
      fetchList()
    } catch (e) {
      setError(e.message || 'Unexpected error while deleting.')
    }
  }

  const canModifyItem = (item) =>
    currentStaffId != null ? Number(item.created_by) === Number(currentStaffId) : false

  const getActions = (item) => {
    const canModify = canModifyItem(item)
    return [
      {
        key: 'edit',
        label: 'Edit',
        disabled: !canModify,
        tooltip: canModify ? 'Edit this SOP' : 'Only the owner may edit this SOP',
        onClick: canModify
          ? () => navigate(`/administration/procedures/edit/${item.id}`)
          : undefined,
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: canModify,
        disabled: !canModify,
        tooltip: canModify ? 'Delete this SOP' : 'Only the owner may delete this SOP',
        dividerBefore: true,
        onClick: canModify ? () => onDelete(item.id) : undefined,
      },
    ]
  }

  const renderCell = (item, column) => {
    if (column.key === 'title') {
      return (
        <DataTableTextCell
          value={item.title || '-'}
          maxWidth="220px"
          title="Title"
          className="procedure-title-cell"
        />
      )
    }
    if (column.key === 'category') {
      return <DataTableStatusBadge tone="info">{item.category}</DataTableStatusBadge>
    }
    if (column.key === 'description') {
      return (
        <DataTableTextCell
          value={item.description}
          maxWidth="200px"
          title="Brief Description"
          mode="expandable"
          previewCharThreshold={34}
          truncateCharThreshold={34}
          constrain
        />
      )
    }
    if (column.key === 'date') return item.dateDisplay
    return item[column.key] || '-'
  }

  const renderMobileItem = (
    item,
    index,
    { pageStart = 0, rowProps = {}, showTitle = true, showSubtitle = true, showMeta = true } = {},
  ) => {
    const actionKey = `procedure-record-${item.id || index}-mobile`

    return (
      <div {...rowProps} className={`records-mobile-item ${rowProps.className || ''}`.trim()}>
        <div className="records-mobile-item-head">
          <div className="records-mobile-item-main text-start">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="records-mobile-row-index text-muted">#{pageStart + index + 1}</span>
              {showTitle && <span className="records-mobile-quote-id">{item.title || '-'}</span>}
              {showSubtitle && (
                <DataTableStatusBadge tone="info">{item.category}</DataTableStatusBadge>
              )}
            </div>
            {showMeta && <div className="records-mobile-client mt-1">{item.dateDisplay}</div>}
          </div>
          <div className="records-mobile-head-actions d-flex align-items-start gap-2 ms-2">
            <DataTableActionMenu
              record={item}
              actions={getActions(item)}
              actionKey={actionKey}
              ariaLabel="Procedure actions"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip tabs={administrationModuleTabs} ariaLabel="Administration sections" />
        <CCard className="mb-4 records-page-card procedure-page-card">
          <CCardHeader className="records-page-card-header d-flex justify-content-between align-items-center gap-2">
            <strong>Standard Operating Procedures</strong>
            <CButton
              color="primary"
              size="sm"
              onClick={() => navigate('/administration/procedures/create')}
            >
              Create New
            </CButton>
          </CCardHeader>

          <CCardBody className="records-page-card-body procedure-page-card-body">
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <DataTableRecordControls
              searchValue={q}
              onSearchChange={setQ}
              searchPlaceholder="Type to search..."
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              activeFilterCount={activeFilterCount}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={resetFilters}
              loading={loading}
              desktopToolsId="procedure-table-tools"
              mobileToolsId="procedure-mobile-table-tools"
            >
              <CCol xs={12} md={4} lg={3}>
                <CFormLabel htmlFor="created-by">Filter By Created By</CFormLabel>
                <CFormInput
                  id="created-by"
                  placeholder="Type name or code..."
                  value={createdByFilter}
                  onChange={(event) => setCreatedByFilter(event.target.value)}
                />
              </CCol>

              <CCol xs={12} md={4} lg={3}>
                <CFormLabel htmlFor="category-filter">Filter By Category</CFormLabel>
                <CFormSelect
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </DataTableRecordControls>

            <DataTableRecordList
              className="procedure-records-table"
              rows={normalizedRows}
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey="procedure.records.visible-columns.v3"
              apiKey="procedure-records-visible-columns-v3"
              idPrefix="procedure-record"
              emptyMessage="No procedures found."
              exportFilename={`procedures-${new Date().toISOString().slice(0, 10)}.csv`}
              loading={loading}
              loadingMessage="Loading procedures..."
              showDesktopSummary={false}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="procedure-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="procedure-mobile-table-tools"
              showMobileUtilityRow={false}
              actionColumnWidth="56px"
              getRowKey={(item, index) => item.id || index}
              renderCell={renderCell}
              renderMobileItem={renderMobileItem}
              onRowOpen={(item) => navigate(`/administration/procedures/view/${item.id}`)}
              rowOpenClassName="procedure-clickable-row"
              getActions={getActions}
              getMobileTitle={(item) => item.title}
              getMobileSubtitle={(item) => item.category}
              getMobileMeta={(item) => `${item.dateDisplay} | ${item.createdBy}`}
              mobileFieldKeys={{
                title: 'title',
                subtitle: 'category',
                meta: ['date', 'createdBy'],
              }}
              initialSortField="date"
              initialSortDir="desc"
              initialSortDirByField={{ date: 'desc' }}
              renderQuickFilters={() => (
                <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
              )}
              resetDeps={[filtered, q, createdByFilter, categoryFilter, periodRange]}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
