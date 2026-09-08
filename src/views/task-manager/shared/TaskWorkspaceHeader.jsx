import React from 'react'
import DataTableCardHeader from '../../../components/datatable/DataTableCardHeader'
import TaskWorkspaceViewSwitch from './TaskWorkspaceViewSwitch'

const TaskWorkspaceHeader = ({
  view,
  taskTitle,
  taskScopeLabel = '',
  weeklyScopeLabel = '',
  onViewChange,
  displayControl,
  primaryAction,
  switchAriaLabel,
}) => {
  const isWeeklyView = view === 'weekly'

  return (
    <DataTableCardHeader
      title={isWeeklyView ? 'Weekly Summary' : taskTitle}
      titleAs="h1"
      scopeLabel={isWeeklyView ? weeklyScopeLabel : taskScopeLabel}
    >
      <div className="task-workspace-header__actions">
        {displayControl ? (
          isWeeklyView ? (
            <span
              aria-hidden="true"
              className="task-workspace-header__display-placeholder d-none d-md-inline-block"
            />
          ) : (
            displayControl
          )
        ) : null}
        {!isWeeklyView ? primaryAction : null}
        <TaskWorkspaceViewSwitch value={view} onChange={onViewChange} ariaLabel={switchAriaLabel} />
      </div>
    </DataTableCardHeader>
  )
}

export default TaskWorkspaceHeader
