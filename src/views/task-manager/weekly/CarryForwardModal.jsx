import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { carryTaskForward } from './taskUpdateApi'
import { formatDateOnly, formatDisplayDate } from './taskWeekUtils'

const nextWeekday = (value) => {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + 7)
  return formatDateOnly(date)
}

const CarryForwardModal = ({ visible, task, onClose, onSaved }) => {
  const [newDueDate, setNewDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setNewDueDate(nextWeekday(task?.dueDate))
    setError('')
  }, [visible, task?.id, task?.dueDate])

  const save = async () => {
    if (!newDueDate) {
      setError('Choose the new due date.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = await carryTaskForward(task.id, newDueDate)
      if (data.status !== 'success')
        throw new Error(data.message || 'Unable to carry task forward.')
      onSaved(data)
      onClose()
    } catch (err) {
      setError(err?.message || 'Unable to carry task forward. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={saving ? undefined : onClose} alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Carry Forward Task</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="fw-semibold text-break mb-3">{task?.title || '-'}</div>
        {error ? <CAlert color="danger">{error}</CAlert> : null}
        <div className="small text-body-secondary mb-3">
          Current due date:{' '}
          <span className="text-body fw-semibold">{formatDisplayDate(task?.dueDate)}</span>
        </div>
        <CFormLabel htmlFor="carry-forward-due-date">New due date</CFormLabel>
        <CFormInput
          id="carry-forward-due-date"
          type="date"
          min={task?.dueDate || undefined}
          value={newDueDate}
          disabled={saving}
          onChange={(event) => setNewDueDate(event.target.value)}
        />
        <div className="small text-body-secondary mt-2">
          This keeps the same task ID and activity history.
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" disabled={saving} onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Carry Forward'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CarryForwardModal
