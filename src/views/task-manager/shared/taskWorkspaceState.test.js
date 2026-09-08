import { describe, expect, it } from 'vitest'
import { applyTaskWorkspaceView, getTaskWorkspaceView } from './taskWorkspaceState'

describe('taskWorkspaceState', () => {
  it('derives only the supported weekly view from the URL', () => {
    expect(getTaskWorkspaceView('?view=weekly')).toBe('weekly')
    expect(getTaskWorkspaceView('?view=unknown')).toBe('tasks')
    expect(getTaskWorkspaceView('')).toBe('tasks')
  })

  it('changes view without discarding the selected week or unrelated query state', () => {
    expect(applyTaskWorkspaceView('?week=2026-08-31&action=create', 'weekly')).toBe(
      'week=2026-08-31&action=create&view=weekly',
    )
    expect(applyTaskWorkspaceView('?view=weekly&week=2026-08-31', 'tasks')).toBe('week=2026-08-31')
  })
})
