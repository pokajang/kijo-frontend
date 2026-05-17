import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CCol } from '@coreui/react'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import { DetailField, DetailSection, ItemsTable } from '../shared/CommercialDetailFields'
import MarkSupplierPaid from './SupplierModal/MarkSupplierPaid '
import dialog from '../../../components/dialog/dialogService'
import { findRecordByPagedEndpoint, sameId } from '../../../utils/detailPages'

const money = (value) => `RM ${Number.parseFloat(value || 0).toFixed(2)}`

const SupplierPoDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [record, setRecord] = useState(location.state?.record || null)
  const recordRef = useRef(record)
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [markPaidVisible, setMarkPaidVisible] = useState(false)

  useEffect(() => {
    recordRef.current = record
  }, [record])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const found = await findRecordByPagedEndpoint({
        url: `${import.meta.env.VITE_API_BASE}catalog/purchase-orders`,
        id,
        keys: ['po_id', 'id'],
        dataKeys: ['data'],
      })
      if (found) {
        setRecord(found)
      } else {
        const current = recordRef.current
        if (current && (sameId(current.po_id, id) || sameId(current.id, id))) return
        setRecord(null)
        setError('Supplier PO not found.')
      }
    } catch (err) {
      console.error('PO detail fetch error:', err)
      setError('Unable to load supplier PO.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleGeneratePdf = () => {
    window.open(
      `${import.meta.env.VITE_API_BASE}catalog/purchase-orders/${record.po_id}/pdf`,
      '_blank',
    )
  }

  const handleDelete = async () => {
    const confirmed = await dialog.confirm(
      `Are you sure you want to delete PO ${record.po_ref_no}?`,
    )
    if (!confirmed) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}catalog/purchase-orders/${record.po_id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )
      const result = await res.json()
      if (result.status === 'success') {
        dialog.alert('PO deleted successfully.')
        navigate('/commercial/supplier-po')
      } else {
        dialog.alert('Failed to delete PO: ' + (result.message || 'Unknown error.'))
      }
    } catch (err) {
      console.error('Delete PO error:', err)
      dialog.alert('Network or server error while deleting PO.')
    }
  }

  const handleConfirmMarkPaid = (data) => {
    fetch(`${import.meta.env.VITE_API_BASE}catalog/purchase-orders/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        po_id: data.po_id,
        payment_date: data.transactionDate,
        remarks: data.remarks,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success') {
          dialog.alert('PO marked as paid.')
          setMarkPaidVisible(false)
          fetchRecords()
        } else {
          dialog.alert('Failed to mark as paid: ' + (result.message || 'Unknown error.'))
        }
      })
      .catch((err) => {
        console.error('Mark paid error:', err)
        dialog.alert('Network or server error.')
      })
  }

  return (
    <>
      <DataTableDetailShell
        title="Supplier PO Details"
        backLabel="Back"
        onBack={() => navigate('/commercial/supplier-po')}
        loading={loading}
        error={error}
        record={record}
        actions={[
          { key: 'pdf', label: 'Export PDF', onClick: handleGeneratePdf },
          { key: 'mark-paid', label: 'Mark Paid', onClick: () => setMarkPaidVisible(true) },
          {
            key: 'delete',
            label: 'Delete',
            danger: true,
            dividerBefore: true,
            onClick: handleDelete,
          },
        ]}
      >
        <DetailSection title="Supplier">
          <DetailField label="Supplier" value={record?.supplier_name} />
          <DetailField label="Address" value={record?.supplier_address} />
          <DetailField label="Contact" value={record?.supplier_contact_name} />
          <DetailField label="Phone" value={record?.supplier_contact_number} />
        </DetailSection>

        <DetailSection title="PO">
          <DetailField label="PO Number" value={record?.po_ref_no} />
          <DetailField label="Issued" value={record?.created_at} />
          <DetailField
            label="Status"
            value={<DataTableStatusBadge>{record?.status || '-'}</DataTableStatusBadge>}
          />
          <DetailField label="Remarks" value={record?.status_remarks} />
          <DetailField label="Grand Total" value={money(record?.grand_total)} />
        </DetailSection>

        <DetailSection title="Items">
          <CCol xs={12}>
            <ItemsTable
              items={record?.items || []}
              columns={[
                { key: 'item_name', label: 'Item' },
                { key: 'description', label: 'Description' },
                { key: 'quantity', label: 'Qty', className: 'text-center' },
                { key: 'unit', label: 'Unit', className: 'text-center' },
                {
                  key: 'unit_price',
                  label: 'Unit Price',
                  className: 'text-end',
                  render: (item) => money(item.unit_price),
                },
                {
                  key: 'line_total',
                  label: 'Line Total',
                  className: 'text-end',
                  render: (item) => money(item.line_total),
                },
              ]}
            />
          </CCol>
        </DetailSection>
      </DataTableDetailShell>

      <MarkSupplierPaid
        visible={markPaidVisible}
        onClose={() => setMarkPaidVisible(false)}
        onConfirm={handleConfirmMarkPaid}
        record={record}
      />
    </>
  )
}

export default SupplierPoDetailPage
