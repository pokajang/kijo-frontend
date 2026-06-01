// src/views/project/ManageProjectModal/ClientDetailsCard.jsx
import React from 'react'
import PropTypes from 'prop-types'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel } from '@coreui/react'

const ClientDetailsCard = ({ project }) => {
  const clientPics = project.client_pics || []

  return (
    <>
      <CCardHeader className="rounded-0">
        <strong>Client Details</strong>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormLabel>Client Name & Address</CFormLabel>
            <p>
              <strong>{project.client_name || '-'}</strong>
              <br />
              {project.client_full_address || 'No address provided'}
            </p>
          </CCol>

          <CCol md={6}>
            <CFormLabel>Company Contact</CFormLabel>
            {clientPics.length > 0 ? (
              clientPics.map((pic, idx) => (
                <div key={idx} className="mb-2">
                  <strong>{pic.full_name || '-'}</strong>
                  {pic.position ? <small className="text-muted"> ({pic.position})</small> : null}
                  <br />
                  <span>{pic.email || '-'}</span>
                  <br />
                  <span>{pic.mobile_number || '-'}</span>
                </div>
              ))
            ) : (
              <p className="text-muted">No assigned PICs</p>
            )}
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

ClientDetailsCard.propTypes = {
  project: PropTypes.object,
}

export default ClientDetailsCard
