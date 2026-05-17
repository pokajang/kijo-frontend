import React from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
} from '@coreui/react'

const HealthInfoSection = ({ profile, onChange, onUpdate, onCancel, profileIncomplete }) => (
  <>
    <CCardHeader>
      <strong>Health & Medical Concerns</strong>
    </CCardHeader>
    <CCardBody>
      <CRow className="mb-2">
        <CCol md={6}>
          <CFormLabel htmlFor="chronicIllness">Chronic Illness</CFormLabel>
          <CFormInput
            type="text"
            id="chronicIllness"
            name="chronicIllness"
            value={profile.chronicIllness || ''}
            onChange={onChange}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="allergies">Known Allergies</CFormLabel>
          <CFormInput
            type="text"
            id="allergies"
            name="allergies"
            value={profile.allergies || ''}
            onChange={onChange}
          />
        </CCol>
      </CRow>
      <CRow className="mb-2">
        <CCol md={6}>
          <CFormLabel htmlFor="disabilities">Disabilities/Impairments</CFormLabel>
          <CFormInput
            type="text"
            id="disabilities"
            name="disabilities"
            value={profile.disabilities || ''}
            onChange={onChange}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="currentMedication">Current Medications</CFormLabel>
          <CFormInput
            type="text"
            id="currentMedication"
            name="currentMedication"
            value={profile.currentMedication || ''}
            onChange={onChange}
          />
        </CCol>
      </CRow>
      <CRow className="mb-3">
        <CCol>
          <CFormLabel htmlFor="otherConcerns">Other Concerns / Notes</CFormLabel>
          <CFormTextarea
            id="otherConcerns"
            name="otherConcerns"
            rows={3}
            value={profile.otherConcerns || ''}
            onChange={onChange}
          />
        </CCol>
      </CRow>
      <CRow className="g-2 justify-content-start">
        <CCol xs="auto">
          <CButton
            color="primary"
            onClick={onUpdate}
            // disabled={profileIncomplete}
          >
            Update Profile
          </CButton>
        </CCol>
        <CCol xs="auto">
          <CButton color="secondary" onClick={onCancel}>
            Cancel
          </CButton>
        </CCol>
      </CRow>
    </CCardBody>
  </>
)

export default HealthInfoSection
