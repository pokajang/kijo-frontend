import React, { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CFormFeedback,
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
} from '@coreui/react'
import { formatMoney } from '../../../utils/formatters/numberFormatters'
import { getVendorPaymentBalance } from '../payment-records/vendorPaymentModel'
import { toLocalDateInputValue } from '../../../utils/dateInputValues'
import {
  newVendorPaymentRequestKey,
  recordVendorPayment,
} from '../payment-records/vendorPaymentApi'
import dialog from '../../../components/dialog/dialogService'
import PaymentProofCapture, {
  MAX_PAYMENT_PROOF_SIZE,
  MAX_PAYMENT_PROOF_TOTAL,
  PAYMENT_PROOF_TYPES,
} from './payment-proof/PaymentProofCapture'

const today = () => toLocalDateInputValue()

const RecordVendorPaymentModal = ({ visible, payment, onClose, onRecorded }) => {
  const balance = useMemo(() => getVendorPaymentBalance(payment), [payment])
  const firstInputRef = useRef(null)
  const dateInputRef = useRef(null)
  const methodInputRef = useRef(null)
  const referenceInputRef = useRef(null)
  const proofInputRef = useRef(null)
  const remarksInputRef = useRef(null)
  const [values, setValues] = useState({
    amount: '',
    paidDate: today(),
    method: '',
    referenceNumber: '',
    remarks: '',
    proofs: [],
  })
  const [requestKey, setRequestKey] = useState(() => newVendorPaymentRequestKey('vendor-payment'))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!visible) return
    setValues({
      amount: balance.remaining.toFixed(2),
      paidDate: today(),
      method: payment?.method || 'Online Transfer',
      referenceNumber: '',
      remarks: '',
      proofs: [],
    })
    setRequestKey(newVendorPaymentRequestKey('vendor-payment'))
    setError('')
    setFieldErrors({})
    if (proofInputRef.current) proofInputRef.current.value = ''
    setTimeout(() => firstInputRef.current?.focus(), 0)
  }, [balance.remaining, payment?.id, payment?.method, visible])

  const update = (key) => (event) => {
    setValues((current) => ({
      ...current,
      [key]: event.target.value,
    }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
    setError('')
  }

  const validate = () => {
    const amount = Number(values.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { field: 'amount', message: 'Enter an amount greater than zero.' }
    }
    if (amount > balance.remaining) {
      return { field: 'amount', message: 'Payment cannot exceed the remaining approved balance.' }
    }
    if (!values.paidDate) return { field: 'paidDate', message: 'Payment date is required.' }
    if (values.paidDate > today()) {
      return { field: 'paidDate', message: 'Payment date cannot be in the future.' }
    }
    if (!values.method.trim()) return { field: 'method', message: 'Payment method is required.' }
    if (!values.referenceNumber.trim()) {
      return { field: 'referenceNumber', message: 'Transaction reference is required.' }
    }
    if (values.method !== 'Cash' && values.proofs.length === 0) {
      return { field: 'proofs', message: 'Attach payment evidence for this payment method.' }
    }
    if (values.method === 'Cash' && values.proofs.length === 0 && !values.remarks.trim()) {
      return { field: 'remarks', message: 'Add a cash payment note when no evidence is attached.' }
    }
    if (values.proofs.some(({ file }) => !PAYMENT_PROOF_TYPES.has(file.type))) {
      return { field: 'proofs', message: 'Evidence must be a PDF, JPG, or PNG file.' }
    }
    if (values.proofs.some(({ file }) => file.size > MAX_PAYMENT_PROOF_SIZE)) {
      return { field: 'proofs', message: 'Each evidence file must not exceed 5 MB.' }
    }
    if (values.proofs.reduce((total, { file }) => total + file.size, 0) > MAX_PAYMENT_PROOF_TOTAL) {
      return { field: 'proofs', message: 'Payment evidence cannot exceed 20 MB in total.' }
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setFieldErrors({ [validationError.field]: validationError.message })
      const refs = {
        amount: firstInputRef,
        paidDate: dateInputRef,
        method: methodInputRef,
        referenceNumber: referenceInputRef,
        proofs: proofInputRef,
        remarks: remarksInputRef,
      }
      refs[validationError.field]?.current?.focus()
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await recordVendorPayment(payment, values, requestKey)
      await onRecorded?.(result)
    } catch (requestError) {
      setError(
        requestError?.status === 409
          ? `${requestError.message} Reload the request before trying again.`
          : requestError?.message || 'Unable to record the payment.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async () => {
    if (submitting) return
    if (
      values.proofs.length > 0 &&
      !(await dialog.confirm('Discard the payment evidence currently attached to this form?'))
    ) {
      return
    }
    onClose()
  }

  return (
    <CModal
      visible={visible}
      onClose={submitting ? undefined : handleClose}
      backdrop="static"
      size="lg"
      scrollable
      aria-labelledby="record-vendor-payment-title"
    >
      <CModalHeader>
        <CModalTitle id="record-vendor-payment-title">
          {payment?.status === 'Partially Paid' ? 'Record Remaining Payment' : 'Record Payment'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-body-secondary">
          Record this only after the bank or payment channel confirms the settlement. This action
          updates the paid balance and the voucher audit copy.
        </p>
        <div className="vendor-payment-balance-strip" aria-label="Payment balance summary">
          <div>
            <span>Approved</span>
            <strong>{formatMoney(balance.approved)}</strong>
          </div>
          <div>
            <span>Paid to date</span>
            <strong>{formatMoney(balance.paid)}</strong>
          </div>
          <div>
            <span>Remaining</span>
            <strong>{formatMoney(balance.remaining)}</strong>
          </div>
        </div>
        {error && (
          <CAlert color="danger" role="alert">
            {error}
          </CAlert>
        )}
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <CFormLabel htmlFor="vendor-payment-amount">Amount paid now</CFormLabel>
            <CFormInput
              ref={firstInputRef}
              id="vendor-payment-amount"
              type="number"
              min="0.01"
              max={balance.remaining}
              step="0.01"
              inputMode="decimal"
              value={values.amount}
              onChange={update('amount')}
              disabled={submitting}
              invalid={Boolean(fieldErrors.amount)}
              aria-describedby={fieldErrors.amount ? 'vendor-payment-amount-error' : undefined}
              required
            />
            {fieldErrors.amount && (
              <CFormFeedback id="vendor-payment-amount-error" invalid>
                {fieldErrors.amount}
              </CFormFeedback>
            )}
          </div>
          <div className="col-12 col-md-6">
            <CFormLabel htmlFor="vendor-payment-date">Payment date</CFormLabel>
            <CFormInput
              ref={dateInputRef}
              id="vendor-payment-date"
              type="date"
              max={today()}
              value={values.paidDate}
              onChange={update('paidDate')}
              disabled={submitting}
              invalid={Boolean(fieldErrors.paidDate)}
              aria-describedby={fieldErrors.paidDate ? 'vendor-payment-date-error' : undefined}
              required
            />
            {fieldErrors.paidDate && (
              <CFormFeedback id="vendor-payment-date-error" invalid>
                {fieldErrors.paidDate}
              </CFormFeedback>
            )}
          </div>
          <div className="col-12 col-md-6">
            <CFormLabel htmlFor="vendor-payment-method">Payment method</CFormLabel>
            <CFormSelect
              ref={methodInputRef}
              id="vendor-payment-method"
              value={values.method}
              onChange={update('method')}
              disabled={submitting}
              invalid={Boolean(fieldErrors.method)}
              aria-describedby={fieldErrors.method ? 'vendor-payment-method-error' : undefined}
              required
            >
              <option value="">Select method</option>
              <option value="Online Transfer">Online Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </CFormSelect>
            {fieldErrors.method && (
              <CFormFeedback id="vendor-payment-method-error" invalid>
                {fieldErrors.method}
              </CFormFeedback>
            )}
          </div>
          <div className="col-12 col-md-6">
            <CFormLabel htmlFor="vendor-payment-reference">Transaction reference</CFormLabel>
            <CFormInput
              ref={referenceInputRef}
              id="vendor-payment-reference"
              maxLength={150}
              value={values.referenceNumber}
              onChange={update('referenceNumber')}
              disabled={submitting}
              invalid={Boolean(fieldErrors.referenceNumber)}
              aria-describedby={
                fieldErrors.referenceNumber ? 'vendor-payment-reference-error' : undefined
              }
              required
            />
            {fieldErrors.referenceNumber && (
              <CFormFeedback id="vendor-payment-reference-error" invalid>
                {fieldErrors.referenceNumber}
              </CFormFeedback>
            )}
          </div>
          <div className="col-12">
            <CFormLabel>
              Payment evidence{' '}
              {values.method === 'Cash' && <span className="text-body-secondary">(optional)</span>}
            </CFormLabel>
            <PaymentProofCapture
              inputRef={proofInputRef}
              files={values.proofs}
              disabled={submitting}
              enabled={visible}
              error={fieldErrors.proofs}
              onChange={(proofs) => {
                setValues((current) => ({ ...current, proofs }))
                setFieldErrors((current) => ({ ...current, proofs: '' }))
                setError('')
              }}
            />
          </div>
          <div className="col-12">
            <CFormLabel htmlFor="vendor-payment-remarks">
              Payment remarks <span className="text-body-secondary">(optional)</span>
            </CFormLabel>
            <CFormTextarea
              ref={remarksInputRef}
              id="vendor-payment-remarks"
              rows={3}
              maxLength={2000}
              value={values.remarks}
              onChange={update('remarks')}
              disabled={submitting}
              invalid={Boolean(fieldErrors.remarks)}
              aria-describedby={fieldErrors.remarks ? 'vendor-payment-remarks-error' : undefined}
            />
            {fieldErrors.remarks && (
              <CFormFeedback id="vendor-payment-remarks-error" invalid>
                {fieldErrors.remarks}
              </CFormFeedback>
            )}
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </CButton>
        <CButton
          size="sm"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting || balance.remaining <= 0}
        >
          {submitting ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Recording…
            </>
          ) : (
            'Record Payment'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

RecordVendorPaymentModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onRecorded: PropTypes.func,
  payment: PropTypes.object,
  visible: PropTypes.bool,
}

export default RecordVendorPaymentModal
