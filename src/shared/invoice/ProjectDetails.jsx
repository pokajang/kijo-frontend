// ProjectDetails.jsx
import React, { useCallback, useEffect, useState } from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CAlert,
} from '@coreui/react'

// Helper: strip off any " hh:mm:ss" so date inputs receive "YYYY-MM-DD"
const getDateOnly = (val) => val?.split(' ')[0] ?? ''

const ProjectDetails = ({ project, quoteDetails, onProjectChange }) => {
  const getInitialValue = useCallback(
    (field) => {
      const quoteValue = quoteDetails?.[field]
      if (quoteValue !== null && quoteValue !== undefined && String(quoteValue).trim() !== '') {
        return quoteValue
      }
      return project?.[field] ?? ''
    },
    [project, quoteDetails],
  )

  const [showNotice, setShowNotice] = useState(true)
  const [localProject, setLocalProject] = useState({
    project_name: getInitialValue('project_name'),
    project_type: getInitialValue('project_type'),
    award_date: getDateOnly(getInitialValue('award_date')),
    service_start_date: getDateOnly(getInitialValue('service_start_date')),
    service_end_date: getDateOnly(getInitialValue('service_end_date')),
    description: getInitialValue('description'),
  })
  const missingTrainingDates =
    localProject.project_type === 'Training' &&
    (!localProject.service_start_date || !localProject.service_end_date)

  useEffect(() => {
    setLocalProject({
      project_name: getInitialValue('project_name'),
      project_type: getInitialValue('project_type'),
      award_date: getDateOnly(getInitialValue('award_date')),
      service_start_date: getDateOnly(getInitialValue('service_start_date')),
      service_end_date: getDateOnly(getInitialValue('service_end_date')),
      description: getInitialValue('description'),
    })
  }, [getInitialValue])

  useEffect(() => {
    if (onProjectChange) {
      onProjectChange(localProject)
    }
  }, [localProject, onProjectChange])

  const handleChange = (field, value) => {
    setLocalProject((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <CCardHeader>
        <strong>Project Details</strong>
      </CCardHeader>
      <CCardBody>
        {showNotice && (
          <CAlert color="info" dismissible onClose={() => setShowNotice(false)} className="mb-3">
            Project details are read-only here. To update them, go to{' '}
            <strong>Manage &gt; Project Details</strong>.
          </CAlert>
        )}
        {missingTrainingDates && (
          <CAlert color="danger" className="mb-3">
            Warning: Training start/end dates are missing. Please update them in{' '}
            <strong>Manage &gt; Project Details</strong>.
          </CAlert>
        )}
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>Project/Training Name</CFormLabel>
            <CFormTextarea
              rows={2}
              value={localProject.project_name}
              disabled
              onChange={(e) => handleChange('project_name', e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel>Project Type</CFormLabel>
            <CFormInput
              type="text"
              value={localProject.project_type}
              disabled
              onChange={(e) => handleChange('project_type', e.target.value)}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>Award Date</CFormLabel>
            <CFormInput
              type="date"
              value={localProject.award_date}
              disabled
              onChange={(e) => handleChange('award_date', e.target.value)}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel>Start Date</CFormLabel>
            <CFormInput
              type="date"
              value={localProject.service_start_date}
              disabled
              onChange={(e) => handleChange('service_start_date', e.target.value)}
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel>End Date</CFormLabel>
            <CFormInput
              type="date"
              value={localProject.service_end_date}
              disabled
              onChange={(e) => handleChange('service_end_date', e.target.value)}
            />
          </CCol>
        </CRow>

        <CRow>
          <CCol md={12}>
            <CFormLabel>Description</CFormLabel>
            <CFormInput
              type="text"
              value={localProject.description}
              disabled
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default ProjectDetails
