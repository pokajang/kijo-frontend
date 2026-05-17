// src/views/template/TrainingServiceTemplate/ProposalRemarks.jsx
import React from 'react'
import {
  CRow,
  CCol,
  CFormLabel,
  CAlert,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import EditorInput from '../../components/EditorInput'

const ProposalRemarks = ({ remarks, setRemarks, isEdit = false, history = [] }) => {
  return (
    <CRow className="mb-3">
      <CCol md={12}>
        <CFormLabel className="fw-bold">Important Notice</CFormLabel>

        <CAlert color="primary">
          Provide context for why this proposal was <strong>developed or edited</strong>. Include
          details such as which client requested it, the intended purpose, or how this template
          might be reused or adapted by other staff for similar cases in the future.
        </CAlert>

        {isEdit && (
          <>
            <CFormLabel>Remark History</CFormLabel>
            {Array.isArray(history) && history.length > 0 ? (
              /* datatable-exempt: existing embedded/layout table */
              <CTable
                striped
                responsive
                bordered
                className="mb-4 data-table-compact embedded-data-table"
              >
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '20%' }}>Date Created</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '15%' }}>Created By</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '65%' }}>Remarks</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {history.map((entry, idx) => (
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
              <p className="text-muted">
                <em>No creation history available.</em>
              </p>
            )}
          </>
        )}

        <CFormLabel>Proposal Remarks (Internal Use)</CFormLabel>
        <EditorInput value={remarks} onChange={(content) => setRemarks(content)} />
      </CCol>
    </CRow>
  )
}

export default ProposalRemarks
