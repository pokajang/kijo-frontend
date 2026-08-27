import React from 'react'
import { CAlert, CButton, CCardBody, CCardHeader, CTooltip } from '@coreui/react'
import { useAuth } from '../../../../auth/AuthProvider'
import { getQuoteIssuanceState } from '../utils/recordApproval'
import { getQuoteDeleteRestriction } from '../utils/recordOwnership'

const RecordDetailsActions = ({
  handlers,
  record,
  isAwarded,
  isSyncingClient,
  onEmail,
  onSharePdf,
  onFollowUp,
  onUnAward,
  onReAward,
  onChangeToSuccess,
  onChangeToFail,
  onSyncClient,
  onDelete,
}) => {
  const { user } = useAuth()
  const deleteRestriction = onDelete ? getQuoteDeleteRestriction(record, user) : ''
  const issuanceState = getQuoteIssuanceState(record)
  const estimatedCostEditRequired = Boolean(
    (record?.issuanceContext || record?.issuance_context)?.estimated_cost_required,
  )
  const issuanceNoticeId = `quotation-issuance-status-${record?.id || 'unknown'}`
  const issuanceProps = issuanceState.blocked
    ? { disabled: true, 'aria-describedby': issuanceNoticeId }
    : {}
  const pdfIssuanceProps = issuanceState.blocked && !estimatedCostEditRequired ? issuanceProps : {}
  const deleteButton = (
    <CButton
      size="sm"
      color="danger"
      variant="outline"
      onClick={deleteRestriction ? undefined : onDelete}
      disabled={Boolean(deleteRestriction)}
    >
      Delete
    </CButton>
  )

  return (
    <>
      <CCardHeader className="records-detail-section-header">
        <h2 className="h6 mb-0">Actions</h2>
      </CCardHeader>
      <CCardBody>
        {issuanceState.blocked ? (
          <CAlert color="warning" className="py-2 mb-3" id={issuanceNoticeId}>
            <strong>Quote issuance unavailable.</strong> {issuanceState.message}
          </CAlert>
        ) : null}
        <div className="d-flex flex-wrap gap-2">
          <CButton size="sm" color="secondary" variant="outline" onClick={onFollowUp}>
            Follow Up
          </CButton>
          {record?.clientDetails?.email ? (
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={onEmail}
              {...issuanceProps}
            >
              Email
            </CButton>
          ) : null}
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={onSharePdf}
            {...issuanceProps}
          >
            Share PDF
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => handlers?.handleGeneratePdf?.(record)}
            {...pdfIssuanceProps}
          >
            Generate PDF
          </CButton>
          {handlers?.handleGenerateWord ? (
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => handlers.handleGenerateWord(record)}
              {...issuanceProps}
            >
              Generate Word
            </CButton>
          ) : null}
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => handlers?.handleEdit?.(record)}
          >
            Edit
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => handlers?.handleRevise?.(record)}
          >
            Revise
          </CButton>

          {isAwarded ? (
            <>
              <CButton size="sm" color="success" variant="outline" onClick={onUnAward}>
                Un-Award
              </CButton>
              <CButton
                size="sm"
                color="success"
                variant="outline"
                onClick={onReAward}
                {...issuanceProps}
              >
                Re-Award
              </CButton>
            </>
          ) : (
            <CButton
              size="sm"
              color="success"
              variant="outline"
              onClick={onChangeToSuccess}
              {...issuanceProps}
            >
              Awarded
            </CButton>
          )}

          <CButton size="sm" color="warning" variant="outline" onClick={onChangeToFail}>
            Failed
          </CButton>
          <CButton
            size="sm"
            color="info"
            variant="outline"
            onClick={onSyncClient}
            disabled={isSyncingClient}
          >
            {isSyncingClient ? 'Syncing...' : 'Sync Client'}
          </CButton>
          {deleteRestriction ? (
            <CTooltip content={deleteRestriction} placement="top">
              <span>{deleteButton}</span>
            </CTooltip>
          ) : (
            deleteButton
          )}
        </div>
      </CCardBody>
    </>
  )
}

export default RecordDetailsActions
