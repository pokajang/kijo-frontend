import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import {
  DataTableRecordControls,
  DataTableRecordList,
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
import { formatCount } from '../../../utils/stats/formatStats'
import AppraisalModal from './AppraisalModal'
import {
  deleteFinalAppraisal,
  deleteAppraisalRecord,
  fetchFinalAppraisals,
  fetchAppraisalRecords,
  handleInputChange,
  updateAppraisalRecord,
} from './actionHandlers'
import infoDetails from './infoDetails'
import dialog from '../../../components/dialog/dialogService'

const dataColumns = [
  {
    key: 'createdAt',
    label: 'Appraisal Date',
    width: '150px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.createdAt || '',
  },
  {
    key: 'staff',
    label: 'Staff',
    width: '230px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.staff || '',
  },
  {
    key: 'appraisalBy',
    label: 'Appraisal By',
    width: '220px',
    sortable: true,
    sortType: 'string',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (record) => record.appraisalBy || '',
  },
  {
    key: 'eventDate',
    label: 'Event Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.eventDate || '',
  },
  {
    key: 'section',
    label: 'Type',
    width: '170px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.section || '',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    width: '260px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '260px',
    previewCharThreshold: 42,
    getExportValue: (record) => record.feedback || '',
  },
]

const defaultVisibleColumns = {
  createdAt: true,
  staff: true,
  appraisalBy: true,
  eventDate: true,
  section: true,
  feedback: true,
}

const requiredColumns = new Set(['staff', 'section'])

const getRecordActionKey = (record) => `${record.recordKind || 'feedback'}-${record.id}`

const ViewAppraisal = ({ className = '', onAddFeedback, onFinalAppraisal }) => {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadErrorColor, setLoadErrorColor] = useState('danger')
  const [searchText, setSearchText] = useState('')
  const [filterStaff, setFilterStaff] = useState('')
  const [filterType, setFilterType] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [actionState, setActionState] = useState({ id: null, type: '' })
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editFormData, setEditFormData] = useState({
    selectedStaff: '',
    eventDate: '',
    quickInput: '',
  })
  const [editSection, setEditSection] = useState('')
  const [editingRecordId, setEditingRecordId] = useState(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setLoadErrorColor('danger')
    try {
      const feedbackRecords = await fetchAppraisalRecords('', '', { throwOnError: true })
      let finalRecords = []

      try {
        finalRecords = await fetchFinalAppraisals('', '', { throwOnError: true })
      } catch (err) {
        setLoadErrorColor('warning')
        setLoadError(
          err?.message
            ? `Final appraisals could not be loaded. Showing feedback records only. ${err.message}`
            : 'Final appraisals could not be loaded. Showing feedback records only.',
        )
      }

      setRecords([
        ...feedbackRecords.map((record) => ({
          ...record,
          recordKind: 'feedback',
          rowKey: `feedback-${record.id}`,
        })),
        ...finalRecords.map((record) => ({
          ...record,
          recordKind: 'final',
          rowKey: `final-${record.id}`,
        })),
      ])
    } catch (err) {
      setRecords([])
      setLoadErrorColor('danger')
      setLoadError(err.message || 'Failed to load appraisal records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const normalizedRecords = useMemo(
    () =>
      records.map((record) => {
        const isFinal = record.recordKind === 'final'
        return {
          ...record,
          createdAt: record.created_at || '',
          staff: `${record.staff_name || '-'} (${record.staff_code || '-'})${
            record.staff_position ? `, ${record.staff_position}` : ''
          }${record.staff_department ? `, ${record.staff_department}` : ''}`,
          appraisalBy: `${record.creator_name || '-'} (${record.creator_code || '-'})${
            record.creator_position ? `, ${record.creator_position}` : ''
          }${record.creator_department ? `, ${record.creator_department}` : ''}`,
          eventDate: isFinal ? record.appraisal_date || '' : record.event_date || '',
          section: isFinal ? 'Final Appraisal' : record.section || '-',
          feedback: isFinal
            ? `Overall ${record.overall_performance || '-'} / 5 - ${record.supervisor_comments || ''}`
            : record.feedback || '',
        }
      }),
    [records],
  )

  const staffOptions = useMemo(
    () =>
      [
        ...new Map(
          normalizedRecords
            .filter((record) => record.staff_id)
            .map((record) => [
              String(record.staff_id),
              {
                value: String(record.staff_id),
                label: `${record.staff_name} (${record.staff_code})`,
              },
            ]),
        ).values(),
      ].sort((left, right) => left.label.localeCompare(right.label)),
    [normalizedRecords],
  )

  const typeOptions = useMemo(
    () => [...new Set(normalizedRecords.map((record) => record.section).filter(Boolean))].sort(),
    [normalizedRecords],
  )

  const filteredRecords = useMemo(() => {
    const term = searchText.trim().toLowerCase()
    return normalizedRecords.filter((record) => {
      const searchableText = [
        record.staff,
        record.appraisalBy,
        record.eventDate,
        record.section,
        record.feedback,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesSearch = !term || searchableText.includes(term)
      const matchesStaff = !filterStaff || String(record.staff_id) === filterStaff
      const matchesType = !filterType || record.section === filterType
      const matchesPeriod = isDateInPeriodRange(record.eventDate || record.createdAt, periodRange)
      return matchesSearch && matchesStaff && matchesType && matchesPeriod
    })
  }, [filterStaff, filterType, normalizedRecords, periodRange, searchText])

  const activeChips = useMemo(
    () =>
      [
        filterStaff
          ? {
              key: 'staff',
              label: `Staff: ${staffOptions.find((option) => option.value === filterStaff)?.label || filterStaff}`,
            }
          : null,
        filterType ? { key: 'type', label: `Type: ${filterType}` } : null,
        periodRange && !isDefaultPeriodRange(periodRange)
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
          : null,
      ].filter(Boolean),
    [filterStaff, filterType, periodRange, staffOptions],
  )

  const clearChip = (key) => {
    if (key === 'staff') setFilterStaff('')
    if (key === 'type') setFilterType('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const resetFilters = () => {
    setSearchText('')
    setFilterStaff('')
    setFilterType('')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const statsItems = useMemo(() => {
    const currentYear = String(new Date().getFullYear())
    const currentYearRows = filteredRecords.filter((record) =>
      record.eventDate?.startsWith(currentYear),
    )
    const staffCount = new Set(filteredRecords.map((record) => record.staff_id).filter(Boolean))
      .size

    return [
      {
        key: 'records',
        label: 'Appraisals',
        value: formatCount(filteredRecords.length),
        tone: 'primary',
      },
      {
        key: 'staff',
        label: 'Staff Covered',
        value: formatCount(staffCount),
        tone: 'info',
      },
      {
        key: 'current-year',
        label: currentYear,
        value: formatCount(currentYearRows.length),
        tone: 'success',
      },
      {
        key: 'types',
        label: 'Types',
        value: formatCount(new Set(filteredRecords.map((record) => record.section)).size),
        tone: 'secondary',
      },
    ]
  }, [filteredRecords])

  const handleEdit = (record) => {
    if (record.recordKind === 'final') {
      navigate(`/staff/appraise/final-appraisal/${record.id}`)
      return
    }

    setEditingRecordId(record.id)
    setEditSection(record.section)
    setEditFormData({
      selectedStaff: record.staff_id || '',
      eventDate: record.event_date,
      quickInput: record.feedback,
    })
    setEditModalVisible(true)
  }

  const handleEditSubmit = async () => {
    if (!editingRecordId) return
    const editingActionKey = `feedback-${editingRecordId}`
    try {
      setActionState({ id: editingActionKey, type: 'edit' })
      await updateAppraisalRecord({
        id: editingRecordId,
        feedback: editFormData.quickInput,
        event_date: editFormData.eventDate,
      })
      setEditModalVisible(false)
      setEditingRecordId(null)
      await loadRecords()
      dialog.alert('Appraisal updated.')
    } catch (err) {
      dialog.alert(err.message || 'Failed to update appraisal.')
    } finally {
      setActionState({ id: null, type: '' })
    }
  }

  const handleDelete = async (record) => {
    const confirmed = await dialog.confirm(
      record.recordKind === 'final'
        ? 'Delete this final appraisal record?'
        : 'Delete this appraisal record?',
    )
    if (!confirmed) return

    const actionKey = getRecordActionKey(record)
    try {
      setActionState({ id: actionKey, type: 'delete' })
      if (record.recordKind === 'final') {
        await deleteFinalAppraisal(record.id)
      } else {
        await deleteAppraisalRecord(record.id)
      }
      setRecords((prev) => prev.filter((item) => getRecordActionKey(item) !== actionKey))
      dialog.alert(
        record.recordKind === 'final' ? 'Final appraisal deleted.' : 'Appraisal deleted.',
      )
    } catch (err) {
      dialog.alert(err.message || 'Failed to delete appraisal record.')
    } finally {
      setActionState({ id: null, type: '' })
    }
  }

  const getActions = (record) => [
    {
      key: 'edit',
      label:
        actionState.id === getRecordActionKey(record) && actionState.type === 'edit'
          ? 'Saving...'
          : 'Edit',
      disabled: actionState.id === getRecordActionKey(record) && actionState.type === 'edit',
      onClick: () => handleEdit(record),
    },
    {
      key: 'delete',
      label:
        actionState.id === getRecordActionKey(record) && actionState.type === 'delete'
          ? 'Deleting...'
          : 'Delete',
      danger: true,
      dividerBefore: true,
      disabled: actionState.id === getRecordActionKey(record) && actionState.type === 'delete',
      onClick: () => handleDelete(record),
    },
  ]

  const renderCell = (record, column) => {
    if (column.key === 'feedback') {
      return (
        <DataTableTextCell
          value={record.feedback}
          maxWidth="260px"
          title="Feedback"
          mode="expandable"
          previewCharThreshold={42}
        />
      )
    }
    return record[column.key] || '-'
  }

  return (
    <>
      <CCard className={`mb-4 ${className}`}>
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
          <strong>Appraisal Records</strong>
          {(onAddFeedback || onFinalAppraisal) && (
            <CDropdown alignment="end">
              <CDropdownToggle color="primary" size="sm">
                Actions
              </CDropdownToggle>
              <CDropdownMenu>
                {onAddFeedback && (
                  <CDropdownItem onClick={onAddFeedback}>Add Feedback</CDropdownItem>
                )}
                {onFinalAppraisal && (
                  <CDropdownItem onClick={onFinalAppraisal}>Final Appraisal</CDropdownItem>
                )}
              </CDropdownMenu>
            </CDropdown>
          )}
        </CCardHeader>
        <CCardBody>
          <>
            {loadError && (
              <CAlert color={loadErrorColor} className="mb-3">
                {loadError}
              </CAlert>
            )}
            <StatsStrip
              items={statsItems}
              scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
              loading={loading}
            />
            <DataTableRecordControls
              searchValue={searchText}
              onSearchChange={setSearchText}
              searchPlaceholder="Search staff, appraiser, type, or feedback..."
              searchAriaLabel="Search appraisal records"
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              activeFilterCount={getAdvancedFilterCount(activeChips)}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={resetFilters}
              desktopToolsId="appraisal-record-table-tools"
              mobileToolsId="appraisal-record-mobile-table-tools"
              loading={loading}
            >
              <CCol xs={12} md={4} lg={3}>
                <CFormLabel htmlFor="appraisal-filter-staff">Staff</CFormLabel>
                <CFormSelect
                  id="appraisal-filter-staff"
                  value={filterStaff}
                  onChange={(event) => setFilterStaff(event.target.value)}
                >
                  <option value="">All staff</option>
                  {staffOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={6} md={3} lg={2}>
                <CFormLabel htmlFor="appraisal-filter-type">Type</CFormLabel>
                <CFormSelect
                  id="appraisal-filter-type"
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                >
                  <option value="">All types</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </DataTableRecordControls>

            <DataTableRecordList
              rows={filteredRecords}
              loading={loading}
              loadingMessage="Loading appraisal records..."
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey="staff.appraise.records.visible-columns.v1"
              apiKey="staff-appraise-records-visible-columns-v1"
              idPrefix="staff-appraise-record"
              emptyMessage="No appraisal records found."
              exportFilename={`staff-appraisal-records-${new Date().toISOString().slice(0, 10)}.csv`}
              getRowKey={(record, index) => record.rowKey || record.id || index}
              renderCell={renderCell}
              getActions={getActions}
              onRowOpen={(record) => {
                if (record.recordKind === 'final') {
                  navigate(`/staff/appraise/final-appraisal/records/${record.id}`, {
                    state: { record, returnTo: '/staff/appraise' },
                  })
                  return
                }

                navigate(`/staff/appraise/records/${record.id}`, {
                  state: { record, returnTo: '/staff/appraise' },
                })
              }}
              getMobileTitle={(record) => record.staff}
              getMobileSubtitle={(record) => record.section}
              getMobileMeta={(record) => `${record.eventDate} | ${record.appraisalBy}`}
              mobileFieldKeys={{
                title: 'staff',
                subtitle: 'section',
                meta: ['eventDate', 'appraisalBy'],
              }}
              initialSortField="createdAt"
              initialSortDir="desc"
              initialSortDirByField={{ createdAt: 'desc', eventDate: 'desc' }}
              renderQuickFilters={() => (
                <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
              )}
              resetDeps={[filteredRecords, searchText, filterStaff, filterType, periodRange]}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="appraisal-record-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="appraisal-record-mobile-table-tools"
              showMobileUtilityRow={false}
            />
          </>
        </CCardBody>
      </CCard>

      <AppraisalModal
        visible={editModalVisible}
        section={editSection}
        title={`Edit ${editSection || 'Appraisal'}`}
        formData={editFormData}
        disableStaffSelect
        onClose={() => {
          setEditModalVisible(false)
          setEditingRecordId(null)
        }}
        onInputChange={(event) => handleInputChange(event, setEditFormData)}
        onSubmit={handleEditSubmit}
        submitLabel={actionState.type === 'edit' ? 'Saving...' : 'Update'}
        infoContent={infoDetails[editSection]}
      />
    </>
  )
}

export default ViewAppraisal
