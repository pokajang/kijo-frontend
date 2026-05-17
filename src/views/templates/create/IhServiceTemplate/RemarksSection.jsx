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

const RemarksSection = ({ remarks, setRemarks, isEdit = false, history = [] }) => {
  return (
    <CRow className="mb-3">
      <CCol md={12}>
        <CFormLabel className="fw-bold">Remarks for Internal Record</CFormLabel>

        <CAlert color="primary">
          Please include important context for why this proposal was{' '}
          <strong>created or edited</strong> such as which client requested it, scope variations, or
          how this template may be reused by staff in future projects.
        </CAlert>

        {isEdit && (
          <>
            <CFormLabel>Previous Remarks</CFormLabel>
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
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>By</CTableHeaderCell>
                    <CTableHeaderCell>Remarks</CTableHeaderCell>
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
                <em>No previous remarks available.</em>
              </p>
            )}
          </>
        )}

        <EditorInput
          label="New Remark"
          field="remarks"
          value={remarks}
          onChange={(content) => setRemarks(content)}
        />
      </CCol>
    </CRow>
  )
}

export default RemarksSection
