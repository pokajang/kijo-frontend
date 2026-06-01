import { describe, expect, it } from 'vitest'

import {
  PROJECT_CLOSE_TYPES,
  PROJECT_STATUSES,
  getProjectStatusTone,
  isClosedProject,
  isProjectActive,
  normalizeProjectStatus,
  shouldIncludeProjectValue,
} from '../projectStatus'

describe('projectStatus', () => {
  it('exports current display status and close type labels', () => {
    expect(PROJECT_STATUSES).toEqual({
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      TERMINATED: 'Terminated',
      CLOSED: 'Closed',
    })
    expect(PROJECT_CLOSE_TYPES).toEqual({
      COMPLETED: 'Completed',
      TERMINATED: 'Terminated',
    })
  })

  it('normalizes project statuses from strings and project objects', () => {
    expect(normalizeProjectStatus(' Active ')).toBe('active')
    expect(normalizeProjectStatus('completed')).toBe('completed')
    expect(normalizeProjectStatus({ status: ' TERMINATED ' })).toBe('terminated')
    expect(normalizeProjectStatus('')).toBe('')
    expect(normalizeProjectStatus(null)).toBe('')
    expect(normalizeProjectStatus('Pending Review')).toBe('pending review')
  })

  it('maps project status tones consistently', () => {
    expect(getProjectStatusTone('Active')).toBe('info')
    expect(getProjectStatusTone('completed')).toBe('success')
    expect(getProjectStatusTone(' TERMINATED ')).toBe('danger')
    expect(getProjectStatusTone({ status: 'Closed' })).toBe('danger')
    expect(getProjectStatusTone('Pending Review')).toBe('info')
    expect(getProjectStatusTone('')).toBe('info')
  })

  it('treats completed, terminated, and closed projects as closed', () => {
    expect(isClosedProject('Completed')).toBe(true)
    expect(isClosedProject('terminated')).toBe(true)
    expect(isClosedProject({ status: ' Closed ' })).toBe(true)
    expect(isClosedProject('Active')).toBe(false)
    expect(isClosedProject('Pending Review')).toBe(false)
  })

  it('treats active projects with no closed value as active', () => {
    expect(isProjectActive({ status: 'Active' })).toBe(true)
    expect(isProjectActive({ status: ' active ', closed: '' })).toBe(true)
    expect(isProjectActive({ status: 'Active', closed: '2026-05-29' })).toBe(false)
    expect(isProjectActive({ status: 'Completed' })).toBe(false)
  })

  it('excludes terminated project values and includes other statuses', () => {
    expect(shouldIncludeProjectValue({ status: 'Terminated' })).toBe(false)
    expect(shouldIncludeProjectValue({ status: ' terminated ' })).toBe(false)
    expect(shouldIncludeProjectValue({ status: 'Completed' })).toBe(true)
    expect(shouldIncludeProjectValue({ status: 'Closed' })).toBe(true)
    expect(shouldIncludeProjectValue({ status: 'Active' })).toBe(true)
    expect(shouldIncludeProjectValue({ status: '' })).toBe(true)
  })
})
