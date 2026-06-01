import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCsrfToken } from '../../api/apiClient'
import { systemAdminModuleTabs } from '../../components/navigation/moduleNavConfigs'
import SectionAiWorkloadGovernance from './SectionAiWorkloadGovernance'

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const healthResponse = (data = {}) =>
  jsonResponse({
    status: 'success',
    data: {
      available: true,
      totalClassifiedTasks: 12,
      unclearUnratedTasks: 2,
      nonWorkTasks: 1,
      lowConfidenceTasks: 3,
      aiClassifiedTasks: 4,
      learnedCacheTasks: 5,
      learnedCacheRows: 6,
      learnedCacheUsage: 7,
      ...data,
    },
  })

const snapshotHealthResponse = (data = {}) =>
  jsonResponse({
    status: 'success',
    data: {
      available: true,
      captureStatus: 'ok',
      expectedCaptureDate: '2026-05-31',
      latestSnapshot: {
        snapshotDate: '2026-05-31',
        staffCount: 2,
        totalScore: 41,
        avgScore: 20.5,
        totalActiveTasks: 9,
        totalOverdueTasks: 3,
        totalDueSoonTasks: 1,
      },
      checkCounts: {
        warning: 0,
        critical: 0,
      },
      capturedSnapshotsLast31Days: 1,
      reconstructedSnapshotsLast31Days: 2,
      retention: {
        aggregatePayloadsRetainedBeyondCutoff: 0,
        staffPayloadsRetainedBeyondCutoff: 0,
        lastPrunedAt: null,
      },
      ...data,
    },
  })

const listResponse = (examples = [], extra = {}) =>
  jsonResponse({
    status: 'success',
    data: {
      available: true,
      examples,
      total: examples.length,
      page: 1,
      perPage: 25,
      lastPage: 1,
      ...extra,
    },
  })

const learnedRow = {
  id: 7,
  normalizedTitle: 'custom proposal',
  sampleTitle: 'prpe custom new propoosal',
  taskCategoryLabel: 'Real Effort',
  taskCategory: 'real_effort',
  effortScore: 3,
  classificationConfidence: 'medium',
  matchedPattern: 'ai:proposal preparation',
  workTypeLabel: 'Commercial / Sales',
  workType: 'commercial_sales',
  workTypeConfidence: 'medium',
  usageCount: 4,
  affectedTaskCount: 2,
  lastSeenAt: '2026-05-28T02:00:00.000Z',
}

describe('SectionAiWorkloadGovernance', () => {
  beforeEach(() => {
    setCsrfToken('csrf-test')
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    setCsrfToken(null)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('is available from the System Admin navigation config', () => {
    expect(systemAdminModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'ai-workload-governance',
          label: 'AI Workload Governance',
          notificationTabKey: 'system-admin.ai-workload-governance',
        }),
      ]),
    )
  })

  it('renders health cards and learned classification rows', async () => {
    window.fetch
      .mockResolvedValueOnce(healthResponse())
      .mockResolvedValueOnce(snapshotHealthResponse())
      .mockResolvedValueOnce(
        listResponse([learnedRow], {
          total: 1,
        }),
      )

    render(<SectionAiWorkloadGovernance />)

    expect(await screen.findByText('Daily Snapshot Health')).toBeInTheDocument()
    expect(screen.getByText('Latest Snapshot')).toBeInTheDocument()
    expect(screen.getByText('2026-05-31')).toBeInTheDocument()
    expect(screen.getByText('Captured 31d')).toBeInTheDocument()
    expect(screen.getByText('Replayed 31d')).toBeInTheDocument()
    expect(await screen.findByText('Classification Health')).toBeInTheDocument()
    expect(screen.getByText('Classified Tasks')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(await screen.findAllByText('custom proposal')).not.toHaveLength(0)
    expect(screen.getAllByText('prpe custom new propoosal')).not.toHaveLength(0)
    expect(screen.getAllByText('Commercial / Sales').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('searches and paginates learned classifications', async () => {
    window.fetch
      .mockResolvedValueOnce(healthResponse())
      .mockResolvedValueOnce(snapshotHealthResponse())
      .mockResolvedValueOnce(listResponse([], { total: 75, page: 1, perPage: 25, lastPage: 3 }))
      .mockResolvedValueOnce(
        listResponse(
          [
            {
              ...learnedRow,
              id: 8,
              normalizedTitle: 'supplier reconciliation',
              sampleTitle: 'supplier reconciliation',
              workTypeLabel: 'Finance / HR',
            },
          ],
          { total: 1, page: 1, perPage: 25, lastPage: 1 },
        ),
      )
      .mockResolvedValueOnce(
        listResponse([], {
          total: 0,
          page: 1,
          perPage: 50,
          lastPage: 1,
        }),
      )

    render(<SectionAiWorkloadGovernance />)
    await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(3))

    fireEvent.change(screen.getByLabelText(/search learned classifications/i), {
      target: { value: 'supplier' },
    })

    await waitFor(() => expect(window.fetch.mock.calls[3][0]).toContain('search=supplier'))
    expect(await screen.findAllByText('supplier reconciliation')).not.toHaveLength(0)

    fireEvent.change(screen.getAllByLabelText(/rows per page/i)[0], {
      target: { value: '50' },
    })

    await waitFor(() => expect(window.fetch.mock.calls[4][0]).toContain('perPage=50'))
  })

  it('opens advanced filters and sends each filter to the list API', async () => {
    window.fetch.mockImplementation((url) => {
      if (String(url).includes('task-classification-health')) {
        return Promise.resolve(healthResponse())
      }
      if (String(url).includes('snapshot-health')) {
        return Promise.resolve(snapshotHealthResponse())
      }

      return Promise.resolve(listResponse([learnedRow], { total: 1 }))
    })

    render(<SectionAiWorkloadGovernance />)
    await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(3))

    fireEvent.click(screen.getByRole('button', { name: /toggle advanced filters/i }))
    fireEvent.change(screen.getByLabelText(/filter learned classifications by category/i), {
      target: { value: 'real_effort' },
    })
    fireEvent.change(screen.getByLabelText(/filter learned classifications by work type/i), {
      target: { value: 'commercial_sales' },
    })
    fireEvent.change(screen.getByLabelText(/filter learned classifications by confidence/i), {
      target: { value: 'medium' },
    })
    fireEvent.change(screen.getByLabelText(/filter learned classifications by source/i), {
      target: { value: 'ai' },
    })
    fireEvent.change(
      screen.getByLabelText(/filter learned classifications by affected task count/i),
      {
        target: { value: 'with' },
      },
    )

    await waitFor(() => {
      const lastUrl = String(window.fetch.mock.calls.at(-1)?.[0] || '')
      expect(lastUrl).toContain('taskCategory=real_effort')
      expect(lastUrl).toContain('workType=commercial_sales')
      expect(lastUrl).toContain('confidence=medium')
      expect(lastUrl).toContain('source=ai')
      expect(lastUrl).toContain('affected=with')
    })
    expect(screen.getByText('Category: Real Effort')).toBeInTheDocument()
    expect(screen.getByText('Work type: Commercial / Sales')).toBeInTheDocument()
  })

  it('renders every row returned by the server page', async () => {
    const serverPageRows = Array.from({ length: 12 }, (_, index) => ({
      ...learnedRow,
      id: index + 1,
      normalizedTitle: `learned row ${index + 1}`,
      sampleTitle: `sample row ${index + 1}`,
    }))
    window.fetch
      .mockResolvedValueOnce(healthResponse())
      .mockResolvedValueOnce(snapshotHealthResponse())
      .mockResolvedValueOnce(listResponse(serverPageRows, { total: 12, page: 1, perPage: 25 }))

    render(<SectionAiWorkloadGovernance />)

    expect(await screen.findAllByText('learned row 12')).not.toHaveLength(0)
  })

  it('deletes learned classifications after explicit confirmation', async () => {
    window.fetch
      .mockResolvedValueOnce(healthResponse())
      .mockResolvedValueOnce(snapshotHealthResponse())
      .mockResolvedValueOnce(listResponse([learnedRow], { total: 1 }))
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }))
      .mockResolvedValueOnce(healthResponse({ learnedCacheRows: 0 }))

    render(<SectionAiWorkloadGovernance />)

    expect(await screen.findAllByText('custom proposal')).not.toHaveLength(0)
    fireEvent.click(screen.getAllByRole('button', { name: /actions/i })[0])
    fireEvent.click((await screen.findAllByText('Delete learned classification'))[0])

    await waitFor(() => {
      expect(screen.queryAllByText('custom proposal')).toHaveLength(0)
    })
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('will not rewrite existing tasks'),
    )
    expect(window.fetch.mock.calls[3][1]).toMatchObject({ method: 'DELETE' })
  })

  it('shows migration warning when learned storage is unavailable', async () => {
    window.fetch
      .mockResolvedValueOnce(healthResponse({ available: false }))
      .mockResolvedValueOnce(snapshotHealthResponse({ available: false }))
      .mockResolvedValueOnce(
        listResponse([], {
          available: false,
        }),
      )

    render(<SectionAiWorkloadGovernance />)

    expect(await screen.findAllByText(/run migrations before using/i)).not.toHaveLength(0)
  })
})
