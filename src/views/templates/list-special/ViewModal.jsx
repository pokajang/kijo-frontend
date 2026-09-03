// src/templates/create/SpecialTemplate/ViewModal.jsx
import React, { useState, useEffect } from 'react'
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
import AttachmentsModal from './AttachmentsModal'
import { richTextToPlainText, sanitizeDisplayHtml } from '../shared/templateUtils'

export default function ViewModal({ record, onClose }) {
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attachList, setAttachList] = useState([])
  const proposalMode = record?.proposalMode || record?.proposal_mode || 'upload'
  const contentLabel =
    proposalMode === 'write' ? 'Written Proposal Content' : 'Internal Reference Note'
  const contentHtml =
    proposalMode === 'write'
      ? record?.proposalContent || record?.proposal_content || record?.content
      : record?.serviceSummary || record?.service_summary || record?.content

  // Whenever we open the modal, load the current record's attachments
  useEffect(() => {
    if (showAttachModal && Array.isArray(record?.attachments)) {
      setAttachList(record.attachments)
    }
  }, [showAttachModal, record])

  const renderContentSection = (label, content, plainText = false) => (
    <>
      <CCardHeader>
        <strong>{label}</strong>
      </CCardHeader>
      <CCardBody>
        {plainText ? (
          <div className="records-detail-rich-text" style={{ whiteSpace: 'pre-wrap' }}>
            {richTextToPlainText(content) || <em>No content provided.</em>}
          </div>
        ) : (
          <div
            className="records-detail-rich-text"
            dangerouslySetInnerHTML={{
              __html: sanitizeDisplayHtml(content) || '<em>No content provided.</em>',
            }}
          />
        )}
      </CCardBody>
    </>
  )

  return (
    <>
      <CModal visible={!!record} onClose={onClose} size="xl" alignment="center" scrollable>
        <CModalHeader closeButton>
          <CModalTitle>{record?.serviceTitle || 'Special'} Proposal Template</CModalTitle>
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

              {/* Content Section */}
              {renderContentSection(contentLabel, contentHtml, proposalMode === 'upload')}

              {/* Attachments Section */}
              {Array.isArray(record.attachments) && record.attachments.length > 0 && (
                <>
                  <CCardHeader>
                    <strong>Attachments</strong>
                  </CCardHeader>
                  <CCardBody>
                    <ul>
                      {record.attachments.map((att) => (
                        <li key={att.id}>
                          <CButton color="link" size="sm" onClick={() => setShowAttachModal(true)}>
                            {att.fileName}
                          </CButton>
                        </li>
                      ))}
                    </ul>
                  </CCardBody>
                </>
              )}
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

      {/* Reuse our AttachmentsModal to preview files */}
      <AttachmentsModal
        visible={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        attachments={attachList}
      />
    </>
  )
}
