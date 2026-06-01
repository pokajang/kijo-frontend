import React from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CRow,
} from '@coreui/react'
import TemplateContentView from '../TemplateContentView'
import { displayValue } from '../../utils/formatters'
import { getClauseFields } from '../../utils/templateContent'

const complianceStatusMeta = {
  comply: { label: 'Comply', color: 'success' },
  not_comply: { label: 'Not comply', color: 'danger' },
}

const getComplianceStatusMeta = (value) =>
  complianceStatusMeta[value] || { label: 'Not selected', color: 'secondary' }

const AssessmentReviewReport = ({
  assessmentDetails,
  sections,
  clauseResponses,
  isSavingAssessment,
  onBack,
}) => {
  const renderReviewField = (field, response) => {
    const value = response[field.key] || ''

    if (field.key === 'complianceStatus') {
      return null
    }

    if (field.key === 'finding') {
      return (
        <div className="mb-2 records-detail-field" key={field.key}>
          <CFormLabel className="mb-0">Finding</CFormLabel>
          <div>{displayValue(value)}</div>
        </div>
      )
    }

    return (
      <div className="mb-2" key={field.key}>
        <strong>{field.label}</strong>
        <div>{displayValue(value)}</div>
      </div>
    )
  }

  return (
    <CCard>
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
        <strong>Assessment Details</strong>
        <CButton
          color="secondary"
          size="sm"
          variant="outline"
          onClick={onBack}
          disabled={isSavingAssessment}
        >
          Back
        </CButton>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={6} lg={4} className="records-detail-field">
            <CFormLabel>Company</CFormLabel>
            <div>{displayValue(assessmentDetails.companyName)}</div>
          </CCol>
          <CCol md={6} lg={4} className="records-detail-field">
            <CFormLabel>Address</CFormLabel>
            <div>{displayValue(assessmentDetails.siteLocation)}</div>
          </CCol>
          <CCol md={6} lg={4} className="records-detail-field">
            <CFormLabel>Assessment Date</CFormLabel>
            <div>{displayValue(assessmentDetails.assessmentDate)}</div>
          </CCol>
          <CCol md={6} lg={4} className="records-detail-field">
            <CFormLabel>Client PIC Name</CFormLabel>
            <div>{displayValue(assessmentDetails.clientPicName)}</div>
          </CCol>
          <CCol md={6} lg={4} className="records-detail-field">
            <CFormLabel>Client PIC Email</CFormLabel>
            <div>{displayValue(assessmentDetails.clientPicEmail)}</div>
          </CCol>
          <CCol md={6} lg={4} className="records-detail-field">
            <CFormLabel>Nature of Company</CFormLabel>
            <div style={{ whiteSpace: 'pre-line' }}>
              {displayValue(assessmentDetails.scopeRemarks)}
            </div>
          </CCol>
          {assessmentDetails.projectName && (
            <CCol md={6} lg={4} className="records-detail-field">
              <CFormLabel>Project</CFormLabel>
              <div>{displayValue(assessmentDetails.projectName)}</div>
            </CCol>
          )}
        </CRow>
      </CCardBody>
      <CCardHeader>
        <strong>Assessment Findings</strong>
      </CCardHeader>
      <CCardBody>
        <TemplateContentView
          groups={sections}
          emptyMessage="No assessment findings found."
          renderClausePrefix={(clause) => {
            const response = clauseResponses[clause.id] || { finding: '' }
            const complianceStatus = getComplianceStatusMeta(response.complianceStatus)
            return <CBadge color={complianceStatus.color}>{complianceStatus.label}</CBadge>
          }}
          renderClauseExtra={(clause) => {
            const response = clauseResponses[clause.id] || { finding: '' }
            return getClauseFields(clause).map((field) => renderReviewField(field, response))
          }}
        />
      </CCardBody>
    </CCard>
  )
}

export default AssessmentReviewReport
