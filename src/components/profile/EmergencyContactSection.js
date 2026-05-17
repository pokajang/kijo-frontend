import React from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'

const EmergencyContactSection = ({ profile, onChange }) => (
  <>
    <CCardHeader>
      <strong>Emergency Contact</strong>
    </CCardHeader>
    <CCardBody>
      {[1, 2].map((i) => (
        <CRow key={i} className="mb-2">
          <CCol md={6}>
            <CFormLabel htmlFor={`emergencyName${i}`}>Full Name (Person {i})</CFormLabel>
            <CFormInput
              type="text"
              id={`emergencyName${i}`}
              name={`emergencyName${i}`}
              value={profile[`emergencyName${i}`] || ''}
              onChange={onChange}
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel htmlFor={`emergencyRelationship${i}`}>Relationship (Person {i})</CFormLabel>
            <CFormInput
              type="text"
              id={`emergencyRelationship${i}`}
              name={`emergencyRelationship${i}`}
              value={profile[`emergencyRelationship${i}`] || ''}
              onChange={onChange}
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel htmlFor={`emergencyPhone${i}`}>Phone Number (Person {i})</CFormLabel>
            <CFormInput
              type="tel"
              id={`emergencyPhone${i}`}
              name={`emergencyPhone${i}`}
              value={profile[`emergencyPhone${i}`] || ''}
              onChange={onChange}
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel htmlFor={`emergencyAddress${i}`}>Address (Person {i})</CFormLabel>
            <CFormTextarea
              id={`emergencyAddress${i}`}
              name={`emergencyAddress${i}`}
              rows={2}
              value={profile[`emergencyAddress${i}`] || ''}
              onChange={onChange}
            />
          </CCol>
        </CRow>
      ))}
    </CCardBody>
  </>
)

export default EmergencyContactSection
