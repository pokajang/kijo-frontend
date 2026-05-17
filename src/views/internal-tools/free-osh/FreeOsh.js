import React, { useState } from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormInput,
  CFormLabel,
  CButton,
} from '@coreui/react'

import { useNavigate } from 'react-router-dom'

const FreeOSH = () => {
  const navigate = useNavigate()

  // Example state hooks
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [responses, setResponses] = useState({}) // for questions later

  const handleReset = () => {
    setClientName('')
    setClientEmail('')
    setResponses({})
  }

  const handleGenerateReport = () => {
    // logic for generating report (PDF, summary, etc.)
  }

  return (
    <CForm>
      <CRow className="g-4 mb-4">
        {/* Client Information Card */}
        <CCol md={12}>
          <CCard>
            <CCardHeader>
              <strong>Client Information</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel htmlFor="clientName">Client Name</CFormLabel>
                  <CFormInput
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client name"
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel htmlFor="clientEmail">Client Email</CFormLabel>
                  <CFormInput
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Enter client email"
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Questions Card */}
        <CCol md={12}>
          <CCard>
            <CCardHeader>
              <strong>OSH Compliance Questions</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-4">
                {[
                  {
                    id: 'q1',
                    title: 'Dedicated OSH Personnel',
                    text: 'Do you have a dedicated Safety & Health Officer (SHO)?',
                  },
                  {
                    id: 'q2',
                    title: 'Risk Assessment Implementation',
                    text: 'Has your organization conducted a HIRARC in the past 12 months?',
                  },
                  {
                    id: 'q3',
                    title: 'OSH Policy',
                    text: 'Is a safety and health policy displayed in the workplace?',
                  },
                ].map((q) => (
                  <CCol md={12} key={q.id}>
                    <CFormLabel>{q.title}</CFormLabel>
                    <p>{q.text}</p>
                    <div className="d-flex gap-4 mt-1">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name={q.id}
                          value="Yes"
                          onChange={(e) =>
                            setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          checked={responses[q.id] === 'Yes'}
                        />
                        <label className="form-check-label">Yes</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name={q.id}
                          value="No"
                          onChange={(e) =>
                            setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          checked={responses[q.id] === 'No'}
                        />
                        <label className="form-check-label">No</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name={q.id}
                          value="Not Sure"
                          onChange={(e) =>
                            setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          checked={responses[q.id] === 'Not Sure'}
                        />
                        <label className="form-check-label">Not Sure</label>
                      </div>
                    </div>
                  </CCol>
                ))}
              </CRow>

              {/* Action Buttons */}
              <CRow className="mt-4">
                <CCol className="d-flex gap-2">
                  <CButton color="secondary" onClick={() => navigate(-1)}>
                    Back
                  </CButton>
                  <CButton color="danger" onClick={handleReset}>
                    Reset
                  </CButton>
                  <CButton color="primary" onClick={handleGenerateReport}>
                    Generate Report
                  </CButton>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CForm>
  )
}

export default FreeOSH
