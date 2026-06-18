import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataTableRecordList, DataTableStatusBadge } from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { countByPredicate, formatCount } from '../../../utils/stats/formatStats'
import EditJd14Modal from './EditJd14Modal'
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'

const emptyValue = '-'
const columnStorageKey = 'commercial.jd14.visible-columns.v3'

const defaultVisibleColumns = {
  approvalNo: true,
  employer: true,
  course: true,
  commenced: true,
  ended: false,
  venue: false,
  status: true,
}

const requiredColumns = new Set(['approvalNo', 'employer', 'status'])

const dataColumns = [
  {
    key: 'approvalNo',
    label: 'Approval No',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'employer',
    label: 'Employer',
    width: '220px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'course',
    label: 'Course',
    width: '240px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'commenced',
    label: 'Commenced',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (form) => form.commencedDisplay,
  },
  {
    key: 'ended',
    label: 'Ended',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (form) => form.endedDisplay,
  },
  {
    key: 'venue',
    label: 'Venue',
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
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw
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

const getFormStatus = (form) => {
  const started = parseLocalDate(form?.commenced_date)
  const ended = parseLocalDate(form?.end_date)

  if (!started && !ended) return 'Unknown'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (started && today < started) return 'Upcoming'
  if (ended && today > ended) return 'Completed'
  return 'Ongoing'
}

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'completed') return 'success'
  if (normalized === 'ongoing') return 'info'
  if (normalized === 'upcoming') return 'warning'
  return 'secondary'
}

const JD14Table = ({
  forms = [],
  loading = false,
  beforeList,
  renderQuickFilters,
  desktopUtilityPortalId,
  mobileUtilityPortalId,
  onStatFilter,
  onRefresh,
  statsVisible = true,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [editJd14Visible, setEditJd14Visible] = useState(false)
  const [selectedForm, setSelectedForm] = useState(null)

  const handleViewJd14 = (form) => {
    setSelectedForm(form)
    setEditJd14Visible(true)
  }

  const handleGeneratePdfJd14 = (form) => {
    window.open(
      `${import.meta.env.VITE_API_BASE}jd14-forms/${encodeURIComponent(form.id)}/pdf`,
      '_blank',
    )
  }

  const handleDeleteJd14 = async (form) => {
    const confirmDelete = await dialog.confirm(
      `Are you sure you want to delete JD14 record: ${form.approval_no}?`,
      {
        confirmText: 'Delete',
        confirmColor: 'danger',
      },
    )
    if (!confirmDelete) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}jd14-forms/${encodeURIComponent(form.id)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )

      const result = await res.json()
      if (result.status === 'success') {
        showToast('JD14 record deleted.')
        await onRefresh?.()
      } else {
        dialog.alert(`Failed to delete: ${result.message}`)
      }
    } catch (err) {
      console.error('Delete JD14 error:', err)
      dialog.alert('Server error. Please try again later.')
    }
  }

  const normalizedForms = useMemo(
    () =>
      forms.map((form) => ({
        ...form,
        approvalNo: form.approval_no || emptyValue,
        employer: form.employer_name || emptyValue,
        course: form.course_title || emptyValue,
        commenced: form.commenced_date || '',
        commencedDisplay: form.commenced_date || emptyValue,
        ended: form.end_date || '',
        endedDisplay: form.end_date || emptyValue,
        venue: form.training_venue || emptyValue,
        status: getFormStatus(form),
      })),
    [forms],
  )

  const statsItems = useMemo(() => {
    return [
      {
        key: 'forms',
        label: 'JD14 Forms',
        value: formatCount(normalizedForms.length),
        tone: 'primary',
      },
      {
        key: 'completed',
        label: 'Completed',
        value: formatCount(
          countByPredicate(normalizedForms, (form) => form.status === 'Completed'),
        ),
        tone: 'success',
        onClick: onStatFilter ? () => onStatFilter('status', 'Completed') : undefined,
      },
      {
        key: 'ongoing',
        label: 'Ongoing',
        value: formatCount(countByPredicate(normalizedForms, (form) => form.status === 'Ongoing')),
        tone: 'info',
        onClick: onStatFilter ? () => onStatFilter('status', 'Ongoing') : undefined,
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        value: formatCount(countByPredicate(normalizedForms, (form) => form.status === 'Upcoming')),
        tone: 'warning',
        onClick: onStatFilter ? () => onStatFilter('status', 'Upcoming') : undefined,
      },
    ]
  }, [normalizedForms, onStatFilter])

  const getActions = (form) => [
    {
      key: 'view',
      label: 'View',
      onClick: (record) =>
        navigate(`/commercial/jd14/${record.id}`, {
          state: { record, returnTo: getCurrentReturnTo(location) },
        }),
    },
    {
      key: 'edit',
      label: 'Edit',
      onClick: handleViewJd14,
    },
    {
      key: 'generate',
      label: 'Generate PDF',
      onClick: handleGeneratePdfJd14,
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: handleDeleteJd14,
    },
  ]

  const renderCell = (form, column) => {
    if (column.key === 'commenced') return form.commencedDisplay
    if (column.key === 'ended') return form.endedDisplay
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(form.status)}>{form.status}</DataTableStatusBadge>
      )
    }

    return form[column.key] || emptyValue
  }

  return (
    <>
      {statsVisible && <StatsStrip items={statsItems} loading={loading} />}
      {beforeList}
      <DataTableRecordList
        rows={normalizedForms}
        loading={loading}
        loadingMessage="Loading JD14 records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey={columnStorageKey}
        scrollStorageKey="commercial.jd14.records.scroll"
        idPrefix="jd14-record"
        emptyMessage="No JD14 records found."
        exportFilename={`jd14-records-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId={desktopUtilityPortalId}
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId={mobileUtilityPortalId}
        showMobileUtilityRow={false}
        renderQuickFilters={renderQuickFilters}
        getRowKey={(form, index) => form.id || `${form.approvalNo}-${index}`}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={(form) =>
          navigate(`/commercial/jd14/${form.id}`, {
            state: { record: form, returnTo: getCurrentReturnTo(location) },
          })
        }
        getMobileTitle={(form) => form.approvalNo}
        getMobileSubtitle={(form) => form.employer}
        getMobileMeta={(form) => `${form.commencedDisplay} | ${form.endedDisplay}`}
        getMobileStatus={(form) => form.status}
        getMobileStatusTone={(form) => getStatusTone(form.status)}
        mobileFieldKeys={{
          title: 'approvalNo',
          subtitle: 'employer',
          meta: ['commenced', 'ended'],
          status: 'status',
        }}
        initialSortField="commenced"
        initialSortDir="desc"
        initialSortDirByField={{ commenced: 'desc', ended: 'desc' }}
        getSortValue={(form, field) => form[field]}
        resetDeps={[]}
        actionColumnWidth="56px"
      />

      {editJd14Visible && selectedForm && (
        <EditJd14Modal
          visible={editJd14Visible}
          formData={selectedForm}
          onClose={() => setEditJd14Visible(false)}
          onSaved={onRefresh}
        />
      )}
    </>
  )
}

export default JD14Table
