import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import AuthenticatedDocumentPreviewModal from '../../../../components/documents/AuthenticatedDocumentPreviewModal'
import { DataTableStatusBadge } from '../../../../components/datatable'
import { resolveAssetUrl } from '../../../../utils/assetUrls'
import { formatMoney } from '../../../../utils/formatters/numberFormatters'
import { showApiToast } from '../../../../api/apiClient'
import dialog from '../../../../components/dialog/dialogService'
import {
  appendVendorPaymentProofs,
  newVendorPaymentRequestKey,
  supersedeVendorPaymentProof,
} from '../../payment-records/vendorPaymentApi'
import PaymentProofCapture, { getPaymentProofValidationError } from './PaymentProofCapture'

const PaymentTransactionHistory = ({ payment, canView, canManage, onChanged }) => {
  const [editor, setEditor] = useState(null)
  const [files, setFiles] = useState([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(null)
  const transactions = payment?.transactions || []

  const openEditor = (transaction, proof = null) => {
    setEditor({ transaction, proof, requestKey: newVendorPaymentRequestKey('payment-evidence') })
    setFiles([])
    setReason('')
    setError('')
  }

  const submit = async () => {
    const maxFiles = editor.proof
      ? 1
      : Math.max(0, 5 - Number(editor.transaction.evidence_count || 0))
    if (!files.length) return setError('Choose or paste evidence before saving.')
    if (editor.proof && files.length !== 1) return setError('Choose one replacement file.')
    if (editor.proof && !reason.trim())
      return setError('Explain why this evidence is being replaced.')
    const validationError = getPaymentProofValidationError(files, maxFiles)
    if (validationError) return setError(validationError)
    setSubmitting(true)
    setError('')
    try {
      if (editor.proof) {
        await supersedeVendorPaymentProof(
          payment.id,
          editor.transaction.id,
          editor.proof.id,
          files[0],
          reason.trim(),
          editor.requestKey,
        )
      } else {
        await appendVendorPaymentProofs(payment.id, editor.transaction.id, files, editor.requestKey)
      }
      setEditor(null)
      showApiToast(editor.proof ? 'Payment evidence replaced.' : 'Payment evidence attached.')
      await onChanged?.()
    } catch (requestError) {
      setError(requestError?.message || 'Unable to save payment evidence.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeEditor = async () => {
    if (submitting) return
    if (
      (files.length > 0 || reason.trim()) &&
      !(await dialog.confirm('Discard the unsaved payment evidence changes?'))
    ) {
      return
    }
    setEditor(null)
  }

  if (!transactions.length)
    return <div className="text-body-secondary">No settlement transactions have been recorded.</div>

  return (
    <>
      <div className="vendor-payment-transactions">
        {transactions.map((transaction) => {
          const activeProofs = (transaction.proofs || []).filter((proof) => !proof.superseded_at)
          const supersededProofs = (transaction.proofs || []).filter((proof) => proof.superseded_at)
          return (
            <article key={transaction.id} className="vendor-payment-transaction-card">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                <div>
                  <strong>{formatMoney(transaction.amount)}</strong>
                  <div className="small text-body-secondary">
                    {transaction.paid_date} · {transaction.method} · {transaction.reference_number}
                  </div>
                </div>
                <DataTableStatusBadge tone={transaction.reversed_at ? 'danger' : 'success'}>
                  {transaction.reversed_at ? 'Reversed' : 'Recorded'}
                </DataTableStatusBadge>
              </div>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                <div>
                  <strong className="small">Payment evidence</strong>
                  <div className="small text-body-secondary">
                    {transaction.evidence_count || 0} active file(s)
                    {supersededProofs.length ? ` · ${supersededProofs.length} replaced` : ''}
                  </div>
                </div>
                {canManage && (
                  <CButton
                    size="sm"
                    color="primary"
                    variant="outline"
                    disabled={activeProofs.length >= 5}
                    title={
                      activeProofs.length >= 5
                        ? 'Replace an existing file before adding another.'
                        : undefined
                    }
                    onClick={() => openEditor(transaction)}
                  >
                    {activeProofs.length >= 5 ? 'Evidence limit reached' : 'Add evidence'}
                  </CButton>
                )}
              </div>
              {canView && activeProofs.length > 0 && (
                <ul className="vendor-payment-evidence-list mt-2">
                  {activeProofs.map((proof) => (
                    <li key={proof.id}>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-start"
                        onClick={() => setPreview(proof)}
                      >
                        {proof.original_name}
                      </button>
                      <span className="small text-body-secondary">
                        {(proof.file_size / 1024 / 1024).toFixed(2)} MB ·{' '}
                        {proof.capture_method === 'paste' ? 'Pasted' : 'Uploaded'}
                      </span>
                      {canManage && (
                        <CButton
                          size="sm"
                          color="secondary"
                          variant="ghost"
                          onClick={() => openEditor(transaction, proof)}
                        >
                          Replace
                        </CButton>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canView && supersededProofs.length > 0 && (
                <details className="small mt-2">
                  <summary>Replaced evidence ({supersededProofs.length})</summary>
                  <ul className="vendor-payment-evidence-list mt-2">
                    {supersededProofs.map((proof) => (
                      <li key={proof.id}>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-start"
                          onClick={() => setPreview(proof)}
                        >
                          {proof.original_name}
                        </button>
                        <span className="small text-body-secondary">
                          Retained for audit · {proof.supersession_reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {!canView && transaction.evidence_count > 0 && (
                <div className="small text-body-secondary mt-2">
                  Evidence is restricted to Finance and management roles.
                </div>
              )}
            </article>
          )
        })}
      </div>

      <CModal
        visible={Boolean(editor)}
        onClose={submitting ? undefined : closeEditor}
        backdrop="static"
        size="lg"
        aria-labelledby="payment-evidence-editor-title"
      >
        <CModalHeader>
          <CModalTitle id="payment-evidence-editor-title">
            {editor?.proof ? 'Replace Payment Evidence' : 'Add Payment Evidence'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {editor?.proof && (
            <CAlert color="warning">
              The original file remains visible in the audit history. The replacement becomes the
              active evidence.
            </CAlert>
          )}
          {error && <CAlert color="danger">{error}</CAlert>}
          <PaymentProofCapture
            files={files}
            onChange={setFiles}
            disabled={submitting}
            enabled={Boolean(editor)}
            maxFiles={
              editor?.proof ? 1 : Math.max(1, 5 - Number(editor?.transaction?.evidence_count || 0))
            }
          />
          {editor?.proof && (
            <div className="mt-3">
              <CFormLabel htmlFor="payment-evidence-reason">Reason for replacement</CFormLabel>
              <CFormTextarea
                id="payment-evidence-reason"
                rows={3}
                maxLength={500}
                value={reason}
                disabled={submitting}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={submitting}
            onClick={closeEditor}
          >
            Cancel
          </CButton>
          <CButton size="sm" color="primary" disabled={submitting} onClick={submit}>
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving…
              </>
            ) : editor?.proof ? (
              'Replace evidence'
            ) : (
              'Attach evidence'
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      <AuthenticatedDocumentPreviewModal
        visible={Boolean(preview)}
        onClose={() => setPreview(null)}
        url={resolveAssetUrl(preview?.view_url)}
        title="Payment Evidence"
        originalName={preview?.original_name}
        allowImages
      />
    </>
  )
}

PaymentTransactionHistory.propTypes = {
  canManage: PropTypes.bool,
  canView: PropTypes.bool,
  onChanged: PropTypes.func,
  payment: PropTypes.object,
}

export default PaymentTransactionHistory
