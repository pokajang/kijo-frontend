import React, { useState, useEffect } from 'react'
import { CRow, CCol, CAlert, CCard } from '@coreui/react'
import GeneralInfoSection from './GeneralInfoSection'
import SalesProfileSection from './SalesProfileSection'
import EmergencyContactSection from './EmergencyContactSection'
import HealthInfoSection from './HealthInfoSection'
import dialog from '../dialog/dialogService'
const initialProfileState = {
  fullName: '',
  email: '',
  mobileNumber: '',
  birthDate: '',
  nric: '',
  currentAddress: '',
  nameCode: '',
  crmPosition: '',
  emergencyName1: '',
  emergencyRelationship1: '',
  emergencyPhone1: '',
  emergencyAddress1: '',
  emergencyName2: '',
  emergencyRelationship2: '',
  emergencyPhone2: '',
  emergencyAddress2: '',
  chronicIllness: '',
  allergies: '',
  disabilities: '',
  currentMedication: '',
  otherConcerns: '',
}

const StaffProfile = ({ closeModal }) => {
  const [profileDetails, setProfileDetails] = useState(initialProfileState)
  const [profileIncomplete, setProfileIncomplete] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}staff/profile`, {
          credentials: 'include',
        })
        const result = await res.json()
        if (result.status === 'success' && result.profile) {
          const p = result.profile
          const newProfile = {
            fullName: p.full_name || '',
            email: p.email || '',
            mobileNumber: p.mobile_number || '',
            birthDate: p.birth_date || '',
            nric: p.nric || '',
            currentAddress: p.current_address || '',
            nameCode: p.name_code || '',
            crmPosition: p.crm_position || '',
            emergencyName1: p.emergency_name1 || '',
            emergencyRelationship1: p.emergency_relationship1 || '',
            emergencyPhone1: p.emergency_phone1 || '',
            emergencyAddress1: p.emergency_address1 || '',
            emergencyName2: p.emergency_name2 || '',
            emergencyRelationship2: p.emergency_relationship2 || '',
            emergencyPhone2: p.emergency_phone2 || '',
            emergencyAddress2: p.emergency_address2 || '',
            chronicIllness: p.chronic_illness || '',
            allergies: p.allergies || '',
            disabilities: p.disabilities || '',
            currentMedication: p.current_medication || '',
            otherConcerns: p.other_concerns || '',
          }
          setProfileDetails(newProfile)
          setProfileIncomplete(Object.values(newProfile).some((v) => v === '' || v === null))
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    fetchProfile()
  }, [])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileDetails((prev) => ({ ...prev, [name]: value }))
  }

  const handleUpdateProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}staff/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileDetails),
      })
      const result = await res.json()
      if (result.status === 'success') {
        dialog.alert('✅ Profile updated successfully.')
        if (closeModal) closeModal()
      } else {
        dialog.alert('❌ Failed to update profile: ' + result.message)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      dialog.alert('❌ Unexpected error. Please try again.')
    }
  }

  const handleCancelProfile = () => {
    setProfileDetails(initialProfileState)
    if (closeModal) closeModal()
  }

  return (
    <CRow className="justify-content-center">
      <CCol xs={12}>
        <CAlert color="primary">
          <strong>
            Please ensure all details are accurate and true. The information provided herein will be
            reflected across various official documents.
          </strong>
        </CAlert>
        {profileIncomplete && (
          <CAlert color="warning">
            Please complete all information to avoid issues with official records.
          </CAlert>
        )}
        <CCard>
          <GeneralInfoSection profile={profileDetails} onChange={handleProfileChange} />
          <SalesProfileSection profile={profileDetails} onChange={handleProfileChange} />
          <EmergencyContactSection profile={profileDetails} onChange={handleProfileChange} />
          <HealthInfoSection
            profile={profileDetails}
            onChange={handleProfileChange}
            onUpdate={handleUpdateProfile}
            onCancel={handleCancelProfile}
            profileIncomplete={profileIncomplete}
          />
        </CCard>
      </CCol>
    </CRow>
  )
}

export default StaffProfile
