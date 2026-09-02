import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CCol } from '@coreui/react'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import { DetailField, DetailSection, ItemsTable } from '../shared/CommercialDetailFields'
import { getCommercialReturnContext } from '../shared/commercialReturnNavigation'
import MarkSupplierPaid from './SupplierModal/MarkSupplierPaid '
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import { findRecordByPagedEndpoint, sameId } from '../../../utils/detailPages'
import { downloadCommercialWord } from '../shared/commercialWordDownload'
import { formatMoney } from '../../../utils/formatters/numberFormatters'
import SupplierPoEditModal from './SupplierPoEditModal'

const money = (value) => formatMoney(Number.parseFloat(value) || 0)

const SupplierPoDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnContext = getCommercialReturnContext(location, '/commercial/supplier-po')
  const [record, setRecord] = useState(location.state?.record || null)
  const recordRef = useRef(record)
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [markPaidVisible, setMarkPaidVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(Boolean(location.state?.edit))
  const [savingEdit, setSavingEdit] = useState(false)

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

  const handleGenerateWord = () =>
    downloadCommercialWord(
      `${import.meta.env.VITE_API_BASE}catalog/purchase-orders/${record.po_id}/word`,
      `supplier-po-${record.po_ref_no || record.po_id}.docx`,
    )

  const handleDelete = async () => {
    const confirmed = await dialog.confirm(
      `Are you sure you want to delete PO ${record.po_ref_no}?`,
      {
        confirmText: 'Delete',
        confirmColor: 'danger',
      },
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
        showToast('Supplier PO deleted.')
        navigate(returnContext.backPath)
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
          showToast('Supplier PO marked as paid.')
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

  const handleSaveEdit = async (payload) => {
    setSavingEdit(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}catalog/purchase-orders/${record.po_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      const result = await response.json()
      if (!response.ok || result.status !== 'success') {
        dialog.alert(result.message || 'Failed to update Supplier PO.')
        return
      }
      showToast('Supplier PO updated.')
      setEditVisible(false)
      await fetchRecords()
    } catch (error) {
      console.error('Supplier PO update error:', error)
      dialog.alert('Network or server error while updating Supplier PO.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <>
      <DataTableDetailShell
        title="Supplier PO Details"
        backLabel={returnContext.backLabel}
        onBack={() => navigate(returnContext.backPath)}
        loading={loading}
        error={error}
        record={record}
        actions={[
          returnContext.isProjectOrigin
            ? {
                key: 'view-list',
                label: 'View Supplier PO List',
                buttonColor: 'secondary',
                onClick: () => navigate(returnContext.listPath),
              }
            : null,
          String(record?.status || '').toLowerCase() !== 'paid'
            ? { key: 'edit', label: 'Edit', onClick: () => setEditVisible(true) }
            : null,
          { key: 'pdf', label: 'Export PDF', onClick: handleGeneratePdf },
          { key: 'word', label: 'Export Word', onClick: handleGenerateWord },
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
          <DetailField label="Reference Number" value={record?.po_ref_no} />
          <DetailField
            label="Service Category"
            value={record?.service_category || record?.project_type}
          />
          <DetailField label="Issued" value={record?.created_at} />
          <DetailField
            label="Status"
            value={<DataTableStatusBadge>{record?.status || '-'}</DataTableStatusBadge>}
          />
          <DetailField label="Remarks" value={record?.status_remarks} />
          <DetailField label="Quotation Remarks" value={record?.quotation_remarks} />
          <DetailField label="Grand Total" value={money(record?.grand_total)} />
        </DetailSection>

        <DetailSection title="Items">
          <CCol xs={12}>
            <ItemsTable
              items={record?.items || []}
              columns={[
                { key: 'item_name', label: 'Item' },
                { key: 'description', label: 'Description' },
                { key: 'item_remarks', label: 'Specifications / Remarks' },
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
      <SupplierPoEditModal
        visible={editVisible}
        record={record}
        submitting={savingEdit}
        onClose={() => setEditVisible(false)}
        onSave={handleSaveEdit}
      />
    </>
  )
}

export default SupplierPoDetailPage
