// src/components/tasks/TaskAchievement.js

import React, { useState, useMemo } from 'react'
import { CCardHeader, CCardBody, CButtonGroup, CButton } from '@coreui/react'
import { StatsStrip } from '../../../components/stats'
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
    } else if (status.startsWith('Completed (Late')) {
      late++
    }
  })

  return { onTimeCount: onTime, lateCount: late }
}

const TaskAchievement = ({ tasks, todayStr }) => {
  const [mode, setMode] = useState('year')
  const currentYear = Number(String(todayStr).slice(0, 4))

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
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Achievement</strong>
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
      </CCardHeader>
      <CCardBody>
        <StatsStrip
          items={achievementItems}
          className="mb-0"
          scopeLabel={mode === 'year' ? `YTD ${currentYear}` : 'All Time'}
        />
      </CCardBody>
    </>
  )
}

export default TaskAchievement
