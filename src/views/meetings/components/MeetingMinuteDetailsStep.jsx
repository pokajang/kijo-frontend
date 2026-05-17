import React from 'react'
import {
  CButton,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
} from '@coreui/react'

export default function MeetingMinuteDetailsStep({
  form,
  isFormLocked,
  loadingStaff,
  staff,
  meetingTypeOptions,
  onChangeField,
  onToggleAttendee,
  validationErrors = {},
  sessionStaffId = 0,
}) {
  const [attendeeSearch, setAttendeeSearch] = React.useState('')
  const [showSelectedOnly, setShowSelectedOnly] = React.useState(false)
  const attendeeTerm = attendeeSearch.trim().toLowerCase()
  const selectedIds = new Set(form.attendeeIds || [])
  const filteredStaff = (staff || []).filter((member) => {
    const id = Number(member.staff_id)
    if (showSelectedOnly && !selectedIds.has(id)) return false
    if (!attendeeTerm) return true
    return `${member.full_name || ''} ${member.name_code || ''}`
      .toLowerCase()
      .includes(attendeeTerm)
  })
  const sessionStaffNumericId = Number(sessionStaffId || 0)
  const canSelectMe =
    sessionStaffNumericId > 0 &&
    (staff || []).some((member) => Number(member.staff_id) === sessionStaffNumericId)
  return (
    <>
      <CRow className="mb-3 g-3">
        <CCol md={8}>
          <CFormLabel htmlFor="meetingTitle">Meeting Title</CFormLabel>
          <CFormInput
            id="meetingTitle"
            type="text"
            value={form.meetingTitle}
            onChange={(e) => onChangeField('meetingTitle', e.target.value)}
            placeholder="e.g., Monthly Operations Sync"
            disabled={isFormLocked}
            invalid={Boolean(validationErrors.meetingTitle)}
            feedbackInvalid={validationErrors.meetingTitle}
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel htmlFor="meetingType">Meeting Type</CFormLabel>
          <CFormSelect
            id="meetingType"
            value={form.meetingType}
            onChange={(e) => onChangeField('meetingType', e.target.value)}
            disabled={isFormLocked}
            invalid={Boolean(validationErrors.meetingType)}
            feedbackInvalid={validationErrors.meetingType}
          >
            {meetingTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      <CRow className="mb-3 g-3">
        <CCol md={6}>
          <CFormLabel htmlFor="meetingDateTime">Meeting Date & Time</CFormLabel>
          <CFormInput
            id="meetingDateTime"
            type="datetime-local"
            value={form.meetingDateTime}
            onChange={(e) => onChangeField('meetingDateTime', e.target.value)}
            disabled={isFormLocked}
            invalid={Boolean(validationErrors.meetingDateTime)}
            feedbackInvalid={validationErrors.meetingDateTime}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="meetingVenue">Venue</CFormLabel>
          <CFormInput
            id="meetingVenue"
            type="text"
            value={form.venue}
            onChange={(e) => onChangeField('venue', e.target.value)}
            placeholder="e.g., Meeting Room A"
            disabled={isFormLocked}
          />
        </CCol>
      </CRow>

      <CFormLabel className="mb-2">Tick Attendees</CFormLabel>

      <CRow className="mb-3">
        <CCol xs={12}>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <CFormInput
              type="search"
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              placeholder="Search staff"
              disabled={isFormLocked || loadingStaff}
              className="meeting-attendee-search"
              aria-label="Search attendees"
            />
            <CFormCheck
              id="meeting-attendee-selected-only"
              label="Selected only"
              checked={showSelectedOnly}
              onChange={(e) => setShowSelectedOnly(e.target.checked)}
              disabled={isFormLocked || loadingStaff}
            />
            {canSelectMe && (
              <CButton
                type="button"
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => {
                  if (!selectedIds.has(sessionStaffNumericId))
                    onToggleAttendee(sessionStaffNumericId)
                }}
                disabled={isFormLocked || selectedIds.has(sessionStaffNumericId)}
              >
                Select Me
              </CButton>
            )}
            <small className="text-muted ms-auto">
              Selected attendees: <strong>{form.attendeeIds.length}</strong>
            </small>
          </div>
          <div
            id="meeting-attendees-panel"
            className={`border rounded p-3 ${validationErrors.attendeeIds ? 'is-invalid' : ''}`}
            style={{ maxHeight: 220, overflowY: 'auto' }}
            tabIndex={-1}
          >
            {loadingStaff ? (
              <div className="text-center py-2">
                <CSpinner size="sm" className="me-2" />
                Loading staff...
              </div>
            ) : (staff || []).length === 0 ? (
              <div className="text-muted">No staff found.</div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-muted">No matching staff found.</div>
            ) : (
              <CRow className="g-2">
                {filteredStaff.map((member) => {
                  const id = Number(member.staff_id)
                  const checked = form.attendeeIds.includes(id)
                  const label = `${member.full_name || '-'} (${member.name_code || '-'})`
                  return (
                    <CCol xs={12} md={6} lg={4} key={id}>
                      <CFormCheck
                        id={`meeting-attendee-${id}`}
                        checked={checked}
                        onChange={() => onToggleAttendee(id)}
                        label={label}
                        disabled={isFormLocked}
                      />
                    </CCol>
                  )
                })}
              </CRow>
            )}
          </div>
          {validationErrors.attendeeIds && (
            <div className="invalid-feedback d-block">{validationErrors.attendeeIds}</div>
          )}
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel htmlFor="guestAttendeesText">Guest Attendees (Optional)</CFormLabel>
          <CFormTextarea
            id="guestAttendeesText"
            rows={3}
            value={form.guestAttendeesText}
            onChange={(e) => onChangeField('guestAttendeesText', e.target.value)}
            placeholder={'Suriati - Marshe Technology Sdn Bhd\nJohn Tan - ABC Sdn Bhd'}
            disabled={isFormLocked}
          />
          <small className="text-muted">Enter one guest per line (Name - Company).</small>
        </CCol>
      </CRow>
    </>
  )
}
