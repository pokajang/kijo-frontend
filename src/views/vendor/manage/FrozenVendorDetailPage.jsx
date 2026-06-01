import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailFields, DataTableDetailShell } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import { fetchJson, findRecordByPagedEndpoint, sameId } from '../../../utils/detailPages'
import { normalizeVendorRows } from './actionHandlers'

const API_BASE = import.meta.env.VITE_API_BASE

const fmtList = (value) => (Array.isArray(value) && value.length ? value.join(', ') : '-')

const FrozenVendorDetailPage = () => {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/vendor/frozen'
  const [vendor, setVendor] = useState(location.state?.record || null)
  const vendorRef = useRef(vendor)
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')

  useEffect(() => {
    vendorRef.current = vendor
  }, [vendor])

  const loadVendor = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const found = await findRecordByPagedEndpoint({
        url: `${API_BASE}vendors?status=inactive`,
        id: vendorId,
        keys: ['id', 'vendor_id'],
        dataKeys: ['vendors', 'data'],
        normalizeRecords: normalizeVendorRows,
      })
      if (found) {
        setVendor(found)
      } else {
        const current = vendorRef.current
        if (current && sameId(current.id, vendorId)) return
        setVendor(null)
        setError('Frozen vendor not found.')
      }
    } catch (err) {
      setError(err?.message || 'Unable to load frozen vendor details.')
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    loadVendor()
  }, [loadVendor])

  const reactivateVendor = useCallback(async () => {
    if (!(await dialog.confirm(`Reactivate vendor "${vendor?.vendorName}"?`))) return
    try {
      const data = await fetchJson(
        `${API_BASE}vendors/${encodeURIComponent(vendorId)}/reactivate`,
        {
          method: 'PATCH',
        },
      )
      if (data?.status !== 'success' && data?.success !== true) {
        throw new Error(data?.message || 'Failed to reactivate vendor')
      }
      dialog.alert(`Vendor "${vendor?.vendorName}" has been reactivated.`)
      navigate(returnTo)
    } catch (err) {
      dialog.alert(err?.message || 'An error occurred while trying to reactivate the vendor.')
    }
  }, [navigate, returnTo, vendor?.vendorName, vendorId])

  const deleteVendor = useCallback(async () => {
    if (
      !(await dialog.confirm(
        `Are you sure you want to permanently delete "${vendor?.vendorName}"? This action cannot be undone.`,
        {
          confirmText: 'Delete',
          confirmColor: 'danger',
        },
      ))
    ) {
      return
    }
    try {
      const data = await fetchJson(`${API_BASE}vendors/${encodeURIComponent(vendorId)}`, {
        method: 'DELETE',
      })
      if (data?.status !== 'success' && data?.success !== true) {
        throw new Error(data?.message || 'Failed to delete vendor')
      }
      dialog.alert(`Vendor "${vendor?.vendorName}" has been permanently deleted.`)
      navigate(returnTo)
    } catch (err) {
      dialog.alert(err?.message || 'An error occurred while trying to delete the vendor.')
    }
  }, [navigate, returnTo, vendor?.vendorName, vendorId])

  const actions = useMemo(
    () => [
      { key: 'reactivate', label: 'Reactivate', onClick: reactivateVendor },
      { key: 'delete', label: 'Delete', danger: true, onClick: deleteVendor },
    ],
    [deleteVendor, reactivateVendor],
  )

  return (
    <DataTableDetailShell
      title="Frozen Vendor Details"
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={vendor}
      actions={actions}
      emptyMessage="Frozen vendor not found."
    >
      <DataTableDetailFields
        fields={[
          { key: 'vendor', label: 'Vendor Name', value: vendor?.vendorName },
          { key: 'contact', label: 'Contact Person', value: vendor?.contactPersonName },
          { key: 'mobile', label: 'Mobile', value: vendor?.mobileNumber },
          { key: 'email', label: 'Email', value: vendor?.email },
          { key: 'category', label: 'Category', value: fmtList(vendor?.category), xs: 12 },
          {
            key: 'training',
            label: 'Training Topics',
            value: fmtList(vendor?.trainingTopics),
            xs: 12,
          },
          { key: 'competency', label: 'Competency', value: fmtList(vendor?.competency), xs: 12 },
          {
            key: 'products',
            label: 'Supplier Products',
            value: fmtList(vendor?.supplierProducts),
            xs: 12,
          },
          { key: 'consultancy', label: 'Consultancy', value: fmtList(vendor?.consultancy), xs: 12 },
          {
            key: 'services',
            label: 'Services Offered',
            value: fmtList(vendor?.servicesOffered),
            xs: 12,
          },
          {
            key: 'reason',
            label: 'Deactivation Reason',
            value: vendor?.delete_reason || '-',
            xs: 12,
          },
        ]}
      />
    </DataTableDetailShell>
  )
}

export default FrozenVendorDetailPage
