import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import { DetailField, DetailSection } from '../shared/CommercialDetailFields'
import ViewInvoiceModal from './InvoiceModal/ViewInvoiceModal'
import EditInvoiceModal from './InvoiceModal/edit/EditInvoiceModal'
import MarkPaidModal from './InvoiceModal/MarkPaidModal'
import UpdateHrdClaimRefModal from './InvoiceModal/UpdateHrdClaimRefModal'
import {
  fetchAllInvoices,
  handleAction,
  handleDelete,
  handleMarkPaidConfirmed,
  handleMarkUnpaidConfirmed,
  handleUpdateHrdClaimRefConfirmed,
} from './actionHandlers'

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') return 'success'
  if (normalized === 'unpaid' || normalized === 'pending') return 'warning'
  if (normalized === 'overdue') return 'danger'
  if (normalized.includes('cancel') || normalized.includes('void')) return 'danger'
  return 'warning'
}

const InvoiceDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [hrdClaimInvoice, setHrdClaimInvoice] = useState(null)
  const [showHrdClaimRefModal, setShowHrdClaimRefModal] = useState(false)

  const refresh = () => fetchAllInvoices(setInvoices, setLoading)

  useEffect(() => {
    refresh()
  }, [])

  const invoice = useMemo(
    () => invoices.find((item) => String(item.rawId || item.id) === String(id)) || null,
    [id, invoices],
  )

  const runAction = (action, target = invoice) => {
    if (!target) return
    if (action === 'markunpaid') {
      handleMarkUnpaidConfirmed(target, refresh)
      return
    }
    handleAction(
      action,
      target,
      setCurrentInvoice,
      setSelectedInvoice,
      setShowMarkPaid,
      setViewModalVisible,
      setEditModalVisible,
      setHrdClaimInvoice,
      setShowHrdClaimRefModal,
    )
  }

  const actions = invoice
    ? [
        {
          key: 'edit',
          label: 'Edit',
          onClick: () => runAction('edit'),
          hidden: invoice.status === 'Paid',
        },
        invoice.status === 'Paid'
          ? {
              key: 'edit-disabled',
              label: 'Edit',
              disabled: true,
              tooltip: 'Mark as Pending to edit',
            }
          : null,
        invoice.isHrdTraining
          ? {
              key: 'updatehrdclaim',
              label: 'HRD Claim Ref',
              onClick: () => runAction('updatehrdclaim'),
            }
          : null,
        { key: 'generate', label: 'PDF Invoice', onClick: () => runAction('generate') },
        invoice.status === 'Paid'
          ? { key: 'receipt', label: 'PDF Receipt', onClick: () => runAction('receipt') }
          : null,
        invoice.status === 'Paid'
          ? { key: 'markunpaid', label: 'Mark as Pending', onClick: () => runAction('markunpaid') }
          : { key: 'markpaid', label: 'Mark as Paid', onClick: () => runAction('markpaid') },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          onClick: () =>
            handleDelete(invoice, async () => {
              await refresh()
              navigate('/commercial/invoice')
            }),
        },
      ].filter(Boolean)
    : []

  return (
    <>
      <DataTableDetailShell
        title="Invoice Details"
        backLabel="Back"
        onBack={() => navigate('/commercial/invoice')}
        loading={loading}
        record={invoice}
        actions={actions}
        emptyMessage="Invoice not found."
      >
        <DetailSection title="Details">
          <DetailField label="Invoice" value={invoice?.id} />
          <DetailField
            label="Status"
            value={
              <DataTableStatusBadge tone={getStatusTone(invoice?.status)}>
                {invoice?.status || '-'}
              </DataTableStatusBadge>
            }
          />
          <DetailField label="Client" value={invoice?.requestor?.company?.name} />
          <DetailField label="PIC" value={invoice?.requestor?.pic?.name} />
          <DetailField label="Service" value={invoice?.serviceType} />
          <DetailField label="Service Period" value={invoice?.servicePeriod} />
          <DetailField label="Purpose" value={invoice?.purpose} />
          <DetailField label="Issued" value={invoice?.dateIssued} />
          <DetailField label="Age" value={invoice?.dueInDays} />
          <DetailField label="Grand Total" value={invoice?.grandTotal} />
          <DetailField label="Payment Method" value={invoice?.paymentMethod} />
          <DetailField label="HRD Claim Ref" value={invoice?.hrdClaimRef} />
          <DetailField label="Remarks" value={invoice?.remarks} />
        </DetailSection>
      </DataTableDetailShell>

      <ViewInvoiceModal
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        invoice={selectedInvoice}
      />
      <EditInvoiceModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        invoice={selectedInvoice}
        onSaved={refresh}
      />
      <MarkPaidModal
        visible={showMarkPaid}
        invoice={currentInvoice}
        onClose={() => setShowMarkPaid(false)}
        onConfirmed={(invoiceData, paidData) =>
          handleMarkPaidConfirmed(invoiceData, paidData, refresh, setShowMarkPaid)
        }
      />
      <UpdateHrdClaimRefModal
        visible={showHrdClaimRefModal}
        invoice={hrdClaimInvoice}
        onClose={() => setShowHrdClaimRefModal(false)}
        onConfirmed={(invoiceData, hrdClaimRef) =>
          handleUpdateHrdClaimRefConfirmed(
            invoiceData,
            hrdClaimRef,
            refresh,
            setShowHrdClaimRefModal,
          )
        }
      />
    </>
  )
}

export default InvoiceDetailPage
