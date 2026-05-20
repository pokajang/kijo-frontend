// src/views/SectionAssignLeaves.js

import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CButton,
  CRow,
  CCol,
  CAlert,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import * as AH from './actionHandlers'
import dialog from '../../../components/dialog/dialogService'
/**
 * Props:
 *   - staffList: array of staff objects
 *   - onAssigned: fn to re-fetch entitlements after create/update
 *   - editEntitlement: object|null — when non-null, form enters edit mode
 *   - onCancelEdit: fn to exit edit mode
 */
const SectionAssignLeaves = ({
  staffList = [],
  onAssigned,
  editEntitlement = null,
  onCancelEdit,
}) => {
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [assignYear, setAssignYear] = useState(new Date().getFullYear())
  const [leaveType, setLeaveType] = useState('')
  const [noOfDays, setNoOfDays] = useState('')
  const [isEdit, setIsEdit] = useState(false)

  // build your dropdown options from staffList
  const staffOptions = staffList.map((s) => ({
    value: s.staff_id,
    label: `${s.full_name} (${s.name_code}) — ${s.position}, ${s.department}`,
  }))

  useEffect(() => {
    if (editEntitlement) {
      setIsEdit(true)
      // find the matching staff record
      const st = staffList.find((s) => s.staff_id === editEntitlement.staff_id)
      if (st) {
        setSelectedStaff({
          value: st.staff_id,
          label: `${st.full_name} (${st.name_code}) — ${st.position}, ${st.department}`,
        })
      }
      // populate the rest
      setAssignYear(editEntitlement.year)
      setLeaveType(editEntitlement.leave_type)
      setNoOfDays(editEntitlement.total_days)
    } else {
      // reset to “new” mode
      setIsEdit(false)
      setSelectedStaff(null)
      setAssignYear(new Date().getFullYear())
      setLeaveType('')
      setNoOfDays('')
    }
  }, [editEntitlement, staffList])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStaff || !leaveType || !noOfDays) {
      return dialog.alert('Please select staff, leave type, and entitlement days.')
    }

    try {
      if (isEdit) {
        await AH.updateEntitlement({
          id: editEntitlement.id,
          staff_id: selectedStaff.value,
          year: assignYear,
          type: leaveType,
          days: Number(noOfDays),
        })
        dialog.alert('Entitlement updated successfully.')
      } else {
        await AH.assignLeaveEntitlement({
          staff_id: selectedStaff.value,
          year: assignYear,
          type: leaveType,
          days: Number(noOfDays),
        })
        dialog.alert('Leave entitlement assigned successfully.')
      }
      await onAssigned?.()
      onCancelEdit?.()
    } catch (err) {
      console.error(err)
      dialog.alert(`Failed to ${isEdit ? 'update' : 'assign'} entitlement: ${err.message}`)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
        <strong>{isEdit ? 'Edit Leave Entitlement' : 'Assign Leaves to Staff'}</strong>
        {onCancelEdit && (
          <CButton color="secondary" variant="outline" size="sm" onClick={onCancelEdit}>
            Back
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        <CForm onSubmit={handleSubmit}>
          {isEdit && (
            <CAlert color="primary">
              <strong>Editing entitlement for {selectedStaff?.label}</strong>
            </CAlert>
          )}
          <CRow className="mb-3">
            <CCol md={5}>
              <CFormLabel>Staff Name</CFormLabel>
              <Select
                options={staffOptions}
                value={selectedStaff}
                onChange={setSelectedStaff}
                placeholder="Select staff..."
                isSearchable
                isDisabled={isEdit} // lock down when editing
              />
            </CCol>
            <CCol md={2}>
              <CFormLabel>For the Year</CFormLabel>
              <CFormInput
                type="number"
                value={assignYear}
                onChange={(e) => setAssignYear(e.target.value)}
                min="1900"
                max="2100"
                disabled={isEdit}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Type of Leave</CFormLabel>
              <CFormSelect value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option value="">Select type</option>
                <option value="Annual">Annual</option>
                <option value="Sick">Sick</option>
                <option value="Hospitalization">Hospitalization</option>
                <option value="Maternity">Maternity</option>
                <option value="Emergency">Emergency</option>
                <option value="Paternity">Paternity</option>
                <option value="Unrecorded">Unrecorded</option>
                <option value="Special">Special</option>
                <option value="Not Specified">Not Specified</option>
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormLabel>Entitlement (Days)</CFormLabel>
              <CFormInput
                type="number"
                value={noOfDays}
                onChange={(e) => setNoOfDays(e.target.value)}
                min="0"
              />
            </CCol>
          </CRow>

          <CButton type="submit" color="primary" size="sm" variant="outline" className="me-2">
            {isEdit ? 'Update Leave' : 'Assign Leave'}
          </CButton>
          <CButton
            type="button"
            color="secondary"
            size="sm"
            variant="outline"
            onClick={onCancelEdit}
          >
            Cancel
          </CButton>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default SectionAssignLeaves
