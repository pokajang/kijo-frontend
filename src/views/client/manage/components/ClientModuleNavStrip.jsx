import React, { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import ModuleNavStrip from '../../../../components/navigation/ModuleNavStrip'
import { clientModuleTabs } from '../../../../components/navigation/moduleNavConfigs'
import { useClientVendorRegistrationAttentionCount } from '../../../../hooks/useClientVendorRegistrationAttentionCount'

export const buildClientModuleTabsWithVendorRegistrationBadge = (expiredCount = 0) => {
  const count = Number(expiredCount) || 0

  return clientModuleTabs.map((tab) => {
    if (tab.key !== 'vendor-registration' || count <= 0) {
      return tab
    }

    return {
      ...tab,
      badge: {
        color: 'danger',
        text: String(count),
        title: 'Expired vendor registrations',
      },
    }
  })
}

const ClientModuleNavStrip = (props) => {
  const location = useLocation()
  const { count } = useClientVendorRegistrationAttentionCount({ refreshKey: location.pathname })
  const tabs = useMemo(() => buildClientModuleTabsWithVendorRegistrationBadge(count), [count])

  return <ModuleNavStrip ariaLabel="Client sections" {...props} tabs={tabs} />
}

export default ClientModuleNavStrip
