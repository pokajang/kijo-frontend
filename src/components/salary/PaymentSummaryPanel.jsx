import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { formatMoney } from './salaryCalculations'
import PaymentSummaryDocument from './payment-summary/PaymentSummaryDocument'
import {
  checkPaymentSummaryReadiness,
  fetchPaymentSummaries,
  fetchPaymentSummary,
  getFinancePaymentSummaryAttachmentUrl,
  issuePaymentSummary,
  preparePaymentSummary,
  resendPaymentSummary,
  revokePaymentSummary,
} from './paymentSummaryStorage'

const DEFAULT_BOSS_EMAIL = 'aminrozak@amiosh.com'
const currentPeriod = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}
const tones = {
  Draft: 'secondary',
  Issued: 'info',
  Paid: 'success',
  Revoked: 'danger',
  Superseded: 'warning',
  'Payment Reversed': 'danger',
}

const PaymentSummaryActions = ({ record, busy, onPreview, onRun, onRegenerate, onRevoke }) => (
  <div className="d-flex flex-wrap gap-1">
    <CButton size="sm" variant="outline" color="secondary" onClick={onPreview}>
      Preview
    </CButton>
    {record.status === 'Draft' && (
      <CButton
        size="sm"
        color="primary"
        disabled={busy}
        onClick={() => onRun(() => issuePaymentSummary(record.id), 'Payment summary issued.')}
      >
        Issue
      </CButton>
    )}
    {record.status === 'Issued' && (
      <>
        <CButton
          size="sm"
          variant="outline"
          color="primary"
          disabled={busy}
          onClick={() => onRun(() => resendPaymentSummary(record.id), 'Secure link resent.')}
        >
          Resend
        </CButton>
        <CButton size="sm" variant="outline" color="warning" onClick={onRegenerate}>
          Regenerate
        </CButton>
        <CButton size="sm" variant="outline" color="danger" onClick={onRevoke}>
          Revoke
        </CButton>
      </>
    )}
  </div>
)

const PaymentSummaryPanel = ({ onQueueChanged }) => {
  const [records, setRecords] = useState([])
  const [defaultRecipient, setDefaultRecipient] = useState({
    email: DEFAULT_BOSS_EMAIL,
    name: 'Amin Rozak',
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [form, setForm] = useState({
    paymentPeriod: currentPeriod(),
    recipientEmail: DEFAULT_BOSS_EMAIL,
    recipientName: 'Amin Rozak',
    remarks: '',
  })
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [revokeReason, setRevokeReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchPaymentSummaries()
      setRecords(payload.records)
      setDefaultRecipient({
        email: payload.defaults?.recipientEmail || DEFAULT_BOSS_EMAIL,
        name: payload.defaults?.recipientName || 'Amin Rozak',
      })
    } catch (err) {
      setError(err?.message || 'Could not load payment summaries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])
  const run = async (operation, successMessage) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = await operation()
      setNotice(payload?.message || successMessage)
      await load()
      onQueueChanged?.()
      return payload
    } catch (err) {
      setError(err?.message || 'Could not update the payment summary.')
      return null
    } finally {
      setBusy(false)
    }
  }

  const checkReadiness = async () => {
    setBusy(true)
    setError('')
    setReadiness(null)
    try {
      const payload = await checkPaymentSummaryReadiness(form.paymentPeriod)
      setReadiness(payload.readiness)
    } catch (err) {
      setError(err?.message || 'Could not check payment readiness.')
    } finally {
      setBusy(false)
    }
  }

  const prepare = async () => {
    const payload = await run(() => preparePaymentSummary(form), 'Payment summary prepared.')
    if (payload?.record) {
      setPrepareOpen(false)
      setReadiness(null)
      setPreview(payload.record)
    }
  }

  const openPreview = async (id) => {
    setBusy(true)
    setError('')
    try {
      const payload = await fetchPaymentSummary(id)
      if (payload?.record) setPreview(payload.record)
    } catch (err) {
      setError(err?.message || 'Could not load the payment summary preview.')
    } finally {
      setBusy(false)
    }
  }

  const startPrepare = (record = null) => {
    setReadiness(null)
    setForm({
      paymentPeriod: record?.paymentPeriod || currentPeriod(),
      recipientEmail: record?.recipientEmail || defaultRecipient.email,
      recipientName: record?.recipientName || defaultRecipient.name,
      remarks: record ? `Regenerated from ${record.reference}: ` : '',
    })
    setPrepareOpen(true)
  }

  return (
    <section className="mb-4" aria-labelledby="payment-summary-heading">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div>
          <h2 id="payment-summary-heading" className="h5 mb-1">
            Boss payment summaries
          </h2>
          <p className="small text-body-secondary mb-0">
            Issue a verified, read-only briefing only after every review and approval is final.
          </p>
        </div>
        <CButton size="sm" color="primary" onClick={() => startPrepare()}>
          Prepare Payment Summary
        </CButton>
      </div>
      {error && (
        <CAlert color="danger" className="py-2">
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert color="success" className="py-2">
          {notice}
        </CAlert>
      )}
      {loading ? (
        <div className="py-3 text-center">
          <CSpinner size="sm" />
        </div>
      ) : records.length === 0 ? (
        <CAlert color="light" className="border py-2 mb-0">
          No payment summary has been prepared yet.
        </CAlert>
      ) : (
        <>
          <div className="table-responsive d-none d-md-block">
            <CTable align="middle" className="mb-0" small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Reference</CTableHeaderCell>
                  <CTableHeaderCell>Recipient</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {records.map((record) => (
                  <CTableRow key={record.id}>
                    <CTableDataCell>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-start"
                        onClick={() => openPreview(record.id)}
                      >
                        {record.reference}
                      </button>
                      <div className="small text-body-secondary">
                        {record.paymentPeriod} · revision {record.revision}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      {record.recipientName || 'Configured recipient'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={tones[record.status] || 'secondary'}>{record.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(record.grandTotal)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <PaymentSummaryActions
                        record={record}
                        busy={busy}
                        onPreview={() => openPreview(record.id)}
                        onRun={run}
                        onRegenerate={() => startPrepare(record)}
                        onRevoke={() => {
                          setRevokeTarget(record)
                          setRevokeReason('')
                        }}
                      />
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>

          <div className="payment-summary-record-list d-grid gap-2 d-md-none">
            {records.map((record) => (
              <article className="payment-summary-record-card" key={record.id}>
                <button
                  type="button"
                  className="payment-summary-record-card__preview"
                  aria-label={`Preview payment summary ${record.reference}`}
                  onClick={() => openPreview(record.id)}
                >
                  <span className="payment-summary-record-card__heading">
                    <strong>{record.reference}</strong>
                    <CBadge color={tones[record.status] || 'secondary'}>{record.status}</CBadge>
                  </span>
                  <span className="payment-summary-record-card__meta">
                    <span>
                      {record.paymentPeriod} · revision {record.revision}
                    </span>
                    <span>{record.recipientName || 'Configured recipient'}</span>
                  </span>
                  <span className="payment-summary-record-card__total">
                    <span>Total payout</span>
                    <strong>{formatMoney(record.grandTotal)}</strong>
                  </span>
                </button>
                <div className="payment-summary-record-card__actions">
                  <PaymentSummaryActions
                    record={record}
                    busy={busy}
                    onPreview={() => openPreview(record.id)}
                    onRun={run}
                    onRegenerate={() => startPrepare(record)}
                    onRevoke={() => {
                      setRevokeTarget(record)
                      setRevokeReason('')
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <CModal visible={prepareOpen} onClose={() => !busy && setPrepareOpen(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Prepare payment summary</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color="warning" className="py-2">
            The readiness check covers the entire period. Pending reviews, approvals, duplicate
            salary records, or changed values must be resolved first.
          </CAlert>
          <div className="row g-3">
            <div className="col-md-5">
              <CFormLabel htmlFor="summaryPeriod">Payment period</CFormLabel>
              <CFormInput
                id="summaryPeriod"
                type="month"
                value={form.paymentPeriod}
                onChange={(event) => {
                  setForm((value) => ({ ...value, paymentPeriod: event.target.value }))
                  setReadiness(null)
                }}
              />
            </div>
            <div className="col-md-7">
              <CFormLabel htmlFor="summaryRecipient">Boss email</CFormLabel>
              <CFormInput
                id="summaryRecipient"
                type="email"
                autoComplete="email"
                value={form.recipientEmail}
                onChange={(event) =>
                  setForm((value) => ({ ...value, recipientEmail: event.target.value }))
                }
              />
              <div className="form-text">
                The secure summary link and verification code are sent to this address.
              </div>
            </div>
            <div className="col-md-5">
              <CFormLabel htmlFor="summaryRecipientName">Recipient name</CFormLabel>
              <CFormInput
                id="summaryRecipientName"
                value={form.recipientName}
                onChange={(event) =>
                  setForm((value) => ({ ...value, recipientName: event.target.value }))
                }
              />
            </div>
            <div className="col-12">
              <CFormLabel htmlFor="summaryRemarks">Revision remarks</CFormLabel>
              <CFormTextarea
                id="summaryRemarks"
                rows={2}
                value={form.remarks}
                placeholder="State what changed when regenerating a previously issued summary."
                onChange={(event) =>
                  setForm((value) => ({ ...value, remarks: event.target.value }))
                }
              />
            </div>
          </div>
          {readiness && (
            <CAlert color={readiness.ready ? 'success' : 'danger'} className="mt-3 mb-0">
              <strong>{readiness.ready ? 'Ready to prepare' : 'Not ready'}</strong>
              <div>
                {readiness.employees} employees · {readiness.approvedRecords} approved records ·{' '}
                {formatMoney(readiness.grandTotal)}
              </div>
              {readiness.blockers?.length > 0 && (
                <ul className="mb-0 mt-2">
                  {readiness.blockers.map((item, index) => (
                    <li key={`${item.type}-${item.recordId}-${index}`}>
                      {item.type}
                      {item.recordId ? ` #${item.recordId}` : ''}: {item.reason}
                    </li>
                  ))}
                </ul>
              )}
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            variant="outline"
            color="secondary"
            disabled={busy}
            onClick={() => setPrepareOpen(false)}
          >
            Cancel
          </CButton>
          <CButton
            variant="outline"
            color="primary"
            disabled={busy || !form.paymentPeriod}
            onClick={checkReadiness}
          >
            Check readiness
          </CButton>
          <CButton
            color="primary"
            disabled={busy || !readiness?.ready || !form.recipientEmail.trim()}
            onClick={prepare}
          >
            Prepare draft
          </CButton>
        </CModalFooter>
      </CModal>

      <PaymentSummaryPreview record={preview} onClose={() => setPreview(null)} />
      <CModal visible={Boolean(revokeTarget)} onClose={() => !busy && setRevokeTarget(null)}>
        <CModalHeader>
          <CModalTitle>Revoke payment summary</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Revoking immediately disables the boss link. The immutable revision remains in the audit
            history.
          </p>
          <CFormLabel htmlFor="revokeReason">Reason</CFormLabel>
          <CFormTextarea
            id="revokeReason"
            rows={3}
            value={revokeReason}
            onChange={(event) => setRevokeReason(event.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton variant="outline" color="secondary" onClick={() => setRevokeTarget(null)}>
            Cancel
          </CButton>
          <CButton
            color="danger"
            disabled={busy || !revokeReason.trim()}
            onClick={async () => {
              const result = await run(
                () => revokePaymentSummary(revokeTarget.id, revokeReason.trim()),
                'Payment summary revoked.',
              )
              if (result) setRevokeTarget(null)
            }}
          >
            Revoke access
          </CButton>
        </CModalFooter>
      </CModal>
    </section>
  )
}

const PaymentSummaryPreview = ({ record, onClose }) => {
  return (
    <CModal visible={Boolean(record)} onClose={onClose} size="xl" scrollable>
      <CModalHeader>
        <CModalTitle>{record?.reference || 'Payment summary preview'}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {record?.snapshot && (
          <PaymentSummaryDocument
            record={record}
            showPrivateMetadata
            resolveAttachmentUrl={(file) => getFinancePaymentSummaryAttachmentUrl(record.id, file)}
          />
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default PaymentSummaryPanel
