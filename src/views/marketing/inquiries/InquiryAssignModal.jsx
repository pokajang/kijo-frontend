import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { assignInquiryOwner, listAssignableStaff } from './inquiryUtils'

const InquiryAssignModal = ({ visible, inquiry, onClose, onSaved }) => {
  const [staffOptions, setStaffOptions] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return

    setSelectedStaffId(inquiry?.ownerStaffId ? String(inquiry.ownerStaffId) : '')
    setError('')
    setLoading(true)

    listAssignableStaff()
      .then(setStaffOptions)
      .catch((err) => setError(err?.message || 'Unable to load staff list.'))
      .finally(() => setLoading(false))
  }, [inquiry, visible])

  const selectedStaff = useMemo(
    () => staffOptions.find((staff) => String(staff.id) === String(selectedStaffId)),
    [selectedStaffId, staffOptions],
  )

  const saveAssignment = async () => {
    if (!inquiry?.id) return

    setSaving(true)
    setError('')
    try {
      const saved = await assignInquiryOwner(inquiry.id, selectedStaffId)
      onSaved?.(saved, selectedStaff)
    } catch (err) {
      setError(err?.message || 'Unable to assign PIC.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={saving ? undefined : onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Assign PIC</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}
        <CFormLabel htmlFor="inquiry-assign-pic">PIC</CFormLabel>
        <CFormSelect
          id="inquiry-assign-pic"
          value={selectedStaffId}
          disabled={loading || saving}
          onChange={(event) => setSelectedStaffId(event.target.value)}
        >
          <option value="">{loading ? 'Loading staff...' : 'Unassigned'}</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.label}
            </option>
          ))}
        </CFormSelect>
        {inquiry?.companyName && (
          <div className="text-muted small mt-2">Inquiry: {inquiry.companyName}</div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" disabled={saving} onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" disabled={saving || loading} onClick={saveAssignment}>
          {saving ? 'Saving...' : 'Save Assignment'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default InquiryAssignModal
