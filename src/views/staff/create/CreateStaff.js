import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CRow, CCol, CCard, CCardBody, CCardHeader, CForm, CButton } from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'

import {
  initialState,
  handleInputChange,
  handleNameCodeInputChange,
  handleSubmit,
  handleReset,
  mapStaffToFormState,
  fetchStaffById,
  handleUpdate,
} from './actionHandlers'
import PersonalDetails from './PersonalDetails'
import HiringDetails from './HiringDetails'
import SystemAccess from './SystemAccess'

const CreateStaff = () => {
  const [staffDetails, setStaffDetails] = useState(initialState)
  const [nameCodeTaken, setNameCodeTaken] = useState(false)
  const [isLoadingStaff, setIsLoadingStaff] = useState(false)
  const [initialEditDetails, setInitialEditDetails] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const editId = useMemo(() => {
    const raw = searchParams.get('edit_id')
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }, [searchParams])
  const isEditMode = Boolean(editId)

  useEffect(() => {
    let isActive = true

    const loadStaffForEdit = async () => {
      if (!isEditMode || !editId) return

      setIsLoadingStaff(true)
      try {
        const result = await fetchStaffById(editId)
        if (!isActive) return

        if (result.status !== 'success' || !result.staff) {
          dialog.alert(result.message || 'Failed to load staff details.')
          navigate('/staff/manage')
          return
        }

        const mapped = mapStaffToFormState(result.staff)
        setStaffDetails(mapped)
        setInitialEditDetails(mapped)
        setNameCodeTaken(false)
      } catch (error) {
        if (!isActive) return
        console.error('Load edit staff error:', error)
        dialog.alert('Unable to load staff details.')
        navigate('/staff/manage')
      } finally {
        if (isActive) setIsLoadingStaff(false)
      }
    }

    loadStaffForEdit()
    return () => {
      isActive = false
    }
  }, [editId, isEditMode, navigate])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <strong>{isEditMode ? 'Editing Current Staff' : 'Staff Registration Form'}</strong>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => navigate('/staff/manage')}
              >
                Back
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {isEditMode && isLoadingStaff ? (
              <div className="text-muted">Loading current staff data...</div>
            ) : (
              <CForm autoComplete="off" className="row g-3">
                <PersonalDetails
                  staffDetails={staffDetails}
                  setStaffDetails={setStaffDetails}
                  handleInputChange={handleInputChange}
                  handleNameCodeInputChange={handleNameCodeInputChange}
                  nameCodeTaken={nameCodeTaken}
                  setNameCodeTaken={setNameCodeTaken}
                />

                <HiringDetails
                  staffDetails={staffDetails}
                  setStaffDetails={setStaffDetails}
                  handleInputChange={handleInputChange}
                />

                <SystemAccess
                  staffDetails={staffDetails}
                  setStaffDetails={setStaffDetails}
                  handleInputChange={handleInputChange}
                />

                <CCol xs={12} className="mt-4 d-flex justify-content-end gap-2 flex-wrap">
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isEditMode && initialEditDetails) {
                        setStaffDetails(initialEditDetails)
                        setNameCodeTaken(false)
                      } else {
                        handleReset(setStaffDetails)
                      }
                    }}
                  >
                    {isEditMode ? 'Reset Changes' : 'Reset'}
                  </CButton>
                  <CButton
                    color="primary"
                    size="sm"
                    onClick={() => {
                      if (isEditMode && editId) {
                        handleUpdate(editId, staffDetails, navigate)
                      } else {
                        handleSubmit(staffDetails, setStaffDetails, navigate)
                      }
                    }}
                  >
                    {isEditMode ? 'Update Staff' : 'Create Staff'}
                  </CButton>
                </CCol>
              </CForm>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CreateStaff
