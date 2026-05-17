import React from 'react'
import { CButton, CCardBody, CCardHeader } from '@coreui/react'

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
}) => (
  <>
    <CCardHeader>
      <strong>Actions</strong>
    </CCardHeader>
    <CCardBody>
      <div className="d-flex flex-wrap gap-2">
        <CButton size="sm" color="primary" variant="outline" onClick={onFollowUp}>
          Follow Up
        </CButton>
        {record?.clientDetails?.email ? (
          <CButton size="sm" color="primary" variant="outline" onClick={onEmail}>
            Email
          </CButton>
        ) : null}
        <CButton size="sm" color="primary" variant="outline" onClick={onSharePdf}>
          Share PDF
        </CButton>
        <CButton
          size="sm"
          color="primary"
          variant="outline"
          onClick={() => handlers?.handleGeneratePdf?.(record)}
        >
          Generate Quote
        </CButton>
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
            <CButton size="sm" color="success" variant="outline" onClick={onReAward}>
              Re-Award
            </CButton>
          </>
        ) : (
          <CButton size="sm" color="success" variant="outline" onClick={onChangeToSuccess}>
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
        <CButton size="sm" color="danger" variant="outline" onClick={onDelete}>
          Delete
        </CButton>
      </div>
    </CCardBody>
  </>
)

export default RecordDetailsActions
