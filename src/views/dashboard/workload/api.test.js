import { describe, expect, it, vi } from 'vitest'

import {
  createWorkloadShare,
  fetchSharedWorkload,
  fetchWorkload,
  fetchWorkloadHistory,
  getWorkloadPdfUrl,
  normalizeStaffRow,
} from './api'
import { fetchJson, fetchJsonGet } from '../shared/fetchUtils'

vi.mock('../shared/fetchUtils', async () => {
  const actual = await vi.importActual('../shared/fetchUtils')
  return {
    ...actual,
    fetchJson: vi.fn(),
    fetchJsonGet: vi.fn(),
  }
})

describe('workload api normalization', () => {
  it('preserves weighted score and project metadata from the backend', () => {
    const row = normalizeStaffRow({
      staffId: 1,
      staffCode: 'AZA',
      score: 10,
      project_group_count: 2,
      scoreBreakdown: [
        { label: 'Non-project tasks', points: 0 },
        { label: 'Project responsibility', points: 6 },
        { label: 'Deadline pressure', points: 4 },
        { label: 'Completed work', points: 1.05 },
      ],
      work_type_breakdown: [
        {
          work_type: 'training_delivery',
          work_type_label: 'Training / Delivery',
          active_count: 1,
          completed_count: 1,
          task_count: 2,
          effort_points: 5,
        },
      ],
      completed_tasks: [
        {
          id: 20,
          title: 'Closed period task',
          status: 'Completed',
          effort_score: 3,
          completed_at: '2026-05-10',
        },
      ],
      projectGroups: [
        {
          project_id: 501,
          project_name: 'Weighted Project',
          project_role: 'leader',
          role_weight: 1,
          value_band: 3,
          score_contribution: 8,
          scoreable_progress_count: 4,
          project_task_points: 3,
          project_base_points: 1,
          project_progress_points: 2,
          project_value_points: 2,
          project_overhead_points: 5,
          activeTasks: [
            {
              id: 10,
              title: 'Create training module',
              task_category: 'real_effort',
              effort_score: 3,
              classification_confidence: 'high',
              classification_source: 'system',
              user_override: false,
              matched_pattern: 'create training module',
              work_type: 'training_delivery',
              work_type_label: 'Training / Delivery',
              work_type_confidence: 'high',
              work_type_matched_pattern: 'work_type:training_delivery:training',
            },
          ],
          completed_tasks: [
            {
              id: 11,
              title: 'Completed project report',
              status: 'Completed',
              effort_score: 2,
              completed_at: '2026-05-09',
            },
          ],
        },
      ],
    })

    expect(row.scoreBreakdown).toEqual([
      { label: 'Non-project tasks', points: 0 },
      { label: 'Project responsibility', points: 6 },
      { label: 'Deadline pressure', points: 4 },
      { label: 'Completed work', points: 1.05 },
    ])
    expect(row.projectGroups[0]).toMatchObject({
      projectId: 501,
      projectName: 'Weighted Project',
      projectRole: 'leader',
      roleWeight: 1,
      valueBand: 3,
      scoreContribution: 8,
      scoreableProgressCount: 4,
      projectTaskPoints: 3,
      projectBasePoints: 1,
      projectProgressPoints: 2,
      projectValuePoints: 2,
      projectOverheadPoints: 5,
    })
    expect(row.projectGroupCount).toBe(2)
    expect(row.projectGroups[0].activeTasks[0]).toMatchObject({
      taskCategory: 'real_effort',
      effortScore: 3,
      classificationConfidence: 'high',
      classificationSource: 'system',
      userOverride: false,
      matchedPattern: 'create training module',
      workType: 'training_delivery',
      workTypeLabel: 'Training / Delivery',
      workTypeConfidence: 'high',
      workTypeMatchedPattern: 'work_type:training_delivery:training',
    })
    expect(row.workTypeBreakdown[0]).toMatchObject({
      workType: 'training_delivery',
      workTypeLabel: 'Training / Delivery',
      activeCount: 1,
      completedCount: 1,
      taskCount: 2,
      effortPoints: 5,
    })
    expect(row.projectGroups[0].completedTasks[0]).toMatchObject({
      title: 'Completed project report',
      effortScore: 2,
      completedAt: '2026-05-09',
    })
    expect(row.completedTasks[0]).toMatchObject({
      title: 'Closed period task',
      effortScore: 3,
      completedAt: '2026-05-10',
    })
  })

  it('normalizes unknown work type values to unclear', () => {
    const row = normalizeStaffRow({
      staffId: 1,
      staffCode: 'AZA',
      workTypeBreakdown: [
        {
          workType: 'legacy_custom_type',
          workTypeLabel: 'Legacy Custom Type',
          taskCount: 1,
          effortPoints: 3,
        },
      ],
      otherTasks: [
        {
          id: 10,
          title: 'Legacy typed task',
          workType: 'legacy_custom_type',
          workTypeLabel: 'Legacy Custom Type',
        },
      ],
    })

    expect(row.workTypeBreakdown[0]).toMatchObject({
      workType: 'unclear',
      workTypeLabel: 'Unclear',
    })
    expect(row.otherTasks[0]).toMatchObject({
      workType: 'unclear',
      workTypeLabel: 'Unclear',
    })
  })

  it('leaves missing project score detail fields unset for legacy fallback calculations', () => {
    const row = normalizeStaffRow({
      staffId: 1,
      staffCode: 'AZA',
      projectGroups: [
        {
          project_id: 501,
          project_name: 'Legacy Project',
          project_role: 'leader',
          role_weight: 1,
          value_band: 2,
          active_tasks: [{ id: 10, title: 'Legacy project task', status: 'Ongoing' }],
        },
      ],
    })

    expect(row.projectGroups[0]).toMatchObject({
      projectId: 501,
      projectName: 'Legacy Project',
      roleWeight: 1,
      valueBand: 2,
    })
    expect(row.projectGroups[0].scoreContribution).toBeUndefined()
    expect(row.projectGroups[0].projectTaskPoints).toBeUndefined()
    expect(row.projectGroups[0].projectBasePoints).toBeUndefined()
    expect(row.projectGroups[0].projectProgressPoints).toBeUndefined()
    expect(row.projectGroups[0].projectValuePoints).toBeUndefined()
    expect(row.projectGroups[0].projectOverheadPoints).toBeUndefined()
  })

  it('keeps returning normalized staff rows when the backend includes snapshot metadata', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-03-31',
      completedWindow: {
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      },
      staff: [
        {
          staffId: 1,
          staffCode: 'AZA',
          score: 5,
          otherTasks: [
            {
              id: 20,
              title: 'Past year open overdue task',
              status: 'Ongoing',
              effort_score: 3,
            },
          ],
        },
      ],
    })

    const rows = await fetchWorkload({ startDate: '2026-01-01', endDate: '2026-03-31' })

    expect(fetchJsonGet).toHaveBeenCalledWith(
      expect.stringContaining('stats/workload'),
      { start_date: '2026-01-01', end_date: '2026-03-31' },
      undefined,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      staffCode: 'AZA',
      asOfDate: '2026-03-31',
      score: 5,
    })
    expect(rows[0].otherTasks[0]).toMatchObject({
      title: 'Past year open overdue task',
      status: 'Ongoing',
      effortScore: 3,
    })
  })

  it('builds workload PDF URLs with the selected date range', () => {
    const url = getWorkloadPdfUrl({ startDate: '2026-05-01', endDate: '2026-05-31' })

    expect(url).toContain('stats/workload/pdf')
    expect(url).toContain('start_date=2026-05-01')
    expect(url).toContain('end_date=2026-05-31')
  })

  it('loads and normalizes workload history rows', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      staff: [
        {
          staff_key: 1,
          staff_id: 1,
          staff_code: 'AZA',
          staff_name: 'Azam',
          points: [
            { date: '2026-05-29', score: '12.50', capture_mode: 'reconstructed' },
            { snapshot_date: '2026-05-30', score: 13 },
          ],
        },
      ],
    })

    const result = await fetchWorkloadHistory({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    })

    expect(fetchJsonGet).toHaveBeenCalledWith(
      expect.stringContaining('stats/workload/history'),
      { start_date: '2026-05-01', end_date: '2026-05-31' },
      undefined,
    )
    expect(result).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      staff: [
        {
          staffKey: '1',
          staffId: 1,
          staffCode: 'AZA',
          staffName: 'Azam',
          points: [
            { date: '2026-05-29', score: 12.5, captureMode: 'reconstructed' },
            { date: '2026-05-30', score: 13, captureMode: 'captured' },
          ],
        },
      ],
    })
  })

  it('creates workload share tokens with the selected date range', async () => {
    fetchJson.mockResolvedValueOnce({
      status: 'success',
      token: 'share-token',
      path: '/share/workload/share-token',
      expiresAt: '2026-06-07T00:00:00+08:00',
    })

    const result = await createWorkloadShare({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    })

    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringContaining('stats/workload/share'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ start_date: '2026-05-01', end_date: '2026-05-31' }),
      }),
      undefined,
    )
    expect(result).toEqual({
      token: 'share-token',
      path: '/share/workload/share-token',
      expiresAt: '2026-06-07T00:00:00+08:00',
    })
  })

  it('loads shared workload snapshots without credentials', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      share: {
        expiresAt: '2026-06-07T00:00:00+08:00',
      },
      staff: [
        {
          staff_id: 1,
          staff_code: 'AZA',
          staffName: 'Azam',
          score: 4,
        },
      ],
    })

    const result = await fetchSharedWorkload({ token: 'abc123' })

    expect(fetchJsonGet).toHaveBeenCalledWith(
      expect.stringContaining('stats/workload/share/abc123'),
      {},
      { credentials: 'omit', silentError: true },
      undefined,
    )
    expect(result.staffRows[0]).toMatchObject({
      staffId: 1,
      staffName: 'Azam',
      asOfDate: '2026-05-31',
      score: 4,
    })
    expect(result.share).toEqual({ expiresAt: '2026-06-07T00:00:00+08:00' })
  })
})
