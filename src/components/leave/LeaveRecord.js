import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert } from '@coreui/react'
import { StatsStrip } from '../stats'
import { getMyEntitlements } from './actionHandlers'
import { useLeaveRecordHandlers } from './actionHandlersRecords'
import LeaveRecordTable from './LeaveRecordTable'

const currentYear = new Date().getFullYear()

const toNumber = (value) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

const formatDays = (value) => {
  const number = toNumber(value)
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

export const buildLeaveRecordStats = (leaveRecords = [], entitlements = [], year = currentYear) => {
  const currentYearEntitlements = entitlements.filter(
    (entitlement) => Number(entitlement.year) === year,
  )
  const currentYearRecords = leaveRecords.filter((record) => {
    const dateText = record.appliedAt || record.startDate || ''
    const recordYear = new Date(dateText).getFullYear()
    return recordYear === year
  })

  const totalDays = currentYearEntitlements.reduce(
    (sum, entitlement) => sum + toNumber(entitlement.total_days),
    0,
  )
  const usedDays = currentYearEntitlements.reduce(
    (sum, entitlement) => sum + toNumber(entitlement.used_days),
    0,
  )
  const balanceDays = currentYearEntitlements.reduce(
    (sum, entitlement) => sum + toNumber(entitlement.remaining),
    0,
  )
  const pendingRows = currentYearRecords.filter((record) => record.status === 'Pending')
  const cancelledRows = currentYearRecords.filter((record) => record.status === 'Cancelled')
  const pendingDays = pendingRows.reduce((sum, record) => sum + toNumber(record.duration), 0)
  const cancelledDays = cancelledRows.reduce((sum, record) => sum + toNumber(record.duration), 0)

  return [
    {
      key: 'balance',
      label: 'Days Balance',
      value: formatDays(balanceDays),
      tone: 'success',
    },
    {
      key: 'used',
      label: 'Days Used',
      value: formatDays(usedDays),
      tone: 'primary',
    },
    {
      key: 'pending',
      label: 'Days Pending Approval',
      value: formatDays(pendingDays),
      tone: 'warning',
    },
    {
      key: 'cancelled',
      label: 'Days Cancelled',
      value: formatDays(cancelledDays),
      tone: 'secondary',
    },
  ]
}

const LeaveRecord = () => {
  const navigate = useNavigate()
  const [entitlements, setEntitlements] = useState([])
  const [loadingEntitlements, setLoadingEntitlements] = useState(false)
  const [entitlementsError, setEntitlementsError] = useState('')
  const {
    leaveRecords,
    loadingRecords,
    recordsError,
    fetchLeaveRecords,
    handleCancel,
    getStatusBadge,
  } = useLeaveRecordHandlers()

  useEffect(() => {
    fetchLeaveRecords()
  }, [fetchLeaveRecords])

  useEffect(() => {
    let cancelled = false

    const fetchEntitlements = async () => {
      try {
        setLoadingEntitlements(true)
        setEntitlementsError('')
        const items = await getMyEntitlements()
        if (!cancelled) setEntitlements(items)
      } catch (err) {
        console.error(err)
        if (!cancelled) setEntitlementsError(err?.message || 'Could not load leave balances.')
      } finally {
        if (!cancelled) setLoadingEntitlements(false)
      }
    }

    fetchEntitlements()

    return () => {
      cancelled = true
    }
  }, [])

  const statsItems = useMemo(
    () => buildLeaveRecordStats(leaveRecords, entitlements),
    [entitlements, leaveRecords],
  )

  return (
    <>
      {recordsError && (
        <CAlert color="danger" className="mb-3">
          {recordsError}
        </CAlert>
      )}
      {entitlementsError && (
        <CAlert color="warning" className="mb-3">
          {entitlementsError}
        </CAlert>
      )}

      <StatsStrip
        items={statsItems}
        loading={loadingRecords || loadingEntitlements}
        scopeLabel={`YTD ${currentYear}`}
      />

      <LeaveRecordTable
        leaveRecords={leaveRecords}
        loading={loadingRecords}
        handleCancel={handleCancel}
        getStatusBadge={getStatusBadge}
        onView={(record) =>
          navigate(`/my/leaves/records/${record.id}`, {
            state: { record, returnTo: '/my/leaves' },
          })
        }
      />
    </>
  )
}

export default LeaveRecord
