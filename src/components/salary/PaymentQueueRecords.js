import React, { useCallback, useEffect, useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilReload, cilSearch } from '@coreui/icons'
import {
  CAlert,
  CButton,
  CFormInput,
  CFormLabel,
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
import { DataTableLoadingState, DataTableStatusBadge, EmptyTableState } from '../datatable'
import { formatMoney } from './salaryCalculations'
import {
  fetchPaymentQueue,
  fetchPaymentQueueDetail,
  markPaymentQueuePaid,
} from './paymentQueueStorage'

const todayValue = () => new Date().toLocaleDateString('en-CA')

const formatQueueMoney = (value, restricted) => {
  if (restricted || value === null || value === undefined) return 'Restricted'
  return formatMoney(value)
}

const PaymentQueueRecords = ({ onScopeLabelChange }) => {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: todayValue(),
    paymentReference: '',
    paymentMethod: '',
    remarks: '',
  })

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const rows = await fetchPaymentQueue()
      setRecords(rows)
      onScopeLabelChange?.(`${rows.length} due`)
    } catch (err) {
      setError(err?.message || 'Could not load payment queue.')
    } finally {
      setIsLoading(false)
    }
  }, [onScopeLabelChange])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const totalVisibleDue = useMemo(
    () =>
      records.reduce(
        (total, record) => total + (record.restricted ? 0 : Number(record.totalDue || 0)),
        0,
      ),
    [records],
  )

  const openDetail = async (record) => {
    setSelected(record)
    setDetail(null)
    setError('')
    setIsDetailLoading(true)
    try {
      setDetail(await fetchPaymentQueueDetail(record.staffId, record.period))
    } catch (err) {
      setError(err?.message || 'Could not load payment queue detail.')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const closeDetail = () => {
    if (isMarkingPaid) return
    setSelected(null)
    setDetail(null)
  }

  const handleMarkPaid = async () => {
    if (!selected || isMarkingPaid) return

    setIsMarkingPaid(true)
    setError('')
    try {
      await markPaymentQueuePaid({
        staffId: selected.staffId,
        period: selected.period,
        ...paymentForm,
      })
      closeDetail()
      await loadRecords()
    } catch (err) {
      setError(err?.message || 'Could not mark payment queue row as paid.')
    } finally {
      setIsMarkingPaid(false)
    }
  }

  if (isLoading) {
    return <DataTableLoadingState message="Loading payment queue..." />
  }

  return (
    <div className="salary-payment-queue">
      {error && (
        <CAlert color="danger" className="py-2">
          {error}
        </CAlert>
      )}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          <DataTableStatusBadge tone="info">{records.length} Due</DataTableStatusBadge>
          <DataTableStatusBadge tone="success">
            Visible Total {formatMoney(totalVisibleDue)}
          </DataTableStatusBadge>
        </div>
        <CButton color="secondary" variant="outline" size="sm" type="button" onClick={loadRecords}>
          <CIcon icon={cilReload} size="sm" className="me-1" />
          Refresh
        </CButton>
      </div>

      {records.length === 0 ? (
        <EmptyTableState message="No payment due. Approved unpaid records will appear here." />
      ) : (
        <CTable hover responsive align="middle" className="mb-0">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell scope="col">Employee</CTableHeaderCell>
              <CTableHeaderCell scope="col">Period</CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-end">
                Salary Due
              </CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-end">
                Other Claims
              </CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-end">
                Total Due
              </CTableHeaderCell>
              <CTableHeaderCell scope="col">Items</CTableHeaderCell>
              <CTableHeaderCell scope="col">Status</CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-end">
                Action
              </CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {records.map((record) => (
              <CTableRow key={record.id || `${record.staffId}-${record.period}`}>
                <CTableDataCell>
                  <strong>{record.staffName || 'Restricted'}</strong>
                  {record.staffCode && (
                    <div className="text-body-secondary">{record.staffCode}</div>
                  )}
                </CTableDataCell>
                <CTableDataCell>{record.periodLabel}</CTableDataCell>
                <CTableDataCell className="text-end">
                  {formatQueueMoney(record.salaryDue, record.restricted)}
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  {formatQueueMoney(record.otherClaimDue, record.restricted)}
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  <strong>{formatQueueMoney(record.totalDue, record.restricted)}</strong>
                </CTableDataCell>
                <CTableDataCell>{record.itemCount ?? 'Restricted'}</CTableDataCell>
                <CTableDataCell>
                  <DataTableStatusBadge tone={record.status === 'Blocked' ? 'warning' : 'info'}>
                    {record.status || 'Pending Payment'}
                  </DataTableStatusBadge>
                  {record.blockReason && (
                    <div className="small text-body-secondary mt-1">{record.blockReason}</div>
                  )}
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    disabled={record.restricted || !record.staffId}
                    title={
                      record.restricted ? 'Payment values are restricted.' : 'View payment detail'
                    }
                    onClick={() => openDetail(record)}
                  >
                    <CIcon icon={cilSearch} size="sm" className="me-1" />
                    View
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      )}

      <CModal visible={Boolean(selected)} onClose={closeDetail} size="lg" scrollable>
        <CModalHeader closeButton={!isMarkingPaid}>
          <CModalTitle>Payment Queue Detail</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isDetailLoading ? (
            <div className="d-flex align-items-center">
              <CSpinner size="sm" className="me-2" />
              Loading payment details...
            </div>
          ) : selected ? (
            <>
              <div className="mb-3">
                <strong>{selected.staffName || 'Restricted'}</strong>
                <div className="text-body-secondary">{selected.periodLabel}</div>
              </div>
              {selected.blockReason && (
                <CAlert color="warning" className="py-2">
                  {selected.blockReason}
                </CAlert>
              )}
              {selected.restricted ? (
                <CAlert color="warning" className="py-2">
                  Payment values are restricted to workflow and payment actors.
                </CAlert>
              ) : (
                <CTable small responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">Record</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Amount
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {(detail?.items || []).map((item) => (
                      <CTableRow key={`${item.subjectType}-${item.subjectId}`}>
                        <CTableDataCell>{item.label}</CTableDataCell>
                        <CTableDataCell>{item.status}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {formatMoney(item.amount)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
              {selected.canMarkPaid && !selected.restricted && (
                <div className="row g-3 mt-2">
                  <div className="col-12 col-md-4">
                    <CFormLabel htmlFor="paymentQueueDate">Payment Date</CFormLabel>
                    <CFormInput
                      id="paymentQueueDate"
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <CFormLabel htmlFor="paymentQueueReference">Reference</CFormLabel>
                    <CFormInput
                      id="paymentQueueReference"
                      value={paymentForm.paymentReference}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          paymentReference: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <CFormLabel htmlFor="paymentQueueMethod">Method</CFormLabel>
                    <CFormInput
                      id="paymentQueueMethod"
                      value={paymentForm.paymentMethod}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, paymentMethod: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <CFormLabel htmlFor="paymentQueueRemarks">Remarks</CFormLabel>
                    <CFormInput
                      id="paymentQueueRemarks"
                      value={paymentForm.remarks}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, remarks: event.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={closeDetail}
            disabled={isMarkingPaid}
          >
            Close
          </CButton>
          {selected?.canMarkPaid && !selected?.restricted && (
            <CButton color="success" onClick={handleMarkPaid} disabled={isMarkingPaid}>
              <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
              {isMarkingPaid ? 'Marking Paid...' : 'Mark Paid'}
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default PaymentQueueRecords
