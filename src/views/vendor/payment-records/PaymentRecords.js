// src/components/PaymentRecords.js

import React, { useState } from 'react'
import { CCard, CCardHeader, CCardBody } from '@coreui/react'
import usePaymentData from './usePaymentData'
import PaymentTable from './PaymentTable'
import PaymentViewModal from './PaymentViewModal'
import dialog from '../../../components/dialog/dialogService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'
const PaymentRecords = () => {
  const API_BASE = import.meta.env.VITE_API_BASE
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)

  // Destructure the roles array instead of a single role
  const { staffRoles, allPayments, loading, reloadPayments } = usePaymentData()

  const handleApprove = async (paymentId) => {
    if (!(await dialog.confirm('Approve this payment?'))) return
    try {
      const res = await fetch(`${API_BASE}vendor-payments/${paymentId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && (data?.status === 'success' || data?.success === true)) {
        dialog.alert('Payment approved.')
        reloadPayments()
      } else {
        dialog.alert('Failed to approve.')
      }
    } catch {
      dialog.alert('Error approving payment.')
    }
  }

  const handleDelete = async (paymentId) => {
    if (!(await dialog.confirm('Delete this payment?'))) return
    try {
      const res = await fetch(`${API_BASE}vendor-payments/${paymentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && (data?.status === 'success' || data?.success === true)) {
        dialog.alert('Payment deleted.')
        reloadPayments()
      } else {
        dialog.alert('Failed to delete.')
      }
    } catch {
      dialog.alert('Error deleting payment.')
    }
  }

  return (
    <>
      <ModuleNavStrip tabs={vendorModuleTabs} ariaLabel="Vendor sections" />
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Vendor Payment Records</strong>
        </CCardHeader>
        <CCardBody>
          <PaymentTable
            payments={allPayments}
            loading={loading}
            searchPlaceholder="Search by vendor, project, context, requester"
            staffRoles={staffRoles}
            onView={(p) => {
              setSelectedPayment(p)
              setViewModalVisible(true)
            }}
            onApprove={handleApprove}
            onDelete={handleDelete}
          />
        </CCardBody>
      </CCard>

      <PaymentViewModal
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        payment={selectedPayment}
      />
    </>
  )
}

export default PaymentRecords
