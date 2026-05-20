// src/views/project/InvoiceProjectModal/ViewInvoiceModal.jsx
import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CFormLabel,
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import { getInvoicePaymentTermsSourceLabel } from '../../../../shared/paymentTerms'

const ViewInvoiceModal = ({ visible, onClose, invoice }) => {
  if (!visible || !invoice) return null

  const raw = invoice.raw || {}
  const {
    service_type,

    // original (requestor) client
    client_name,
    client_ssm,
    client_tin,
    client_address,
    client_city,
    client_state,
    client_zip,
    pic_name,
    pic_email,
    pic_phone,

    // billed-to overrides
    invoice_client_name,
    invoice_client_ssm,
    invoice_client_tin,
    invoice_client_address,
    invoice_client_city,
    invoice_client_state,
    invoice_client_zip,
    invoice_pic_name,
    invoice_pic_email,
    invoice_pic_phone,
    invoice_pic_position,

    invoice_ref_no,
    invoice_purpose,
    invoice_date,
    service_start_date,
    service_end_date,
    status,
    payment_method,
    grant_approval_no,
    remarks,
    sst_amount,
    grand_total,
    breakdown = [],
    paid_date,
    paid_amount,
    paid_remarks,
  } = raw

  const { dateIssued, dueInDays, amount, paymentTermsDays, dueDate } = invoice
  const servicePeriod =
    service_start_date && service_end_date
      ? `${service_start_date} to ${service_end_date}`
      : service_start_date || service_end_date || '-'
  const subtotalAmount = parseFloat(amount) || 0
  const parsedSstAmount = parseFloat(sst_amount) || 0
  const parsedGrandTotal = parseFloat(grand_total) || 0
  const rawSstRate = raw.sst_rate ?? raw.sst_percent
  const derivedSstRate = subtotalAmount > 0 ? (parsedSstAmount / subtotalAmount) * 100 : 0
  const sstRateValue = Number.isFinite(parseFloat(rawSstRate))
    ? parseFloat(rawSstRate)
    : derivedSstRate
  const sstRateLabel = `${sstRateValue.toFixed(2)}% SST (RM)`

  const normalizeText = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
  const normalizeLabel = (value) => {
    const raw = String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!raw) return ''
    const parts = raw.split(' ')
    if (parts[parts.length - 1] === 'rm') {
      parts.pop()
    }
    return parts.join(' ')
  }
  const isExactLabel = (value, labels) => {
    const normalized = normalizeLabel(value)
    if (!normalized) return false
    return labels.some((label) => normalized === normalizeLabel(label))
  }
  const sortedBreakdown = [...breakdown].sort((a, b) => {
    const type = normalizeText(service_type)
    if (type === 'training') {
      const rank = (line) => {
        const desc = line?.item_description
        if (isExactLabel(desc, ['training fee', 'training total'])) return 1
        if (isExactLabel(desc, ['meal total'])) return 2
        if (isExactLabel(desc, ['mobilization charge', 'mobilization cost'])) return 3
        if (isExactLabel(desc, ['discount', 'less'])) return 99
        return 10
      }
      const diff = rank(a) - rank(b)
      if (diff !== 0) return diff
    }

    const aOrder = Number(a?.sort_order)
    const bOrder = Number(b?.sort_order)
    const aHasOrder = Number.isFinite(aOrder)
    const bHasOrder = Number.isFinite(bOrder)
    if (aHasOrder && bHasOrder) return aOrder - bOrder
    if (aHasOrder) return -1
    if (bHasOrder) return 1

    const aId = Number(a?.id)
    const bId = Number(b?.id)
    if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId
    if (Number.isFinite(aId)) return -1
    if (Number.isFinite(bId)) return 1
    return 0
  })

  return (
    <CModal
      size="lg"
      visible={visible}
      onClose={onClose}
      backdrop="static"
      alignment="center"
      scrollable
    >
      <CModalHeader onClose={onClose}>
        <CModalTitle>Invoice Preview</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard className="mb-4">
          {/* Client Details */}
          <CCardHeader>
            <strong>Client Details</strong>
          </CCardHeader>
          <CCardBody>
            {/* Person In Charge */}
            <CRow className="mt-3">
              <CCol>
                <CFormLabel>
                  <em>
                    <strong>Person in Charge</strong>
                  </em>
                </CFormLabel>
              </CCol>
            </CRow>
            {/* Requestor */}
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Client Name</CFormLabel>
                <div>
                  {client_name}
                  <br />
                  SSM: {client_ssm || '-'}
                  <br />
                  TIN: {client_tin || '-'}
                </div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Address</CFormLabel>
                <div>
                  {client_address}, {client_city}, {client_state} {client_zip}
                </div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>PIC Name</CFormLabel>
                <div>{pic_name}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>PIC Contacts</CFormLabel>
                <div>
                  {pic_email} | {pic_phone}
                </div>
              </CCol>
            </CRow>

            {/* Billed-To */}
            <CRow className="mt-3">
              <CCol>
                <CFormLabel>
                  <em>
                    <strong>Invoiced To</strong>
                  </em>
                </CFormLabel>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <CFormLabel>Company Name</CFormLabel>
                <div>
                  {invoice_client_name}
                  <br />
                  SSM: {invoice_client_ssm || '-'}
                  <br />
                  TIN: {invoice_client_tin || '-'}
                </div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Address</CFormLabel>
                <div>
                  {invoice_client_address}, {invoice_client_city}, {invoice_client_state}{' '}
                  {invoice_client_zip}
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <CFormLabel>PIC Name</CFormLabel>
                <div>{invoice_pic_name}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>PIC Contacts</CFormLabel>
                <div>
                  {invoice_pic_email || invoice_pic_phone ? (
                    <>
                      {invoice_pic_email}
                      {invoice_pic_email && invoice_pic_phone && ' | '}
                      {invoice_pic_phone}
                    </>
                  ) : (
                    '-'
                  )}
                </div>
              </CCol>
            </CRow>
          </CCardBody>

          {/* Invoice Header */}
          <CCardHeader>
            <strong>Invoice Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Invoice No.</CFormLabel>
                <div>{invoice_ref_no}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Purpose</CFormLabel>
                <div>{invoice_purpose}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Date Issued</CFormLabel>
                <div>{dateIssued}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Age</CFormLabel>
                <div>{dueInDays}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Payment Terms</CFormLabel>
                <div>
                  {getInvoicePaymentTermsSourceLabel(
                    invoice.paymentTermsSource || raw.payment_terms_source,
                    paymentTermsDays ?? raw.payment_terms_days,
                  )}
                </div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Due Date</CFormLabel>
                <div>{dueDate || raw.due_date || '-'}</div>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol md={6}>
                <CFormLabel>Status</CFormLabel>
                <div>{status}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Service Period</CFormLabel>
                <div>{servicePeriod}</div>
              </CCol>
            </CRow>

            {service_type === 'Training' && (
              <CRow className="mb-2">
                <CCol md={6}>
                  <CFormLabel>Payment Method</CFormLabel>
                  <div>{payment_method}</div>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>HRD Grant No.</CFormLabel>
                  <div>{grant_approval_no || '-'}</div>
                </CCol>
              </CRow>
            )}

            {remarks && (
              <CRow className="mb-2">
                <CCol>
                  <CFormLabel>Remarks</CFormLabel>
                  <div>{remarks}</div>
                </CCol>
              </CRow>
            )}

            {status === 'Paid' && (
              <>
                <CRow className="mb-2">
                  <CCol md={6}>
                    <CFormLabel>Paid Date</CFormLabel>
                    <div>{paid_date || '-'}</div>
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Paid Amount</CFormLabel>
                    <div>
                      {paid_amount != null ? `RM ${parseFloat(paid_amount).toFixed(2)}` : '-'}
                    </div>
                  </CCol>
                </CRow>
                <CRow className="mb-2">
                  <CCol>
                    <CFormLabel>Payment Remarks</CFormLabel>
                    <div>{paid_remarks || '-'}</div>
                  </CCol>
                </CRow>
              </>
            )}
          </CCardBody>

          {/* Service Breakdown */}
          <CCardHeader>
            <strong>Service Breakdown</strong>
          </CCardHeader>
          <CCardBody>
            {/* datatable-exempt: existing embedded/layout table */}
            <CTable hover responsive className="mb-3 data-table-compact embedded-data-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Unit</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Unit Price (RM)</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Subtotal (RM)</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {sortedBreakdown.map((line, idx) => (
                  <CTableRow key={line.id || `${idx}-${line.item_description || 'line'}`}>
                    {(() => {
                      const qty = parseFloat(line.quantity) || 0
                      const unitPrice = parseFloat(line.unit_price) || 0
                      const rawSubtotal = parseFloat(line.subtotal)
                      const lineSubtotal = Number.isFinite(rawSubtotal)
                        ? rawSubtotal
                        : qty * unitPrice
                      return (
                        <>
                          <CTableDataCell className="text-center">{idx + 1}</CTableDataCell>
                          <CTableDataCell>
                            <div>{line.item_description}</div>
                            {line.description ? (
                              <div className="text-muted small">{line.description}</div>
                            ) : null}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">{line.quantity}</CTableDataCell>
                          <CTableDataCell className="text-center">{line.unit}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            RM {Number.isFinite(unitPrice) ? unitPrice.toFixed(2) : '0.00'}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            RM {Number.isFinite(lineSubtotal) ? lineSubtotal.toFixed(2) : '0.00'}
                          </CTableDataCell>
                        </>
                      )
                    })()}
                  </CTableRow>
                ))}
                <CTableRow>
                  <CTableDataCell colSpan={5} className="text-end">
                    Subtotal (Before SST) (RM)
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    RM {subtotalAmount.toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
                {parsedSstAmount > 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-end">
                      {sstRateLabel}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      RM {parsedSstAmount.toFixed(2)}
                    </CTableDataCell>
                  </CTableRow>
                ) : null}
                <CTableRow>
                  <CTableDataCell colSpan={5} className="text-end">
                    <strong>Grand Total (RM)</strong>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <strong>RM {parsedGrandTotal.toFixed(2)}</strong>
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ViewInvoiceModal
