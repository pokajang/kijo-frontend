import React, { useState } from 'react'
import {
  CButton,
  CCollapse,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import EditorInput from '../components/EditorInput'
import TemplateFieldLabel from './TemplateFieldLabel'
import TemplateSectionHeader from './TemplateSectionHeader'

const plainRemarks = (value) =>
  (value || '-')
    .replace(/<\/?p[^>]*>/g, '')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/\n/g, ' ')

const TemplateRemarksSection = ({
  remarks,
  setRemarks,
  isEdit = false,
  history = [],
  invalid = false,
  feedbackInvalid = '',
  onChange,
}) => {
  const [historyVisible, setHistoryVisible] = useState(false)
  const historyCount = Array.isArray(history) ? history.length : 0

  return (
    <section className="mb-3" aria-labelledby="template-internal-record-heading">
      <TemplateSectionHeader
        id="template-internal-record-heading"
        title="Internal record"
        description="Explain why this template was created or changed so other staff can reuse it confidently."
      />

      {isEdit && (
        <div className="mb-3">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setHistoryVisible((visible) => !visible)}
            aria-expanded={historyVisible}
            aria-controls="template-remarks-history"
          >
            {historyVisible ? 'Hide' : 'View'} previous remarks ({historyCount})
          </CButton>
          <CCollapse visible={historyVisible}>
            <div id="template-remarks-history" className="mt-3">
              {historyCount > 0 ? (
                <CTable responsive bordered className="mb-0 data-table-compact embedded-data-table">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                      <CTableHeaderCell>By</CTableHeaderCell>
                      <CTableHeaderCell>Remarks</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {history.map((entry, index) => (
                      <CTableRow key={entry.id || `${entry.created_at}-${index}`}>
                        <CTableDataCell>{entry.created_at || '-'}</CTableDataCell>
                        <CTableDataCell>{entry.created_by_code || 'N/A'}</CTableDataCell>
                        <CTableDataCell>{plainRemarks(entry.remarks)}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <p className="text-muted mb-0">No previous remarks available.</p>
              )}
            </div>
          </CCollapse>
        </div>
      )}

      <TemplateFieldLabel>Internal change note</TemplateFieldLabel>
      <EditorInput
        field="remarks"
        value={remarks}
        onChange={(content) => {
          onChange?.()
          setRemarks(content)
        }}
        invalid={invalid}
        feedbackInvalid={feedbackInvalid}
      />
    </section>
  )
}

export default TemplateRemarksSection
