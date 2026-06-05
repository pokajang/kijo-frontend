// src/views/SectionAssignLeaves.js

import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import { ASSIGNABLE_LEAVE_TYPES } from '../../../components/leave/leaveTypes'
import {
  filterActiveStaffRecords,
  isActiveStaffRecord,
} from '../../../components/leave/staffActivity'
import * as AH from './actionHandlers'
import dialog from '../../../components/dialog/dialogService'

const currentYear = new Date().getFullYear()

const formatStaffOption = (staff = {}) => {
  const name = staff.full_name || staff.name || 'Unknown Staff'
  const code = staff.name_code || staff.staff_code
  const roleParts = [staff.position, staff.department].filter(Boolean)
  const base = code ? `${name} (${code})` : name

  return roleParts.length ? `${base} - ${roleParts.join(', ')}` : base
}

const SectionAssignLeaves = ({
  staffList = [],
  onAssigned,
  editEntitlement = null,
  onCancelEdit,
}) => {
  const location = useLocation()
  const assignLeavePrefill = location.state?.assignLeavePrefill || null
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [assignYear, setAssignYear] = useState(currentYear)
  const [leaveType, setLeaveType] = useState('')
  const [noOfDays, setNoOfDays] = useState('')
  const [isEdit, setIsEdit] = useState(false)

  const selectableStaffList = editEntitlement ? staffList : filterActiveStaffRecords(staffList)
  const staffOptions = selectableStaffList.map((staff) => ({
    value: staff.staff_id,
    label: formatStaffOption(staff),
  }))

  useEffect(() => {
    if (editEntitlement) {
      const staff = staffList.find(
        (item) => String(item.staff_id) === String(editEntitlement.staff_id),
      )
      setIsEdit(true)
      setSelectedStaff(staff ? { value: staff.staff_id, label: formatStaffOption(staff) } : null)
      setAssignYear(editEntitlement.year)
      setLeaveType(editEntitlement.leave_type)
      setNoOfDays(editEntitlement.total_days)
      return
    }

    const prefillStaff = assignLeavePrefill?.staff_id
      ? staffList.find((staff) => String(staff.staff_id) === String(assignLeavePrefill.staff_id))
      : null
    const activePrefillStaff =
      prefillStaff && isActiveStaffRecord(prefillStaff) ? prefillStaff : null

    setIsEdit(false)
    setSelectedStaff(
      activePrefillStaff
        ? { value: activePrefillStaff.staff_id, label: formatStaffOption(activePrefillStaff) }
        : null,
    )
    setAssignYear(assignLeavePrefill?.year || currentYear)
    setLeaveType(assignLeavePrefill?.leave_type || '')
    setNoOfDays('')
  }, [assignLeavePrefill, editEntitlement, staffList])

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
                aria-label="Staff Name"
                options={staffOptions}
                value={selectedStaff}
                onChange={setSelectedStaff}
                placeholder="Select staff..."
                isSearchable
                isDisabled={isEdit}
              />
            </CCol>
            <CCol md={2}>
              <CFormLabel>For the Year</CFormLabel>
              <CFormInput
                aria-label="For the Year"
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
              <CFormSelect
                aria-label="Type of Leave"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
              >
                <option value="">Select type</option>
                {ASSIGNABLE_LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormLabel>Entitlement (Days)</CFormLabel>
              <CFormInput
                aria-label="Entitlement (Days)"
                type="number"
                value={noOfDays}
                onChange={(e) => setNoOfDays(e.target.value)}
                min="0"
              />
            </CCol>
          </CRow>

          <div className="d-flex justify-content-end gap-2 flex-wrap">
            <CButton
              type="button"
              color="secondary"
              size="sm"
              variant="outline"
              onClick={onCancelEdit}
            >
              Cancel
            </CButton>
            <CButton type="submit" color="primary" size="sm">
              {isEdit ? 'Update Leave' : 'Assign Leave'}
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default SectionAssignLeaves
