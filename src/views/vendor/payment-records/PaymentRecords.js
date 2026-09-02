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
    const remarks = await dialog.prompt('Review remarks', {
      multiline: true,
      defaultValue: '',
    })
    if (remarks === null) return
    handleWorkflowAction(paymentId, 'check', {
      successMessage: 'Payment reviewed.',
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

  const handleCancel = async (payment) => {
    const paymentId = payment.id || payment.payment_id
    const reason = await dialog.prompt('Cancellation reason', {
      multiline: true,
      required: true,
    })
    if (reason === null) return
    const voucherIssued = Boolean(payment.voucher || payment.voucher_issued)
    if (
      !(await dialog.confirm(
        voucherIssued
          ? 'Cancel this payment request? Its issued voucher will be permanently marked VOID and retained for audit.'
          : 'Cancel this payment request? The record will remain visible for audit.',
        {
          confirmText: 'Cancel request',
          confirmColor: 'danger',
        },
      ))
    )
      return
    try {
      const res = await apiFetch(`${API_BASE}vendor-payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason, version: Number(payment.version || 1) }),
      })
      const data = await res.json()
      if (res.ok && (data?.status === 'success' || data?.success === true)) {
        dialog.alert(
          voucherIssued
            ? 'Payment request cancelled and its voucher marked VOID.'
            : 'Payment request cancelled.',
        )
        reloadPayments()
        dispatchAppNotificationsChanged()
      } else {
        dialog.alert(data?.message || 'Failed to cancel payment request.')
      }
    } catch (err) {
      dialog.alert('Error cancelling payment: ' + err.message)
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
            onEdit={(payment) => navigate('/vendor/pay', { state: { editRecord: payment } })}
            onCancel={handleCancel}
            onResubmit={(payment) =>
              navigate('/vendor/pay', { state: { resubmitRecord: payment } })
            }
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default PaymentRecords
