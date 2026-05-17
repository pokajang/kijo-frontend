import React from 'react'
import { useNavigate } from 'react-router-dom'
import AppraisalFeedback from './AppraisalFeedback'
import ViewAppraisal from './ViewAppraisal'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'

const Appraisal = ({ routeSection = 'records' }) => {
  const navigate = useNavigate()

  if (routeSection === 'feedback') {
    return (
      <>
        <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" />
        <AppraisalFeedback onBack={() => navigate('/staff/appraise')} />
      </>
    )
  }

  return (
    <>
      <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" />
      <ViewAppraisal
        onAddFeedback={() => navigate('/staff/appraise/feedback')}
        onFinalAppraisal={() => navigate('/staff/appraise/final-appraisal')}
      />
    </>
  )
}

export default Appraisal
