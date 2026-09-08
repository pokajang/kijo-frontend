import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TaskWorkspaceHeader from './TaskWorkspaceHeader'

afterEach(cleanup)

describe('TaskWorkspaceHeader', () => {
  it('renders task context and keeps the shared switch at the end', () => {
    const onViewChange = vi.fn()

    render(
      <TaskWorkspaceHeader
        view="tasks"
        taskTitle="My Tasks"
        taskScopeLabel="1 Jan 2026 - 7 Sep 2026"
        weeklyScopeLabel="7 Sep 2026 - 13 Sep 2026"
        onViewChange={onViewChange}
        displayControl={<button type="button">Table display</button>}
        primaryAction={<button type="button">Create Task</button>}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'My Tasks' })).toBeInTheDocument()
    expect(screen.getByText('1 Jan 2026 - 7 Sep 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tasks' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Weekly Summary' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen
        .getByRole('button', { name: 'Weekly Summary' })
        .closest('.task-workspace-header__actions')?.lastElementChild,
    ).toHaveClass('task-workspace-view-switch')

    fireEvent.click(screen.getByRole('button', { name: 'Weekly Summary' }))
    expect(onViewChange).toHaveBeenCalledWith('weekly')
  })

  it('renders weekly context without task-only interactive controls', () => {
    const { container } = render(
      <TaskWorkspaceHeader
        view="weekly"
        taskTitle="All Staff Tasks"
        taskScopeLabel="1 Jan 2026 - 7 Sep 2026"
        weeklyScopeLabel="31 Aug 2026 - 6 Sep 2026"
        displayControl={<button type="button">Table display</button>}
        primaryAction={<button type="button">Create Task</button>}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Weekly Summary' })).toBeInTheDocument()
    expect(screen.getByText('31 Aug 2026 - 6 Sep 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Table display' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Task' })).not.toBeInTheDocument()
    expect(container.querySelector('.task-workspace-header__display-placeholder')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Weekly Summary' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
