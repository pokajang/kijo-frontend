// src/components/PaymentRecords.js

import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import { CButton, CCard, CCardBody } from '@coreui/react'
import usePaymentData from './usePaymentData'
import PaymentTable from './PaymentTable'
import dialog from '../../../components/dialog/dialogService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { getPeriodRangePreset, getPeriodRangeScopeLabel } from '../../../components/filters'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'
import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import { apiFetch } from '../../../api/apiClient'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../components/datatable'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'

const PaymentRecords = () => {
  const API_BASE = import.meta.env.VITE_API_BASE
  const navigate = useNavigate()
  const location = useLocation()
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const statsScopeLabel = periodRange ? getPeriodRangeScopeLabel(periodRange) : ''
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('vendor.payment-records')
  const { consumeRouteGroup } = useAppNotifications()

  const { staffRoles, allPayments, loading, reloadPayments } = usePaymentData(periodRange)

  useEffect(() => {
    consumeRouteGroup({
      routePrefix: '/vendor/payment-records',
      moduleKeys: ['vendor.payments'],
    }).catch(() => {})
  }, [consumeRouteGroup])

  const handleWorkflowAction = async (paymentId, action, options = {}) => {
    const { confirmMessage, successMessage, body = null } = options
    if (confirmMessage && !(await dialog.confirm(confirmMessage))) return

    try {
      const res = await apiFetch(`${API_BASE}vendor-payments/${paymentId}/${action}`, {
        method: 'PATCH',
        ...(body
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && (data?.status === 'success' || data?.success === true)) {
        dialog.alert(successMessage || data.message || 'Payment updated.')
        reloadPayments()
        dispatchAppNotificationsChanged()
      } else {
        dialog.alert(data?.message || 'Failed to update payment.')
      }
    } catch (err) {
      dialog.alert('Error updating payment: ' + err.message)
    }
  }

  const handleCheck = async (paymentId) => {
    const remarks = await dialog.prompt('Checker remarks', {
      multiline: true,
      defaultValue: '',
    })
    if (remarks === null) return
    handleWorkflowAction(paymentId, 'check', {
      successMessage: 'Payment checked.',
      body: { remarks },
    })
  }

  const handleApprove = async (paymentId) => {
    const remarks = await dialog.prompt('Approval remarks', {
      multiline: true,
      defaultValue: '',
    })
    if (remarks === null) return
    handleWorkflowAction(paymentId, 'approve', {
      successMessage: 'Payment approved.',
      body: { remarks },
    })
  }

  const handleReject = async (paymentId) => {
    const remarks = await dialog.prompt('Rejection remarks', {
      multiline: true,
      required: true,
    })
    if (remarks === null) return
    handleWorkflowAction(paymentId, 'reject', {
      successMessage: 'Payment rejected.',
      body: { remarks },
    })
  }

  const handleReturn = async (paymentId) => {
    const remarks = await dialog.prompt('Return remarks', {
      multiline: true,
      required: true,
    })
    if (remarks === null) return
    handleWorkflowAction(paymentId, 'return', {
      successMessage: 'Payment returned.',
      body: { remarks },
    })
  }

  const handleMarkPaid = async (payment) => {
    const paidDate = await dialog.prompt('Paid date (YYYY-MM-DD)', {
      defaultValue: new Date().toISOString().slice(0, 10),
      inputType: 'date',
      required: true,
    })
    if (paidDate === null) return
    const paidAmount = await dialog.prompt('Paid amount (RM)', {
      defaultValue: Number(payment.paid_amount || payment.amount || 0).toFixed(2),
      inputType: 'number',
      required: true,
    })
    if (paidAmount === null) return
    const normalizedPaidAmount = Number(paidAmount)
    if (!Number.isFinite(normalizedPaidAmount) || normalizedPaidAmount <= 0) {
      dialog.alert('Enter a paid amount greater than 0.')
      return
    }
    const remarks = await dialog.prompt('Payment remarks', {
      multiline: true,
      defaultValue: '',
    })
    if (remarks === null) return
    handleWorkflowAction(payment.id || payment.payment_id, 'mark-paid', {
      successMessage: 'Payment marked paid.',
      body: {
        paid_date: paidDate,
        paid_amount: normalizedPaidAmount,
        remarks,
      },
    })
  }

  const handleDelete = async (paymentId) => {
    if (
      !(await dialog.confirm('Delete this payment?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const res = await apiFetch(`${API_BASE}vendor-payments/${paymentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && (data?.status === 'success' || data?.success === true)) {
        dialog.alert('Payment deleted.')
        reloadPayments()
        dispatchAppNotificationsChanged()
      } else {
        dialog.alert(data?.message || 'Failed to delete.')
      }
    } catch (err) {
      dialog.alert('Error deleting payment: ' + err.message)
    }
  }

  return (
    <>
      <ModuleNavStrip tabs={vendorModuleTabs} ariaLabel="Vendor sections" />
      <CCard className="mb-4">
        <DataTableCardHeader title="Payment Queue" scopeLabel={statsScopeLabel}>
          <DataTableStatsToggle
            visible={statsVisible}
            onToggle={toggleStatsVisible}
            controlsVisible={controlsVisible}
            onControlsToggle={toggleControlsVisible}
          />
          <CButton size="sm" color="primary" onClick={() => navigate('/vendor/pay')}>
            <CIcon icon={cilPlus} className="me-1" />
            Request Vendor Payment
          </CButton>
        </DataTableCardHeader>
        <CCardBody>
          <PaymentTable
            payments={allPayments}
            loading={loading}
            statsVisible={statsVisible}
            controlsVisible={controlsVisible}
            periodRange={periodRange}
            onPeriodRangeChange={setPeriodRange}
            searchPlaceholder="Search by vendor, project, context, requester"
            staffRoles={staffRoles}
            onView={(p) =>
              navigate(`/vendor/payment-records/${p.id || p.payment_id}`, {
                state: { record: p, returnTo: getCurrentReturnTo(location) },
              })
            }
            onCheck={handleCheck}
            onApprove={handleApprove}
            onReject={handleReject}
            onReturn={handleReturn}
            onMarkPaid={handleMarkPaid}
            onDelete={handleDelete}
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default PaymentRecords
