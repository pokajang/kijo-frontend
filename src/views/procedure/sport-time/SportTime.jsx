import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormCheck,
  CFormSwitch,
  CProgress,
  CRow,
  CSpinner,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import { DataTableLoadingState } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { administrationModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { resolveAssetUrl } from '../../../utils/assetUrls'

const API_BASE = import.meta.env.VITE_API_BASE

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

const sanitizeName = (value) => (value || '').trim().replace(/\s+/g, ' ')
const buildSportEventsUrl = (page) => {
  const base = `${API_BASE}sport-events`
  if (!page || Number(page) <= 1) return base
  return `${base}${base.includes('?') ? '&' : '?'}page=${Number(page)}`
}
const parseSportEventsPage = (payload, requestedPage) => {
  const rootData = payload?.data
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(rootData?.items)
        ? rootData.items
        : Array.isArray(rootData?.data)
          ? rootData.data
          : Array.isArray(payload?.results)
            ? payload.results
            : []

  const currentPage = Number(
    payload?.current_page ??
      payload?.pagination?.current_page ??
      payload?.meta?.current_page ??
      rootData?.current_page ??
      rootData?.meta?.current_page ??
      requestedPage,
  )
  const lastPage = Number(
    payload?.last_page ??
      payload?.pagination?.last_page ??
      payload?.meta?.last_page ??
      rootData?.last_page ??
      rootData?.meta?.last_page ??
      currentPage,
  )
  const nextPageUrl =
    payload?.next_page_url ??
    payload?.pagination?.next_page_url ??
    payload?.links?.next ??
    rootData?.next_page_url ??
    rootData?.links?.next ??
    null

  const hasMoreByPage =
    Number.isFinite(currentPage) &&
    Number.isFinite(lastPage) &&
    lastPage > 0 &&
    currentPage < lastPage
  const hasMoreByNextUrl = typeof nextPageUrl === 'string' && nextPageUrl.trim() !== ''

  return {
    items: Array.isArray(items) ? items : [],
    hasMore: hasMoreByNextUrl || hasMoreByPage,
  }
}

export default function SportTime() {
  const [staff, setStaff] = useState([])
  const [events, setEvents] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [editingImageUrl, setEditingImageUrl] = useState('')
  const [alert, setAlert] = useState({ color: 'info', text: '' })
  const [staffSearch, setStaffSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const [showStats, setShowStats] = useState(false)

  const [form, setForm] = useState({
    eventName: '',
    eventDateTime: '',
    attendeeIds: [],
    image: null,
  })

  const fetchStaff = async () => {
    setLoadingStaff(true)
    try {
      const res = await fetch(`${API_BASE}staff/list`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to load staff list.')
      }
      setStaff(Array.isArray(data.staff) ? data.staff : [])
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to load staff list.' })
      setStaff([])
    } finally {
      setLoadingStaff(false)
    }
  }

  const fetchEvents = async () => {
    setLoadingEvents(true)
    try {
      const allEvents = []
      const seenIds = new Set()
      let page = 1
      let hasMore = true
      let safetyCounter = 0

      while (hasMore && safetyCounter < 50) {
        const res = await fetch(buildSportEventsUrl(page), {
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || 'Failed to load events.')
        }

        const parsed = parseSportEventsPage(data, page)
        parsed.items.forEach((event, idx) => {
          const rawId = event?.id
          const key = rawId != null && rawId !== '' ? `id-${String(rawId)}` : `p${page}-i${idx}`
          if (seenIds.has(key)) return
          seenIds.add(key)
          allEvents.push(event)
        })

        hasMore = parsed.hasMore
        page += 1
        safetyCounter += 1
      }

      setEvents(allEvents)
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to load events.' })
      setEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  useEffect(() => {
    fetchStaff()
    fetchEvents()
  }, [])

  const filteredStaff = useMemo(() => {
    const term = staffSearch.trim().toLowerCase()
    if (!term) return staff
    return staff.filter((member) => {
      const name = String(member.full_name || '').toLowerCase()
      const code = String(member.name_code || '').toLowerCase()
      const dept = String(member.department || '').toLowerCase()
      return name.includes(term) || code.includes(term) || dept.includes(term)
    })
  }, [staff, staffSearch])

  const yearOptions = useMemo(() => {
    const years = new Set()
    events.forEach((event) => {
      if (!event?.event_datetime) return
      const d = new Date(String(event.event_datetime).replace(' ', 'T'))
      if (!Number.isNaN(d.getTime())) {
        years.add(String(d.getFullYear()))
      }
    })
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [events])

  const filteredEvents = useMemo(() => {
    const term = recordSearch.trim().toLowerCase()

    return events.filter((event) => {
      const matchesYear = (() => {
        if (!yearFilter) return true
        const d = new Date(String(event.event_datetime || '').replace(' ', 'T'))
        return !Number.isNaN(d.getTime()) && String(d.getFullYear()) === yearFilter
      })()

      if (!matchesYear) return false
      if (!term) return true

      const eventName = String(event.event_name || '').toLowerCase()
      const participantNames = (event.attendees || [])
        .map((a) => `${a?.staff_name || ''} ${a?.staff_code || ''}`.toLowerCase())
        .join(' ')

      return eventName.includes(term) || participantNames.includes(term)
    })
  }, [events, yearFilter, recordSearch])

  const participationStats = useMemo(() => {
    const yearScopedEvents = events.filter((event) => {
      if (!yearFilter) return true
      const d = new Date(String(event.event_datetime || '').replace(' ', 'T'))
      return !Number.isNaN(d.getTime()) && String(d.getFullYear()) === yearFilter
    })

    const counts = new Map()
    yearScopedEvents.forEach((event) => {
      ;(event.attendees || []).forEach((attendee) => {
        const id = Number(attendee?.staff_id)
        if (!id) return
        counts.set(id, (counts.get(id) || 0) + 1)
      })
    })

    const rows = (staff || [])
      .map((member) => {
        const id = Number(member.staff_id)
        return {
          staff_id: id,
          name: member.full_name || '-',
          code: member.name_code || '-',
          count: counts.get(id) || 0,
        }
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.name.localeCompare(b.name)
      })

    return {
      totalEvents: yearScopedEvents.length,
      maxCount: rows.reduce((max, row) => Math.max(max, row.count), 0),
      rows,
    }
  }, [events, staff, yearFilter])

  const handleToggleAttendee = (staffId) => {
    setForm((prev) => {
      const exists = prev.attendeeIds.includes(staffId)
      const attendeeIds = exists
        ? prev.attendeeIds.filter((id) => id !== staffId)
        : [...prev.attendeeIds, staffId]
      return { ...prev, attendeeIds }
    })
  }

  const validate = () => {
    const errs = []
    if (!sanitizeName(form.eventName)) errs.push('Event name is required.')
    if (!form.eventDateTime) errs.push('Event date and time is required.')
    if (form.attendeeIds.length === 0) errs.push('Select at least one attendee.')
    if (!form.image && !editingImageUrl) errs.push('Please upload an event image.')
    return errs
  }

  const resetForm = () => {
    setEditingEventId(null)
    setEditingImageUrl('')
    setForm({
      eventName: '',
      eventDateTime: '',
      attendeeIds: [],
      image: null,
    })
    setStaffSearch('')
  }

  const toDateTimeLocalValue = (value) => {
    const normalized = String(value || '').replace(' ', 'T')
    return normalized.length >= 16 ? normalized.slice(0, 16) : normalized
  }

  const openCreateModal = () => {
    resetForm()
    setShowFormModal(true)
  }

  const openEditModal = (item) => {
    setEditingEventId(Number(item?.id) || null)
    setEditingImageUrl(resolveAssetUrl(item?.image_path))
    setForm({
      eventName: item?.event_name || '',
      eventDateTime: toDateTimeLocalValue(item?.event_datetime),
      attendeeIds: (item?.attendees || []).map((a) => Number(a.staff_id)).filter(Boolean),
      image: null,
    })
    setStaffSearch('')
    setShowFormModal(true)
  }

  const handleDelete = async (eventId) => {
    if (!eventId) return
    if (
      !(await dialog.confirm('Delete this sport event? This action cannot be undone.', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return

    try {
      const res = await fetch(`${API_BASE}sport-events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to delete event.')
      }

      if (editingEventId === Number(eventId)) {
        setShowFormModal(false)
        resetForm()
      }
      setAlert({ color: 'success', text: 'Sport event deleted successfully.' })
      fetchEvents()
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to delete event.' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAlert({ color: 'info', text: '' })

    const errors = validate()
    if (errors.length > 0) {
      setAlert({ color: 'danger', text: errors.join(' ') })
      return
    }

    setSubmitting(true)
    try {
      const payload = new FormData()
      payload.append('event_name', sanitizeName(form.eventName))
      payload.append('event_datetime', form.eventDateTime)
      payload.append('attendee_ids', JSON.stringify(form.attendeeIds))
      if (form.image) {
        payload.append('image', form.image)
      }

      const endpoint = editingEventId
        ? `${API_BASE}sport-events/${editingEventId}`
        : `${API_BASE}sport-events`
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to save event.')
      }

      setAlert({
        color: 'success',
        text: editingEventId
          ? 'Sport event updated successfully.'
          : 'Sport event added successfully.',
      })
      resetForm()
      setShowFormModal(false)
      fetchEvents()
    } catch (err) {
      setAlert({ color: 'danger', text: err.message || 'Failed to save event.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip tabs={administrationModuleTabs} ariaLabel="Administration sections" />
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Sport Event Records</strong>
            <CButton color="primary" size="sm" className="d-md-none" onClick={openCreateModal}>
              Add Event
            </CButton>
          </CCardHeader>
          <CCardBody>
            {alert.text && (
              <CAlert
                color={alert.color}
                dismissible
                onClose={() => setAlert({ color: 'info', text: '' })}
              >
                {alert.text}
              </CAlert>
            )}

            <CRow className="g-2 align-items-end mb-3">
              <CCol xs={6} md={5}>
                <CFormLabel htmlFor="recordSearch">Search</CFormLabel>
                <CFormInput
                  id="recordSearch"
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Search event or participant"
                />
              </CCol>
              <CCol xs={6} md={3}>
                <CFormLabel htmlFor="yearFilter">Year</CFormLabel>
                <CFormSelect
                  id="yearFilter"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md="auto" className="d-none d-md-block">
                <CFormCheck
                  id="showStatsDesktop"
                  label="Show Stats"
                  checked={showStats}
                  onChange={(e) => setShowStats(e.target.checked)}
                  className="mb-2 text-nowrap"
                />
              </CCol>
              <CCol xs={12} className="d-md-none">
                <div className="border rounded px-3 py-2 d-flex justify-content-between align-items-center">
                  <span className="small fw-semibold">Show Stats</span>
                  <CFormSwitch
                    id="showStatsMobile"
                    checked={showStats}
                    onChange={(e) => setShowStats(e.target.checked)}
                    size="lg"
                  />
                </div>
              </CCol>
              <CCol md="auto" className="ms-md-auto d-none d-md-block">
                <CButton color="primary" size="sm" onClick={openCreateModal}>
                  Add Event
                </CButton>
              </CCol>
            </CRow>

            {showStats && (
              <div className="border rounded p-3 mb-3">
                <div className="fw-semibold mb-1">
                  Participation Stats ({yearFilter || 'All Years'})
                </div>
                <div className="small text-muted mb-2">
                  Total events: {participationStats.totalEvents}
                </div>
                {participationStats.rows.length === 0 ? (
                  <div className="small text-muted">No staff data available.</div>
                ) : participationStats.totalEvents === 0 ? (
                  <div className="small text-muted">No events found for this year.</div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {participationStats.rows.map((row) => (
                      <div key={row.staff_id} className="mb-2">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>
                            {row.name} ({row.code})
                          </span>
                          <strong>
                            {row.count} time{row.count === 1 ? '' : 's'}
                          </strong>
                        </div>
                        <CProgress
                          thin
                          color={
                            row.count === participationStats.maxCount && row.count > 0
                              ? 'success'
                              : row.count > 0
                                ? 'info'
                                : 'secondary'
                          }
                          value={
                            participationStats.maxCount > 0
                              ? Math.round((row.count / participationStats.maxCount) * 100)
                              : 0
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {loadingEvents ? (
              <DataTableLoadingState message="Loading sporting events..." />
            ) : filteredEvents.length === 0 ? (
              <div className="text-center text-muted py-4">No sporting events found.</div>
            ) : (
              <CRow className="g-3">
                {filteredEvents.map((item) => {
                  const imageUrl = resolveAssetUrl(item.image_path)
                  return (
                    <CCol xs={12} md={6} xl={4} key={item.id}>
                      <CCard className="h-100">
                        {imageUrl ? (
                          <a href={imageUrl} target="_blank" rel="noreferrer">
                            <img
                              src={imageUrl}
                              alt={item.event_name || 'event'}
                              style={{
                                width: '100%',
                                height: 180,
                                objectFit: 'cover',
                                borderTopLeftRadius: '0.375rem',
                                borderTopRightRadius: '0.375rem',
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center text-muted"
                            style={{
                              height: 180,
                              borderTopLeftRadius: '0.375rem',
                              borderTopRightRadius: '0.375rem',
                              background: 'var(--app-surface-subtle)',
                            }}
                          >
                            No Image
                          </div>
                        )}
                        <CCardBody>
                          <div className="fw-semibold mb-2">{item.event_name || '-'}</div>
                          <div className="small text-muted mb-2">
                            Event Date: {formatDateTime(item.event_datetime)}
                          </div>
                          <div className="small mb-2">
                            {(item.attendees || []).length === 0 ? (
                              <span className="text-muted">No attendees</span>
                            ) : (
                              (item.attendees || [])
                                .map(
                                  (a) =>
                                    `${a.staff_name}${a.staff_code ? ` (${a.staff_code})` : ''}`,
                                )
                                .join(', ')
                            )}
                          </div>
                          <div className="small text-muted">
                            Updated By: {item.created_name || '-'} ({item.created_code || '-'})
                          </div>
                          <div className="mt-3 d-flex gap-2">
                            <CButton
                              size="sm"
                              color="secondary"
                              variant="outline"
                              onClick={() => openEditModal(item)}
                            >
                              Edit
                            </CButton>
                            <CButton
                              size="sm"
                              color="danger"
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </CButton>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  )
                })}
              </CRow>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal
        visible={showFormModal}
        size="xl"
        backdrop="static"
        onClose={() => {
          if (submitting) return
          setShowFormModal(false)
          resetForm()
        }}
      >
        <CModalHeader closeButton={!submitting}>
          <CModalTitle>{editingEventId ? 'Edit Sport Event' : 'Add Sport Event'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <form id="sport-event-form" onSubmit={handleSubmit}>
            <CRow className="mb-3 g-3">
              <CCol md={7}>
                <CFormLabel htmlFor="eventName">Event Name</CFormLabel>
                <CFormInput
                  id="eventName"
                  type="text"
                  value={form.eventName}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventName: e.target.value }))}
                  placeholder="e.g., KIJO Badminton Night"
                  disabled={submitting}
                />
              </CCol>
              <CCol md={5}>
                <CFormLabel htmlFor="eventDateTime">Event Date & Time</CFormLabel>
                <CFormInput
                  id="eventDateTime"
                  type="datetime-local"
                  value={form.eventDateTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, eventDateTime: e.target.value }))}
                  disabled={submitting}
                />
              </CCol>
            </CRow>

            <CRow className="mb-2">
              <CCol md={12}>
                <CFormLabel htmlFor="attendeeSearch">Tick Attendees (from Staff List)</CFormLabel>
                <CFormInput
                  id="attendeeSearch"
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search by name, code, or department"
                  disabled={loadingStaff || submitting}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol xs={12}>
                <div className="border rounded p-3" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {loadingStaff ? (
                    <div className="text-center py-2">
                      <CSpinner size="sm" className="me-2" />
                      Loading staff...
                    </div>
                  ) : filteredStaff.length === 0 ? (
                    <div className="text-muted">No matching staff.</div>
                  ) : (
                    <CRow className="g-2">
                      {filteredStaff.map((member) => {
                        const id = Number(member.staff_id)
                        const checked = form.attendeeIds.includes(id)
                        const label = `${member.full_name || '-'} (${member.name_code || '-'})`
                        return (
                          <CCol xs={12} md={6} lg={4} key={id}>
                            <CFormCheck
                              id={`attendee-${id}`}
                              checked={checked}
                              onChange={() => handleToggleAttendee(id)}
                              label={label}
                              disabled={submitting}
                            />
                          </CCol>
                        )
                      })}
                    </CRow>
                  )}
                </div>
                <small className="text-muted">
                  Selected attendees: <strong>{form.attendeeIds.length}</strong>
                </small>
              </CCol>
            </CRow>

            <CRow className="mb-1">
              <CCol md={6}>
                <CFormLabel htmlFor="eventImage">Upload Image</CFormLabel>
                {editingImageUrl && !form.image && (
                  <div className="mb-2">
                    <small className="text-muted d-block mb-1">Current image</small>
                    <img
                      src={editingImageUrl}
                      alt="current-event"
                      style={{
                        width: 140,
                        height: 90,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid var(--app-border-card)',
                      }}
                    />
                  </div>
                )}
                <CFormInput
                  id="eventImage"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, image: e.target.files?.[0] || null }))
                  }
                  disabled={submitting}
                />
              </CCol>
            </CRow>
          </form>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={resetForm}
            disabled={submitting}
          >
            Reset
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowFormModal(false)
              resetForm()
            }}
            disabled={submitting}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            type="submit"
            form="sport-event-form"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving...
              </>
            ) : editingEventId ? (
              'Update Event'
            ) : (
              'Save Event'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}
