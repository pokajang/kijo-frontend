import React from 'react'

import ModuleNavStrip from '../../../../components/navigation/ModuleNavStrip'
import { clientModuleTabs } from '../../../../components/navigation/moduleNavConfigs'

const ClientModuleNavStrip = (props) => {
  return <ModuleNavStrip ariaLabel="Client sections" {...props} tabs={clientModuleTabs} />
}

export default ClientModuleNavStrip
