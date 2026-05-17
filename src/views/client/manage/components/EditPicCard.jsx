import React from 'react'
import {
  CCol,
  CAlert,
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
} from '@coreui/react'

const EditPicCard = ({ alertMessage, alertColor, onDismissAlert, selectedPic, setSelectedPic }) => {
  if (!selectedPic) return null

  return (
    <>
      {alertMessage && (
        <CCol>
          <CAlert color={alertColor} dismissible onClose={onDismissAlert}>
            {alertMessage}
          </CAlert>
        </CCol>
      )}
      <CCard>
        <CCardHeader>
          <strong>Person In Charge</strong>
        </CCardHeader>
        <CCardBody>
          <CForm className="row g-3">
            <CCol md={3}>
              <CFormLabel>Full Name</CFormLabel>
              <CFormInput
                value={selectedPic.full_name}
                onChange={(e) => setSelectedPic((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                type="email"
                value={selectedPic.email}
                onChange={(e) => setSelectedPic((prev) => ({ ...prev, email: e.target.value }))}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Mobile Number</CFormLabel>
              <CFormInput
                value={selectedPic.mobile_number}
                onChange={(e) =>
                  setSelectedPic((prev) => ({ ...prev, mobile_number: e.target.value }))
                }
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Position</CFormLabel>
              <CFormInput
                value={selectedPic.position}
                onChange={(e) => setSelectedPic((prev) => ({ ...prev, position: e.target.value }))}
              />
            </CCol>
          </CForm>
        </CCardBody>
      </CCard>
    </>
  )
}

export default EditPicCard
