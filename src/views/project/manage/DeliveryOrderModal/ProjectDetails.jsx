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

/**
 * Editable Project Details form
 * @param {{
 *   name: string,
 *   date: string,
 *   type: string,
 *   servicePeriod: string,
 *   description: string
 * }} project  Current project details
 * @param {Function} setProject  Setter for updating project details
 */
const ProjectDetails = ({ project, setProject }) => {
  const handleChange = (field) => (e) => {
    setProject({
      ...project,
      [field]: e.target.value,
    })
  }

  return (
    <>
      <CCardHeader>
        <strong>Project Details</strong>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol md={12}>
            <div className="mb-3">
              <CFormLabel>Project Name</CFormLabel>
              <CFormInput type="text" value={project.name} onChange={handleChange('name')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel>Award Date</CFormLabel>
              <CFormInput type="text" value={project.date} onChange={handleChange('date')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel>Project Type</CFormLabel>
              <CFormInput type="text" value={project.type} onChange={handleChange('type')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel>Service Period</CFormLabel>
              <CFormInput
                type="text"
                value={project.servicePeriod}
                onChange={handleChange('servicePeriod')}
              />
            </div>
          </CCol>
          <CCol md={12}>
            <div className="mb-3">
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea
                rows={3}
                value={project.description}
                onChange={handleChange('description')}
              />
            </div>
          </CCol>
          <CCol md={12}>
            <div className="mb-3">
              <CFormLabel>Quotation Remarks</CFormLabel>
              <CFormTextarea
                rows={3}
                maxLength={2000}
                value={project.quotationRemarks || ''}
                onChange={handleChange('quotationRemarks')}
                placeholder="General specifications carried from the equipment quotation"
              />
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default ProjectDetails
