import React from 'react'
import { CCard } from '@coreui/react'
import AllTasks from './AllTasks'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'

const ViewTasks = () => (
  <>
    <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" showScrollButtons />
    <CCard>
      <AllTasks />
    </CCard>
  </>
)

export default ViewTasks
