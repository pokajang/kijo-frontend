import React from 'react'
import {
  CModal,
  CFormLabel,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableBody,
  CTableHeaderCell,
  CTableRow,
  CTableDataCell,
} from '@coreui/react'
import { sanitizeDisplayHtml } from '../shared/templateUtils'

export default function ViewModal({ record, onClose }) {
  const renderHtmlSection = (label, htmlContent) => (
    <>
      <CCardHeader>
        <strong>{label}</strong>
      </CCardHeader>
      <CCardBody>
        <div
          className="records-detail-rich-text"
          dangerouslySetInnerHTML={{
            __html: sanitizeDisplayHtml(htmlContent) || '<em>No content provided.</em>',
          }}
        />
      </CCardBody>
    </>
  )

  const renderPlainSection = (label, content) => (
    <>
      <CCardHeader>
        <strong>{label}</strong>
      </CCardHeader>
      <CCardBody>{content || '-'}</CCardBody>
    </>
  )

  return (
    <CModal visible={!!record} onClose={onClose} size="xl" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>
          {record?.trainingTitle || record?.serviceTitle || 'Proposal'} Template
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        {record ? (
          <CCard className="mb-3">
            {/* Metadata */}
            <CCardHeader>
              <strong>Metadata / History</strong>
            </CCardHeader>
            <CCardBody>
              {Array.isArray(record.history) && record.history.length > 0 ? (
                /* datatable-exempt: existing embedded/layout table */
                <CTable striped responsive className="data-table-compact embedded-data-table">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: '20%' }}>Date Created</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '15%' }}>Created By</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '65%' }}>Remarks</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {record.history.map((entry, idx) => (
                      <CTableRow key={idx}>
                        <CTableDataCell>{entry.created_at}</CTableDataCell>
                        <CTableDataCell>{entry.created_by_code || 'N/A'}</CTableDataCell>
                        <CTableDataCell>
                          {(entry.remarks || '-')
                            .replace(/<\/?p[^>]*>/g, '')
                            .replace(/<br\s*\/?>/g, ' ')
                            .replace(/\n/g, ' ')}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <p>
                  <em>No creation history available.</em>
                </p>
              )}
            </CCardBody>

            {/* Ordered Field Rendering */}
            {renderHtmlSection('Introduction', record.introduction)}
            {renderHtmlSection('Objectives', record.objectives)}

            {/* Modules (only for training) */}
            {record.modules && renderHtmlSection('Modules', record.modules)}

            {/* Methodology (only for training) */}
            {(record.methodTheoryDesc || record.methodPracticalDesc) && (
              <>
                <CCardHeader>
                  <strong>Training Methodology</strong>
                </CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={6}>
                      <CFormLabel>Theory Method</CFormLabel>
                      <br />
                      {record.methodTheoryDesc || 'Not specified'}
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Practical Method</CFormLabel>
                      <br />
                      {record.methodPracticalDesc || 'Not specified'}
                    </CCol>
                  </CRow>
                </CCardBody>
              </>
            )}

            {/* Training Requirements */}
            {(record.trainingRequirements || record.additionalRequirements) && (
              <>
                <CCardHeader>
                  <strong>Training Requirements</strong>
                </CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={6}>
                      <CFormLabel>Requirements</CFormLabel>
                      <br />
                      {record.trainingRequirements || '-'}
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Additional Requirements</CFormLabel>
                      <br />
                      {record.additionalRequirements || '-'}
                    </CCol>
                  </CRow>
                </CCardBody>
              </>
            )}

            {/* Training Materials (if available) */}
            {record.trainingMaterials &&
              renderPlainSection('Training Materials', record.trainingMaterials)}

            {/* Lecture Medium (if available) */}
            {record.lectureMedium && renderPlainSection('Lecture Medium', record.lectureMedium)}

            {/* Tentative Program (only for training) */}
            {Array.isArray(record.agenda) && record.agenda.length > 0 && (
              <>
                <CCardHeader>
                  <strong>Tentative Program</strong>
                </CCardHeader>
                <CCardBody>
                  {/* datatable-exempt: existing embedded/layout table */}
                  <CTable striped responsive className="data-table-compact embedded-data-table">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: '30%' }}>Time</CTableHeaderCell>
                        <CTableHeaderCell>Topic</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {record.agenda.map((item, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell>
                            {item.start_time} - {item.end_time}
                          </CTableDataCell>
                          <CTableDataCell>{item.topic || '-'}</CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </CCardBody>
              </>
            )}

            {/* IH-specific sections */}
            {record.workScope && renderHtmlSection('Scope of Work', record.workScope)}
            {record.schedule && renderHtmlSection('Project Schedule', record.schedule)}
            {record.reference && renderHtmlSection('Reference', record.reference)}
            {record.otherFields && renderHtmlSection('Other Information', record.otherFields)}
          </CCard>
        ) : (
          <p>No record selected.</p>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
