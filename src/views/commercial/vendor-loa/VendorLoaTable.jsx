import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTableRecordList, DataTableStatusBadge } from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { formatCount, formatMoney, getTopGroupBySum, sumBy } from '../../../utils/stats/formatStats'
import MarkPaidModal from './MarkPaidModal'
import VendorLoaEditModal from './VendorLoaEditModal'
import dialog from '../../../components/dialog/dialogService'

const emptyValue = '-'
const columnStorageKey = 'commercial.vendor-loa.visible-columns.v3'

const defaultVisibleColumns = {
  loa: true,
  vendor: true,
  project: true,
  service: false,
  value: true,
  award: true,
  requested: false,
  approved: false,
  status: true,
}

const requiredColumns = new Set(['loa', 'vendor', 'status'])

const dataColumns = [
  {
    key: 'loa',
    label: 'LOA',
    width: '130px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  { key: 'vendor', label: 'Vendor', width: '210px', sortable: true, sortType: 'string' },
  { key: 'project', label: 'Project', width: '240px', sortable: true, sortType: 'string' },
  {
    key: 'service',
    label: 'Service',
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
    getExportValue: (rec) => rec.valueDisplay,
  },
  {
    key: 'award',
    label: 'Award',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (rec) => rec.awardDisplay,
  },
  {
    key: 'awardBy',
    label: 'Award By',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'requested',
    label: 'Requested',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (rec) => rec.requestedDisplay,
  },
  {
    key: 'approved',
    label: 'Approved',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (rec) => rec.approvedDisplay,
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
]

const canManagePaidStatus = (roles = []) => {
  const safeRoles = Array.isArray(roles) ? roles : []
  return safeRoles.some((role) => {
    const text = String(role || '').toLowerCase()
    return (
      text.includes('manager') ||
      text.includes('admin') ||
      text.includes('finance') ||
      text.includes('account') ||
      text.includes('bank')
    )
  })
}

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('paid') || normalized.includes('approved')) return 'success'
  if (normalized.includes('reject') || normalized.includes('fail')) return 'danger'
  return 'info'
}

const VendorLoaTable = ({
  records = [],
  loading = false,
  staffRoles = [],
  onRefresh,
  scopeLabel = 'All years',
  beforeList,
  renderQuickFilters,
  desktopUtilityPortalId,
  mobileUtilityPortalId,
  onStatFilter,
}) => {
  const navigate = useNavigate()
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [markPaidVisible, setMarkPaidVisible] = useState(false)
  const [submittingPaid, setSubmittingPaid] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const canManage = canManagePaidStatus(staffRoles)

  const handleMarkPaid = (record) => {
    setSelectedRecord(record)
    setMarkPaidVisible(true)
  }

  const handleCloseModal = () => {
    setMarkPaidVisible(false)
    setSelectedRecord(null)
  }

  const handleGenerateLoa = (record) => {
    if (!record?.project_id || !record?.vendor_id) return

    const params = new URLSearchParams({
      project_id: String(record.project_id),
      vendor_id: String(record.vendor_id),
    })

    if (record.id) {
      params.set('assignment_id', String(record.id))
    }

    window.open(
      `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(record.project_id)}/loa?${params.toString()}`,
      '_blank',
    )
  }

  const handleEdit = (record) => {
    setSelectedRecord(record)
    setEditVisible(true)
  }

  const handleCloseEdit = () => {
    setEditVisible(false)
    setSelectedRecord(null)
  }

  const handleSaveEdit = async (record) => {
    if (!record?.id || !record?.project_id || !record?.vendor_id) {
      dialog.alert('Missing Vendor LOA details. Please refresh and try again.')
      return false
    }

    setSubmittingEdit(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(record.project_id)}/vendors/${encodeURIComponent(record.id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            assignment_id: record.id,
            project_id: record.project_id,
            vendor_id: record.vendor_id,
            award_value: record.award_value,
            position: record.position || '',
            remarks: record.remarks || '',
            services_description: record.services_description || '',
            venue_details: record.venue_details || '',
            fee_breakdown: record.fee_breakdown || '',
            payment_terms: record.payment_terms || '',
          }),
        },
      )
      const result = await res.json()
      if (res.ok && result.status === 'success') {
        dialog.alert('Vendor LOA updated successfully.')
        handleCloseEdit()
        if (typeof onRefresh === 'function') {
          await onRefresh()
        }
        return true
      }

      dialog.alert(result.message || 'Failed to update Vendor LOA.')
      return false
    } catch (error) {
      console.error('Update Vendor LOA error:', error)
      dialog.alert('Server error while updating Vendor LOA.')
      return false
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleDelete = async (record) => {
    if (!record?.id || !record?.project_id || !record?.vendor_id) {
      dialog.alert('Missing Vendor LOA details. Please refresh and try again.')
      return
    }

    const confirmed = await dialog.confirm(
      `Are you sure you want to delete LOA ${record.loa_ref_no || record.loa || ''}?`,
    )
    if (!confirmed) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(record.project_id)}/vendors/${encodeURIComponent(record.id)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            project_id: record.project_id,
            vendor_id: record.vendor_id,
            assignment_id: record.id,
          }),
        },
      )
      const result = await res.json()
      if (res.ok && result.status === 'success') {
        dialog.alert('Vendor LOA deleted successfully.')
        if (typeof onRefresh === 'function') {
          await onRefresh()
        }
        return
      }

      dialog.alert(result.message || 'Failed to delete Vendor LOA.')
    } catch (error) {
      console.error('Delete Vendor LOA error:', error)
      dialog.alert('Server error while deleting Vendor LOA.')
    }
  }

  const handleConfirmPaid = async ({ transactionDate, vendor_id, project_id, payment_id }) => {
    if (!payment_id || !vendor_id || !project_id || !transactionDate) {
      dialog.alert('Missing payment details. Please refresh and try again.')
      return false
    }

    setSubmittingPaid(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}vendor-loas/payment-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payment_id,
          payment_id,
          vendor_id,
          project_id,
          transaction_date: transactionDate,
        }),
        credentials: 'include',
      })

      const result = await res.json()
      if (res.ok && (result?.status === 'success' || result?.success === true)) {
        dialog.alert('Payment marked as Paid.')
        handleCloseModal()
        if (typeof onRefresh === 'function') {
          await onRefresh()
        }
        return true
      }

      dialog.alert('Failed: ' + result.message)
      return false
    } catch (error) {
      console.error('Error:', error)
      dialog.alert('Unexpected error occurred.')
      return false
    } finally {
      setSubmittingPaid(false)
    }
  }

  const normalizedRecords = useMemo(
    () =>
      records.map((rec) => ({
        ...rec,
        loa: rec.loa_ref_no || emptyValue,
        vendor: rec.vendor_name || emptyValue,
        project: rec.project_name || emptyValue,
        service: rec.services_description || emptyValue,
        value: Number(rec.award_value || 0),
        valueDisplay: Number(rec.award_value || 0).toFixed(2),
        award: rec.award_date || '',
        awardDisplay: rec.award_date || emptyValue,
        awardBy: rec.award_by || emptyValue,
        requested: rec.payment_requested_on || '',
        requestedDisplay: rec.payment_requested_on || emptyValue,
        approved: rec.payment_approved_on || '',
        approvedDisplay: rec.payment_approved_on || emptyValue,
        status: rec.status || 'Pending',
      })),
    [records],
  )

  const statsItems = useMemo(() => {
    const isSuccess = (record) => {
      const status = String(record.status || '').toLowerCase()
      return status.includes('paid') || status.includes('approved')
    }
    const isFailure = (record) => {
      const status = String(record.status || '').toLowerCase()
      return status.includes('reject') || status.includes('fail')
    }
    const pendingRows = normalizedRecords.filter(
      (record) => !isSuccess(record) && !isFailure(record),
    )
    const topAwardBy = getTopGroupBySum(
      normalizedRecords,
      (record) => record.awardBy,
      (record) => record.value,
    )

    return [
      {
        key: 'loas',
        label: 'LOAs',
        value: formatCount(normalizedRecords.length),
        tone: 'primary',
      },
      {
        key: 'total-value',
        label: 'Total Value',
        value: formatMoney(sumBy(normalizedRecords, (record) => record.value)),
        tone: 'info',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: formatCount(pendingRows.length),
        sublabel: formatMoney(sumBy(pendingRows, (record) => record.value)),
        tone: 'warning',
      },
      {
        key: 'top-award-by',
        label: 'Top Award By',
        value: topAwardBy.value,
        sublabel: `${formatMoney(topAwardBy.total)} across ${formatCount(topAwardBy.count)} LOAs`,
        tone: 'secondary',
        onClick:
          onStatFilter && topAwardBy.value && topAwardBy.value !== emptyValue
            ? () => onStatFilter('pic', topAwardBy.value)
            : undefined,
      },
    ]
  }, [normalizedRecords, onStatFilter])

  const canMarkPaid = (rec) => {
    const statusRaw = String(rec.payment_status_raw || '').toLowerCase()
    return canManage && !!rec.payment_id && statusRaw === 'approved' && !!rec.payment_approved_on
  }

  const getMarkPaidDisabledReason = (rec) => {
    if (canMarkPaid(rec)) return ''
    if (!canManage) return 'Only manager, admin, finance, account, or bank roles can mark paid'
    if (!rec.payment_id) return 'No payment request exists for this LOA'
    if (String(rec.payment_status_raw || '').toLowerCase() !== 'approved') {
      return 'Payment must be approved before marking paid'
    }
    if (!rec.payment_approved_on) return 'Payment approval date is missing'
    return 'This LOA is not eligible to be marked paid'
  }

  const getActions = (rec) => [
    {
      key: 'view',
      label: 'View',
      onClick: (record) => navigate(`/commercial/vendor-loa/${record.id || record.payment_id}`),
    },
    {
      key: 'edit',
      label: 'Edit',
      onClick: handleEdit,
    },
    {
      key: 'generate-loa',
      label: 'Generate LOA',
      onClick: handleGenerateLoa,
    },
    {
      key: 'mark-paid',
      label: 'Mark Paid',
      disabled: !canMarkPaid(rec),
      className: !canMarkPaid(rec) ? 'text-muted' : '',
      tooltip: getMarkPaidDisabledReason(rec),
      onClick: () => canMarkPaid(rec) && handleMarkPaid(rec),
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: handleDelete,
    },
  ]

  const renderCell = (rec, column) => {
    if (column.key === 'value') return rec.valueDisplay
    if (column.key === 'award') return rec.awardDisplay
    if (column.key === 'requested') return rec.requestedDisplay
    if (column.key === 'approved') return rec.approvedDisplay
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(rec.status)}>{rec.status}</DataTableStatusBadge>
      )
    }

    return rec[column.key] || emptyValue
  }

  return (
    <>
      <StatsStrip items={statsItems} scopeLabel={scopeLabel} loading={loading} />
      {beforeList}
      <DataTableRecordList
        rows={normalizedRecords}
        loading={loading}
        loadingMessage="Loading vendor LOA records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey={columnStorageKey}
        idPrefix="vendor-loa-record"
        emptyMessage="No letter of award records found."
        exportFilename={`vendor-loa-records-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId={desktopUtilityPortalId}
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId={mobileUtilityPortalId}
        showMobileUtilityRow={false}
        renderQuickFilters={renderQuickFilters}
        getRowKey={(rec, index) => rec.id || rec.payment_id || `${rec.loa}-${index}`}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={(rec) => navigate(`/commercial/vendor-loa/${rec.id || rec.payment_id}`)}
        getMobileTitle={(rec) => rec.loa}
        getMobileSubtitle={(rec) => rec.vendor}
        getMobileMeta={(rec) => `${rec.valueDisplay} | ${rec.awardDisplay}`}
        getMobileStatus={(rec) => rec.status}
        getMobileStatusTone={(rec) => getStatusTone(rec.status)}
        mobileFieldKeys={{
          title: 'loa',
          subtitle: 'vendor',
          meta: ['value', 'award'],
          status: 'status',
        }}
        initialSortField="award"
        initialSortDir="desc"
        initialSortDirByField={{
          award: 'desc',
          requested: 'desc',
          approved: 'desc',
          value: 'desc',
        }}
        getSortValue={(record, field) => record[field]}
        resetDeps={[records]}
        actionColumnWidth="56px"
      />

      <MarkPaidModal
        visible={markPaidVisible}
        onClose={handleCloseModal}
        onConfirm={handleConfirmPaid}
        record={selectedRecord}
        submitting={submittingPaid}
      />
      <VendorLoaEditModal
        visible={editVisible}
        record={selectedRecord}
        submitting={submittingEdit}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />
    </>
  )
}

export default VendorLoaTable
