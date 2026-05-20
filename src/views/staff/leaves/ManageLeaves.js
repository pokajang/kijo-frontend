// src/views/ManageLeaves.js

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SectionAllLeaves from './SectionAllLeaves'
import SectionViewAssignments from './SectionViewAssignments'
import SectionAssignLeaves from './SectionAssignLeaves'
import SectionLeaveWorkflowSettings from './SectionLeaveWorkflowSettings'
import * as AH from './actionHandlers'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'

const ManageLeaves = ({ routeSection = 'records' }) => {
  const navigate = useNavigate()
  const { entitlementId } = useParams()
  const [allLeaveRecords, setAllLeaveRecords] = useState([])
  const [staffList, setStaffList] = useState([])
  const [entitlements, setEntitlements] = useState([])

  const fetchAllLeaveRecords = async () => {
    try {
      const leaves = await AH.getAllLeaves()
      setAllLeaveRecords(leaves)
    } catch (err) {
      console.error(err)
    }
  }

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
      return
    }

    fetchStaffList()
    if (routeSection !== 'workflow') {
      fetchEntitlements()
    }
  }, [routeSection])

  const editEntitlement = useMemo(
    () =>
      entitlementId
        ? entitlements.find((entitlement) => String(entitlement.id) === String(entitlementId)) ||
          null
        : null,
    [entitlementId, entitlements],
  )

  let content

  if (routeSection === 'entitlements') {
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
  } else if (routeSection === 'workflow') {
    content = (
      <SectionLeaveWorkflowSettings
        staffList={staffList}
        onBack={() => navigate('/staff/leaves')}
      />
    )
  } else {
    content = (
      <SectionAllLeaves
        allLeaveRecords={allLeaveRecords}
        fetchAllLeaveRecords={fetchAllLeaveRecords}
        onManageEntitlements={() => navigate('/staff/leaves/entitlements')}
        onAssignLeave={() => navigate('/staff/leaves/assign')}
        onManageWorkflow={() => navigate('/staff/leaves/workflow')}
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
