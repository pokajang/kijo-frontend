import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
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
import { useAuth } from '../../auth/AuthProvider'
import { extractRolesFromSession, hasAnyAllowedRole } from '../../utils/roles'
import { ALERT_AUTO_HIDE_MS, API_BASE, MEETING_TYPE_OPTIONS } from './utils/meetingConstants'
import { toDateOnlyValue } from './utils/meetingDateUtils'
import { normalizeActionStatus, parseActionItems } from './utils/meetingActionItems'
import { dataColumns, defaultVisibleColumns, requiredColumns } from './utils/meetingsTableConfig'
import { filterMeetings, normalizeMeetingRows } from './utils/meetingsRecordUtils'

export default function Meetings() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [meetings, setMeetings] = useState([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [alert, setAlert] = useState({ color: 'info', text: '' })
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('')
  const [recordStatusFilter, setRecordStatusFilter] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [staff, setStaff] = useState([])
  const sessionUser = useMemo(
    () => ({
      staffId: Number(user?.staff_id || 0),
      roles: extractRolesFromSession({ user }),
    }),
    [user],
  )
  const [actionModal, setActionModal] = useState({
    visible: false,
    meeting: null,
    actionText: '',
    picStaffId: '',
    dueDate: '',
    submitting: false,
  })
  const [completeModal, setCompleteModal] = useState({
    visible: false,
    meeting: null,
    items: [],
    selectedKey: '',
    submitting: false,
    hasPendingItems: false,
  })

  const clearAlert = () => setAlert({ color: 'info', text: '' })
  const activeChips = [
    recordSearch.trim() ? { key: 'search', label: `Search: ${recordSearch.trim()}` } : null,
    meetingTypeFilter ? { key: 'meetingType', label: `Type: ${meetingTypeFilter}` } : null,
    recordStatusFilter ? { key: 'recordStatus', label: `Status: ${recordStatusFilter}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
  ].filter(Boolean)
  const activeFilterCount = getAdvancedFilterCount(activeChips)
  const resetFilters = () => {
    setRecordSearch('')
    setMeetingTypeFilter('')
    setRecordStatusFilter('')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }
  const clearChip = (key) => {
    if (key === 'search') setRecordSearch('')
    if (key === 'meetingType') setMeetingTypeFilter('')
    if (key === 'recordStatus') setRecordStatusFilter('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const fetchMeetings = async () => {
    setLoadingMeetings(true)
    try {
      const res = await fetch(`${API_BASE}meetings`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to load meeting minutes.')
      }
      setMeetings(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to load meeting minutes.' })
      setMeetings([])
    } finally {
      setLoadingMeetings(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}staff/list`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to load staff list.')
      }
      setStaff(Array.isArray(data.staff) ? data.staff : [])
    } catch {
      setStaff([])
    }
  }

  useEffect(() => {
    const toastMessage = location.state?.toast
    if (toastMessage) {
      setAlert({ color: 'success', text: toastMessage })
      navigate(location.pathname, { replace: true, state: {} })
    }
    fetchMeetings()
    fetchStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const shouldAutoHide =
      Boolean(alert.text) &&
      (String(alert.color).toLowerCase() === 'success' ||
        String(alert.color).toLowerCase() === 'info')
    if (!shouldAutoHide) return undefined

    const timer = window.setTimeout(() => {
      setAlert({ color: 'info', text: '' })
    }, ALERT_AUTO_HIDE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [alert.color, alert.text])

  const filteredMeetings = useMemo(
    () =>
      filterMeetings(meetings, { recordSearch, meetingTypeFilter, recordStatusFilter }).filter(
        (meeting) => isDateInPeriodRange(meeting?.meeting_datetime, periodRange),
      ),
    [meetings, recordSearch, meetingTypeFilter, recordStatusFilter, periodRange],
  )

  const normalizedMeetings = useMemo(
    () => normalizeMeetingRows(filteredMeetings),
    [filteredMeetings],
  )

  const handleDelete = async (meetingId, isDraft = false) => {
    if (!meetingId) return
    const confirmText = isDraft
      ? 'Discard this meeting draft? This action cannot be undone.'
      : 'Delete this meeting minute record? This action cannot be undone.'
    if (!(await dialog.confirm(confirmText))) return

    try {
      const res = await fetch(`${API_BASE}meetings/${meetingId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to delete meeting record.')
      }
      setAlert({
        color: 'success',
        text: isDraft
          ? 'Meeting draft discarded successfully.'
          : 'Meeting minute record deleted successfully.',
      })
      fetchMeetings()
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to delete meeting record.' })
    }
  }

  const handleExportPdf = (meetingId) => {
    if (!meetingId) return
    const url = `${API_BASE}meetings/${meetingId}/pdf`
    window.open(url, '_blank')
  }

  const openAddActionModal = (meeting) => {
    setActionModal({
      visible: true,
      meeting,
      actionText: '',
      picStaffId: '',
      dueDate: '',
      submitting: false,
    })
  }

  const isSystemAdmin = hasAnyAllowedRole(sessionUser.roles, ['System Admin'])
  const getDeleteRestriction = (item) => {
    if (isSystemAdmin) return ''

    const currentStaffId = Number(sessionUser.staffId || 0)
    const creatorId = Number(item?.created_by || 0)
    if (currentStaffId > 0 && creatorId > 0 && currentStaffId === creatorId) return ''

    return 'Delete disabled: this is not your meeting record.'
  }

  const getActions = (item) => {
    const deleteRestriction = getDeleteRestriction(item)

    if (item.isDraft) {
      return [
        {
          key: 'continue-draft',
          label: 'Continue Draft',
          onClick: () => navigate(`/administration/meetings/edit/${item.id}?step=2`),
        },
        {
          key: 'discard-draft',
          label: 'Discard Draft',
          danger: true,
          dividerBefore: true,
          disabled: Boolean(deleteRestriction),
          tooltip: deleteRestriction || undefined,
          onClick: () => handleDelete(item.id, true),
        },
      ]
    }

    return [
      {
        key: 'export-pdf',
        label: 'Export PDF',
        onClick: () => handleExportPdf(item.id),
      },
      {
        key: 'edit',
        label: 'Edit',
        onClick: () => navigate(`/administration/meetings/edit/${item.id}`),
      },
      {
        key: 'add-action',
        label: 'Add Action',
        onClick: () => openAddActionModal(item),
      },
      {
        key: 'complete-action',
        label: 'Complete Action',
        disabled: !item.pendingItems,
        tooltip: !item.pendingItems ? 'No pending action items.' : undefined,
        onClick: () => openCompleteActionModal(item),
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        dividerBefore: true,
        disabled: Boolean(deleteRestriction),
        tooltip: deleteRestriction || undefined,
        onClick: () => handleDelete(item.id),
      },
    ]
  }

  const openMeetingDetails = (item) => {
    if (!item?.id) return
    if (item?.isDraft) {
      navigate(`/administration/meetings/edit/${item.id}?step=2`)
      return
    }
    navigate(`/administration/meetings/view/${item.id}`)
  }

  const renderPendingBadges = (item) => {
    if (!item.pendingItems) {
      if (item.isDraft) return <DataTableStatusBadge tone="warning">Draft</DataTableStatusBadge>
      return <DataTableStatusBadge tone="success">0</DataTableStatusBadge>
    }

    if (Array.isArray(item.pendingPicCounts) && item.pendingPicCounts.length > 0) {
      return (
        <div className="meetings-pending-badges">
          {item.pendingPicCounts.map((pic) => (
            <DataTableStatusBadge key={pic.code} tone="info">
              {pic.code === 'Unassigned' ? String(pic.count) : `${pic.code} (${pic.count})`}
            </DataTableStatusBadge>
          ))}
        </div>
      )
    }

    return <DataTableStatusBadge tone="info">{item.pendingItems}</DataTableStatusBadge>
  }

  const renderMobileItem = (
    item,
    index,
    {
      pageStart = 0,
      rowProps = {},
      showTitle = true,
      showSubtitle = true,
      showMeta = true,
      showStatus = true,
    } = {},
  ) => {
    const actionKey = `meeting-record-${item.id || index}-mobile`

    return (
      <div {...rowProps} className={`records-mobile-item ${rowProps.className}`.trim()}>
        <div className="records-mobile-item-head">
          <div className="records-mobile-item-main text-start">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="records-mobile-row-index text-muted">#{pageStart + index + 1}</span>
              {showTitle && <span className="records-mobile-quote-id">{item.title || '-'}</span>}
              {item.isDraft && <DataTableStatusBadge tone="warning">Draft</DataTableStatusBadge>}
            </div>
            {(showSubtitle || showStatus) && (
              <div className="records-mobile-subtitle meetings-mobile-type-row mt-1">
                {showSubtitle && <span>{item.meetingType || '-'}</span>}
                {showStatus && renderPendingBadges(item)}
              </div>
            )}
            {showMeta && (
              <div className="records-mobile-client mt-1">{item.meetingDateDisplay || '-'}</div>
            )}
          </div>
          <div className="records-mobile-head-actions d-flex align-items-start gap-2 ms-2">
            <DataTableActionMenu
              record={item}
              actions={getActions(item)}
              actionKey={actionKey}
              openActionKey={null}
              ariaLabel="Meeting actions"
            />
          </div>
        </div>
      </div>
    )
  }

  const renderCell = (item, column) => {
    if (column.key === 'title') {
      return (
        <>
          <DataTableTextCell
            value={item.title}
            maxWidth="220px"
            title="Meeting Title"
            mode="expandable"
            previewCharThreshold={34}
            className="meetings-title-cell"
          />
          {item.isDraft && (
            <div className="mt-1">
              <DataTableStatusBadge tone="warning">Draft</DataTableStatusBadge>
            </div>
          )}
        </>
      )
    }
    if (column.key === 'meetingDate') return item.meetingDateDisplay
    if (column.key === 'pendingItems') {
      return renderPendingBadges(item)
    }
    return item[column.key] || '-'
  }

  const closeAddActionModal = () => {
    if (actionModal.submitting) return
    setActionModal({
      visible: false,
      meeting: null,
      actionText: '',
      picStaffId: '',
      dueDate: '',
      submitting: false,
    })
  }

  const handleActionModalSubmit = async () => {
    const meeting = actionModal.meeting
    const actionText = String(actionModal.actionText || '').trim()

    if (!meeting?.id) {
      setAlert({ color: 'danger', text: 'Invalid meeting record.' })
      return
    }
    if (!actionText) {
      setAlert({ color: 'danger', text: 'Action is required.' })
      return
    }

    setActionModal((prev) => ({ ...prev, submitting: true }))
    try {
      const picId = Number(actionModal.picStaffId || 0)

      const payload = new FormData()
      payload.append('meeting_id', String(meeting.id))
      payload.append('action_text', actionText)
      if (Number.isFinite(picId) && picId > 0) {
        payload.append('pic_staff_id', String(picId))
      }
      const dueDate = toDateOnlyValue(actionModal.dueDate)
      if (dueDate) {
        payload.append('due_date', dueDate)
      }

      const res = await fetch(`${API_BASE}meetings/action-items`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to add action item.')
      }

      closeAddActionModal()
      setAlert({ color: 'success', text: 'Action item added successfully.' })
      fetchMeetings()
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to add action item.' })
      setActionModal((prev) => ({ ...prev, submitting: false }))
    }
  }

  const openCompleteActionModal = (meeting) => {
    const pendingItems = parseActionItems(meeting?.action_items).filter(
      (item) => normalizeActionStatus(item.status) !== 'Done',
    )
    const currentStaffId = Number(sessionUser.staffId || 0)
    const myItems = pendingItems.filter((item) => {
      const picId = Number(item.picStaffId || 0)
      const createdBy = Number(item.createdBy || 0)
      if (currentStaffId > 0 && picId > 0 && picId === currentStaffId) return true
      if (currentStaffId > 0 && createdBy > 0 && createdBy === currentStaffId) return true
      return false
    })

    setCompleteModal({
      visible: true,
      meeting,
      items: myItems,
      selectedKey: myItems[0]?.key || '',
      submitting: false,
      hasPendingItems: pendingItems.length > 0,
    })
  }

  const closeCompleteActionModal = () => {
    if (completeModal.submitting) return
    setCompleteModal({
      visible: false,
      meeting: null,
      items: [],
      selectedKey: '',
      submitting: false,
      hasPendingItems: false,
    })
  }

  const handleCompleteActionSubmit = async () => {
    const meeting = completeModal.meeting
    if (!meeting?.id) {
      setAlert({ color: 'danger', text: 'Invalid meeting record.' })
      return
    }
    const selected = (completeModal.items || []).find(
      (item) => item.key === completeModal.selectedKey,
    )
    if (!selected) {
      setAlert({ color: 'danger', text: 'Please select a pending action item.' })
      return
    }

    setCompleteModal((prev) => ({ ...prev, submitting: true }))
    try {
      const payload = new FormData()
      payload.append('meeting_id', String(meeting.id))
      payload.append('status', 'Done')
      if (selected.itemId) {
        payload.append('item_id', selected.itemId)
      } else {
        payload.append('item_index', String(selected.itemIndex))
      }

      const res = await fetch(`${API_BASE}meetings/action-items/status`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to complete action item.')
      }

      closeCompleteActionModal()
      setAlert({ color: 'success', text: data?.message || 'Action item marked done.' })
      fetchMeetings()
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to complete action item.' })
      setCompleteModal((prev) => ({ ...prev, submitting: false }))
    }
  }

  return (
    <CRow>
      <CCol xs={12} className="meeting-mobile-edge-col">
        <ModuleNavStrip tabs={administrationModuleTabs} ariaLabel="Administration sections" />
        <CCard className="mb-4 meeting-mobile-edge-card">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
            <strong>Meetings</strong>
            <CButton
              color="primary"
              size="sm"
              onClick={() => navigate('/administration/meetings/add')}
            >
              Add Minute
            </CButton>
          </CCardHeader>
          <CCardBody className="meetings-page-card-body">
            {alert.text && (
              <CAlert color={alert.color} dismissible onClose={clearAlert}>
                {alert.text}
              </CAlert>
            )}

            <DataTableRecordControls
              searchValue={recordSearch}
              onSearchChange={setRecordSearch}
              searchPlaceholder="Search title, minutes, attendee, guest"
              showAdvancedFilters={showMobileFilters}
              setShowAdvancedFilters={setShowMobileFilters}
              activeFilterCount={activeFilterCount}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={resetFilters}
              loading={loadingMeetings}
              desktopToolsId="meetings-table-tools"
              mobileToolsId="meetings-mobile-table-tools"
              searchColProps={{ xs: true, lg: 7 }}
              actionColProps={{ xs: 'auto', lg: 5 }}
            >
              <CCol xs={6} md={3} lg={2}>
                <CFormLabel htmlFor="meetingTypeFilter">Meeting Type</CFormLabel>
                <CFormSelect
                  id="meetingTypeFilter"
                  value={meetingTypeFilter}
                  onChange={(e) => setMeetingTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  {MEETING_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={6} md={3} lg={2}>
                <CFormLabel htmlFor="meetingStatusFilter">Status</CFormLabel>
                <CFormSelect
                  id="meetingStatusFilter"
                  value={recordStatusFilter}
                  onChange={(e) => setRecordStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Drafts</option>
                  <option value="Complete">Complete</option>
                </CFormSelect>
              </CCol>
            </DataTableRecordControls>

            <DataTableRecordList
              className="meetings-records-table"
              rows={normalizedMeetings}
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey="meetings.records.visible-columns.v3"
              apiKey="meetings-records-visible-columns-v3"
              idPrefix="meeting-record"
              emptyMessage="No meeting minutes found."
              exportFilename={`meeting-minutes-${new Date().toISOString().slice(0, 10)}.csv`}
              loading={loadingMeetings}
              loadingMessage="Loading meeting records..."
              showDesktopSummary={false}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="meetings-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="meetings-mobile-table-tools"
              showMobileUtilityRow={false}
              getRowKey={(item, index) => item.id || index}
              renderCell={renderCell}
              renderMobileItem={renderMobileItem}
              onRowOpen={openMeetingDetails}
              rowOpenClassName="meetings-clickable-row"
              getActions={getActions}
              getMobileTitle={(item) => item.title}
              getMobileSubtitle={(item) => item.meetingType}
              getMobileMeta={(item) => item.meetingDateDisplay}
              getMobileStatus={(item) => item.pendingItemsDisplay}
              getMobileStatusTone={(item) => (item.pendingItems > 0 ? 'warning' : 'success')}
              mobileFieldKeys={{
                title: 'title',
                subtitle: 'meetingType',
                meta: 'meetingDate',
                status: 'pendingItems',
              }}
              initialSortField="meetingDate"
              initialSortDir="desc"
              initialSortDirByField={{ meetingDate: 'desc', pendingItems: 'desc' }}
              renderQuickFilters={() => (
                <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
              )}
              resetDeps={[
                filteredMeetings,
                recordSearch,
                meetingTypeFilter,
                recordStatusFilter,
                periodRange,
              ]}
            />

            <CModal visible={actionModal.visible} onClose={closeAddActionModal} alignment="center">
              <CModalHeader>
                <CModalTitle>Add Action Item</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <div className="mb-3">
                  <small className="text-muted d-block">Meeting</small>
                  <div className="fw-semibold">{actionModal.meeting?.meeting_title || '-'}</div>
                </div>
                <CFormLabel htmlFor="quickActionText">Action</CFormLabel>
                <CFormInput
                  id="quickActionText"
                  value={actionModal.actionText}
                  onChange={(e) =>
                    setActionModal((prev) => ({ ...prev, actionText: e.target.value }))
                  }
                  placeholder="Enter action item"
                  disabled={actionModal.submitting}
                />
                <CRow className="g-2 mt-2">
                  <CCol md={7}>
                    <CFormLabel htmlFor="quickActionPic">Assign PIC</CFormLabel>
                    <CFormSelect
                      id="quickActionPic"
                      value={actionModal.picStaffId}
                      onChange={(e) =>
                        setActionModal((prev) => ({ ...prev, picStaffId: e.target.value }))
                      }
                      disabled={actionModal.submitting}
                    >
                      <option value="">Select PIC</option>
                      {staff.map((member) => {
                        const id = Number(member.staff_id)
                        return (
                          <option key={`quick-pic-${id}`} value={id}>
                            {member.full_name || '-'} ({member.name_code || '-'})
                          </option>
                        )
                      })}
                    </CFormSelect>
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel htmlFor="quickActionDueDate">Due Date</CFormLabel>
                    <CFormInput
                      id="quickActionDueDate"
                      type="date"
                      value={actionModal.dueDate}
                      onChange={(e) =>
                        setActionModal((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      disabled={actionModal.submitting}
                    />
                  </CCol>
                </CRow>
              </CModalBody>
              <CModalFooter>
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={closeAddActionModal}
                  disabled={actionModal.submitting}
                >
                  Cancel
                </CButton>
                <CButton
                  color="primary"
                  onClick={handleActionModalSubmit}
                  disabled={actionModal.submitting}
                >
                  {actionModal.submitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    'Add Action'
                  )}
                </CButton>
              </CModalFooter>
            </CModal>

            <CModal
              visible={completeModal.visible}
              onClose={closeCompleteActionModal}
              alignment="center"
            >
              <CModalHeader>
                <CModalTitle>Complete Action Item</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <div className="mb-3">
                  <small className="text-muted d-block">Meeting</small>
                  <div className="fw-semibold">{completeModal.meeting?.meeting_title || '-'}</div>
                </div>
                {(completeModal.items || []).length === 0 ? (
                  <div className="text-muted">
                    {completeModal.hasPendingItems
                      ? 'You are not eligible to complete pending actions for this meeting.'
                      : 'There are no pending action items for this meeting.'}
                  </div>
                ) : (
                  <>
                    <CFormLabel htmlFor="completeActionSelect">Pending Action</CFormLabel>
                    <CFormSelect
                      id="completeActionSelect"
                      value={completeModal.selectedKey}
                      onChange={(e) =>
                        setCompleteModal((prev) => ({ ...prev, selectedKey: e.target.value }))
                      }
                      disabled={completeModal.submitting}
                    >
                      {(completeModal.items || []).map((action) => {
                        const picLabel = action.picName
                          ? `${action.picName}${action.picCode ? ` (${action.picCode})` : ''}`
                          : 'No PIC'
                        const dueLabel = action.dueDate || 'No due date'
                        const actionTitle = action.actionText || 'Untitled action'
                        return (
                          <option key={action.key} value={action.key}>
                            {`${actionTitle} | ${picLabel} | Due: ${dueLabel}`}
                          </option>
                        )
                      })}
                    </CFormSelect>
                  </>
                )}
              </CModalBody>
              <CModalFooter>
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={closeCompleteActionModal}
                  disabled={completeModal.submitting}
                >
                  Cancel
                </CButton>
                <CButton
                  color="primary"
                  onClick={handleCompleteActionSubmit}
                  disabled={completeModal.submitting || (completeModal.items || []).length === 0}
                >
                  {completeModal.submitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    'Mark Done'
                  )}
                </CButton>
              </CModalFooter>
            </CModal>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
