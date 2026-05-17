// src/views/project/ManageProjectModal/CollaboratorsCard.jsx
import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CButton,
  CTable,
  CTableHead,
  CTableBody,
  CTableHeaderCell,
  CTableRow,
  CTableDataCell,
  CDropdown,
  CDropdownMenu,
  CDropdownItem,
  CDropdownToggle,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'

import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import Select from 'react-select'
import { DataTableLoadingState } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import {
  addProjectCollaborator,
  listProjectCollaborators,
  listStaff,
  removeProjectCollaborator,
} from '../projectApi'

const roleOptions = [
  { value: 'Leader', label: 'Leader' },
  { value: 'Assistant', label: 'Assistant' },
  { value: 'Collaborator', label: 'Collaborator' },
]

const getStaffId = (staff) => staff?.id ?? staff?.staff_id ?? staff?.user_id
const getStaffName = (staff) => staff?.name || staff?.full_name || '-'
const getStaffCode = (staff) => staff?.code || staff?.name_code || '-'

const CollaboratorsCard = ({ projectId, onProgressUpdate }) => {
  const [staffList, setStaffList] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleDescription, setRoleDescription] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)

  const [loading, setLoading] = useState(true)
  const [addingCollaborator, setAddingCollaborator] = useState(false)
  const [removingStaffId, setRemovingStaffId] = useState(null)

  const fetchCollaborators = useCallback(
    async (options = {}) => {
      if (!projectId) return

      try {
        setLoading(true)
        const data = await listProjectCollaborators(projectId, options)
        setCollaborators(data)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch collaborators:', err)
        setCollaborators([])
        dialog.alert(err.message || 'Failed to fetch collaborators.')
      } finally {
        setLoading(false)
      }
    },
    [projectId],
  )

  useEffect(() => {
    const controller = new AbortController()

    listStaff({ signal: controller.signal })
      .then(setStaffList)
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch staff list:', err)
        setStaffList([])
      })

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    if (projectId) {
      fetchCollaborators({ signal: controller.signal })
    } else {
      setCollaborators([])
      setLoading(false)
    }

    return () => {
      controller.abort()
    }
  }, [fetchCollaborators, projectId])

  const handleAddCollaborator = async () => {
    if (addingCollaborator || !selectedStaff || !selectedRole) return

    const newCollaborator = {
      project_id: projectId,
      staff_id: selectedStaff.value,
      project_role: selectedRole.value,
      role_description: roleDescription,
    }

    try {
      setAddingCollaborator(true)
      const result = await addProjectCollaborator(newCollaborator)
      if (result.status === 'success') {
        await fetchCollaborators()
        setSelectedStaff(null)
        setSelectedRole(null)
        setRoleDescription('')
        setShowAssignModal(false)

        if (typeof onProgressUpdate === 'function') {
          onProgressUpdate()
        }
      } else {
        dialog.alert(result.message || 'Failed to add collaborator.')
      }
    } catch (err) {
      console.error('Failed to add collaborator:', err)
      dialog.alert(err.message || 'Failed to add collaborator.')
    } finally {
      setAddingCollaborator(false)
    }
  }

  const leaderAlreadyAssigned = collaborators.some((c) => c.project_role === 'Leader')

  const handleCancelAssign = () => {
    if (addingCollaborator) return
    setSelectedStaff(null)
    setSelectedRole(null)
    setRoleDescription('')
    setShowAssignModal(false)
  }

  const handleRemoveCollaborator = async (staffId) => {
    if (removingStaffId != null || !staffId || !projectId) return
    if (!(await dialog.confirm('Remove this collaborator from the project?'))) return

    try {
      setRemovingStaffId(staffId)
      const result = await removeProjectCollaborator({ project_id: projectId, staff_id: staffId })
      if (result.status === 'success') {
        await fetchCollaborators()

        if (typeof onProgressUpdate === 'function') {
          onProgressUpdate()
        }
      } else {
        dialog.alert(result.message || 'Failed to remove collaborator.')
      }
    } catch (err) {
      console.error('Failed to remove collaborator:', err)
      dialog.alert(err.message || 'Failed to remove collaborator.')
    } finally {
      setRemovingStaffId(null)
    }
  }

  const availableStaffOptions = staffList
    .filter(
      (staff) =>
        !collaborators.some(
          (collaborator) => String(collaborator.staff_id) === String(getStaffId(staff)),
        ),
    )
    .map((staff) => ({
      value: getStaffId(staff),
      label: `${getStaffName(staff)} (${getStaffCode(staff)})`,
      data: staff,
    }))

  return (
    <>
      <CCardHeader className="rounded-0 d-flex align-items-center justify-content-between">
        <strong>Collaborators</strong>
        <CButton
          color="primary"
          variant="outline"
          size="sm"
          onClick={() => setShowAssignModal(true)}
          disabled={addingCollaborator || removingStaffId != null}
        >
          Add Collaborator
        </CButton>
      </CCardHeader>
      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading collaborators..." />
        ) : (
          <div className="data-table-embedded-shell">
            {/* datatable-exempt: existing embedded/layout table */}
            <CTable hover className="data-table-compact embedded-data-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Role</CTableHeaderCell>
                  <CTableHeaderCell>Role Description</CTableHeaderCell>
                  <CTableHeaderCell>Contact</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {collaborators.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-muted">
                      No collaborators assigned to this project.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  collaborators.map((staff, i) => (
                    <CTableRow key={staff.staff_id || i}>
                      <CTableHeaderCell>{i + 1}</CTableHeaderCell>

                      <CTableDataCell>
                        {staff.name || staff.full_name || '-'}
                        <br />
                        <small className="text-muted">{staff.code || staff.name_code || '-'}</small>
                      </CTableDataCell>

                      <CTableDataCell>{staff.project_role || '-'}</CTableDataCell>

                      <CTableDataCell>{staff.role_description || '-'}</CTableDataCell>

                      <CTableDataCell>
                        {staff.mobileNumber || staff.mobile_number || '-'}
                        <br />
                        <small className="text-muted">{staff.email || '-'}</small>
                      </CTableDataCell>

                      <CTableDataCell className="text-end">
                        <CDropdown portal>
                          <CDropdownToggle color="transparent" size="sm">
                            <CIcon icon={cilOptions} />
                          </CDropdownToggle>
                          <CDropdownMenu>
                            <CDropdownItem
                              className="text-danger"
                              disabled={removingStaffId != null}
                              onClick={() => handleRemoveCollaborator(staff.staff_id)}
                            >
                              {removingStaffId === staff.staff_id
                                ? 'Removing...'
                                : 'Remove Collaborator'}
                            </CDropdownItem>
                          </CDropdownMenu>
                        </CDropdown>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          </div>
        )}
      </CCardBody>

      <CModal visible={showAssignModal} onClose={handleCancelAssign} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Add Collaborator</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel>Assign Staff</CFormLabel>
              <Select
                options={availableStaffOptions}
                value={selectedStaff}
                onChange={setSelectedStaff}
                isClearable
                isDisabled={addingCollaborator}
                placeholder="Search staff..."
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Role</CFormLabel>
              <Select
                options={
                  leaderAlreadyAssigned
                    ? roleOptions.filter((r) => r.value !== 'Leader')
                    : roleOptions
                }
                value={selectedRole}
                onChange={setSelectedRole}
                isClearable
                isDisabled={addingCollaborator}
                placeholder="Select role..."
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Role Description</CFormLabel>
              <CFormInput
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="e.g. To assist in documentation..."
                disabled={addingCollaborator}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={handleCancelAssign}
            disabled={addingCollaborator}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            variant="outline"
            onClick={handleAddCollaborator}
            disabled={!selectedStaff || !selectedRole || addingCollaborator}
          >
            {addingCollaborator ? 'Adding...' : 'Add Staff'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

CollaboratorsCard.propTypes = {
  projectId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onProgressUpdate: PropTypes.func,
}

export default CollaboratorsCard
