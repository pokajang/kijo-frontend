// src/components/tasks/TaskAchievement.js

import React, { useState, useMemo } from 'react'
import { CCardBody, CButtonGroup, CButton } from '@coreui/react'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import { formatCount } from '../../../utils/stats/formatStats'
import { getStatusText } from './actionHandlers'

export const getTaskAchievementCounts = (tasks = [], todayStr, mode = 'year') => {
  const currentYear = Number(String(todayStr).slice(0, 4))
  let onTime = 0
  let late = 0

  tasks.forEach((task) => {
    const status = getStatusText(task, todayStr)
    if (!status.startsWith('Completed')) return

    if (mode === 'year') {
      const compDate = task.completedAt || todayStr
      const compYear = new Date(compDate).getFullYear()
      if (compYear !== currentYear) return
    }

    if (status.startsWith('Completed (On time)')) {
      onTime++
    } else if (status.startsWith('Completed but late')) {
      late++
    }
  })

  return { onTimeCount: onTime, lateCount: late }
}

const TaskAchievement = ({ tasks, todayStr }) => {
  const [mode, setMode] = useState('year')
  const currentYear = Number(String(todayStr).slice(0, 4))
  const { statsVisible, toggleStatsVisible } =
    useDataTableStatsVisibility('staff.tasks.achievement')

  const { onTimeCount, lateCount } = useMemo(
    () => getTaskAchievementCounts(tasks, todayStr, mode),
    [tasks, todayStr, mode],
  )

  const achievementItems = useMemo(
    () => [
      {
        key: 'on-time',
        label: 'On Time',
        value: formatCount(onTimeCount),
        tone: onTimeCount ? 'success' : 'secondary',
      },
      {
        key: 'late',
        label: 'Late',
        value: formatCount(lateCount),
        tone: lateCount ? 'warning' : 'secondary',
      },
    ],
    [onTimeCount, lateCount],
  )

  return (
    <>
      <DataTableCardHeader
        title="Achievement"
        scopeLabel={mode === 'year' ? `YTD ${currentYear}` : 'All Time'}
      >
        <DataTableStatsToggle visible={statsVisible} onToggle={toggleStatsVisible} />
        <CButtonGroup>
          <CButton
            color={mode === 'year' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('year')}
          >
            This Year
          </CButton>
          <CButton
            color={mode === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('all')}
          >
            All Time
          </CButton>
        </CButtonGroup>
      </DataTableCardHeader>
      <CCardBody>
        {statsVisible && <StatsStrip items={achievementItems} className="mb-0" />}
      </CCardBody>
    </>
  )
}

export default TaskAchievement
