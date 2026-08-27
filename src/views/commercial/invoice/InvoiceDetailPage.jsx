import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CCol } from '@coreui/react'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import { DetailField, DetailSection, ItemsTable } from '../shared/CommercialDetailFields'
import { getCommercialReturnContext } from '../shared/commercialReturnNavigation'
import ViewInvoiceModal from './InvoiceModal/ViewInvoiceModal'
import EditInvoiceModal from './InvoiceModal/edit/EditInvoiceModal'
import MarkPaidModal from './InvoiceModal/MarkPaidModal'
import UpdateHrdClaimRefModal from './InvoiceModal/UpdateHrdClaimRefModal'
import { getInvoicePaymentTermsSourceLabel } from '../../../shared/paymentTerms'
import { buildStoredInvoiceSummaryRows } from '../../../shared/invoice/invoiceStoredTotals'
import {
  fetchAllInvoices,
  handleAction,
  handleDelete,
  handleMarkPaidConfirmed,
  handlePaymentReversal,
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

const isCancelledInvoice = (status) =>
  ['cancelled', 'canceled', 'void'].includes(
    String(status || '')
      .trim()
      .toLowerCase(),
  )
const isPaidInvoice = (status) =>
  String(status || '')
    .trim()
    .toLowerCase() === 'paid'

const InvoiceDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const returnContext = getCommercialReturnContext(location, '/commercial/invoice')
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
        returnContext.isProjectOrigin
          ? {
              key: 'view-list',
              label: 'View Invoice List',
              buttonColor: 'secondary',
              onClick: () => navigate(returnContext.listPath),
            }
          : null,
        !returnContext.isProjectOrigin && (invoice.projectId || invoice.raw?.project_id)
          ? {
              key: 'back-project',
              label: 'Back to Project',
              buttonColor: 'secondary',
              onClick: () =>
                navigate(`/project/manage/${invoice.projectId || invoice.raw.project_id}`),
            }
          : null,
        {
          key: 'edit',
          label: 'Edit',
          buttonColor: 'primary',
          onClick: () => runAction('edit'),
        },
        invoice.isHrdTraining
          ? {
              key: 'updatehrdclaim',
              label: 'HRD Claim Ref',
              buttonColor: 'secondary',
              onClick: () => runAction('updatehrdclaim'),
            }
          : null,
        {
          key: 'generate',
          label: 'PDF Invoice',
          buttonColor: 'secondary',
          onClick: () => runAction('generate'),
        },
        invoice.isWordInvoiceSupported
          ? {
              key: 'generate-word',
              label: 'Word Invoice',
              buttonColor: 'secondary',
              onClick: () => runAction('generateWord'),
            }
          : null,
        isPaidInvoice(invoice.status)
          ? {
              key: 'receipt',
              label: 'PDF Receipt',
              buttonColor: 'secondary',
              onClick: () => runAction('receipt'),
            }
          : null,
        invoice.isWordReceiptSupported && isPaidInvoice(invoice.status)
          ? {
              key: 'receipt-word',
              label: 'Word Receipt',
              buttonColor: 'secondary',
              onClick: () => runAction('receiptWord'),
            }
          : null,
        !isCancelledInvoice(invoice.status)
          ? {
              key: 'markpaid',
              label: 'Update Payment',
              buttonColor: 'success',
              onClick: () => runAction('markpaid'),
            }
          : null,
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          onClick: () =>
            handleDelete(invoice, async () => {
              await refresh()
              navigate(returnContext.backPath)
            }),
        },
      ].filter(Boolean)
    : []

  return (
    <>
      <DataTableDetailShell
        title="Invoice Details"
        backLabel={returnContext.backLabel}
        onBack={() => navigate(returnContext.backPath)}
        loading={loading}
        record={invoice}
        actions={actions}
        emptyMessage="Invoice not found."
      >
        <DetailSection title="Details">
          <DetailField label="Reference Number" value={invoice?.id} />
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
          <DetailField
            label="Payment Terms"
            value={getInvoicePaymentTermsSourceLabel(
              invoice?.paymentTermsSource,
              invoice?.paymentTermsDays,
            )}
          />
          <DetailField label="Due Date" value={invoice?.dueDate} />
          <DetailField label="Age" value={invoice?.dueInDays} />
          <DetailField label="Grand Total" value={invoice?.grandTotal} />
          <DetailField label="Payment Method" value={invoice?.paymentMethod} />
          <DetailField label="HRD Claim Ref" value={invoice?.hrdClaimRef} />
          <DetailField label="Remarks" value={invoice?.remarks} />
          <DetailField label="Quotation Remarks" value={invoice?.quotationRemarks} />
        </DetailSection>

        <DetailSection title="Item Breakdown">
          <CCol xs={12}>
            <ItemsTable
              items={invoice?.breakdown || []}
              columns={[
                { key: 'item_description', label: 'Item' },
                { key: 'description', label: 'Description' },
                { key: 'item_remarks', label: 'Specifications / Remarks' },
                { key: 'quantity', label: 'Qty', className: 'text-center' },
                { key: 'unit', label: 'Unit', className: 'text-center' },
                { key: 'unit_price', label: 'Unit Price', className: 'text-end' },
                { key: 'subtotal', label: 'Subtotal', className: 'text-end' },
              ]}
              summaryRows={buildStoredInvoiceSummaryRows(invoice)}
            />
          </CCol>
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
        onReverse={(payment) => handlePaymentReversal(payment, refresh)}
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
