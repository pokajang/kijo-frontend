import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import { DetailField, DetailSection } from '../shared/CommercialDetailFields'
import { getCommercialReturnContext } from '../shared/commercialReturnNavigation'
import MarkPaidModal from './MarkPaidModal'
import VendorLoaEditModal from './VendorLoaEditModal'
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import { findRecordByPagedEndpoint, sameId } from '../../../utils/detailPages'

const canManagePaidStatus = (roles = []) => {
  const safeRoles = Array.isArray(roles) ? roles : []
  return safeRoles.some((role) => {
    const text = String(role || '').toLowerCase()
    return (
      text.includes('manager') ||
      text.includes('admin') ||
      text.includes('finance') ||
      text.includes('account') ||
      text.includes('bank')
    )
  })
}

const VendorLoaDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnContext = getCommercialReturnContext(location, '/commercial/vendor-loa')
  const [record, setRecord] = useState(location.state?.record || null)
  const recordRef = useRef(record)
  const [staffRoles, setStaffRoles] = useState([])
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [markPaidVisible, setMarkPaidVisible] = useState(false)
  const [submittingPaid, setSubmittingPaid] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  useEffect(() => {
    recordRef.current = record
  }, [record])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const found = await findRecordByPagedEndpoint({
        url: `${import.meta.env.VITE_API_BASE}vendor-loas`,
        id,
        keys: ['id', 'payment_id', 'loa_ref_no'],
        dataKeys: ['data', 'records'],
        onPage: (result) => {
          const roles = Array.isArray(result?.staff?.roles)
            ? result.staff.roles
            : Array.isArray(result?.roles)
              ? result.roles
              : []
          if (roles.length) setStaffRoles(roles)
        },
        normalizeRecords: (rows) =>
          rows.map((item) => {
            let statusText = 'No Request'
            if (item.payment_requested_on) {
              if (item.status === 'Pending') {
                statusText = 'Payment Requested'
              } else if (item.status === 'Approved') {
                statusText = 'System Level Approved, Pending Bank Transfer'
              } else {
                statusText = item.status || 'Unknown'
              }
            }
            return {
              ...item,
              status: statusText,
              payment_status_raw: item.status || null,
            }
          }),
      })

      if (found) {
        setRecord(found)
      } else {
        const current = recordRef.current
        if (
          current &&
          (sameId(current.id, id) ||
            sameId(current.payment_id, id) ||
            sameId(current.loa_ref_no, id))
        ) {
          return
        }
        setRecord(null)
        setError('Unable to load Vendor LOA.')
      }
    } catch (err) {
      console.error('Error fetching Vendor LOA data:', err)
      setError('Unable to load Vendor LOA.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const canMarkPaid =
    canManagePaidStatus(staffRoles) &&
    !!record?.payment_id &&
    String(record?.payment_status_raw || '').toLowerCase() === 'approved' &&
    !!record?.payment_approved_on

  const getMarkPaidDisabledReason = () => {
    if (canMarkPaid) return ''
    if (!canManagePaidStatus(staffRoles)) {
      return 'Only manager, admin, finance, account, or bank roles can mark paid'
    }
    if (!record?.payment_id) return 'No payment request exists for this LOA'
    if (String(record?.payment_status_raw || '').toLowerCase() !== 'approved') {
      return 'Payment must be approved before marking paid'
    }
    if (!record?.payment_approved_on) return 'Payment approval date is missing'
    return 'This LOA is not eligible to be marked paid'
  }

  const handleGenerateLoa = () => {
    if (!record?.project_id || !record?.vendor_id) return

    const params = new URLSearchParams({
      project_id: String(record.project_id),
      vendor_id: String(record.vendor_id),
    })

    if (record.id) {
      params.set('assignment_id', String(record.id))
    }

    window.open(
      `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(record.project_id)}/loa?${params.toString()}`,
      '_blank',
    )
  }

  const handleSaveEdit = async (updatedRecord) => {
    if (!updatedRecord?.id || !updatedRecord?.project_id || !updatedRecord?.vendor_id) {
      dialog.alert('Missing Vendor LOA details. Please refresh and try again.')
      return false
    }

    setSubmittingEdit(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(updatedRecord.project_id)}/vendors/${encodeURIComponent(updatedRecord.id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            assignment_id: updatedRecord.id,
            project_id: updatedRecord.project_id,
            vendor_id: updatedRecord.vendor_id,
            award_value: updatedRecord.award_value,
            position: updatedRecord.position || '',
            remarks: updatedRecord.remarks || '',
            services_description: updatedRecord.services_description || '',
            venue_details: updatedRecord.venue_details || '',
            fee_breakdown: updatedRecord.fee_breakdown || '',
            payment_terms: updatedRecord.payment_terms || '',
          }),
        },
      )
      const result = await res.json()
      if (res.ok && result.status === 'success') {
        showToast('Vendor LOA updated.')
        setEditVisible(false)
        await fetchRecords()
        return true
      }

      dialog.alert(result.message || 'Failed to update Vendor LOA.')
      return false
    } catch (err) {
      console.error('Update Vendor LOA error:', err)
      dialog.alert('Server error while updating Vendor LOA.')
      return false
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!record?.id || !record?.project_id || !record?.vendor_id) {
      dialog.alert('Missing Vendor LOA details. Please refresh and try again.')
      return
    }

    const confirmed = await dialog.confirm(
      `Are you sure you want to delete LOA ${record.loa_ref_no || ''}?`,
      {
        confirmText: 'Delete',
        confirmColor: 'danger',
      },
    )
    if (!confirmed) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}projects/${encodeURIComponent(record.project_id)}/vendors/${encodeURIComponent(record.id)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            project_id: record.project_id,
            vendor_id: record.vendor_id,
            assignment_id: record.id,
          }),
        },
      )
      const result = await res.json()
      if (res.ok && result.status === 'success') {
        showToast('Vendor LOA deleted.')
        navigate(returnContext.backPath)
        return
      }

      dialog.alert(result.message || 'Failed to delete Vendor LOA.')
    } catch (err) {
      console.error('Delete Vendor LOA error:', err)
      dialog.alert('Server error while deleting Vendor LOA.')
    }
  }

  const handleConfirmPaid = async ({ transactionDate, vendor_id, project_id, payment_id }) => {
    if (!payment_id || !vendor_id || !project_id || !transactionDate) {
      dialog.alert('Missing payment details. Please refresh and try again.')
      return false
    }

    setSubmittingPaid(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}vendor-loas/payment-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payment_id,
          payment_id,
          vendor_id,
          project_id,
          transaction_date: transactionDate,
        }),
        credentials: 'include',
      })

      const result = await res.json()
      if (res.ok && (result?.status === 'success' || result?.success === true)) {
        showToast('Payment marked as paid.')
        setMarkPaidVisible(false)
        await fetchRecords()
        return true
      }

      dialog.alert('Failed: ' + result.message)
      return false
    } catch (err) {
      console.error('Error:', err)
      dialog.alert('Unexpected error occurred.')
      return false
    } finally {
      setSubmittingPaid(false)
    }
  }

  return (
    <>
      <DataTableDetailShell
        title="Vendor LOA Details"
        backLabel={returnContext.backLabel}
        onBack={() => navigate(returnContext.backPath)}
        loading={loading}
        error={error}
        record={record}
        actions={[
          returnContext.isProjectOrigin
            ? {
                key: 'view-list',
                label: 'View Vendor LOA List',
                buttonColor: 'secondary',
                onClick: () => navigate(returnContext.listPath),
              }
            : null,
          { key: 'edit', label: 'Edit', onClick: () => setEditVisible(true) },
          { key: 'generate-loa', label: 'Generate LOA', onClick: handleGenerateLoa },
          {
            key: 'mark-paid',
            label: 'Mark Paid',
            disabled: !canMarkPaid,
            tooltip: getMarkPaidDisabledReason(),
            onClick: () => setMarkPaidVisible(true),
          },
          { key: 'delete', label: 'Delete', danger: true, onClick: handleDelete },
        ]}
      >
        <DetailSection title="Details">
          <DetailField label="Reference Number" value={record?.loa_ref_no} />
          <DetailField label="Vendor" value={record?.vendor_name} />
          <DetailField label="Project" value={record?.project_name} />
          <DetailField label="Service" value={record?.services_description} />
          <DetailField label="Position" value={record?.position} />
          <DetailField label="Payment Terms" value={record?.payment_terms} />
          <DetailField label="Value" value={Number(record?.award_value || 0).toFixed(2)} />
          <DetailField label="Award Date" value={record?.award_date} />
          <DetailField label="Award By" value={record?.award_by} />
          <DetailField label="Requested" value={record?.payment_requested_on} />
          <DetailField label="Approved" value={record?.payment_approved_on} />
          <DetailField
            label="Status"
            value={<DataTableStatusBadge>{record?.status || '-'}</DataTableStatusBadge>}
          />
          <DetailField label="Venue" value={record?.venue_details} />
          <DetailField label="Fee Breakdown" value={record?.fee_breakdown} />
          <DetailField label="Remarks" value={record?.remarks} />
        </DetailSection>
      </DataTableDetailShell>

      <MarkPaidModal
        visible={markPaidVisible}
        onClose={() => setMarkPaidVisible(false)}
        onConfirm={handleConfirmPaid}
        record={record}
        submitting={submittingPaid}
      />
      <VendorLoaEditModal
        visible={editVisible}
        record={record}
        submitting={submittingEdit}
        onClose={() => setEditVisible(false)}
        onSave={handleSaveEdit}
      />
    </>
  )
}

export default VendorLoaDetailPage
