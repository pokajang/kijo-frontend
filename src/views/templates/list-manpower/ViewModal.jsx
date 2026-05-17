import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { sanitizeDisplayHtml } from '../shared/templateUtils'

export default function ViewModal({ record, onClose }) {
  const renderHtmlSection = (label, html) => (
    <>
      <CCardHeader>
        <strong>{label}</strong>
      </CCardHeader>
      <CCardBody>
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeDisplayHtml(html) || '<em>No content provided.</em>',
          }}
        />
      </CCardBody>
    </>
  )

  return (
    <CModal visible={!!record} onClose={onClose} size="xl" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>{record?.serviceTitle || 'Proposal'} Template</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {record ? (
          <CCard className="mb-3">
            {/* Metadata / History */}
            <CCardHeader>
              <strong>Metadata / History</strong>
            </CCardHeader>
            <CCardBody>
              {Array.isArray(record.history) && record.history.length > 0 ? (
                /* datatable-exempt: existing embedded/layout table */
                <CTable
                  striped
                  responsive
                  bordered
                  className="data-table-compact embedded-data-table"
                >
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
                          {(entry.remarks || '-').replace(/<\/?[^>]+>/g, '').replace(/\n/g, ' ')}
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

            {/* Manpower-specific Sections */}
            {renderHtmlSection('Introduction', record.introduction)}
            {renderHtmlSection('Service Deliverables', record.serviceDeliverables)}
            {renderHtmlSection(
              'Supplied Manpower Deliverables',
              record.suppliedManpowerDeliverables,
            )}
            {record.customSection && renderHtmlSection('Custom Section', record.customSection)}
          </CCard>
        ) : (
          <p>No record selected.</p>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
