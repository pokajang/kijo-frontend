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

// ---- helpers ----------------------------------------------------------------------------------------------------------------------
const inferDurationTokenFromAgenda = (agenda) => {
  if (!Array.isArray(agenda) || agenda.length === 0) return ''
  const maxDay = Math.max(...agenda.map((a) => Number(a?.day) || 1))
  return maxDay >= 3 ? '3day' : maxDay === 2 ? '2day' : '1day'
}

const formatDurationLabel = (raw) => {
  const token = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const m = token.match(/^(\d+)\s*hour$/)
  if (m) {
    const h = parseInt(m[1], 10)
    return `${h} ${h === 1 ? 'Hour' : 'Hours'}`
  }
  switch (token) {
    case 'halfday_am':
    case 'halfday_pm':
      return 'Half Day (4 hours)'
    case '1day':
    case 'full_day':
      return '1 Day'
    case '2day':
      return '2 Days'
    case '3day':
      return '3 Days'
    default:
      return token ? token.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
  }
}

const groupAgendaByDay = (agenda = []) =>
  agenda.reduce((acc, item) => {
    const d = Number(item?.day) || 1
    acc[d] = acc[d] || []
    acc[d].push(item)
    return acc
  }, {})

export default function ViewModal({ record, onClose }) {
  const renderHtmlSection = (label, htmlContent) => (
    <>
      <CCardHeader>
        <strong>{label}</strong>
      </CCardHeader>
      <CCardBody>
        <div
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

  const titleBase = record?.trainingTitle || record?.serviceTitle || 'Proposal'
  const codePart = record?.trainingCode ? ` (${record.trainingCode})` : ''
  const durationToken = record?.duration || inferDurationTokenFromAgenda(record?.agenda)
  const durationLabel = formatDurationLabel(durationToken)
  const modalTitle = durationLabel
    ? `${titleBase}${codePart} - ${durationLabel}`
    : `${titleBase}${codePart}`

  const agendaByDay = groupAgendaByDay(record?.agenda || [])
  const dayKeys = Object.keys(agendaByDay)
    .map((n) => Number(n))
    .sort((a, b) => a - b)

  return (
    <CModal visible={!!record} onClose={onClose} size="xl" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>{modalTitle}</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {record ? (
          <CCard className="mb-3">
            {/* Metadata / History (compact) */}
            <CCardHeader>
              <strong>Metadata / History</strong>
            </CCardHeader>
            <CCardBody className="pt-2">
              {Array.isArray(record.history) && record.history.length > 0 ? (
                /* datatable-exempt: existing embedded/layout table */
                <CTable responsive bordered className="mb-2 data-table-compact embedded-data-table">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: '22%' }}>
                        Date
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '15%' }}>By</CTableHeaderCell>
                      <CTableHeaderCell>Remarks</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {record.history.map((entry, idx) => (
                      <CTableRow key={idx}>
                        <CTableDataCell className="text-center">{entry.created_at}</CTableDataCell>
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
                <p className="mb-2">
                  <em>No creation history available.</em>
                </p>
              )}
            </CCardBody>

            {/* Title Heading */}
            <CCardHeader>
              <strong>Training Title</strong>
            </CCardHeader>
            <CCardBody>{titleBase}</CCardBody>

            <CCardHeader>
              <strong>HRD Program Number</strong>
            </CCardHeader>
            <CCardBody>{record.hrdNo || 'Not available'}</CCardBody>

            {/* Introduction (title already shown above). Then Duration after Introduction */}
            {renderHtmlSection('Introduction', record.introduction)}

            {/* Duration after Introduction (compact) */}
            <CCardHeader>
              <strong>Duration</strong>
            </CCardHeader>
            <CCardBody>{durationLabel || '-'}</CCardBody>

            {/* Objectives */}
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

            {/* Tentative Program - split by Day */}
            {Array.isArray(record.agenda) && record.agenda.length > 0 && (
              <>
                <CCardHeader>
                  <strong>Tentative Program</strong>
                </CCardHeader>
                <CCardBody>
                  {Object.keys(agendaByDay).length > 1 ? (
                    // Multiple days: render a table per day
                    Object.keys(agendaByDay)
                      .map((n) => Number(n))
                      .sort((a, b) => a - b)
                      .map((day) => (
                        <div key={day} className="mb-4">
                          <div className="fw-bold mb-2">Day {day}</div>
                          {/* datatable-exempt: existing embedded/layout table */}
                          <CTable
                            striped
                            responsive
                            bordered
                            className="data-table-compact embedded-data-table"
                          >
                            <CTableHead>
                              <CTableRow>
                                <CTableHeaderCell className="text-center" style={{ width: '30%' }}>
                                  Time
                                </CTableHeaderCell>
                                <CTableHeaderCell>Topic</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {agendaByDay[day].map((item, idx) => (
                                <CTableRow key={`${day}-${idx}`}>
                                  <CTableDataCell className="text-center">
                                    {(item.start_time || '').slice(0, 5)} -{' '}
                                    {(item.end_time || '').slice(0, 5)}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {item.topic ? (
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html: sanitizeDisplayHtml(item.topic),
                                        }}
                                      />
                                    ) : (
                                      '-'
                                    )}
                                  </CTableDataCell>
                                </CTableRow>
                              ))}
                            </CTableBody>
                          </CTable>
                        </div>
                      ))
                  ) : (
                    // Single day/hourly: single table
                    /* datatable-exempt: existing embedded/layout table */
                    <CTable
                      striped
                      responsive
                      bordered
                      className="data-table-compact embedded-data-table"
                    >
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell className="text-center" style={{ width: '30%' }}>
                            Time
                          </CTableHeaderCell>
                          <CTableHeaderCell>Topic</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {(agendaByDay[1] || []).map((item, idx) => (
                          <CTableRow key={`1-${idx}`}>
                            <CTableDataCell className="text-center">
                              {(item.start_time || '').slice(0, 5)} -{' '}
                              {(item.end_time || '').slice(0, 5)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {item.topic ? (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeDisplayHtml(item.topic),
                                  }}
                                />
                              ) : (
                                '-'
                              )}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
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
