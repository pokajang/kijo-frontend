import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import {
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../../../components/datatable'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import { formatMoney } from '../../../utils/stats/formatStats'

const API_BASE = import.meta.env.VITE_API_BASE

const columns = [
  {
    key: 'paid_date',
    label: 'Paid Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
  },
  {
    key: 'project_name',
    label: 'Project / Context',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
  },
  {
    key: 'payment_type',
    label: 'Payment Type',
    width: '140px',
    sortable: true,
    sortType: 'string',
  },
  { key: 'method', label: 'Method', width: '130px', sortable: true, sortType: 'string' },
  {
    key: 'paid_amount_display',
    label: 'Paid Amount',
    width: '140px',
    sortable: true,
    sortType: 'number',
    align: 'center',
  },
  {
    key: 'status',
    label: 'Status',
    width: '110px',
    sortable: true,
    sortType: 'string',
    align: 'center',
  },
]

const PaidVendorDetailPage = () => {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const records = await fetchAllPagedRecords({
        url: `${API_BASE}vendor-payments/paid-by-vendor/${encodeURIComponent(vendorId)}`,
        dataKeys: ['data'],
        perPage: 100,
      })
      setRows(records)
    } catch (err) {
      console.error('Failed to load paid payments for vendor', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => {
        const paidAmount = Number(row.paid_amount || row.amount || 0)
        return {
          ...row,
          project_name: row.project_name || row.payment_context || '-',
          paid_amount_display: formatMoney(paidAmount),
        }
      }),
    [rows],
  )

  const vendorName =
    location.state?.vendor?.vendor_name || normalizedRows[0]?.vendor_name || `Vendor #${vendorId}`

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
        <strong>Paid Payments: {vendorName}</strong>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate('/vendor/paid')}
        >
          Back
        </button>
      </CCardHeader>
      <CCardBody>
        <DataTableRecordList
          rows={normalizedRows}
          loading={loading}
          loadingMessage="Loading paid payments..."
          dataColumns={columns}
          defaultVisibleColumns={{
            paid_date: true,
            project_name: true,
            payment_type: true,
            method: true,
            paid_amount_display: true,
            status: true,
          }}
          requiredColumns={new Set(['paid_date', 'project_name', 'paid_amount_display'])}
          storageKey="vendor.paid-detail.visible-columns.v1"
          scrollStorageKey="vendor.paid-detail.scroll"
          idPrefix="vendor-paid-detail"
          emptyMessage="No paid payments found for this vendor."
          exportFilename={`vendor-${vendorId}-paid-payments-${new Date().toISOString().slice(0, 10)}.csv`}
          getRowKey={(row, index) => row.id || index}
          renderCell={(row, column) => {
            if (column.key === 'project_name') {
              return (
                <DataTableTextCell
                  value={row.project_name}
                  maxWidth="220px"
                  title="Project / Context"
                  mode="expandable"
                />
              )
            }
            if (column.key === 'status') {
              return (
                <DataTableStatusBadge tone="success">{row.status || 'Paid'}</DataTableStatusBadge>
              )
            }
            return row[column.key] || '-'
          }}
          onRowOpen={(row) =>
            navigate(`/vendor/payment-records/${row.id}`, {
              state: { record: row, returnTo: `/vendor/paid/${vendorId}` },
            })
          }
          getMobileTitle={(row) => row.project_name}
          getMobileSubtitle={(row) => row.paid_date || '-'}
          getMobileMeta={(row) => row.paid_amount_display}
          initialSortField="paid_date"
          initialSortDir="desc"
          resetDeps={[]}
        />
      </CCardBody>
    </CCard>
  )
}

export default PaidVendorDetailPage
