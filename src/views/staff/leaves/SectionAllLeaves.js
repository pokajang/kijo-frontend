import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
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
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
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
import { formatCount, getTopGroupBySum, sumBy } from '../../../utils/stats/formatStats'
import * as AH from './actionHandlers'

const dataColumns = [
  {
    key: 'appliedAt',
    label: 'Applied',
    width: '140px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.appliedAt || '',
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
    key: 'leave',
    label: 'Leave Type',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    getExportValue: (record) => record.leave || '',
  },
  {
    key: 'reason',
    label: 'Reason',
    width: '230px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '230px',
    previewCharThreshold: 34,
    getExportValue: (record) => record.reason || '',
  },
  {
    key: 'period',
    label: 'Period',
    width: '220px',
    sortable: true,
    sortType: 'date',
    getExportValue: (record) => record.period || '',
  },
  {
    key: 'duration',
    label: 'Duration',
    width: '96px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.duration || '',
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.status || '',
  },
  {
    key: 'workflow',
    label: 'Workflow',
    width: '260px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '260px',
    previewCharThreshold: 42,
    getExportValue: (record) => record.workflow || '',
  },
]

const defaultVisibleColumns = {
  appliedAt: true,
  staff: true,
  leave: true,
  reason: true,
  period: true,
  duration: true,
  status: true,
  workflow: false,
}

const requiredColumns = new Set(['staff', 'status'])

const formatTime = (value) => {
  if (!value) return '-'
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

const getStatusTone = (status) => {
  switch (status) {
    case 'Pending':
      return 'warning'
    case 'Approved':
      return 'success'
    case 'Rejected':
      return 'danger'
    case 'Cancelled':
      return 'info'
    default:
      return 'dark'
  }
}

export const getLeaveApplicationScopeDate = (record = {}) =>
  record.applied_at || record.start_date || null

const SectionAllLeaves = ({
  allLeaveRecords = [],
  fetchAllLeaveRecords,
  onManageEntitlements,
  onAssignLeave,
  onViewRecord,
}) => {
  const [searchText, setSearchText] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [actionModal, setActionModal] = useState({
    visible: false,
    leaveId: null,
    action: '',
    label: '',
  })
  const [remarks, setRemarks] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [responseModal, setResponseModal] = useState({
    visible: false,
    title: '',
    message: '',
    color: 'info',
  })

  const typeOptions = useMemo(
    () => [...new Set(allLeaveRecords.map((r) => r.type).filter(Boolean))].sort(),
    [allLeaveRecords],
  )

  const statusOptions = useMemo(
    () => [...new Set(allLeaveRecords.map((r) => r.status).filter(Boolean))].sort(),
    [allLeaveRecords],
  )

  const openActionModal = (leaveId, action) => {
    const label = action[0].toUpperCase() + action.slice(1)
    setActionModal({ visible: true, leaveId, action, label })
    setRemarks(label)
  }

  const getPastActionLabel = (action) => {
    switch (action) {
      case 'recommend':
        return 'recommended'
      case 'approve':
        return 'approved'
      case 'reject':
        return 'rejected'
      default:
        return `${action}ed`
    }
  }

  const closeActionModal = (force = false) => {
    if (isSubmittingAction && !force) return
    setActionModal({ visible: false, leaveId: null, action: '', label: '' })
    setRemarks('')
  }

  const showResponseModal = (title, message, color) => {
    setResponseModal({ visible: true, title, message, color })
  }

  const handleActionSubmit = async () => {
    if (!actionModal.leaveId || !actionModal.action) return
    try {
      setIsSubmittingAction(true)
      await AH.leaveAction(actionModal.leaveId, actionModal.action, remarks)
      closeActionModal(true)
      showResponseModal(
        'Action Completed',
        `Leave successfully ${getPastActionLabel(actionModal.action)}.`,
        'success',
      )
      fetchAllLeaveRecords()
    } catch (err) {
      console.error(err)
      closeActionModal(true)
      showResponseModal(
        'Action Failed',
        `Failed to ${actionModal.action}: ${err.message}`,
        'danger',
      )
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const activeChips = useMemo(
    () =>
      [
        filterType ? { key: 'type', label: `Type: ${filterType}` } : null,
        filterStatus ? { key: 'status', label: `Status: ${filterStatus}` } : null,
        periodRange && !isDefaultPeriodRange(periodRange)
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
          : null,
      ].filter(Boolean),
    [filterType, filterStatus, periodRange],
  )

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const clearChip = (key) => {
    if (key === 'type') setFilterType('')
    if (key === 'status') setFilterStatus('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const resetFilters = () => {
    setSearchText('')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setFilterType('')
    setFilterStatus('')
  }

  const filteredRecords = useMemo(
    () =>
      allLeaveRecords.filter((record) => {
        const term = searchText.trim().toLowerCase()
        const searchableText = [
          record.applicant_name,
          record.applicant_code,
          record.type,
          record.reason,
          record.status,
          record.reviewer_name,
          record.reviewer_code,
          record.approver_name,
          record.approver_code,
          record.reviewed_status,
          record.approved_status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const nameMatch = !term || searchableText.includes(term)
        const periodMatch = isDateInPeriodRange(getLeaveApplicationScopeDate(record), periodRange)
        const typeMatch = !filterType || record.type === filterType
        const statusMatch = !filterStatus || record.status === filterStatus
        return nameMatch && periodMatch && typeMatch && statusMatch
      }),
    [allLeaveRecords, searchText, periodRange, filterType, filterStatus],
  )

  const normalizedRecords = useMemo(
    () =>
      filteredRecords.map((record) => {
        const staff = `${record.applicant_name || 'Unknown'}${
          record.applicant_code ? ` (${record.applicant_code})` : ''
        }`
        const reviewer = record.reviewer_code
          ? `${record.reviewer_name || 'Reviewer'} (${record.reviewer_code})`
          : ''
        const approver = record.approver_code
          ? `${record.approver_name || 'Approver'} (${record.approver_code})`
          : ''
        const period = `${record.start_date || '-'} ${formatTime(
          record.start_time,
        )} to ${record.end_date || '-'} ${formatTime(record.end_time)}`
        const workflow = [
          reviewer
            ? `Reviewer: ${reviewer}${record.reviewed_at ? ` at ${record.reviewed_at}` : ''}${
                record.reviewed_status ? ` - ${record.reviewed_status}` : ''
              }${record.reviewed_remarks ? ` (${record.reviewed_remarks})` : ''}`
            : '',
          approver
            ? `Approver: ${approver}${record.approved_at ? ` at ${record.approved_at}` : ''}${
                record.approved_status ? ` - ${record.approved_status}` : ''
              }${record.approved_remarks ? ` (${record.approved_remarks})` : ''}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')

        return {
          ...record,
          appliedAt: record.applied_at || '',
          staff,
          leave: record.type || '-',
          period,
          duration: Number(record.duration_days || 0),
          durationDisplay: `${record.duration_days || 0} days`,
          reason: record.reason || '',
          workflow,
          mobileMeta: [
            `${record.duration_days || 0} days`,
            period,
            reviewer ? `Reviewer: ${record.reviewer_code}` : '',
            approver ? `Approver: ${record.approver_code}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
        }
      }),
    [filteredRecords],
  )

  const statsItems = useMemo(() => {
    const pendingRows = normalizedRecords.filter((record) => record.status === 'Pending')
    const approvedRows = normalizedRecords.filter((record) => record.status === 'Approved')
    const topStaff = getTopGroupBySum(
      normalizedRecords,
      (record) => record.staff,
      (record) => record.duration,
    )

    return [
      {
        key: 'requests',
        label: 'Leave Requests',
        value: formatCount(normalizedRecords.length),
        tone: 'primary',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: formatCount(pendingRows.length),
        tone: 'warning',
      },
      {
        key: 'approved-days',
        label: 'Approved Days',
        value: formatCount(sumBy(approvedRows, (record) => record.duration)),
        sublabel: `${formatCount(approvedRows.length)} approved requests`,
        tone: 'success',
      },
      {
        key: 'top-staff',
        label: 'Top Staff',
        value: topStaff.value,
        sublabel: `${formatCount(topStaff.total)} days across ${formatCount(
          topStaff.count,
        )} requests`,
        tone: 'secondary',
      },
    ]
  }, [normalizedRecords])

  const getActions = (record) => {
    const isPending = record.status === 'Pending'
    const hasReviewed = Boolean(record.reviewed_by)
    return [
      {
        key: 'recommend',
        label: 'Recommend',
        disabled: !isPending || hasReviewed,
        onClick: () => openActionModal(record.id, 'recommend'),
      },
      {
        key: 'approve',
        label: 'Approve',
        disabled: !isPending || !hasReviewed,
        onClick: () => openActionModal(record.id, 'approve'),
      },
      {
        key: 'reject',
        label: 'Reject',
        danger: true,
        disabled: !isPending,
        dividerBefore: true,
        onClick: () => openActionModal(record.id, 'reject'),
      },
    ]
  }

  const renderCell = (record, column) => {
    if (column.key === 'reason') {
      return (
        <DataTableTextCell
          value={record.reason}
          maxWidth="230px"
          title="Reason"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    if (column.key === 'duration') {
      return record.durationDisplay
    }
    if (column.key === 'workflow') {
      return (
        <DataTableTextCell
          value={record.workflow}
          maxWidth="260px"
          title="Workflow"
          mode="expandable"
          previewCharThreshold={42}
        />
      )
    }
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(record.status)}>
          {record.status}
        </DataTableStatusBadge>
      )
    }
    return record[column.key] || '-'
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
          <strong>All Leave Records</strong>
          {(onManageEntitlements || onAssignLeave) && (
            <CDropdown alignment="end">
              <CDropdownToggle color="primary" size="sm">
                Actions
              </CDropdownToggle>
              <CDropdownMenu>
                {onManageEntitlements && (
                  <CDropdownItem onClick={onManageEntitlements}>Entitlements</CDropdownItem>
                )}
                {onAssignLeave && (
                  <CDropdownItem onClick={onAssignLeave}>Assign Leave</CDropdownItem>
                )}
              </CDropdownMenu>
            </CDropdown>
          )}
        </CCardHeader>
        <CCardBody>
          <StatsStrip
            items={statsItems}
            scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
          />
          <DataTableRecordControls
            searchValue={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder="Search by staff name or code..."
            searchAriaLabel="Search leave records"
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            activeFilterCount={activeFilterCount}
            activeChips={activeChips}
            clearChip={clearChip}
            resetFilters={resetFilters}
            desktopToolsId="all-leaves-table-tools"
            mobileToolsId="all-leaves-mobile-table-tools"
          >
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="leaves-filter-type">Leave Type</CFormLabel>
              <CFormSelect
                id="leaves-filter-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="leaves-filter-status">Status</CFormLabel>
              <CFormSelect
                id="leaves-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </DataTableRecordControls>

          <DataTableRecordList
            rows={normalizedRecords}
            dataColumns={dataColumns}
            defaultVisibleColumns={defaultVisibleColumns}
            requiredColumns={requiredColumns}
            storageKey="staff.leaves.all.visible-columns.v5"
            idPrefix="staff-leave-all"
            emptyMessage="No matching leave records found."
            exportFilename={`all-leave-records-${new Date().toISOString().slice(0, 10)}.csv`}
            getRowKey={(record, index) => record.id || index}
            renderCell={renderCell}
            getActions={getActions}
            onRowOpen={onViewRecord}
            actionColumnWidth="56px"
            getMobileTitle={(record) => record.staff}
            getMobileSubtitle={(record) => record.leave}
            getMobileMeta={(record) => record.mobileMeta}
            getMobileStatus={(record) => record.status}
            getMobileStatusTone={(record) => getStatusTone(record.status)}
            mobileFieldKeys={{
              title: 'staff',
              subtitle: 'leave',
              meta: ['reason', 'duration', 'period'],
              status: 'status',
            }}
            mobileRecord={{
              title: (record) => record.staff,
              badges: (record) => [
                {
                  key: 'status',
                  label: record.status,
                  tone: getStatusTone(record.status),
                },
              ],
              subtitle: (record) => record.leave,
              meta: (record) => [record.reason, record.mobileMeta].filter(Boolean).join(' | '),
              kv: (record) => [
                {
                  key: 'duration',
                  label: 'Duration',
                  value: record.durationDisplay,
                },
              ],
            }}
            initialSortField="appliedAt"
            initialSortDir="desc"
            initialSortDirByField={{ appliedAt: 'desc', duration: 'desc' }}
            resetDeps={[filteredRecords, searchText, periodRange, filterType, filterStatus]}
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId="all-leaves-table-tools"
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId="all-leaves-mobile-table-tools"
            showMobileUtilityRow={false}
            renderQuickFilters={() => (
              <PeriodRangeSelector
                value={periodRange}
                onChange={setPeriodRange}
                className="d-none d-lg-block"
              />
            )}
          />
        </CCardBody>
      </CCard>

      <CModal
        visible={actionModal.visible}
        onClose={closeActionModal}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>{actionModal.label} Leave</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">
            Confirm to {actionModal.label.toLowerCase()} this leave and provide remarks.
          </p>
          <CFormTextarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks"
            disabled={isSubmittingAction}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={closeActionModal}
            disabled={isSubmittingAction}
          >
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleActionSubmit} disabled={isSubmittingAction}>
            {isSubmittingAction ? 'Submitting...' : actionModal.label || 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={responseModal.visible}
        onClose={() => setResponseModal((prev) => ({ ...prev, visible: false }))}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>{responseModal.title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color={responseModal.color} className="mb-0">
            {responseModal.message}
          </CAlert>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="primary"
            onClick={() => setResponseModal((prev) => ({ ...prev, visible: false }))}
          >
            OK
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default SectionAllLeaves
