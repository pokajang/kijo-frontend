// src/views/SectionAssignLeaves.js

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import { ASSIGNABLE_LEAVE_TYPES } from '../../../components/leave/leaveTypes'
import {
  formatLeaveBalanceDays,
  normalizeLeaveType,
} from '../../../components/leave/leaveBalanceSummary'
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
  entitlements = [],
  entitlementsLoading = false,
}) => {
  const location = useLocation()
  const assignLeavePrefill = location.state?.assignLeavePrefill || null
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [assignYear, setAssignYear] = useState(currentYear)
  const [leaveType, setLeaveType] = useState('')
  const [noOfDays, setNoOfDays] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isEdit, setIsEdit] = useState(false)

  const selectableStaffList = editEntitlement ? staffList : filterActiveStaffRecords(staffList)
  const staffOptions = selectableStaffList.map((staff) => ({
    value: staff.staff_id,
    label: formatStaffOption(staff),
  }))

  const selectedStaffId = selectedStaff?.value
  const selectedYear = assignYear
  const editUsedDays = Number(editEntitlement?.used_days || 0)
  const editEntitlementLocked = isEdit && editUsedDays > 0

  const assignedEntitlements = useMemo(
    () =>
      selectedStaffId && selectedYear
        ? entitlements.filter(
            (entitlement) =>
              String(entitlement.staff_id) === String(selectedStaffId) &&
              String(entitlement.year) === String(selectedYear),
          )
        : [],
    [entitlements, selectedStaffId, selectedYear],
  )

  const assignedByType = useMemo(() => {
    const map = new Map()
    assignedEntitlements.forEach((entitlement) => {
      const key = normalizeLeaveType(entitlement.leave_type)
      if (key && !map.has(key)) map.set(key, entitlement)
    })
    return map
  }, [assignedEntitlements])

  const isCurrentEditType = useCallback(
    (entitlement, type) => {
      if (!isEdit || !editEntitlement) return false
      if (entitlement?.id && editEntitlement.id) {
        return String(entitlement.id) === String(editEntitlement.id)
      }
      return (
        String(entitlement?.staff_id) === String(editEntitlement.staff_id) &&
        String(entitlement?.year) === String(editEntitlement.year) &&
        normalizeLeaveType(type) === normalizeLeaveType(editEntitlement.leave_type)
      )
    },
    [editEntitlement, isEdit],
  )

  const leaveTypeOptions = useMemo(
    () =>
      ASSIGNABLE_LEAVE_TYPES.map((type) => {
        const assignedEntitlement = assignedByType.get(normalizeLeaveType(type))
        const isCurrent = isCurrentEditType(assignedEntitlement, type)
        const isAssigned = Boolean(assignedEntitlement)

        return {
          type,
          disabled: isAssigned && !isCurrent,
          label: isCurrent ? `${type} - Current` : isAssigned ? `${type} - Assigned` : type,
        }
      }),
    [assignedByType, isCurrentEditType],
  )

  const selectedLeaveTypeOption = leaveTypeOptions.find(
    (option) => normalizeLeaveType(option.type) === normalizeLeaveType(leaveType),
  )

  const assignedLeaveTypes = useMemo(
    () =>
      ASSIGNABLE_LEAVE_TYPES.map((type) => {
        const entitlement = assignedByType.get(normalizeLeaveType(type))
        if (!entitlement) return null
        return {
          type,
          label: `${type} (${formatLeaveBalanceDays(entitlement.total_days)}d)`,
        }
      }).filter(Boolean),
    [assignedByType],
  )

  const unassignedLeaveTypes = useMemo(
    () => ASSIGNABLE_LEAVE_TYPES.filter((type) => !assignedByType.has(normalizeLeaveType(type))),
    [assignedByType],
  )

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
      setRemarks(editEntitlement.remarks || '')
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
    setRemarks('')
  }, [assignLeavePrefill, editEntitlement, staffList])

  useEffect(() => {
    if (leaveType && selectedLeaveTypeOption?.disabled) {
      setLeaveType('')
    }
  }, [leaveType, selectedLeaveTypeOption])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStaff || !leaveType || noOfDays === '') {
      return dialog.alert('Please select staff, leave type, and entitlement days.')
    }
    if (editEntitlementLocked && Number(noOfDays) < editUsedDays) {
      return dialog.alert('Entitlement days cannot be lower than used days.')
    }

    try {
      if (isEdit) {
        await AH.updateEntitlement({
          id: editEntitlement.id,
          staff_id: selectedStaff.value,
          year: assignYear,
          type: leaveType,
          days: Number(noOfDays),
          remarks,
        })
        dialog.alert('Entitlement updated successfully.')
      } else {
        await AH.assignLeaveEntitlement({
          staff_id: selectedStaff.value,
          year: assignYear,
          type: leaveType,
          days: Number(noOfDays),
          remarks,
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
          {editEntitlementLocked && (
            <CAlert color="warning" className="py-2">
              This entitlement has used days. Staff, year, and leave type are locked; remarks remain
              editable and total days cannot be lower than used days.
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
                disabled={editEntitlementLocked}
              >
                <option value="">Select type</option>
                {leaveTypeOptions.map((option) => (
                  <option key={option.type} value={option.type} disabled={option.disabled}>
                    {option.label}
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
                min={editEntitlementLocked ? String(editUsedDays) : '0'}
                step="0.01"
                inputMode="decimal"
              />
            </CCol>
          </CRow>

          {selectedStaffId && selectedYear && (
            <div className="leave-entitlement-assignment-summary mb-3">
              {entitlementsLoading ? (
                <span className="small text-muted">Loading entitlement status...</span>
              ) : (
                <>
                  <div className="leave-entitlement-assignment-summary-group">
                    <span className="small text-muted">Assigned:</span>
                    {assignedLeaveTypes.length > 0 ? (
                      assignedLeaveTypes.map((item) => (
                        <CBadge key={item.type} color="success" className="fw-normal">
                          {item.label}
                        </CBadge>
                      ))
                    ) : (
                      <span className="small text-muted">None</span>
                    )}
                  </div>
                  <div className="leave-entitlement-assignment-summary-group">
                    <span className="small text-muted">Yet to assign:</span>
                    {unassignedLeaveTypes.length > 0 ? (
                      unassignedLeaveTypes.map((type) => (
                        <CBadge key={type} color="warning" textColor="dark" className="fw-normal">
                          {type}
                        </CBadge>
                      ))
                    ) : (
                      <span className="small text-muted">None</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <CRow className="mb-3">
            <CCol xs={12}>
              <CFormLabel>Remarks</CFormLabel>
              <CFormTextarea
                aria-label="Remarks"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional entitlement remarks"
                maxLength={5000}
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
