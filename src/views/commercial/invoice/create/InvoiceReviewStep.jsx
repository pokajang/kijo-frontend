import React, { useEffect, useRef } from 'react'
import {
  CAlert,
  CButton,
  CCardBody,
  CCardFooter,
  CFormCheck,
  CFormInput,
  CFormFeedback,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

const emptyValue = '-'

const formatMoney = (value) => {
  const amount = Number(value || 0)
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const formatOptionalMoney = (value) => (value === null ? emptyValue : formatMoney(value))

const displayRemainingMoney = (value) => {
  if (value === undefined || value === null) return null
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.abs(number) <= 0.01 ? 0 : number
}

const formatNumber = (value) => {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

const getLineTotal = (item = {}) => Number(item.quantity || 0) * Number(item.unit_price || 0)

const InvoiceReviewStep = ({
  payload,
  project,
  projectInvoiceSummary,
  closeProject,
  onCloseProjectChange,
  submitting,
  onBack,
  onConfirm,
  deviationReason,
  deviationAcknowledged,
  deviationError,
  onDeviationReasonChange,
  onDeviationAcknowledgedChange,
}) => {
  const deviationReasonRef = useRef(null)
  const deviationAcknowledgementRef = useRef(null)
  const lineItems = Array.isArray(payload?.breakdown) ? payload.breakdown : []
  const remainingAfter = displayRemainingMoney(projectInvoiceSummary?.remainingAfter)
  const remainingAfterLabel =
    remainingAfter !== null && remainingAfter < 0
      ? 'Amount over project value'
      : 'Yet to be invoiced after this invoice'
  const billedAddress = [
    payload?.invoice_client_address,
    payload?.invoice_client_city,
    payload?.invoice_client_state,
    payload?.invoice_client_zip,
  ]
    .filter(Boolean)
    .join(', ')

  useEffect(() => {
    if (!deviationError) return
    const target = String(deviationReason || '').trim()
      ? deviationAcknowledgementRef.current
      : deviationReasonRef.current
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    target?.focus?.({ preventScroll: true })
  }, [deviationError, deviationReason])

  return (
    <>
      <CCardBody>
        <CAlert color="info">
          Review the invoice details below. The invoice will only be created after you confirm.
        </CAlert>

        <div className="border rounded-2 p-3 mb-3">
          <div className="fw-semibold mb-2">Project Billing</div>
          <div className="row g-2">
            <div className="col-sm-6 col-lg-3">
              <div className="small text-body-secondary">Project value</div>
              <div className="fw-semibold">
                {formatOptionalMoney(projectInvoiceSummary?.projectValue ?? null)}
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="small text-body-secondary">Already invoiced</div>
              <div className="fw-semibold">
                {formatMoney(projectInvoiceSummary?.alreadyInvoiced)}
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="small text-body-secondary">This invoice</div>
              <div className="fw-semibold">{formatMoney(projectInvoiceSummary?.thisInvoice)}</div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="small text-body-secondary">{remainingAfterLabel}</div>
              <div className="fw-semibold">
                {remainingAfter === null ? emptyValue : formatMoney(Math.abs(remainingAfter))}
              </div>
            </div>
          </div>
          {projectInvoiceSummary?.canCloseProject ? (
            <div className="border-top mt-3 pt-3">
              <CFormCheck
                id="close-project-after-invoice"
                label="Close Project"
                checked={Boolean(closeProject)}
                disabled={submitting}
                onChange={(event) => onCloseProjectChange?.(event.target.checked)}
              />
              <div className="small text-body-secondary mt-1">
                Project status will be marked Completed after this invoice is created.
              </div>
            </div>
          ) : null}
          {remainingAfter !== null && remainingAfter < 0 ? (
            <CAlert color="warning" className="mt-3 mb-0">
              <div className="fw-semibold mb-2">
                This invoice is {formatMoney(Math.abs(remainingAfter))} above the remaining project
                value.
              </div>
              <CFormInput
                ref={deviationReasonRef}
                value={deviationReason || ''}
                onChange={(event) => onDeviationReasonChange?.(event.target.value)}
                placeholder="Brief reason"
                invalid={Boolean(deviationError && !String(deviationReason || '').trim())}
                data-field-path="deviation_reason"
                aria-label="Reason for exceeding project value"
              />
              <CFormCheck
                ref={deviationAcknowledgementRef}
                className="mt-2"
                id="invoice-deviation-acknowledgement"
                checked={Boolean(deviationAcknowledged)}
                onChange={(event) => onDeviationAcknowledgedChange?.(event.target.checked)}
                label="I confirm this project-value difference."
                data-field-path="deviation_acknowledged"
              />
              {deviationError ? (
                <CFormFeedback invalid className="d-block">
                  {deviationError}
                </CFormFeedback>
              ) : null}
            </CAlert>
          ) : null}
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <div className="fw-semibold mb-1">Invoice To</div>
            <div>{payload?.invoice_client_name || emptyValue}</div>
            <div className="text-body-secondary small">{billedAddress || emptyValue}</div>
            <div className="text-body-secondary small">
              PIC: {payload?.invoice_pic_name || emptyValue}
            </div>
          </div>
          <div className="col-md-6">
            <div className="fw-semibold mb-1">Project</div>
            <div>{project?.project_name || emptyValue}</div>
            <div className="text-body-secondary small">
              {payload?.service_type || emptyValue} | Project ID {payload?.project_id || emptyValue}
            </div>
            <div className="text-body-secondary small">
              Purpose: {payload?.invoice_purpose || emptyValue}
            </div>
          </div>
          <div className="col-md-3">
            <div className="fw-semibold">Invoice Date</div>
            <div>{payload?.invoice_date || emptyValue}</div>
          </div>
          <div className="col-md-3">
            <div className="fw-semibold">Payment Method</div>
            <div>{payload?.payment_method || emptyValue}</div>
          </div>
          <div className="col-md-3">
            <div className="fw-semibold">Payment Terms</div>
            <div>
              {payload?.override_payment_terms
                ? `${payload?.payment_terms_days || 0} days`
                : 'Project/client default'}
            </div>
          </div>
          <div className="col-md-3">
            <div className="fw-semibold">LOA / PO</div>
            <div>{payload?.client_award_ref_no || emptyValue}</div>
          </div>
        </div>

        <div className="data-table-embedded-shell">
          {/* datatable-exempt: embedded review layout table */}
          <CTable responsive hover className="data-table-compact embedded-data-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Description</CTableHeaderCell>
                <CTableHeaderCell>Notes</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Qty</CTableHeaderCell>
                <CTableHeaderCell>Unit</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Unit Price</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Line Total</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {lineItems.length ? (
                lineItems.map((item, index) => (
                  <CTableRow key={`${item.item_description || 'item'}-${index}`}>
                    <CTableDataCell>{item.item_description || emptyValue}</CTableDataCell>
                    <CTableDataCell>{item.description || emptyValue}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatNumber(item.quantity)}
                    </CTableDataCell>
                    <CTableDataCell>{item.unit || emptyValue}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(item.unit_price)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatMoney(getLineTotal(item))}
                    </CTableDataCell>
                  </CTableRow>
                ))
              ) : (
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-center text-body-secondary">
                    No invoice line items.
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>

        <div className="d-flex justify-content-end mt-3">
          <div style={{ minWidth: '260px' }}>
            <div className="d-flex justify-content-between">
              <span>Amount</span>
              <span>{formatMoney(payload?.amount)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>SST</span>
              <span>{formatMoney(payload?.sst_amount)}</span>
            </div>
            <div className="d-flex justify-content-between fw-semibold border-top pt-2 mt-2">
              <span>Grand Total</span>
              <span>{formatMoney(payload?.grand_total)}</span>
            </div>
          </div>
        </div>
      </CCardBody>
      <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={submitting}
        >
          Back to Edit
        </CButton>
        <CButton color="primary" size="sm" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Invoice'}
        </CButton>
      </CCardFooter>
    </>
  )
}

export default InvoiceReviewStep
