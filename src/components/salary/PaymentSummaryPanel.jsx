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
import PaymentSummaryCandidateSelector from './payment-summary/PaymentSummaryCandidateSelector'
import {
  checkPaymentSummaryReadiness,
  fetchPaymentSummaryCandidates,
  fetchPaymentSummaries,
  fetchPaymentSummary,
  getFinancePaymentSummaryAttachmentUrl,
  issuePaymentSummary,
  markPaymentSummaryPaid,
  preparePaymentSummary,
  resendPaymentSummary,
  revokePaymentSummary,
  updatePaymentSummaryCandidatePreference,
} from './paymentSummaryStorage'

const DEFAULT_BOSS_EMAIL = 'aminrozak@amiosh.com'
const currentPeriod = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}
const today = () => new Date().toISOString().slice(0, 10)
const tones = {
  Draft: 'secondary',
  Issued: 'info',
  'Partially Paid': 'warning',
  Paid: 'success',
  Revoked: 'danger',
  Superseded: 'warning',
  'Payment Reversed': 'danger',
}

const PaymentSummaryActions = ({
  record,
  busy,
  onPreview,
  onRun,
  onRegenerate,
  onRevoke,
  onMarkPaid,
}) => (
  <div className="d-flex flex-wrap gap-1">
    <CButton size="sm" variant="outline" color="secondary" onClick={onPreview}>
      Preview
    </CButton>
    {record.status === 'Draft' && (
      <>
        <CButton
          size="sm"
          color="primary"
          disabled={busy}
          onClick={() => onRun(() => issuePaymentSummary(record.id), 'Payment summary issued.')}
        >
          Issue
        </CButton>
        <CButton size="sm" variant="outline" color="danger" onClick={onRevoke}>
          Discard
        </CButton>
      </>
    )}
    {['Issued', 'Partially Paid'].includes(record.status) && (
      <>
        <CButton size="sm" color="success" disabled={busy} onClick={onMarkPaid}>
          Record paid
        </CButton>
        <CButton
          size="sm"
          variant="outline"
          color="primary"
          disabled={busy}
          onClick={() => onRun(() => resendPaymentSummary(record.id), 'Secure link resent.')}
        >
          Resend
        </CButton>
        {record.status === 'Issued' && (
          <>
            <CButton size="sm" variant="outline" color="warning" onClick={onRegenerate}>
              Revise
            </CButton>
            <CButton size="sm" variant="outline" color="danger" onClick={onRevoke}>
              Revoke
            </CButton>
          </>
        )}
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
  const [candidates, setCandidates] = useState([])
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [form, setForm] = useState({
    paymentPeriod: currentPeriod(),
    batchDate: today(),
    batchName: '',
    recipientEmail: DEFAULT_BOSS_EMAIL,
    recipientName: 'Amin Rozak',
    remarks: '',
    replacesSummaryId: null,
  })
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [paidTarget, setPaidTarget] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    payment_date: today(),
    payment_reference: '',
    payment_method: 'Bank Transfer',
    remarks: '',
  })
  const [paymentResult, setPaymentResult] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const activeStatuses = new Set(['Draft', 'Issued', 'Partially Paid'])
  const activeRecords = records.filter((record) => activeStatuses.has(record.status))
  const historyRecords = records.filter((record) => !activeStatuses.has(record.status))
  const visibleRecords = historyOpen
    ? [...activeRecords, ...historyRecords]
    : [...activeRecords, ...historyRecords.slice(0, 3)]

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

  const selectedItems = () =>
    candidates
      .filter((record) => selectedKeys.has(record.key))
      .map((record) => ({
        subject_type: record.subjectType,
        subject_id: record.subjectId,
        record_version: record.recordVersion,
      }))

  const loadCandidates = async (record = null) => {
    setCandidateLoading(true)
    try {
      const rows = await fetchPaymentSummaryCandidates()
      setCandidates(rows)
      const existingKeys = new Set(
        (record?.selectedItems || []).map((item) => `${item.subjectType}:${item.subjectId}`),
      )
      setSelectedKeys(existingKeys)
    } catch (err) {
      setError(err?.message || 'Could not load approved payment requests.')
      setCandidates([])
      setSelectedKeys(new Set())
    } finally {
      setCandidateLoading(false)
    }
  }

  const checkReadiness = async () => {
    setBusy(true)
    setError('')
    setReadiness(null)
    try {
      const payload = await checkPaymentSummaryReadiness(selectedItems(), form.replacesSummaryId)
      setReadiness(payload.readiness)
    } catch (err) {
      setError(err?.message || 'Could not check payment readiness.')
    } finally {
      setBusy(false)
    }
  }

  const prepare = async () => {
    const payload = await run(
      () => preparePaymentSummary({ ...form, selectedItems: selectedItems() }),
      'Payment summary prepared.',
    )
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
      batchDate: record?.batchDate || today(),
      batchName: record?.batchName || '',
      recipientEmail: record?.recipientEmail || defaultRecipient.email,
      recipientName: record?.recipientName || defaultRecipient.name,
      remarks: record ? `Revised from ${record.reference}: ` : '',
      replacesSummaryId: record?.id || null,
    })
    setPrepareOpen(true)
    loadCandidates(record)
  }

  const updatePreference = async (record, values) => {
    try {
      const payload = await updatePaymentSummaryCandidatePreference({
        subject_type: record.subjectType,
        subject_id: record.subjectId,
        ...values,
      })
      if (payload?.record) {
        setCandidates((rows) => rows.map((row) => (row.key === record.key ? payload.record : row)))
        if (!payload.record.eligible) {
          setSelectedKeys((keys) => {
            const next = new Set(keys)
            next.delete(record.key)
            return next
          })
          setReadiness(null)
        }
      }
      return payload?.record || null
    } catch (err) {
      setError(err?.message || 'Could not update payment priority.')
      throw err
    }
  }

  const recordPaid = async () => {
    if (!paidTarget) return
    setBusy(true)
    setError('')
    setNotice('')
    setPaymentResult(null)
    try {
      const payload = await markPaymentSummaryPaid(paidTarget.id, paymentForm)
      await load()
      onQueueChanged?.()
      const skipped = Number(payload?.summary?.skipped || 0)
      const failed = Number(payload?.summary?.failed || 0)
      if (payload?.status === 'success' && skipped === 0 && failed === 0) {
        setNotice(payload?.message || 'Payment recorded by Finance.')
        setPaidTarget(null)
      } else {
        setPaymentResult(payload)
      }
    } catch (err) {
      setError(err?.message || 'Could not record payment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-4" aria-labelledby="payment-summary-heading">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div>
          <h2 id="payment-summary-heading" className="h5 mb-1">
            Boss payment summaries
          </h2>
          <p className="small text-body-secondary mb-0">
            Select approved, unpaid requests and issue a read-only payment briefing. Unselected
            requests remain in the Finance queue.
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
                {visibleRecords.map((record) => (
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
                        {record.batchName || record.batchDate || record.paymentPeriod} · revision{' '}
                        {record.revision}
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
                        onMarkPaid={() => {
                          setPaymentResult(null)
                          setPaidTarget(record)
                          setPaymentForm({
                            payment_date: today(),
                            payment_reference: '',
                            payment_method: 'Bank Transfer',
                            remarks: '',
                          })
                        }}
                      />
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>

          <div className="payment-summary-record-list d-grid gap-2 d-md-none">
            {visibleRecords.map((record) => (
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
                      {record.batchName || record.batchDate || record.paymentPeriod} · revision{' '}
                      {record.revision}
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
                    onMarkPaid={() => {
                      setPaymentResult(null)
                      setPaidTarget(record)
                      setPaymentForm({
                        payment_date: today(),
                        payment_reference: '',
                        payment_method: 'Bank Transfer',
                        remarks: '',
                      })
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
          {historyRecords.length > 3 && (
            <div className="d-flex justify-content-center mt-2">
              <CButton
                size="sm"
                color="secondary"
                variant="ghost"
                onClick={() => setHistoryOpen((value) => !value)}
              >
                {historyOpen
                  ? 'Show less history'
                  : `View payment summary history (${historyRecords.length})`}
              </CButton>
            </div>
          )}
        </>
      )}

      <CModal
        visible={prepareOpen}
        onClose={() => !busy && setPrepareOpen(false)}
        size="xl"
        scrollable
        className="payment-summary-prepare-modal"
      >
        <CModalHeader>
          <CModalTitle>Prepare payment summary</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <PaymentSummaryCandidateSelector
            records={candidates}
            loading={candidateLoading}
            selectedKeys={selectedKeys}
            onSelectionChange={(keys) => {
              setSelectedKeys(keys)
              setReadiness(null)
            }}
            onPreferenceChange={updatePreference}
          />
          <hr className="my-4" />
          <div className="row g-3">
            <div className="col-md-4">
              <CFormLabel htmlFor="summaryBatchDate">Batch date</CFormLabel>
              <CFormInput
                id="summaryBatchDate"
                type="date"
                value={form.batchDate}
                onChange={(event) => {
                  setForm((value) => ({
                    ...value,
                    batchDate: event.target.value,
                    paymentPeriod: event.target.value.slice(0, 7),
                  }))
                  setReadiness(null)
                }}
              />
            </div>
            <div className="col-md-4">
              <CFormLabel htmlFor="summaryBatchName">Batch name</CFormLabel>
              <CFormInput
                id="summaryBatchName"
                value={form.batchName}
                placeholder="Optional, e.g. Urgent reimbursements"
                onChange={(event) =>
                  setForm((value) => ({ ...value, batchName: event.target.value }))
                }
              />
            </div>
            <div className="col-md-4">
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
                {readiness.employees} employees · {readiness.selectedCount} selected requests ·{' '}
                {formatMoney(readiness.grandTotal)}
              </div>
              {readiness.warnings?.map((warning) => (
                <div className="small mt-1" key={warning}>
                  {warning}
                </div>
              ))}
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
            disabled={busy || candidateLoading || selectedKeys.size === 0}
            onClick={checkReadiness}
          >
            Check readiness
          </CButton>
          <CButton
            color="primary"
            disabled={busy || !readiness?.ready || !form.recipientEmail.trim() || !form.batchDate}
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

      <CModal
        visible={Boolean(paidTarget)}
        onClose={() => {
          if (!busy) {
            setPaidTarget(null)
            setPaymentResult(null)
          }
        }}
      >
        <CModalHeader>
          <CModalTitle>Record payment by Finance</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color="warning" className="py-2">
            This records payment only for the requests selected in {paidTarget?.reference}. The boss
            briefing remains read-only.
          </CAlert>
          <div className="row g-3">
            <div className="col-md-5">
              <CFormLabel htmlFor="summaryPaymentDate">Payment date</CFormLabel>
              <CFormInput
                id="summaryPaymentDate"
                type="date"
                value={paymentForm.payment_date}
                onChange={(event) =>
                  setPaymentForm((value) => ({ ...value, payment_date: event.target.value }))
                }
              />
            </div>
            <div className="col-md-7">
              <CFormLabel htmlFor="summaryPaymentReference">Bank reference</CFormLabel>
              <CFormInput
                id="summaryPaymentReference"
                value={paymentForm.payment_reference}
                onChange={(event) =>
                  setPaymentForm((value) => ({ ...value, payment_reference: event.target.value }))
                }
              />
            </div>
            <div className="col-12">
              <CFormLabel htmlFor="summaryPaymentMethod">Payment method</CFormLabel>
              <CFormInput
                id="summaryPaymentMethod"
                value={paymentForm.payment_method}
                onChange={(event) =>
                  setPaymentForm((value) => ({ ...value, payment_method: event.target.value }))
                }
              />
            </div>
            <div className="col-12">
              <CFormLabel htmlFor="summaryPaymentRemarks">Remarks</CFormLabel>
              <CFormTextarea
                id="summaryPaymentRemarks"
                rows={2}
                value={paymentForm.remarks}
                onChange={(event) =>
                  setPaymentForm((value) => ({ ...value, remarks: event.target.value }))
                }
              />
            </div>
          </div>
          {paymentResult && (
            <CAlert
              color={paymentResult.status === 'partial' ? 'warning' : 'danger'}
              className="mt-3 mb-0"
            >
              <strong>{paymentResult.message}</strong>
              <div className="d-grid gap-2 mt-2">
                {(paymentResult.results || []).map((result, index) => (
                  <div
                    className="border rounded-2 p-2 bg-body"
                    key={`${result.staffId}-${result.paymentPeriod}-${index}`}
                  >
                    <div className="d-flex justify-content-between gap-2">
                      <span>
                        {result.staffName || `Staff #${result.staffId}`} · {result.paymentPeriod}
                      </span>
                      <CBadge
                        color={
                          result.status === 'success'
                            ? 'success'
                            : result.status === 'skipped'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {result.status}
                      </CBadge>
                    </div>
                    <div className="small text-body-secondary mt-1">{result.message}</div>
                  </div>
                ))}
              </div>
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton variant="outline" color="secondary" onClick={() => setPaidTarget(null)}>
            Cancel
          </CButton>
          <CButton
            color="success"
            disabled={busy || !paymentForm.payment_date || !paymentForm.payment_reference.trim()}
            onClick={recordPaid}
          >
            {paymentResult ? 'Retry unpaid requests' : 'Record selected requests paid'}
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
