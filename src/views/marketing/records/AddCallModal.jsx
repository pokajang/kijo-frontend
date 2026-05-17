import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'
import { fetchApi } from './fetchApi'

const toLocalDateTimeInputValue = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const AddCallModal = ({ visible, contact, onClose, onSaved }) => {
  const [form, setForm] = useState({
    called_at: toLocalDateTimeInputValue(),
    outcome: '',
    note: '',
    next_action_at: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  //  Save Handler
  const handleSave = async () => {
    if (!form.outcome.trim()) {
      setError('Please select an outcome.')
      setTimeout(() => setError(''), 5000)
      return
    }

    setSaving(true)
    try {
      const calledAt = form.called_at ? form.called_at.replace('T', ' ') : ''
      const nextActionAt = form.next_action_at ? form.next_action_at.replace('T', ' ') : ''
      await fetchApi.createCallRecord({
        contact_id: contact.id,
        called_at: calledAt,
        outcome: form.outcome,
        note: form.note,
        next_action_at: nextActionAt,
      })
      onSaved('Call record added successfully.')
    } catch (e) {
      setError(e?.message || 'Failed to save call record.')
      setTimeout(() => setError(''), 10000)
    } finally {
      setSaving(false)
    }
  }

  //  Render
  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader>
        <CModalTitle>Add Call Log for {contact?.name || '-'}</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {error && <div className="text-danger small mb-2">{error}</div>}

        <CForm>
          <CFormInput
            className="mb-3"
            type="datetime-local"
            label="Call Date & Time"
            value={form.called_at}
            onChange={(e) => setForm({ ...form, called_at: e.target.value })}
          />

          {/* Outcome Selector */}
          <div className="mb-3">
            <label className="form-label d-block">Outcome</label>
            <div className="d-flex flex-wrap gap-2">
              {/* No Answer */}
              {form.outcome === 'No Answer' ? (
                <CButton
                  size="sm"
                  color="secondary"
                  onClick={() => setForm({ ...form, outcome: 'No Answer' })}
                >
                  No Answer
                </CButton>
              ) : (
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => setForm({ ...form, outcome: 'No Answer' })}
                >
                  No Answer
                </CButton>
              )}

              {/* Callback Later */}
              {form.outcome === 'Callback Later' ? (
                <CButton
                  size="sm"
                  color="secondary"
                  onClick={() => setForm({ ...form, outcome: 'Callback Later' })}
                >
                  Callback Later
                </CButton>
              ) : (
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => setForm({ ...form, outcome: 'Callback Later' })}
                >
                  Callback Later
                </CButton>
              )}

              {/* Interested */}
              {form.outcome === 'Interested' ? (
                <CButton
                  size="sm"
                  color="secondary"
                  onClick={() => setForm({ ...form, outcome: 'Interested' })}
                >
                  Interested
                </CButton>
              ) : (
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => setForm({ ...form, outcome: 'Interested' })}
                >
                  Interested
                </CButton>
              )}

              {/* Not Interested */}
              {form.outcome === 'Not Interested' ? (
                <CButton
                  size="sm"
                  color="secondary"
                  onClick={() => setForm({ ...form, outcome: 'Not Interested' })}
                >
                  Not Interested
                </CButton>
              ) : (
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => setForm({ ...form, outcome: 'Not Interested' })}
                >
                  Not Interested
                </CButton>
              )}
            </div>
          </div>

          {/* Notes */}
          <CFormTextarea
            className="mb-3"
            label="Notes"
            rows={3}
            placeholder="Add details about the conversation..."
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />

          {form.outcome === 'Callback Later' && (
            <CFormInput
              className="mb-3"
              type="datetime-local"
              label="Next Follow-up"
              value={form.next_action_at}
              onChange={(e) => setForm({ ...form, next_action_at: e.target.value })}
            />
          )}
        </CForm>
      </CModalBody>

      <CModalFooter>
        <CButton size="sm" color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        <CButton size="sm" color="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AddCallModal
