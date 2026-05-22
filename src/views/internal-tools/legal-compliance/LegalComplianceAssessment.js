import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'

import { useAuth } from '../../../auth/AuthProvider'
import Select from '../../../components/forms/ThemedSelect'
import { legalComplianceSections } from './legalComplianceTemplateData'

const initialAssessmentDetails = {
  companyName: '',
  siteLocation: '',
  assessmentDate: '',
  assessorName: '',
  assessorEmail: '',
  scopeRemarks: '',
}

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const getStaffName = (staff = {}) =>
  staff.full_name || staff.name || staff.staff_name || staff.name_code || ''

const getStaffEmail = (staff = {}) => staff.email || staff.staff_email || ''

const getStaffId = (staff = {}) =>
  staff.staff_id || staff.id || staff.user_id || staff.name_code || getStaffName(staff)

const createStaffOption = (staff = {}) => {
  const name = getStaffName(staff)
  const email = getStaffEmail(staff)
  const code = staff.name_code || staff.code || ''

  if (!name && !email) return null

  return {
    value: getStaffId(staff) || name || email,
    label: [name, code ? `(${code})` : '', email ? `- ${email}` : ''].filter(Boolean).join(' '),
    data: staff,
  }
}

const getAssessorNames = (options = []) =>
  options.map((option) => getStaffName(option.data) || option.label).filter(Boolean)

const getAssessorEmails = (options = []) =>
  options.map((option) => getStaffEmail(option.data)).filter(Boolean)

const createInitialAssessmentDetails = (user) => ({
  ...initialAssessmentDetails,
  assessorName: getStaffName(user),
  assessorEmail: getStaffEmail(user),
})

const createEmptyClauseResponses = () =>
  legalComplianceSections
    .flatMap((section) => section.clauses)
    .reduce((responses, clause) => {
      responses[clause.id] = {
        finding: '',
      }
      return responses
    }, {})

const displayValue = (value) => value || '-'

const AssessmentDetailsSummary = ({ assessmentDetails, actions }) => (
  <CCard>
    <CCardHeader>
      <strong>Assessment Details</strong>
    </CCardHeader>
    <CCardBody>
      <CRow className="g-3">
        <CCol md={6} lg={2}>
          <strong>Company</strong>
          <div>{displayValue(assessmentDetails.companyName)}</div>
        </CCol>
        <CCol md={6} lg={2}>
          <strong>Address</strong>
          <div>{displayValue(assessmentDetails.siteLocation)}</div>
        </CCol>
        <CCol md={6} lg={2}>
          <strong>Assessment Date</strong>
          <div>{displayValue(assessmentDetails.assessmentDate)}</div>
        </CCol>
        <CCol md={6} lg={2}>
          <strong>Assessor</strong>
          <div>{displayValue(assessmentDetails.assessorName)}</div>
        </CCol>
        <CCol md={6} lg={2}>
          <strong>Assessor Email</strong>
          <div>{displayValue(assessmentDetails.assessorEmail)}</div>
        </CCol>
        <CCol md={6} lg={2}>
          <strong>Scope</strong>
          <div>{displayValue(assessmentDetails.scopeRemarks)}</div>
        </CCol>
      </CRow>
      {actions && <div className="d-flex justify-content-end gap-2 flex-wrap mt-3">{actions}</div>}
    </CCardBody>
  </CCard>
)

const LegalComplianceAssessment = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const sessionAssessmentDetails = useMemo(() => createInitialAssessmentDetails(user), [user])
  const sessionAssessorOption = useMemo(() => createStaffOption(user), [user])
  const [assessmentDetails, setAssessmentDetails] = useState(() =>
    createInitialAssessmentDetails(user),
  )
  const [clauseResponses, setClauseResponses] = useState(() => createEmptyClauseResponses())
  const [isAssessmentSaved, setIsAssessmentSaved] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [staffOptions, setStaffOptions] = useState([])
  const [selectedAssessors, setSelectedAssessors] = useState(() =>
    sessionAssessorOption ? [sessionAssessorOption] : [],
  )
  const [isLoadingStaff, setIsLoadingStaff] = useState(false)
  const [staffError, setStaffError] = useState('')

  useEffect(() => {
    setAssessmentDetails((current) => {
      if (current.assessorName || current.assessorEmail) return current
      return {
        ...current,
        assessorName: sessionAssessmentDetails.assessorName,
        assessorEmail: sessionAssessmentDetails.assessorEmail,
      }
    })
    setSelectedAssessors((current) => {
      if (current.length > 0 || !sessionAssessorOption) return current
      return [sessionAssessorOption]
    })
  }, [sessionAssessmentDetails, sessionAssessorOption])

  const assessorOptions = useMemo(() => {
    const optionsByValue = new Map()

    ;[sessionAssessorOption, ...staffOptions].filter(Boolean).forEach((option) => {
      optionsByValue.set(String(option.value), option)
    })

    return Array.from(optionsByValue.values())
  }, [sessionAssessorOption, staffOptions])

  const loadStaffOptions = () => {
    if (staffOptions.length > 0 || isLoadingStaff) return

    const controller = new AbortController()

    ;(async () => {
      try {
        setIsLoadingStaff(true)
        setStaffError('')
        const response = await fetch(`${API_BASE}staff/list`, {
          credentials: 'include',
          signal: controller.signal,
        })
        const payload = await response.json()

        if (!response.ok || payload?.status !== 'success') {
          throw new Error(payload?.message || 'Could not load staff list.')
        }

        const staff = Array.isArray(payload.staff) ? payload.staff : []
        setStaffOptions(staff.map(createStaffOption).filter(Boolean))
      } catch (error) {
        if (error.name === 'AbortError') return
        setStaffError(error.message || 'Could not load staff list.')
      } finally {
        if (!controller.signal.aborted) setIsLoadingStaff(false)
      }
    })()
  }

  const handleAssessmentChange = (field, value) => {
    setAssessmentDetails((current) => ({ ...current, [field]: value }))
  }

  const handleAssessorChange = (options) => {
    const nextAssessors = options || []
    setSelectedAssessors(nextAssessors)
    setAssessmentDetails((current) => ({
      ...current,
      assessorName: getAssessorNames(nextAssessors).join(', '),
      assessorEmail: getAssessorEmails(nextAssessors).join(', '),
    }))
  }

  const handleFindingChange = (clauseId, value) => {
    setClauseResponses((current) => ({
      ...current,
      [clauseId]: {
        ...current[clauseId],
        finding: value,
      },
    }))
  }

  const handleReset = () => {
    setAssessmentDetails(sessionAssessmentDetails)
    setClauseResponses(createEmptyClauseResponses())
    setIsAssessmentSaved(false)
    setIsReviewing(false)
    setSelectedAssessors(sessionAssessorOption ? [sessionAssessorOption] : [])
    setStaffError('')
  }

  const handleSaveAssessmentDetails = (event) => {
    event.preventDefault()
    setIsAssessmentSaved(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setIsReviewing(true)
  }

  if (isReviewing) {
    return (
      <CRow className="g-4">
        <CCol xs={12}>
          <AssessmentDetailsSummary
            assessmentDetails={assessmentDetails}
            actions={
              <>
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReviewing(false)}
                >
                  Edit Form
                </CButton>
                <CButton color="secondary" size="sm" onClick={() => navigate(-1)}>
                  Back
                </CButton>
              </>
            }
          />
        </CCol>

        {legalComplianceSections.map((section) => (
          <CCol xs={12} key={section.id}>
            <CCard>
              <CCardHeader>
                <strong>{section.title}</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  {section.clauses.map((clause) => {
                    const response = clauseResponses[clause.id]
                    return (
                      <CCol xs={12} key={clause.id}>
                        <div className="pb-3 border-bottom">
                          <div className="fw-semibold">{clause.reference}</div>
                          <div>{clause.title}</div>
                          <p className="mt-2 mb-3">{clause.excerpt}</p>
                          <strong>Assessment Finding</strong>
                          <div>{displayValue(response.finding)}</div>
                        </div>
                      </CCol>
                    )
                  })}
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>
    )
  }

  if (!isAssessmentSaved) {
    return (
      <CForm onSubmit={handleSaveAssessmentDetails}>
        <CRow className="g-4">
          <CCol xs={12}>
            <CCard>
              <CCardHeader>
                <strong>Assessment Details</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol md={4}>
                    <CFormLabel htmlFor="companyName">Company Name</CFormLabel>
                    <CFormInput
                      id="companyName"
                      value={assessmentDetails.companyName}
                      onChange={(event) =>
                        handleAssessmentChange('companyName', event.target.value)
                      }
                      placeholder="Enter company name"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="siteLocation">Address</CFormLabel>
                    <CFormInput
                      id="siteLocation"
                      value={assessmentDetails.siteLocation}
                      onChange={(event) =>
                        handleAssessmentChange('siteLocation', event.target.value)
                      }
                      placeholder="Enter address"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="assessmentDate">Assessment Date</CFormLabel>
                    <CFormInput
                      id="assessmentDate"
                      type="date"
                      value={assessmentDetails.assessmentDate}
                      onChange={(event) =>
                        handleAssessmentChange('assessmentDate', event.target.value)
                      }
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="assessorName">Assessor Name</CFormLabel>
                    <Select
                      inputId="assessorName"
                      options={assessorOptions}
                      value={selectedAssessors}
                      onChange={handleAssessorChange}
                      onMenuOpen={loadStaffOptions}
                      isClearable
                      isLoading={isLoadingStaff}
                      isMulti
                      placeholder="Select assessor or assistant..."
                    />
                    {staffError && <div className="text-danger mt-2">{staffError}</div>}
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="assessorEmail">Assessor Email</CFormLabel>
                    <CFormInput
                      id="assessorEmail"
                      value={assessmentDetails.assessorEmail}
                      onChange={(event) =>
                        handleAssessmentChange('assessorEmail', event.target.value)
                      }
                      placeholder="name@example.com"
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="scopeRemarks">Scope</CFormLabel>
                    <CFormInput
                      id="scopeRemarks"
                      value={assessmentDetails.scopeRemarks}
                      onChange={(event) =>
                        handleAssessmentChange('scopeRemarks', event.target.value)
                      }
                      placeholder="Enter scope"
                    />
                  </CCol>
                </CRow>
                <div className="d-flex justify-content-end gap-2 flex-wrap mt-3">
                  <CButton type="button" color="secondary" size="sm" onClick={() => navigate(-1)}>
                    Back
                  </CButton>
                  <CButton
                    type="button"
                    color="danger"
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                  >
                    Reset
                  </CButton>
                  <CButton type="submit" color="primary" size="sm">
                    Save Assessment Details
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CForm>
    )
  }

  return (
    <CForm onSubmit={handleSubmit}>
      <CRow className="g-4">
        <CCol xs={12}>
          <AssessmentDetailsSummary
            assessmentDetails={assessmentDetails}
            actions={
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={() => setIsAssessmentSaved(false)}
              >
                Edit Details
              </CButton>
            }
          />
        </CCol>

        {legalComplianceSections.map((section, sectionIndex) => (
          <CCol xs={12} key={section.id}>
            <CCard>
              <CCardHeader>
                <strong>{section.title}</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-4">
                  {section.clauses.map((clause) => {
                    const response = clauseResponses[clause.id]
                    return (
                      <CCol xs={12} key={clause.id}>
                        <div className="pb-4 border-bottom">
                          <div className="fw-semibold">{clause.reference}</div>
                          <div className="mb-2">{clause.title}</div>
                          <p>{clause.excerpt}</p>
                          <CFormLabel htmlFor={`${clause.id}-finding`}>
                            Assessment Finding
                          </CFormLabel>
                          <CFormTextarea
                            id={`${clause.id}-finding`}
                            rows={4}
                            value={response.finding}
                            onChange={(event) => handleFindingChange(clause.id, event.target.value)}
                          />
                        </div>
                      </CCol>
                    )
                  })}
                </CRow>
                {sectionIndex === legalComplianceSections.length - 1 && (
                  <div className="d-flex justify-content-end gap-2 flex-wrap mt-3">
                    <CButton type="button" color="secondary" size="sm" onClick={() => navigate(-1)}>
                      Back
                    </CButton>
                    <CButton
                      type="button"
                      color="danger"
                      size="sm"
                      variant="outline"
                      onClick={handleReset}
                    >
                      Reset
                    </CButton>
                    <CButton type="submit" color="primary" size="sm">
                      Review Report
                    </CButton>
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>
    </CForm>
  )
}

export default LegalComplianceAssessment
