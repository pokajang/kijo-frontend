import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormCheck,
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
import { formatMoney } from '../../../components/salary/salaryCalculations'

export const primaryWorkflowAction = (record = {}) =>
  (record.workflow?.availableActions || record.workflowPayload?.availableActions || []).find(
    (action) => action.action === 'check' || action.action === 'approve',
  ) || null

const actionTone = (action) => (action === 'approve' ? 'success' : 'info')

const FinancialWorkflowBatchActions = ({
  selectedRecords = [],
  onClear,
  onSubmit,
  getRecordLabel,
  getRecordAmount,
  showAmounts = true,
}) => {
  const [action, setAction] = useState('')
  const [remarks, setRemarks] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [recommendation, setRecommendation] = useState('')
  const [recommendationRemarks, setRecommendationRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const grouped = useMemo(
    () =>
      ['check', 'approve'].map((key) => ({
        action: key,
        records: selectedRecords.filter((record) => primaryWorkflowAction(record)?.action === key),
      })),
    [selectedRecords],
  )

  const open = (nextAction) => {
    setAction(nextAction)
    setRemarks('')
    setConfirmed(false)
    setRecommendation('')
    setRecommendationRemarks('')
    setError('')
  }
  const close = () => {
    if (!submitting) setAction('')
  }
  const batchRecords = grouped.find((group) => group.action === action)?.records || []
  const total = batchRecords.reduce((sum, record) => sum + Number(getRecordAmount(record) || 0), 0)

  const submit = async () => {
    if (!confirmed || !batchRecords.length || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(action, batchRecords, remarks, {
        priority: recommendation,
        remarks: recommendationRemarks,
      })
      setAction('')
      onClear()
    } catch (err) {
      setError(err?.message || `Unable to ${action} the selected records.`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedRecords.length) return null

  return (
    <>
      <CAlert
        color="light"
        className="border d-flex align-items-center justify-content-between gap-3 py-2 mb-3"
      >
        <span className="small">
          <strong>{selectedRecords.length}</strong> selected (maximum 50). Batch actions apply only
          to records at the matching workflow step; rejection must be handled individually.
        </span>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {grouped.map(
            (group) =>
              group.records.length > 0 && (
                <CButton
                  key={group.action}
                  size="sm"
                  color={actionTone(group.action)}
                  variant="outline"
                  onClick={() => open(group.action)}
                >
                  {group.action === 'approve' ? 'Approve' : 'Check'} {group.records.length}
                </CButton>
              ),
          )}
          <CButton size="sm" color="secondary" variant="ghost" onClick={onClear}>
            Clear
          </CButton>
        </div>
      </CAlert>
      <CModal visible={Boolean(action)} onClose={close} alignment="center" backdrop="static">
        <CModalHeader closeButton={!submitting}>
          <CModalTitle>
            Batch {action === 'approve' ? 'Approve' : 'Check'} {batchRecords.length} records
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="small text-body-secondary">
            {batchRecords.length} records{showAmounts ? ` · ${formatMoney(total)} total` : ''}
          </p>
          <ul className="small ps-3 mb-3">
            {batchRecords.map((record) => (
              <li key={record.id}>
                {showAmounts
                  ? getRecordLabel(record)
                  : String(getRecordLabel(record)).replace(/\s*[·•]\s*-\s*$/, '')}
              </li>
            ))}
          </ul>
          <CFormCheck
            id="financialBatchWorkflowConfirm"
            label="I have reviewed each selected record and its supporting evidence."
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={submitting}
            className="mb-3"
          />
          <CFormLabel htmlFor="financialBatchWorkflowRemarks">Remarks (optional)</CFormLabel>
          <CFormTextarea
            id="financialBatchWorkflowRemarks"
            rows={3}
            value={remarks}
            disabled={submitting}
            onChange={(event) => setRemarks(event.target.value)}
          />
          <hr />
          <CFormLabel htmlFor="financialBatchPaymentRecommendation">
            Payment recommendation (optional)
          </CFormLabel>
          <CFormSelect
            id="financialBatchPaymentRecommendation"
            value={recommendation}
            disabled={submitting}
            onChange={(event) => setRecommendation(event.target.value)}
          >
            <option value="">No recommendation</option>
            <option value="Urgent">Urgent</option>
            <option value="Normal">Normal</option>
            <option value="Deferred">Recommend deferral</option>
          </CFormSelect>
          {recommendation && (
            <>
              <CFormLabel htmlFor="financialBatchPaymentRecommendationRemarks" className="mt-2">
                Recommendation note (optional)
              </CFormLabel>
              <CFormTextarea
                id="financialBatchPaymentRecommendationRemarks"
                rows={2}
                value={recommendationRemarks}
                disabled={submitting}
                onChange={(event) => setRecommendationRemarks(event.target.value)}
              />
              <div className="form-text">
                Finance sees this recommendation but controls final payment scheduling.
              </div>
            </>
          )}
          {error && (
            <div className="text-danger small mt-2" role="alert">
              {error}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={submitting}
            onClick={close}
          >
            Cancel
          </CButton>
          <CButton
            size="sm"
            color={actionTone(action)}
            disabled={submitting || !confirmed}
            onClick={submit}
          >
            {submitting && <CSpinner size="sm" className="me-1" />}
            {action === 'approve' ? 'Approve records' : 'Check records'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FinancialWorkflowBatchActions
