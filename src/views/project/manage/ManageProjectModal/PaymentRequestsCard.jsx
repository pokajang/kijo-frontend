// src/views/project/ManageProjectModal/PaymentRequestsCard.jsx
import React from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import {
  CCardHeader,
  CCardBody,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import { DataTableLoadingState, DataTableStatusBadge } from '../../../../components/datatable'
import { toFiniteNumber } from '../projectApi'

const PaymentRequestsCard = ({ payments = [], loading = false }) => {
  const navigate = useNavigate()
  const getStatusTone = (status) => {
    switch (status) {
      case 'Pending':
        return 'warning'
      case 'Paid':
        return 'success'
      case 'Approved':
        return 'success'
      case 'Rejected':
        return 'danger'
      default:
        return 'info'
    }
  }

  const grandTotal = (list) => list.reduce((sum, item) => sum + toFiniteNumber(item.amount), 0)

  return (
    <>
      <CCardHeader className="rounded-0 d-flex align-items-center justify-content-between">
        <strong>Vendor Payments</strong>
        <CButton
          color="primary"
          size="sm"
          variant="outline"
          onClick={() => navigate('/vendor/pay')}
        >
          Pay Vendor
        </CButton>
      </CCardHeader>

      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading payment records..." />
        ) : (
          <div className="data-table-embedded-shell">
            {/* datatable-exempt: existing embedded/layout table */}
            <CTable hover className="data-table-compact embedded-data-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                  <CTableHeaderCell>Vendor</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Date Requested</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Date Approved</CTableHeaderCell>
                  <CTableHeaderCell>For</CTableHeaderCell>
                  <CTableHeaderCell>Payment Type</CTableHeaderCell>
                  <CTableHeaderCell>Method</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Amount (RM)</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {payments.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center text-muted">
                      No payment records found.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  <>
                    {payments.map((payment, index) => (
                      <CTableRow key={payment.id || index}>
                        <CTableHeaderCell className="text-center">{index + 1}</CTableHeaderCell>
                        <CTableDataCell>{payment.vendor_name || '-'}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          {payment.created_at?.split(' ')[0] || '-'}
                          <br />
                          <small className="text-muted">By {payment.created_by_name_code}</small>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          {payment.date_approved?.split(' ')[0] || '–'}
                        </CTableDataCell>
                        <CTableDataCell style={{ maxWidth: '25%', whiteSpace: 'normal' }}>
                          {payment.payment_context || '-'}
                          <br />
                          <small className="text-muted">{payment.remarks || 'Not provided'}</small>
                        </CTableDataCell>
                        <CTableDataCell>{payment.payment_type || '-'}</CTableDataCell>
                        <CTableDataCell>{payment.method || '-'}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          <DataTableStatusBadge tone={getStatusTone(payment.status)}>
                            {payment.status || '-'}
                          </DataTableStatusBadge>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          RM {toFiniteNumber(payment.amount).toFixed(2)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    <CTableRow className="fw-bold table-light">
                      <CTableDataCell colSpan={8} className="text-end">
                        Grand Total
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        RM {grandTotal(payments).toFixed(2)}
                      </CTableDataCell>
                    </CTableRow>
                  </>
                )}
              </CTableBody>
            </CTable>
          </div>
        )}
      </CCardBody>
    </>
  )
}

PaymentRequestsCard.propTypes = {
  payments: PropTypes.array,
  loading: PropTypes.bool,
}

export default PaymentRequestsCard
