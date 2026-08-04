import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
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
import { fetchJson } from '../../../utils/detailPages'
import { formatMoney, getTodayDate } from './debtorUtils'

const newRequestToken = () =>
  globalThis.crypto?.randomUUID?.() ||
  `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`

const DebtorUpdatePaymentModal = ({
  visible,
  debtor,
  submitting = false,
  onClose,
  onConfirm,
  onReverse,
}) => {
  const [paymentType, setPaymentType] = useState('full')
  const [paymentDate, setPaymentDate] = useState(getTodayDate())
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [remarks, setRemarks] = useState('')
  const [requestToken, setRequestToken] = useState(newRequestToken)
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [validationError, setValidationError] = useState('')

  const effectiveSummary = useMemo(
    () =>
      summary || {
        grandTotal: Number(debtor?.grandTotal || 0),
        paidTotal: Number(debtor?.paidTotal ?? debtor?.paidAmount ?? 0),
        outstandingAmount: Number(
          debtor?.outstandingAmount ??
            Math.max(0, Number(debtor?.grandTotal || 0) - Number(debtor?.paidAmount || 0)),
        ),
        paymentStatus: debtor?.paymentStatus || debtor?.status || 'Open',
      },
    [debtor, summary],
  )
  const outstanding = Number(effectiveSummary.outstandingAmount || 0)

  const loadHistory = useCallback(async () => {
    if (!debtor?.sourceType || !debtor?.sourceId) return
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const payload = await fetchJson(
        `${import.meta.env.VITE_API_BASE}receivables/${encodeURIComponent(
          debtor.sourceType,
        )}/${encodeURIComponent(debtor.sourceId)}/payments`,
      )
      setHistory(Array.isArray(payload?.payments) ? payload.payments : [])
      setSummary(payload?.summary || null)
    } catch (error) {
      setHistory([])
      setHistoryError(error?.message || 'Unable to load payment history.')
    } finally {
      setHistoryLoading(false)
    }
  }, [debtor])

  useEffect(() => {
    if (!visible) return
    setPaymentType('full')
    setPaymentDate(getTodayDate())
    setAmount('')
    setPaymentMethod('')
    setTransactionReference('')
    setRemarks('')
    setRequestToken(newRequestToken())
    setSummary(null)
    setValidationError('')
    loadHistory()
  }, [loadHistory, visible])

  const handleConfirm = async () => {
    setValidationError('')
    const partialAmount = Number(amount)
    if (!paymentDate) {
      setValidationError('Payment date is required.')
      return
    }
    if (paymentType === 'partial' && (!Number.isFinite(partialAmount) || partialAmount <= 0)) {
      setValidationError('Enter a partial payment amount greater than zero.')
      return
    }
    if (paymentType === 'partial' && partialAmount > outstanding) {
      setValidationError('Partial payment cannot exceed the outstanding balance.')
      return
    }

    const succeeded = await onConfirm?.({
      payment_type: paymentType,
      ...(paymentType === 'partial' ? { amount } : {}),
      payment_date: paymentDate,
      payment_method: paymentMethod,
      transaction_reference: transactionReference,
      remarks,
      request_token: requestToken,
    })
    if (succeeded === false) return
    setRequestToken(newRequestToken())
  }

  const handleReverse = async (payment) => {
    const succeeded = await onReverse?.(payment)
    if (succeeded) await loadHistory()
  }

  return (
    <CModal
      visible={visible}
      onClose={submitting ? undefined : onClose}
      backdrop="static"
      size="lg"
    >
      <CModalHeader>
        <CModalTitle>Update Payment</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <div className="fw-semibold">{debtor?.invoiceRef || '-'}</div>
          <div className="text-muted small">{debtor?.client || '-'}</div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="text-muted small">Invoice total</div>
            <div className="fw-semibold">{formatMoney(effectiveSummary.grandTotal)}</div>
          </div>
          <div className="col-12 col-md-4">
            <div className="text-muted small">Previously paid</div>
            <div className="fw-semibold text-success">
              {formatMoney(effectiveSummary.paidTotal)}
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="text-muted small">Outstanding</div>
            <div className="fw-semibold text-warning">{formatMoney(outstanding)}</div>
          </div>
        </div>

        {validationError && <CAlert color="danger">{validationError}</CAlert>}
        {historyError && <CAlert color="warning">{historyError}</CAlert>}

        {outstanding > 0 && (
          <>
            <CFormLabel className="fw-semibold">Payment option</CFormLabel>
            <div className="d-flex flex-column flex-md-row gap-3 mb-3">
              <CFormCheck
                type="radio"
                id="debtor-payment-full"
                name="debtor-payment-type"
                label="Paid in full"
                checked={paymentType === 'full'}
                onChange={() => setPaymentType('full')}
                disabled={submitting}
              />
              <CFormCheck
                type="radio"
                id="debtor-payment-partial"
                name="debtor-payment-type"
                label="Partial payment"
                checked={paymentType === 'partial'}
                onChange={() => setPaymentType('partial')}
                disabled={submitting}
              />
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <CFormLabel htmlFor="receivable-payment-amount">Amount received now</CFormLabel>
                <CFormInput
                  id="receivable-payment-amount"
                  type="number"
                  min="0.01"
                  max={outstanding}
                  step="0.01"
                  value={paymentType === 'full' ? outstanding.toFixed(2) : amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={paymentType === 'full' || submitting}
                />
              </div>
              <div className="col-12 col-md-6">
                <CFormLabel htmlFor="receivable-payment-date">Payment date</CFormLabel>
                <CFormInput
                  id="receivable-payment-date"
                  type="date"
                  max={getTodayDate()}
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="col-12 col-md-6">
                <CFormLabel htmlFor="receivable-payment-method">Payment method</CFormLabel>
                <CFormSelect
                  id="receivable-payment-method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select method</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </CFormSelect>
              </div>
              <div className="col-12 col-md-6">
                <CFormLabel htmlFor="receivable-payment-reference">
                  Transaction reference
                </CFormLabel>
                <CFormInput
                  id="receivable-payment-reference"
                  value={transactionReference}
                  onChange={(event) => setTransactionReference(event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="col-12">
                <CFormLabel htmlFor="receivable-payment-remarks">Remarks</CFormLabel>
                <CFormTextarea
                  id="receivable-payment-remarks"
                  rows={2}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </>
        )}

        <div className="border-top mt-4 pt-3">
          <div className="fw-semibold mb-2">Payment history</div>
          {historyLoading ? (
            <div className="text-muted small d-flex align-items-center gap-2">
              <CSpinner size="sm" /> Loading payment history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-muted small">No payments recorded.</div>
          ) : (
            <div className="table-responsive">
              <CTable small align="middle" className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Method / Reference</CTableHeaderCell>
                    <CTableHeaderCell>Recorded by</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {history.map((payment) => (
                    <CTableRow key={payment.id} color={payment.reversedAt ? 'light' : undefined}>
                      <CTableDataCell>{payment.paymentDate || '-'}</CTableDataCell>
                      <CTableDataCell
                        className={payment.reversedAt ? 'text-decoration-line-through' : ''}
                      >
                        {formatMoney(payment.amount)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {[payment.paymentMethod, payment.transactionReference]
                          .filter(Boolean)
                          .join(' / ') || '-'}
                        {payment.reversedAt && (
                          <div className="small text-danger">
                            Reversed: {payment.reversalReason || 'No reason supplied'}
                          </div>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>{payment.recordedByCode || '-'}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {!payment.reversedAt && typeof onReverse === 'function' && (
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReverse(payment)}
                            disabled={submitting}
                          >
                            Reverse
                          </CButton>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={submitting}
        >
          Close
        </CButton>
        {outstanding > 0 && (
          <CButton
            color="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={submitting || historyLoading}
          >
            {submitting ? 'Saving...' : 'Update Payment'}
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  )
}

DebtorUpdatePaymentModal.propTypes = {
  debtor: PropTypes.object,
  onClose: PropTypes.func,
  onConfirm: PropTypes.func,
  onReverse: PropTypes.func,
  submitting: PropTypes.bool,
  visible: PropTypes.bool,
}

export default DebtorUpdatePaymentModal
