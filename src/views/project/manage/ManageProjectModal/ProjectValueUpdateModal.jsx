import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { showToast } from '../../../../components/toast/toastService'
import {
  getCurrentProjectValue,
  previewProjectValueImpact,
  updateProjectCurrentValue,
} from '../projectApi'
import { formatProjectMoney } from '../projectDetailFormatters'

const initialSync = {
  invoices: [],
  payment_adjustments: [],
  delivery_orders: [],
}

const countText = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`

const normalizeImpact = (payload) => payload?.data || payload || null

const documentRows = (impact) => {
  const documents = impact?.documents || {}
  return [
    ...(documents.invoices || [])
      .filter((doc) => doc.classification === 'editable')
      .map((doc) => ({ ...doc, group: 'invoice' })),
    ...(documents.payment_adjustments || []).map((doc) => ({
      ...doc,
      group: 'payment_adjustments',
    })),
    ...(documents.blocked_items || []).map((doc) => ({
      ...doc,
      group: 'blocked_items',
    })),
    ...(documents.delivery_orders || []).map((doc) => ({ ...doc, group: 'delivery_orders' })),
    ...(documents.jd14 || []).map((doc) => ({ ...doc, group: 'jd14' })),
  ]
}

const syncKeyFor = (row) => {
  if (row.group === 'invoice' && row.classification === 'editable') return 'invoices'
  if (row.group === 'payment_adjustments') return 'payment_adjustments'
  return ''
}

const rowLabel = (row, isValueUnchanged = false) => {
  if (row.group === 'invoice' && row.classification === 'editable') {
    if (isValueUnchanged || row.already_matches_project_value) {
      return `Sync Invoice ${row.reference} to current project value ${formatProjectMoney(row.new_amount)}`
    }
    if (Number(row.delta || 0) < 0 || Number(row.target_adjustment_amount || 0) < 0) {
      return `Reduce Invoice ${row.reference} from ${formatProjectMoney(row.old_amount)} to ${formatProjectMoney(row.new_amount)}`
    }
    return `Update Invoice ${row.reference} from ${formatProjectMoney(row.old_amount)} to ${formatProjectMoney(row.new_amount)}`
  }
  if (row.group === 'payment_adjustments') {
    return `Record adjustment required for paid receipt/payment delta ${formatProjectMoney(row.delta)}`
  }
  if (row.group === 'blocked_items') {
    return row.action === 'manual_review_required'
      ? `Manual review required for ${row.reference}`
      : `Blocked ${row.reference} cannot be changed`
  }
  if (row.group === 'delivery_orders') return `Delivery Order ${row.reference} is informational`
  if (row.group === 'jd14') return `JD14 ${row.reference} is informational`
  return row.reference || '-'
}

const statusLabel = (classification) =>
  ({
    editable: 'Editable',
    adjustment_required: 'Adjustment required',
    blocked: 'Blocked',
    informational: 'Informational',
  })[classification] ||
  classification ||
  'Informational'

const ProjectValueUpdateModal = ({ visible, project, onClose, onUpdated }) => {
  const currentValue = useMemo(() => getCurrentProjectValue(project, 0), [project])
  const [step, setStep] = useState(1)
  const [valueText, setValueText] = useState('')
  const [reason, setReason] = useState('')
  const [impact, setImpact] = useState(null)
  const [sync, setSync] = useState(initialSync)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!visible) return
    setStep(1)
    setValueText(Number.isFinite(currentValue) ? currentValue.toFixed(2) : '')
    setReason('')
    setImpact(null)
    setSync(initialSync)
    setAcknowledged(false)
    setError('')
    setIsPreviewing(false)
    setIsSubmitting(false)
  }, [currentValue, project?.id, visible])

  const nextValue = Number(valueText)
  const hasValidValue = Number.isFinite(nextValue) && nextValue >= 0
  const hasReason = reason.trim() !== ''
  const rows = documentRows(impact)
  const hasAffectedDocuments = Number(impact?.summary?.affected_count || 0) > 0
  const isValueUnchanged =
    impact &&
    Math.abs(Number(impact.old_project_value || 0) - Number(impact.new_project_value || 0)) < 0.01
  const canPreview = hasValidValue && hasReason && !isPreviewing
  const canConfirm = (!hasAffectedDocuments || acknowledged) && !isSubmitting
  const confirmLabel = isValueUnchanged ? 'Confirm Sync' : 'Confirm Update'

  const impactCopy = impact
    ? `This project has ${countText(impact.summary?.invoice_count || 0, 'invoice')}, ${countText(
        impact.summary?.delivery_order_count || 0,
        'delivery order',
      )}, and ${countText(impact.summary?.payment_record_count || 0, 'receipt/payment record')}.`
    : ''

  const toggleSync = (key, id, checked) => {
    setSync((prev) => {
      const current = new Set(prev[key] || [])
      if (checked) current.add(id)
      else current.delete(id)
      return { ...prev, [key]: Array.from(current) }
    })
  }

  const handlePreview = async () => {
    if (!canPreview || !project?.id) return
    setIsPreviewing(true)
    setError('')
    try {
      const payload = await previewProjectValueImpact(project.id, {
        current_project_value: nextValue,
        reason: reason.trim(),
      })
      setImpact(normalizeImpact(payload))
      setSync(initialSync)
      setAcknowledged(false)
      setStep(2)
    } catch (err) {
      console.error('Project value impact preview error', err)
      setError(err.message || 'Failed to preview commercial impact.')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleConfirm = async () => {
    if (!canConfirm || !project?.id) return
    setIsSubmitting(true)
    setError('')
    try {
      const result = await updateProjectCurrentValue(project.id, {
        current_project_value: nextValue,
        reason: reason.trim(),
        acknowledgement: acknowledged || !hasAffectedDocuments,
        sync,
      })

      if (result.status === 'success') {
        showToast(result.message || 'Project current value updated.')
        onUpdated?.({
          ...project,
          quote_value: result.data?.quote_value ?? project.quote_value,
          current_project_value: result.data?.current_project_value ?? null,
          resolved_project_value: result.data?.resolved_project_value ?? nextValue,
        })
        onClose?.()
      } else {
        setError(result.message || 'Failed to update project current value.')
      }
    } catch (err) {
      console.error('Update project current value error', err)
      setError(err.message || 'Server error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isPreviewing || isSubmitting) return
    onClose?.()
  }

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      size="lg"
      alignment="center"
      backdrop="static"
      scrollable
    >
      <CModalHeader closeButton={!isSubmitting && !isPreviewing}>
        <CModalTitle>Update Project Current Value</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error ? (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        ) : null}

        {step === 1 ? (
          <div className="d-grid gap-3">
            <div>
              <CFormLabel htmlFor="projectCurrentValue">New Project Current Value (RM)</CFormLabel>
              <CFormInput
                id="projectCurrentValue"
                type="number"
                min="0"
                step="0.01"
                value={valueText}
                onChange={(event) => setValueText(event.target.value)}
              />
              <div className="small text-medium-emphasis mt-1">
                Current project value: {formatProjectMoney(currentValue)}
              </div>
            </div>
            <div>
              <CFormLabel htmlFor="projectValueReason">Reason</CFormLabel>
              <CFormTextarea
                id="projectValueReason"
                rows={4}
                value={reason}
                placeholder="Example: Approved variation order from client."
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="d-grid gap-3">
            <CAlert color="warning" className="mb-0">
              <div>{impactCopy}</div>
              {isValueUnchanged ? (
                <div>
                  Project value is already {formatProjectMoney(impact?.new_project_value)}. Some
                  commercial records may still need to be synced to this value.
                </div>
              ) : (
                <div>
                  Project value will change from {formatProjectMoney(impact?.old_project_value)} to{' '}
                  {formatProjectMoney(impact?.new_project_value)}.
                </div>
              )}
            </CAlert>

            <div>
              <strong>Do you want to update the following?</strong>
              <div className="table-responsive mt-2">
                <CTable hover className="data-table-compact embedded-data-table mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Document</CTableHeaderCell>
                      <CTableHeaderCell>Impact</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={3} className="text-center text-muted">
                          No commercial documents will be updated.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      rows.map((row) => {
                        const syncKey = syncKeyFor(row)
                        const selectable = Boolean(syncKey)
                        const checkboxId = `project-value-sync-${row.group}-${row.id}`
                        const checked = selectable && (sync[syncKey] || []).includes(row.id)

                        return (
                          <CTableRow key={`${row.group}-${row.id}`}>
                            <CTableDataCell>{row.reference || '-'}</CTableDataCell>
                            <CTableDataCell>
                              {selectable ? (
                                <div className="form-check">
                                  <input
                                    id={checkboxId}
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      toggleSync(syncKey, row.id, event.target.checked)
                                    }
                                  />
                                  <label className="form-check-label" htmlFor={checkboxId}>
                                    {rowLabel(row, isValueUnchanged)}
                                  </label>
                                </div>
                              ) : (
                                <span>{rowLabel(row, isValueUnchanged)}</span>
                              )}
                              {row.message ? (
                                <div className="small text-medium-emphasis mt-1">{row.message}</div>
                              ) : null}
                            </CTableDataCell>
                            <CTableDataCell className="text-nowrap">
                              {statusLabel(row.classification)}
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })
                    )}
                  </CTableBody>
                </CTable>
              </div>
            </div>

            {hasAffectedDocuments ? (
              <CFormCheck
                id="projectValueCommercialAcknowledgement"
                checked={acknowledged}
                label="I understand this will change selected commercial records and create audit history."
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
            ) : null}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        {step === 2 ? (
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setStep(1)}
            disabled={isSubmitting}
          >
            Back
          </CButton>
        ) : null}
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={isPreviewing || isSubmitting}
        >
          Cancel
        </CButton>
        {step === 1 ? (
          <CButton color="primary" size="sm" onClick={handlePreview} disabled={!canPreview}>
            {isPreviewing ? 'Checking...' : 'Preview Impact'}
          </CButton>
        ) : (
          <CButton color="primary" size="sm" onClick={handleConfirm} disabled={!canConfirm}>
            {isSubmitting ? 'Updating...' : confirmLabel}
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  )
}

ProjectValueUpdateModal.propTypes = {
  visible: PropTypes.bool,
  project: PropTypes.object,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
}

export default ProjectValueUpdateModal
