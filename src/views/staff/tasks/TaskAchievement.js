// src/components/tasks/TaskAchievement.js

import React, { useState, useMemo } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CButtonGroup, CButton } from '@coreui/react'
import { getStatusText } from './actionHandlers'

const TaskAchievement = ({ tasks, todayStr }) => {
  const [mode, setMode] = useState('year') // 'year' or 'all'
  const currentYear = Number(String(todayStr).slice(0, 4))

  const { onTimeCount, lateCount } = useMemo(() => {
    let onTime = 0
    let late = 0

    tasks.forEach((task) => {
      const status = getStatusText(task, todayStr)
      if (!status.startsWith('Completed')) return

      // if in 'year' mode, only count tasks completed this year
      if (mode === 'year') {
        const compDate = task.completedAt || todayStr
        const compYear = new Date(compDate).getFullYear()
        if (compYear !== currentYear) return
      }

      if (status.startsWith('Completed (On time)')) {
        onTime++
      } else {
        // anything else starting with 'Completed (' is late
        late++
      }
    })

    return { onTimeCount: onTime, lateCount: late }
  }, [tasks, todayStr, mode, currentYear])

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
        <CRow className="justify-content-center align-items-center">
          {/* Title for on-time completions */}
          <CCol xs="auto" className="text-center">
            <div style={{ fontSize: '1rem', fontWeight: '500' }}>On Time</div>
          </CCol>

          {/* Rabbit icon + count */}
          <CCol xs="auto" className="text-center">
            <div style={{ fontSize: '2.5rem', color: 'brown' }}>🐇</div>
            <div style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
              <strong>{onTimeCount}</strong>
            </div>
          </CCol>

          {/* Snail icon + count */}
          <CCol xs="auto" className="text-center">
            <div style={{ fontSize: '2.5rem', color: 'goldenrod' }}>🐌</div>
            <div style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>
              <strong>{lateCount}</strong>
            </div>
          </CCol>

          {/* Title for late completions */}
          <CCol xs="auto" className="text-center">
            <div style={{ fontSize: '1rem', fontWeight: '500' }}>Late</div>
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default TaskAchievement
