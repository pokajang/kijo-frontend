import React, { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { CCol, CRow } from '@coreui/react'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { accountModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import StaffProfile from '../../../components/profile/StaffProfile'
import PersonalSignature from '../../../components/signature/PersonalSignature'
import UserSetting from '../../../components/user-setting/UserSetting'

const sections = [
  {
    key: 'profile',
    component: StaffProfile,
  },
  {
    key: 'signature',
    component: PersonalSignature,
  },
  {
    key: 'password',
    component: UserSetting,
  },
]

const validSectionKeys = new Set(sections.map((section) => section.key))

const AccountWorkspace = ({ routeSection }) => {
  const activeSection = routeSection || 'profile'

  const activeConfig = useMemo(
    () => sections.find((section) => section.key === activeSection),
    [activeSection],
  )

  if (!validSectionKeys.has(activeSection) || !activeConfig) {
    return <Navigate to="/my/profile" replace />
  }

  const ActiveComponent = activeConfig.component

  return (
    <CRow>
      <CCol xs={12}>
        <ModuleNavStrip tabs={accountModuleTabs} ariaLabel="My account sections" />
        <ActiveComponent />
      </CCol>
    </CRow>
  )
}

export default AccountWorkspace
