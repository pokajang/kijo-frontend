import React from 'react'
import { CButton, CButtonGroup } from '@coreui/react'

const views = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'weekly', label: 'Weekly Summary' },
]

const TaskWorkspaceViewSwitch = ({ value, onChange, ariaLabel = 'Task views' }) => (
  <CButtonGroup
    size="sm"
    role="group"
    aria-label={ariaLabel}
    className="task-workspace-view-switch"
  >
    {views.map((view) => {
      const active = value === view.value

      return (
        <CButton
          key={view.value}
          type="button"
          size="sm"
          color={active ? 'primary' : 'secondary'}
          variant={active ? undefined : 'outline'}
          aria-pressed={active}
          onClick={() => onChange?.(view.value)}
        >
          {view.label}
        </CButton>
      )
    })}
  </CButtonGroup>
)

export default TaskWorkspaceViewSwitch
