import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CCol,
  CFormLabel,
  CFormInput,
  CAlert,
  CButton,
} from '@coreui/react'

const PICAndSubmitSection = ({
  picList,
  setPicList,
  currentPIC,
  handlePICInputChange,
  addPicToList,
  isDuplicatePIC,
  duplicatePICName,
  partialMatchPIC,
  isDuplicateEmail,
  duplicateEmail,
  handleSubmit,
  handleReset,
  embedded = false,
}) => {
  const handleRemove = (index) => {
    const updated = picList.filter((_, i) => i !== index)
    setPicList(updated)
  }

  const content = (
    <>
      {picList.length > 0 && (
        <div className="mb-4 d-flex flex-wrap gap-2">
          {picList.map((pic, index) => (
            <div
              key={index}
              className="border rounded p-2 d-flex flex-column gap-1 position-relative"
              style={{ minWidth: '280px' }}
            >
              <div>
                <strong>{pic.fullName}</strong>{' '}
                <small className="text-muted">({pic.position})</small>
              </div>
              <div className="text-muted small">
                {pic.email} | {pic.mobileNumber}
              </div>
              <CButton
                size="sm"
                color="danger"
                className="align-self-end"
                onClick={() => handleRemove(index)}
              >
                Remove
              </CButton>
            </div>
          ))}
        </div>
      )}

      <CForm className="row g-3" autoComplete="off">
        <CCol md={3}>
          <CFormLabel>Full Name</CFormLabel>
          <CFormInput name="fullName" value={currentPIC.fullName} onChange={handlePICInputChange} />
          {isDuplicatePIC && (
            <CAlert color="danger" className="mt-2">
              <strong>{duplicatePICName}</strong> already exists in the system.
            </CAlert>
          )}
          {!isDuplicatePIC && partialMatchPIC && (
            <CAlert color="primary" className="mt-2">
              <strong>{partialMatchPIC}</strong> looks similar. Please confirm it is not a
              duplicate.
            </CAlert>
          )}
        </CCol>

        <CCol md={3}>
          <CFormLabel>Email</CFormLabel>
          <CFormInput
            type="email"
            name="email"
            value={currentPIC.email}
            onChange={handlePICInputChange}
          />
          {isDuplicateEmail && (
            <CAlert color="warning" className="mt-2">
              <strong>{duplicateEmail}</strong> is already used by another contact.
            </CAlert>
          )}
        </CCol>

        <CCol md={3}>
          <CFormLabel>Mobile</CFormLabel>
          <CFormInput
            name="mobileNumber"
            value={currentPIC.mobileNumber}
            onChange={handlePICInputChange}
          />
        </CCol>

        <CCol md={2}>
          <CFormLabel>Position</CFormLabel>
          <CFormInput name="position" value={currentPIC.position} onChange={handlePICInputChange} />
        </CCol>

        <CCol md={1} className="d-flex align-items-end">
          <CButton color="primary" variant="outline" size="sm" onClick={addPicToList}>
            Add PIC
          </CButton>
        </CCol>

        <CCol xs={12}>
          <CButton type="button" color="primary" onClick={handleSubmit} className="me-2">
            Create Client
          </CButton>
          <CButton type="button" color="secondary" onClick={handleReset}>
            Reset
          </CButton>
        </CCol>
      </CForm>
    </>
  )

  if (embedded) {
    return (
      <>
        <CCardHeader>
          <strong>Client In Charge Details</strong> <small>Multiple PICs allowed</small>
        </CCardHeader>
        <CCardBody>{content}</CCardBody>
      </>
    )
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Client In Charge Details</strong> <small>Multiple PICs allowed</small>
      </CCardHeader>
      <CCardBody>{content}</CCardBody>
    </CCard>
  )
}

export default PICAndSubmitSection
