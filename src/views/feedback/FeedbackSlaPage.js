import React from 'react'
import ModuleNavStrip from '../../components/navigation/ModuleNavStrip'
import { supportModuleTabs } from '../../components/navigation/moduleNavConfigs'
import FeedbackSlaChart from './FeedbackSlaChart'
import useFeedbackSlaMetrics from './useFeedbackSlaMetrics'

const FeedbackSlaPage = () => {
  const currentYear = new Date().getFullYear()
  const { rows, loading, error, targetPercent } = useFeedbackSlaMetrics({ year: currentYear })

  return (
    <>
      <ModuleNavStrip
        tabs={supportModuleTabs}
        activeTab="feedback-sla"
        ariaLabel="Support sections"
      />
      <FeedbackSlaChart
        rows={rows}
        loading={loading}
        error={error}
        year={currentYear}
        targetPercent={targetPercent}
      />
    </>
  )
}

export default FeedbackSlaPage
