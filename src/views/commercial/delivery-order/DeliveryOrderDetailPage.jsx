import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CCol } from '@coreui/react'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import { DetailField, DetailSection, ItemsTable } from '../shared/CommercialDetailFields'
import DoEditModalMain from './DoModal/DoEditModalMain'
import dialog from '../../../components/dialog/dialogService'
import { findRecordByPagedEndpoint, sameId } from '../../../utils/detailPages'

const normalizeDeliveryOrder = (order = {}) => {
  const normalizedItems = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.breakdown)
      ? order.breakdown
      : []

  return {
    ...order,
    do_id: order?.do_id ?? order?.id ?? null,
    project_id: order?.project_id ?? order?.projectId ?? null,
    breakdown: normalizedItems.map((item) => ({
      item_name: item?.item_name || item?.name || '',
      description: item?.description || '',
      quantity: item?.quantity,
      unit: item?.unit,
    })),
  }
}

const DeliveryOrderDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [record, setRecord] = useState(() =>
    location.state?.record ? normalizeDeliveryOrder(location.state.record) : null,
  )
  const recordRef = useRef(record)
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')
  const [editVisible, setEditVisible] = useState(false)
  const projectId = record?.project_id ?? location.state?.fromProjectId ?? null

  useEffect(() => {
    recordRef.current = record
  }, [record])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const found = await findRecordByPagedEndpoint({
        url: `${import.meta.env.VITE_API_BASE}delivery-orders`,
        id,
        keys: ['do_id', 'id'],
        dataKeys: ['orders', 'data'],
        normalizeRecords: (rows) => rows.map(normalizeDeliveryOrder),
      })
      if (found) {
        setRecord(found)
      } else {
        const current = recordRef.current
        if (current && (sameId(current.do_id, id) || sameId(current.id, id))) return
        setRecord(null)
        setError('Delivery order not found.')
      }
    } catch (err) {
      console.error('Delivery order detail fetch error:', err)
      setError('Unable to load delivery order.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleGeneratePdf = () => {
    if (!record?.do_id) return
    window.open(`${import.meta.env.VITE_API_BASE}delivery-orders/${record.do_id}/pdf`, '_blank')
  }

  const handleDelete = async () => {
    if (!(await dialog.confirm('Are you sure you want to delete this delivery order?'))) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}delivery-orders/${record.do_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await res.json()
      if (result.status === 'success') {
        dialog.alert('Delivery Order deleted successfully.')
        navigate('/commercial/delivery-order')
      } else {
        dialog.alert('Failed to delete delivery order.')
      }
    } catch (err) {
      console.error('Error deleting DO:', err)
      dialog.alert('An error occurred while deleting the delivery order.')
    }
  }

  const handleUpdateDo = async (updatedData) => {
    const doId = updatedData?.do_id ?? updatedData?.id
    if (!doId) {
      dialog.alert('Missing delivery order ID.')
      return
    }

    const itemRows = Array.isArray(updatedData?.breakdown)
      ? updatedData.breakdown
      : Array.isArray(updatedData?.items)
        ? updatedData.items
        : []

    const payload = {
      details: {
        do_number: updatedData.do_number,
        client_name: updatedData.client_name,
        client_address: updatedData.client_address,
        client_contact_name: updatedData.client_contact_name,
        client_contact_position: updatedData.client_contact_position,
        client_contact_email: updatedData.client_contact_email,
        client_contact_phone: updatedData.client_contact_phone,
        company_contact_name: updatedData.company_contact_name,
        company_contact_email: updatedData.company_contact_email,
        company_contact_phone: updatedData.company_contact_phone,
        project_name: updatedData.project_name,
        project_code: updatedData.project_code,
        project_award_date: updatedData.project_award_date,
        project_type: updatedData.project_type,
        project_description: updatedData.project_description,
        project_service_period: updatedData.project_service_period,
      },
      items: itemRows.map(({ item_name, name, description, quantity, unit }) => ({
        item_name: item_name || name || '',
        description,
        quantity,
        unit,
      })),
      breakdown: itemRows.map(({ item_name, name, description, quantity, unit }) => ({
        item_name: item_name || name || '',
        description,
        quantity,
        unit,
      })),
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}delivery-orders/${doId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.status === 'success') {
        dialog.alert('Delivery Order updated successfully.')
        setEditVisible(false)
        fetchRecords()
      } else {
        dialog.alert(`Failed to update: ${result.message}`)
      }
    } catch (err) {
      console.error('Update error:', err)
      dialog.alert('Server error. Please try again.')
    }
  }

  return (
    <>
      <DataTableDetailShell
        title="Delivery Order Details"
        backLabel="Back"
        onBack={() => navigate('/commercial/delivery-order')}
        loading={loading}
        error={error}
        record={record}
        actions={[
          projectId
            ? {
                key: 'back-project',
                label: 'Back to Project',
                buttonColor: 'secondary',
                onClick: () => navigate(`/project/manage/${projectId}`),
              }
            : null,
          { key: 'edit', label: 'Edit', onClick: () => setEditVisible(true) },
          { key: 'pdf', label: 'Generate PDF', onClick: handleGeneratePdf },
          {
            key: 'delete',
            label: 'Delete',
            danger: true,
            dividerBefore: true,
            onClick: handleDelete,
          },
        ]}
      >
        <DetailSection title="Client">
          <DetailField label="Client" value={record?.client_name} />
          <DetailField label="Address" value={record?.client_address} />
          <DetailField label="Contact" value={record?.client_contact_name} />
          <DetailField label="Position" value={record?.client_contact_position} />
          <DetailField label="Phone" value={record?.client_contact_phone} />
          <DetailField label="Email" value={record?.client_contact_email} />
        </DetailSection>

        <DetailSection title="Project">
          <DetailField label="DO Number" value={record?.do_number} />
          <DetailField label="Project" value={record?.project_name} />
          <DetailField label="Project Code" value={record?.project_code} />
          <DetailField label="Type" value={record?.project_type} />
          <DetailField label="Award Date" value={record?.project_award_date} />
          <DetailField label="Service Period" value={record?.project_service_period} />
          <DetailField
            label="Status"
            value={<DataTableStatusBadge>{record?.status || 'Issued'}</DataTableStatusBadge>}
          />
          <DetailField label="Description" value={record?.project_description} />
        </DetailSection>

        <DetailSection title="Issued By">
          <DetailField label="Name" value={record?.company_contact_name} />
          <DetailField label="Email" value={record?.company_contact_email} />
          <DetailField label="Phone" value={record?.company_contact_phone} />
        </DetailSection>

        <DetailSection title="Item Breakdown">
          <CCol xs={12}>
            <ItemsTable
              items={record?.breakdown || []}
              columns={[
                { key: 'item_name', label: 'Item Name' },
                { key: 'description', label: 'Description' },
                {
                  key: 'quantity',
                  label: 'Quantity',
                  className: 'text-center',
                  render: (item) => `${item.quantity || '-'} ${item.unit || 'pcs'}`,
                },
              ]}
            />
          </CCol>
        </DetailSection>
      </DataTableDetailShell>

      <DoEditModalMain
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        data={record}
        onSave={handleUpdateDo}
      />
    </>
  )
}

export default DeliveryOrderDetailPage
