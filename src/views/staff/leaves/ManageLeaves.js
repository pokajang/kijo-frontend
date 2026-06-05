// src/views/ManageLeaves.js

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
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
    try {
      const { leaves, actionPermissions } = await AH.getAllLeavesPayload(periodRange)
      setAllLeaveRecords(leaves)
      setLeaveActionPermissions(actionPermissions)
    } catch (err) {
      console.error(err)
    }
  }, [periodRange])

  const fetchStaffList = async () => {
    try {
      const staff = await AH.getStaffList()
      setStaffList(staff)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchEntitlements = async () => {
    try {
      const allocs = await AH.getAllEntitlements()
      setEntitlements(allocs)
    } catch (err) {
      console.error(err)
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

  let content

  if (routeSection !== 'records' && !canManageLeaveAdmin) {
    content = <Navigate to="/staff/leaves" replace />
  } else if (routeSection === 'entitlements') {
    content = (
      <SectionViewAssignments
        staffList={staffList}
        entitlements={entitlements}
        onDelete={fetchEntitlements}
        onEdit={(record) => navigate(`/staff/leaves/entitlements/${record.id}/edit`)}
        onAssign={() => navigate('/staff/leaves/assign')}
        onViewRecords={() => navigate('/staff/leaves')}
      />
    )
  } else if (routeSection === 'assign') {
    content = (
      <SectionAssignLeaves
        staffList={staffList}
        onAssigned={fetchEntitlements}
        editEntitlement={editEntitlement}
        onCancelEdit={() => navigate('/staff/leaves/entitlements')}
      />
    )
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
        onAssignLeave={canManageLeaveAdmin ? () => navigate('/staff/leaves/assign') : undefined}
        onManageWorkflow={
          canManageLeaveAdmin ? () => navigate('/workflows/leave-application') : undefined
        }
        staffList={staffList}
        entitlements={entitlements}
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
