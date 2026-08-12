import React from 'react'
import { CButton, CTable, CTableBody, CTableHead, CTableHeaderCell, CTableRow } from '@coreui/react'
import {
  formatFirstTouchDate,
  getFirstTouchPersonCode,
  getFirstTouchPersonName,
  getFirstTouchSourceLabel,
  getFirstTouchWorkflowSummary,
} from '../clientFirstTouchUtils'

const emptyValue = '-'

const ClientOriginPanel = ({
  firstTouch,
  record,
  onViewEvidence,
  onEdit,
  onDispute,
  onReviewConflict,
  isClarificationRecipient = false,
}) => {
  if (!firstTouch) {
    return (
      <section className="border-top" aria-label="Current first touch">
        <div className="table-responsive">
          <CTable className="mb-0 align-middle first-touch-origin-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Source</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              <CTableRow>
                <td className="py-4 text-muted">No first-touch evidence recorded.</td>
              </CTableRow>
            </CTableBody>
          </CTable>
        </div>
      </section>
    )
  }

  const personName = getFirstTouchPersonName(firstTouch)
  const personCode = getFirstTouchPersonCode(firstTouch)
  const personLabel = [personName, personCode ? `(${personCode})` : ''].filter(Boolean).join(' ')
  const workflow = getFirstTouchWorkflowSummary(record || { firstTouch }, {
    canReviewConflict: Boolean(onReviewConflict),
    isClarificationRecipient,
  })
  const requiresReview =
    record?.conflict?.status === 'clarification_requested' || firstTouch.status === 'contested'

  return (
    <section className="border-top" aria-label="Current first touch">
      <div className="table-responsive">
        <CTable className="mb-0 align-middle first-touch-origin-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell scope="col">Source</CTableHeaderCell>
              <CTableHeaderCell scope="col">Encounter date</CTableHeaderCell>
              <CTableHeaderCell scope="col">Client contact</CTableHeaderCell>
              <CTableHeaderCell scope="col">Handled by or referred through</CTableHeaderCell>
              <CTableHeaderCell scope="col">Linked inquiry</CTableHeaderCell>
              <CTableHeaderCell scope="col">Evidence</CTableHeaderCell>
              <CTableHeaderCell scope="col">Actions</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            <CTableRow>
              <td className="fw-medium">{getFirstTouchSourceLabel(firstTouch)}</td>
              <td>
                {formatFirstTouchDate(firstTouch.occurredAt)}
                {firstTouch.occurredTime ? ` at ${firstTouch.occurredTime}` : ''}
              </td>
              <td>{firstTouch.clientContact || emptyValue}</td>
              <td>{personLabel || emptyValue}</td>
              <td>{firstTouch.inquiryRef || emptyValue}</td>
              <td>
                <CButton color="secondary" variant="outline" size="sm" onClick={onViewEvidence}>
                  View evidence
                </CButton>
              </td>
              <td>
                <div className="d-flex gap-2 flex-wrap">
                  {onEdit ? (
                    <CButton color="secondary" variant="outline" size="sm" onClick={onEdit}>
                      Edit evidence
                    </CButton>
                  ) : null}
                  {onDispute ? (
                    <CButton color="danger" variant="outline" size="sm" onClick={onDispute}>
                      Dispute evidence
                    </CButton>
                  ) : null}
                </div>
              </td>
            </CTableRow>
            {firstTouch.notes ? (
              <CTableRow>
                <th scope="row" className="text-muted fw-normal">
                  Remarks
                </th>
                <td colSpan={6}>{firstTouch.notes}</td>
              </CTableRow>
            ) : null}
            {requiresReview ? (
              <CTableRow>
                <th scope="row" className="text-muted fw-normal">
                  Review status
                </th>
                <td colSpan={6}>
                  <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div>
                      <div>{workflow.label}.</div>
                      {workflow.detail ? (
                        <div className="small text-muted">{workflow.detail}</div>
                      ) : null}
                    </div>
                    {onReviewConflict ? (
                      <CButton
                        color="warning"
                        variant="outline"
                        size="sm"
                        onClick={onReviewConflict}
                      >
                        Review conflict
                      </CButton>
                    ) : null}
                  </div>
                </td>
              </CTableRow>
            ) : null}
            <CTableRow>
              <th scope="row" className="text-muted fw-normal">
                Recorded
              </th>
              <td colSpan={6}>
                {firstTouch.submittedBy || 'Staff'} - {formatFirstTouchDate(firstTouch.submittedAt)}
              </td>
            </CTableRow>
          </CTableBody>
        </CTable>
      </div>
    </section>
  )
}

export default ClientOriginPanel
