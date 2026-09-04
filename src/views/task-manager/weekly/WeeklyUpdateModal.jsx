import React, { useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CButtonGroup,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import { createTaskUpdate } from './taskUpdateApi'
import { formatDateOnly, formatDisplayDate, formatWeekLabel, getWeekStart } from './taskWeekUtils'

const MAX_NOTE_LENGTH = 1000

const WeeklyUpdateModal = ({ visible, task, onClose, onSaved }) => {
  const noteRef = useRef(null)
  const savedRef = useRef(false)
  const [type, setType] = useState('progress')
  const [reportingDate, setReportingDate] = useState(getWeekStart())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setType('progress')
    setReportingDate(getWeekStart())
    setNote('')
    setError('')
    savedRef.current = false
  }, [visible, task?.id])

  useEffect(() => {
    if (error) noteRef.current?.focus()
  }, [error])

  const requestClose = async () => {
    if (saving) return
    if (!savedRef.current && note.trim() && !(await dialog.confirm('Discard this weekly update?')))
      return
    onClose()
  }

  const save = async () => {
    const trimmedNote = note.trim()
    if (!trimmedNote) {
      setError('Enter a short update before saving.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = await createTaskUpdate(task.id, {
        update_type: type,
        reporting_date: reportingDate,
        note: trimmedNote,
      })
      if (data.status !== 'success')
        throw new Error(data.message || 'Unable to save weekly update.')
      savedRef.current = true
      await onSaved(data)
      onClose()
    } catch (err) {
      setError(err?.message || 'Unable to save weekly update. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const typeCopy =
    type === 'hiccup'
      ? 'What is slowing or blocking this task?'
      : 'What moved forward or was achieved this week?'

  return (
    <CModal visible={visible} onClose={() => void requestClose()} alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>Add Weekly Update</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-4">
          <div className="fw-semibold text-break">{task?.title || '-'}</div>
          <div className="small text-body-secondary mt-1">
            {task?.projectName ? `${task.projectName} · ` : ''}Due{' '}
            {formatDisplayDate(task?.dueDate)}
          </div>
        </div>

        {error ? <CAlert color="danger">{error}</CAlert> : null}

        <div className="mb-3">
          <CFormLabel htmlFor="weekly-update-date">Reporting date</CFormLabel>
          <CFormInput
            id="weekly-update-date"
            type="date"
            min={String(task?.createdAt || '').slice(0, 10) || undefined}
            max={formatDateOnly(new Date())}
            value={reportingDate}
            disabled={saving}
            onChange={(event) => setReportingDate(event.target.value)}
          />
          <div className="small text-body-secondary mt-1">
            Saved under the week of {formatWeekLabel(getWeekStart(reportingDate))}.
          </div>
        </div>

        <fieldset className="border-0 p-0 mb-3">
          <legend className="form-label mb-2">Update type</legend>
          <CButtonGroup className="w-100" role="radiogroup" aria-label="Weekly update type">
            <CFormCheck
              type="radio"
              button={{ color: 'success', variant: type === 'progress' ? undefined : 'outline' }}
              name="weekly-update-type"
              id="weekly-update-progress"
              label="Progress"
              checked={type === 'progress'}
              disabled={saving}
              onChange={() => setType('progress')}
            />
            <CFormCheck
              type="radio"
              button={{ color: 'warning', variant: type === 'hiccup' ? undefined : 'outline' }}
              name="weekly-update-type"
              id="weekly-update-hiccup"
              label="Hiccup"
              checked={type === 'hiccup'}
              disabled={saving}
              onChange={() => setType('hiccup')}
            />
          </CButtonGroup>
        </fieldset>

        <div>
          <CFormLabel htmlFor="weekly-update-note">Update</CFormLabel>
          <CFormTextarea
            id="weekly-update-note"
            ref={noteRef}
            rows={5}
            maxLength={MAX_NOTE_LENGTH}
            value={note}
            disabled={saving}
            placeholder={typeCopy}
            aria-describedby="weekly-update-note-count"
            onChange={(event) => setNote(event.target.value)}
          />
          <div id="weekly-update-note-count" className="small text-body-secondary text-end mt-1">
            {note.length} / {MAX_NOTE_LENGTH}
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          disabled={saving}
          onClick={() => void requestClose()}
        >
          Cancel
        </CButton>
        <CButton color={type === 'hiccup' ? 'warning' : 'success'} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : type === 'hiccup' ? 'Report Hiccup' : 'Save Update'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default WeeklyUpdateModal
