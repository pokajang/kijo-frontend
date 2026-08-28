import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CContainer, CFormInput, CFormLabel, CSpinner } from '@coreui/react'
import PaymentSummaryDocument from '../../components/salary/payment-summary/PaymentSummaryDocument'
import {
  fetchBossPaymentSummary,
  fetchBossPaymentSummaryStatus,
  getPublicPaymentSummaryAttachmentUrl,
  requestBossPaymentSummaryCode,
  verifyBossPaymentSummary,
} from '../../components/salary/paymentSummaryStorage'

const readToken = () => {
  const params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''))
  return params.get('access') || ''
}

const PaymentSummaryPublicPage = () => {
  const token = useMemo(readToken, [])
  const [status, setStatus] = useState(null)
  const [record, setRecord] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) {
      setError('This payment summary link is incomplete.')
      setLoading(false)
      return
    }
    fetchPaymentSummaryStatusAndContent(token, setStatus, setRecord, setError).finally(() =>
      setLoading(false),
    )
  }, [token])

  const requestCode = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = await requestBossPaymentSummaryCode(token)
      setNotice(payload.message || 'Verification code sent.')
    } catch (err) {
      setError(err?.message || 'Could not send the verification code.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = await verifyBossPaymentSummary(token, code)
      setRecord(payload.record)
    } catch (err) {
      setError(err?.message || 'Could not verify this payment summary.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="payment-summary-public min-vh-100 bg-body-tertiary">
      <CContainer
        className={record ? 'payment-summary-public__document' : 'payment-summary-public__gate'}
      >
        <div className="payment-summary-public__surface">
          {!record && <VerificationHeader />}
          {loading && (
            <div className="text-center py-5" role="status">
              <CSpinner />
              <div className="mt-2">Opening secure summary…</div>
            </div>
          )}
          {error && <CAlert color="danger">{error}</CAlert>}
          {notice && <CAlert color="success">{notice}</CAlert>}
          {!loading && !record && status && (
            <VerificationForm
              status={status}
              code={code}
              busy={busy}
              onCodeChange={setCode}
              onRequestCode={requestCode}
              onSubmit={verify}
            />
          )}
          {record && (
            <PaymentSummaryDocument
              record={record}
              resolveAttachmentUrl={getPublicPaymentSummaryAttachmentUrl}
            />
          )}
        </div>
      </CContainer>
    </main>
  )
}

const VerificationHeader = () => (
  <header className="mb-4">
    <h1 className="h4 mb-1">Payment summary</h1>
    <p className="small text-body-secondary mb-0">
      Prepared by Finance <span aria-hidden="true">·</span> Read-only
    </p>
  </header>
)

const VerificationForm = ({ status, code, busy, onCodeChange, onRequestCode, onSubmit }) => (
  <section aria-labelledby="verify-heading">
    <h2 id="verify-heading" className="h6 mb-1">
      Enter verification code
    </h2>
    <p id="verification-help" className="small text-body-secondary mb-3">
      {status.localPreview
        ? `Use the six-digit preview code for ${status.reference}.`
        : `Use the six-digit code for ${status.reference}. It expires after 10 minutes.`}
    </p>
    {!status.localPreview && (
      <CButton color="primary" variant="outline" size="sm" disabled={busy} onClick={onRequestCode}>
        Send code
      </CButton>
    )}
    <form className={status.localPreview ? '' : 'mt-3'} onSubmit={onSubmit}>
      <CFormLabel htmlFor="summaryCode" className="small">
        6-digit code
      </CFormLabel>
      <div className="d-grid d-sm-flex gap-2">
        <CFormInput
          id="summaryCode"
          className="flex-grow-1"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-describedby="verification-help"
          placeholder="000000"
          maxLength={6}
          pattern="[0-9]{6}"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <CButton
          type="submit"
          color="primary"
          className="text-nowrap px-4"
          disabled={busy || code.length !== 6}
        >
          Continue
        </CButton>
      </div>
    </form>
  </section>
)

const fetchPaymentSummaryStatusAndContent = async (token, setStatus, setRecord, setError) => {
  try {
    const state = await fetchBossPaymentSummaryStatus(token)
    setStatus(state)
    if (!state.verificationRequired) {
      const payload = await fetchBossPaymentSummary(token)
      setRecord(payload.record)
    }
  } catch (err) {
    setError(err?.message || 'This payment summary is unavailable.')
  }
}

export default PaymentSummaryPublicPage
