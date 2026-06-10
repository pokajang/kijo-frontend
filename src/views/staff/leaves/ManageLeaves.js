// src/views/ManageLeaves.js

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import SectionAllLeaves from './SectionAllLeaves'
import SectionViewAssignments from './SectionViewAssignments'
import SectionAssignLeaves from './SectionAssignLeaves'
import * as AH from './actionHandlers'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { useAuth } from '../../../auth/AuthProvider'
import { extractRolesFromSession, hasAnyAllowedRole } from '../../../utils/roles'
import { getPeriodRangePreset } from '../../../components/filters'
import { APP_NOTIFICATIONS_CHANGED_EVENT } from '../../../notifications/appNotificationEvents'

const LEAVE_ADMIN_ALLOWED_ROLES = ['System Admin', 'HR']

const ManageLeaves = ({ routeSection = 'records' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { entitlementId } = useParams()
  const { user } = useAuth()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])
  const canManageLeaveAdmin = useMemo(
    () => hasAnyAllowedRole(roles, LEAVE_ADMIN_ALLOWED_ROLES),
    [roles],
  )
  const [allLeaveRecords, setAllLeaveRecords] = useState([])
  const [staffList, setStaffList] = useState([])
  const [entitlements, setEntitlements] = useState([])
  const [entitlementHistory, setEntitlementHistory] = useState([])
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [staffListLoading, setStaffListLoading] = useState(false)
  const [entitlementsLoading, setEntitlementsLoading] = useState(false)
  const [entitlementHistoryLoading, setEntitlementHistoryLoading] = useState(false)
  const [leaveActionPermissions, setLeaveActionPermissions] = useState(null)
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))

  const defaultLeaveActionPermissions = useMemo(
    () => ({
      canRecommend: hasAnyAllowedRole(roles, ['Manager', 'System Admin']),
      canApprove: hasAnyAllowedRole(roles, ['HR', 'System Admin']),
    }),
    [roles],
  )

  const effectiveLeaveActionPermissions = leaveActionPermissions || defaultLeaveActionPermissions

  const fetchAllLeaveRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const { leaves, actionPermissions } = await AH.getAllLeavesPayload(periodRange)
      setAllLeaveRecords(leaves)
      setLeaveActionPermissions(actionPermissions)
    } catch (err) {
      console.error(err)
    } finally {
      setRecordsLoading(false)
    }
  }, [periodRange])

  const fetchStaffList = async () => {
    setStaffListLoading(true)
    try {
      const staff = await AH.getStaffList()
      setStaffList(staff)
    } catch (err) {
      console.error(err)
    } finally {
      setStaffListLoading(false)
    }
  }

  const fetchEntitlements = async () => {
    setEntitlementsLoaded(false)
    setEntitlementsLoading(true)
    setEntitlementHistoryLoading(true)
    try {
      const allocs = await AH.getAllEntitlements()
      setEntitlements(allocs)
      setEntitlementsLoaded(true)
      setEntitlementsLoading(false)
      try {
        const history = await AH.getLeaveEntitlementHistory()
        setEntitlementHistory(history)
      } catch (historyErr) {
        console.error(historyErr)
        setEntitlementHistory([])
      } finally {
        setEntitlementHistoryLoading(false)
      }
    } catch (err) {
      console.error(err)
      setEntitlementsLoaded(true)
      setEntitlementsLoading(false)
      setEntitlementHistory([])
      setEntitlementHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (routeSection === 'records') {
      fetchAllLeaveRecords()
      if (canManageLeaveAdmin) {
        fetchStaffList()
        fetchEntitlements()
      }
      return
    }

    if (!canManageLeaveAdmin) return

    fetchStaffList()
    fetchEntitlements()
  }, [canManageLeaveAdmin, fetchAllLeaveRecords, routeSection])

  useEffect(() => {
    if (routeSection !== 'records') return undefined

    const refreshRecords = () => {
      fetchAllLeaveRecords()
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return
      refreshRecords()
    }

    window.addEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, refreshRecords)
    window.addEventListener('focus', refreshRecords)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_CHANGED_EVENT, refreshRecords)
      window.removeEventListener('focus', refreshRecords)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [fetchAllLeaveRecords, routeSection])

  const editEntitlement = useMemo(
    () =>
      entitlementId
        ? entitlements.find((entitlement) => String(entitlement.id) === String(entitlementId)) ||
          null
        : null,
    [entitlementId, entitlements],
  )

  const assignReturnTo = location.state?.returnTo || '/staff/leaves/entitlements'
  const currentReturnTo = `${location.pathname}${location.search}`

  const openAssignLeave = (record) => {
    if (record?.rowKind === 'missing') {
      navigate('/staff/leaves/assign', {
        state: {
          returnTo: currentReturnTo,
          assignLeavePrefill: {
            staff_id: record.staff_id,
            year: record.year,
            leave_type: record.leave_type,
          },
        },
      })
      return
    }

    navigate('/staff/leaves/assign', {
      state: {
        returnTo: currentReturnTo,
      },
    })
  }

  const openEntitlementDetails = (record) => {
    if (!record?.staff_id) return
    const staff = staffList.find((item) => String(item.staff_id) === String(record.staff_id))
    const staffEntitlements = entitlements.filter(
      (entitlement) => String(entitlement.staff_id) === String(record.staff_id),
    )

    navigate(`/staff/leaves/entitlements/staff/${encodeURIComponent(record.staff_id)}`, {
      state: {
        staff: staff || {
          staff_id: record.staff_id,
          full_name: record.full_name,
          name_code: record.name_code,
        },
        entitlements: staffEntitlements,
        returnTo: '/staff/leaves/entitlements',
      },
    })
  }

  let content

  if (routeSection !== 'records' && !canManageLeaveAdmin) {
    content = <Navigate to="/staff/leaves" replace />
  } else if (routeSection === 'entitlements') {
    content = (
      <SectionViewAssignments
        staffList={staffList}
        entitlements={entitlements}
        entitlementHistory={entitlementHistory}
        loading={staffListLoading || entitlementsLoading}
        historyLoading={entitlementHistoryLoading}
        onDelete={fetchEntitlements}
        onEdit={(record) =>
          navigate(`/staff/leaves/entitlements/${record.id}/edit`, {
            state: { returnTo: currentReturnTo },
          })
        }
        onAssign={openAssignLeave}
        onViewAssignment={openEntitlementDetails}
        onViewRecords={() => navigate('/staff/leaves')}
      />
    )
  } else if (routeSection === 'assign') {
    if (entitlementId && !entitlementsLoaded) {
      content = <div className="text-muted small p-3">Loading leave entitlement...</div>
    } else if (entitlementId && !editEntitlement) {
      content = (
        <CAlert color="warning" className="d-flex justify-content-between align-items-center gap-3">
          <span>Leave entitlement not found.</span>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate(assignReturnTo)}
          >
            Back
          </CButton>
        </CAlert>
      )
    } else {
      content = (
        <SectionAssignLeaves
          staffList={staffList}
          onAssigned={fetchEntitlements}
          editEntitlement={editEntitlement}
          onCancelEdit={() => navigate(assignReturnTo)}
          entitlements={entitlements}
          entitlementsLoading={entitlementsLoading}
        />
      )
    }
  } else {
    content = (
      <SectionAllLeaves
        allLeaveRecords={allLeaveRecords}
        fetchAllLeaveRecords={fetchAllLeaveRecords}
        periodRange={periodRange}
        onPeriodRangeChange={setPeriodRange}
        onManageEntitlements={
          canManageLeaveAdmin ? () => navigate('/staff/leaves/entitlements') : undefined
        }
        onAssignLeave={canManageLeaveAdmin ? openAssignLeave : undefined}
        onManageWorkflow={
          canManageLeaveAdmin ? () => navigate('/workflows/leave-application') : undefined
        }
        staffList={staffList}
        entitlements={entitlements}
        loading={recordsLoading}
        canManageLeaveAdmin={canManageLeaveAdmin}
        canRecommendActions={effectiveLeaveActionPermissions.canRecommend}
        canApproveActions={effectiveLeaveActionPermissions.canApprove}
        onViewRecord={(record) =>
          navigate(`/staff/leaves/records/${record.id}`, {
            state: { record, returnTo: '/staff/leaves' },
          })
        }
      />
    )
  }

  return (
    <>
      <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" />
      {content}
    </>
  )
}

export default ManageLeaves
