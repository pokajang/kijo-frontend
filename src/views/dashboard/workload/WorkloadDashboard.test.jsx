import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'

import store from '../../../store'
import { RightDrawerProvider } from '../../../components/right-drawer/RightDrawerContext'
import { KnowledgePanelProvider, useKnowledgePanel } from '../../knowledge/KnowledgePanelContext'
import KnowledgeSidePanel from '../../knowledge/KnowledgeSidePanel'
import {
  askKnowledgeAssistant,
  clearKnowledgeAssistantThread,
  createKnowledgeAssistantThread,
  getKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeAssistantThread,
} from '../../knowledge/knowledgeApi'
import dialog from '../../../components/dialog/dialogService'
import { apiClientEvents } from '../../../api/apiClient'
import WorkloadDashboard from './WorkloadDashboard'
import { fetchJson, fetchJsonGet } from '../shared/fetchUtils'

vi.mock('../shared/fetchUtils', async () => {
  const actual = await vi.importActual('../shared/fetchUtils')
  return {
    ...actual,
    fetchJson: vi.fn(),
    fetchJsonGet: vi.fn(),
  }
})

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(() => Promise.resolve()),
    confirm: vi.fn(() => Promise.resolve(false)),
  },
}))

vi.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { staff_id: 7, roles: ['Staff'] } }),
}))

vi.mock('../../knowledge/knowledgeApi', () => ({
  askKnowledgeAssistant: vi.fn(),
  clearKnowledgeAssistantThread: vi.fn(),
  createKnowledgeAssistantThread: vi.fn(),
  getKnowledgeArticles: vi.fn(),
  getKnowledgeArticle: vi.fn(),
  getKnowledgeAssistantThread: vi.fn(),
}))

vi.mock('@coreui/react-chartjs', () => ({
  CChartLine: ({ data, options }) => {
    const tooltipLabel = options?.plugins?.tooltip?.callbacks?.label?.({
      dataIndex: 0,
      parsed: { y: data?.datasets?.[0]?.data?.[0] },
    })
    const values = (data?.datasets?.[0]?.data || []).map((value) =>
      value === null ? 'null' : value,
    )

    return (
      <div role="img" aria-label="Workload score chart">
        {(data?.labels || []).join(', ')}
        {' | '}
        {values.join(', ')}
        {' | '}
        {tooltipLabel}
      </div>
    )
  },
}))

const workloadStaff = [
  {
    staffId: 10,
    staffCode: 'ALP',
    staffName: 'Alpha Staff',
    staffLabel: 'ALP - Alpha Staff',
    staffKey: '10',
    score: 8.5,
    activeTasks: 1,
    overdueTasks: 1,
    dueSoonTasks: 0,
    projectTaggedActiveTasks: 1,
    completedInPeriod: 0,
    lateCompletedInPeriod: 0,
    avgDaysLapsed: 24,
    scoreBreakdown: [
      { label: 'Non-project tasks', points: 0 },
      { label: 'Project responsibility', points: 7 },
      { label: 'Deadline pressure', points: 1.5 },
    ],
    workTypeBreakdown: [
      {
        workType: 'technical_specialist',
        workTypeLabel: 'Technical / Specialist',
        activeCount: 1,
        completedCount: 0,
        taskCount: 1,
        effortPoints: 3,
      },
    ],
    projectGroups: [
      {
        projectId: 100,
        projectName: 'Project A',
        clientName: 'Client A',
        projectValue: 1234.5,
        projectRole: 'leader',
        roleWeight: 1,
        valueBand: 1,
        scoreContribution: 7,
        scoreableProgressCount: 3,
        projectTaskPoints: 3,
        projectBasePoints: 1,
        projectProgressPoints: 2,
        projectValuePoints: 1,
        projectOverheadPoints: 4,
        activeTasks: [
          {
            id: 1,
            staffId: 10,
            staffName: 'Alpha Staff',
            staffCode: 'ALP',
            status: 'Ongoing',
            title: 'Overdue work @Project A',
            createdAt: '2026-05-23',
            dueDate: '2026-05-20',
            completedAt: '',
            projectId: 100,
            projectName: 'Project A',
            taskCategory: 'real_effort',
            effortScore: 3,
            workType: 'technical_specialist',
            workTypeLabel: 'Technical / Specialist',
            isOverdue: true,
          },
        ],
        completedTasks: [
          {
            id: 2,
            staffId: 10,
            staffName: 'Alpha Staff',
            staffCode: 'ALP',
            status: 'Completed',
            title: 'Completed project report',
            createdAt: '2026-05-20',
            dueDate: '2026-05-23',
            completedAt: '2026-05-24',
            projectId: 100,
            projectName: 'Project A',
            taskCategory: 'real_effort',
            effortScore: 3,
            workType: 'technical_specialist',
            workTypeLabel: 'Technical / Specialist',
          },
        ],
        progressUpdates: [
          {
            id: 10,
            projectId: 100,
            projectName: 'Project A',
            progressDate: '2026-05-22',
            progressText: 'Manual update for project A',
            sourceType: '',
            sourceTaskId: null,
          },
          {
            id: 11,
            projectId: 100,
            projectName: 'Project A',
            progressDate: '2026-05-18',
            progressText: 'Fourth update for project A',
            sourceType: '',
            sourceTaskId: null,
          },
          {
            id: 12,
            projectId: 100,
            projectName: 'Project A',
            progressDate: '2026-05-17',
            progressText: 'Fifth update for project A',
            sourceType: '',
            sourceTaskId: null,
          },
        ],
      },
    ],
    otherTasks: [],
  },
  {
    staffId: 20,
    staffCode: 'BET',
    staffName: 'Beta Staff',
    staffLabel: 'BET - Beta Staff',
    staffKey: '20',
    score: 6.5,
    activeTasks: 3,
    overdueTasks: 0,
    dueSoonTasks: 1,
    projectTaggedActiveTasks: 0,
    completedInPeriod: 0,
    lateCompletedInPeriod: 0,
    avgDaysLapsed: 2,
    scoreBreakdown: [
      { label: 'Non-project tasks', points: 6 },
      { label: 'Project responsibility', points: 0 },
      { label: 'Deadline pressure', points: 0.5 },
    ],
    workTypeBreakdown: [
      {
        workType: 'coordination_followup',
        workTypeLabel: 'Coordination / Follow-up',
        activeCount: 1,
        completedCount: 0,
        taskCount: 1,
        effortPoints: 2,
      },
      {
        workType: 'management_strategy',
        workTypeLabel: 'Management / Strategy',
        activeCount: 1,
        completedCount: 0,
        taskCount: 1,
        effortPoints: 3,
      },
    ],
    projectGroups: [],
    otherTasks: [
      {
        id: 5,
        staffId: 20,
        staffName: 'Beta Staff',
        staffCode: 'BET',
        status: 'Ongoing',
        title: 'Internal follow up',
        createdAt: '2026-05-24',
        dueDate: '2026-05-30',
        completedAt: '',
        taskCategory: 'coordination_follow_up',
        effortScore: 2,
        workType: 'coordination_followup',
        workTypeLabel: 'Coordination / Follow-up',
        isDueSoon: true,
      },
      {
        id: 6,
        staffId: 20,
        staffName: 'Beta Staff',
        staffCode: 'BET',
        status: 'Ongoing',
        title: 'Prepare internal memo',
        createdAt: '2026-05-25',
        dueDate: '2026-05-31',
        completedAt: '',
        taskCategory: 'real_effort',
        effortScore: 3,
        workType: 'management_strategy',
        workTypeLabel: 'Management / Strategy',
      },
      {
        id: 7,
        staffId: 20,
        staffName: 'Beta Staff',
        staffCode: 'BET',
        status: 'Ongoing',
        title: 'Hidden admin task',
        createdAt: '2026-05-26',
        dueDate: '2026-06-01',
        completedAt: '',
        taskCategory: 'administrative',
        effortScore: 1,
        workType: 'clerical_admin',
        workTypeLabel: 'Clerical / Admin',
      },
    ],
    completedTasks: [],
  },
]

const renderWorkloadDashboard = (props = {}) =>
  render(
    <RightDrawerProvider>
      <WorkloadDashboard startDate="2026-05-01" endDate="2026-05-31" {...props} />
    </RightDrawerProvider>,
  )

const WorkloadKnowledgeDrawerHarness = () => {
  const { openKnowledgeSearch } = useKnowledgePanel()

  return (
    <>
      <button type="button" onClick={openKnowledgeSearch}>
        Open Help
      </button>
      <div className="knowledge-layout-shell">
        <div className="knowledge-layout-main">
          <WorkloadDashboard startDate="2026-05-01" endDate="2026-05-31" />
        </div>
        <KnowledgeSidePanel />
      </div>
    </>
  )
}

const renderWorkloadKnowledgeDrawerHarness = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <RightDrawerProvider>
          <KnowledgePanelProvider>
            <WorkloadKnowledgeDrawerHarness />
          </KnowledgePanelProvider>
        </RightDrawerProvider>
      </MemoryRouter>
    </Provider>,
  )

describe('WorkloadDashboard', () => {
  beforeEach(() => {
    fetchJson.mockReset()
    fetchJsonGet.mockReset()
    askKnowledgeAssistant.mockReset()
    clearKnowledgeAssistantThread.mockReset()
    createKnowledgeAssistantThread.mockReset()
    getKnowledgeArticles.mockReset()
    getKnowledgeArticle.mockReset()
    getKnowledgeAssistantThread.mockReset()
    getKnowledgeAssistantThread.mockResolvedValue({ messages: [], threads: [] })
    dialog.alert.mockClear()
    dialog.confirm.mockClear()
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('loads stats/workload with the selected date range and renders the staff snapshot', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      staff: workloadStaff,
    })

    renderWorkloadDashboard()

    await waitFor(() => expect(fetchJsonGet).toHaveBeenCalledTimes(1))
    expect(fetchJsonGet.mock.calls[0][0]).toContain('stats/workload')
    expect(fetchJsonGet.mock.calls[0][1]).toEqual({
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    })

    await screen.findAllByText('ALP')

    expect(screen.getAllByText('ALP').length).toBeGreaterThan(0)
    expect(screen.getAllByText('BET').length).toBeGreaterThan(0)
    expect(screen.getByText(/Alpha Staff/)).toBeInTheDocument()
    expect(screen.getAllByText('1 Active Task').length).toBeGreaterThan(0)
    expect(screen.getByText('1 Overdue Task')).toBeInTheDocument()
    expect(screen.getAllByText('1 Project')).toHaveLength(1)
    expect(
      screen.getAllByText((_, element) => element?.textContent === 'workload score').length,
    ).toBeGreaterThan(0)
  })

  it('counts displayed project groups in the staff header project chip', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      staff: [
        {
          ...workloadStaff[0],
          projectTaggedActiveTasks: 1,
          projectGroupCount: 2,
          projectGroups: [
            workloadStaff[0].projectGroups[0],
            {
              ...workloadStaff[0].projectGroups[0],
              projectId: 101,
              projectName: 'Project C',
              activeTasks: [],
              completedTasks: [],
              progressUpdates: [
                {
                  id: 30,
                  projectId: 101,
                  projectName: 'Project C',
                  progressDate: '2026-05-21',
                  progressText: 'Manual update for project C',
                  sourceType: '',
                  sourceTaskId: null,
                },
              ],
            },
          ],
        },
      ],
    })

    renderWorkloadDashboard()

    expect(await screen.findByText('2 Projects')).toBeInTheDocument()
    expect(screen.getByText('Project 1 - Project A for Client A')).toBeInTheDocument()
    expect(screen.getByText('Project 2 - Project C for Client A')).toBeInTheDocument()
  })

  it('uses backend snapshot date for workload evidence timing', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      staff: [
        {
          ...workloadStaff[1],
          projectGroups: [],
          otherTasks: [
            {
              id: 30,
              staffId: 20,
              staffName: 'Beta Staff',
              staffCode: 'BET',
              status: 'Ongoing',
              title: 'Historical snapshot task',
              createdAt: '2026-05-30',
              dueDate: '2026-05-30',
              completedAt: '',
              effortScore: 2,
            },
          ],
        },
      ],
    })

    renderWorkloadDashboard()

    await screen.findByText('Historical snapshot task')

    expect(screen.getByText('Overdue by 1 day')).toBeInTheDocument()
  })

  it('shows project workload activity and other tasks, expanding the preview on demand', async () => {
    fetchJsonGet.mockResolvedValueOnce({ status: 'success', staff: workloadStaff })

    renderWorkloadDashboard()

    expect(await screen.findByText('Project 1 - Project A for Client A')).toBeInTheDocument()
    expect(screen.getByText('RM 1,234.50')).toBeInTheDocument()
    expect(screen.getByText('Overdue work')).toBeInTheDocument()
    // Project mention should be stripped from active-task evidence titles
    expect(screen.queryByText('Overdue work @Project A')).not.toBeInTheDocument()
    expect(screen.getAllByText('Active 5MM Task').length).toBeGreaterThan(0)
    expect(screen.getByText('Manual update for project A')).toBeInTheDocument()
    expect(screen.getByText('Fourth update for project A')).toBeInTheDocument()
    // Preview truncates the third progress update until "+1 more" is clicked
    expect(screen.queryByText('Fifth update for project A')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '+1 more' })[0])
    expect(screen.getByText('Fifth update for project A')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Show less' })[0])
    expect(screen.queryByText('Fifth update for project A')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^BET/ }))

    expect(screen.queryByText('Project 1 - Project B for Client B')).not.toBeInTheDocument()
    expect(screen.queryByText('Completed task: Completed delivery')).not.toBeInTheDocument()
    expect(screen.queryByText('Done 5MM Task')).not.toBeInTheDocument()
    expect(screen.getAllByText('Other 5MM Tasks').length).toBeGreaterThan(0)
    expect(screen.queryByText('Closed period task')).not.toBeInTheDocument()
    expect(screen.getByText('Internal follow up')).toBeInTheDocument()
    expect(screen.getByText('Hidden admin task')).toBeInTheDocument()
    expect(screen.getByText('Prepare internal memo')).toBeInTheDocument()
  })

  it('opens the backend workload PDF export URL with the selected date range', async () => {
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null)
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      staff: workloadStaff,
    })

    renderWorkloadDashboard()

    const exportButton = await screen.findByRole('button', { name: /export pdf/i })
    expect(exportButton).toBeEnabled()
    expect(screen.queryByText('Fifth update for project A')).not.toBeInTheDocument()
    expect(screen.getByText('Hidden admin task')).toBeInTheDocument()

    fireEvent.click(exportButton)

    expect(windowOpen).toHaveBeenCalledTimes(1)
    const [url, target] = windowOpen.mock.calls[0]
    expect(target).toBe('_blank')
    expect(url).toContain('stats/workload/pdf')
    expect(url).toContain('start_date=2026-05-01')
    expect(url).toContain('end_date=2026-05-31')
    windowOpen.mockRestore()
  })

  it('renders the graph toggle next to PDF export and swaps accordion content to workload history', async () => {
    fetchJsonGet
      .mockResolvedValueOnce({
        status: 'success',
        asOfDate: '2026-05-31',
        completedWindow: {
          startDate: '2026-05-01',
          endDate: '2026-05-31',
        },
        staff: workloadStaff,
      })
      .mockResolvedValueOnce({
        status: 'success',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        staff: [
          {
            staffKey: '10',
            staffId: 10,
            staffCode: 'ALP',
            staffName: 'Alpha Staff',
            points: [
              { date: '2026-05-29', score: 8, captureMode: 'reconstructed' },
              { date: '2026-05-30', score: 8.5 },
            ],
          },
          {
            staffKey: '20',
            staffId: 20,
            staffCode: 'BET',
            staffName: 'Beta Staff',
            points: [
              { date: '2026-05-29', score: 6 },
              { date: '2026-05-30', score: 6.5 },
            ],
          },
        ],
      })

    renderWorkloadDashboard()

    const exportButton = await screen.findByRole('button', { name: /export pdf/i })
    const graphButton = screen.getByRole('button', { name: /^graph$/i })
    expect(graphButton).toBeEnabled()
    expect(
      exportButton.compareDocumentPosition(graphButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByText('Project 1 - Project A for Client A')).toBeInTheDocument()

    fireEvent.click(graphButton)

    await waitFor(() => expect(fetchJsonGet).toHaveBeenCalledTimes(2))
    expect(fetchJsonGet.mock.calls[1][0]).toContain('stats/workload/history')
    expect(fetchJsonGet.mock.calls[1][1]).toEqual({
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    })
    expect(screen.getByText('Daily score')).toBeInTheDocument()
    const chart = await screen.findByRole('img', { name: 'Workload score chart' })
    expect(chart).toHaveTextContent('May 1, May 2, May 3')
    expect(chart).toHaveTextContent('null, null')
    expect(chart).toHaveTextContent('8, 8.5')
    expect(screen.getAllByRole('img', { name: 'Workload score chart' })).toHaveLength(1)
    expect(screen.queryByText('Project 1 - Project A for Client A')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^BET/ }))

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Workload score chart' })).toHaveTextContent('6, 6.5'),
    )
    expect(screen.getAllByRole('img', { name: 'Workload score chart' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /^evidence$/i }))

    expect(screen.getByText('Project 1 - Project A for Client A')).toBeInTheDocument()
  })

  it('consolidates workload history into weekly averages for medium ranges', async () => {
    fetchJsonGet
      .mockResolvedValueOnce({
        status: 'success',
        staff: workloadStaff,
      })
      .mockResolvedValueOnce({
        status: 'success',
        staff: [
          {
            staffKey: '10',
            staffId: 10,
            staffCode: 'ALP',
            staffName: 'Alpha Staff',
            points: [
              { date: '2026-05-04', score: 10, captureMode: 'captured' },
              { date: '2026-05-05', score: 20, captureMode: 'reconstructed' },
              { date: '2026-05-11', score: 30, captureMode: 'captured' },
            ],
          },
        ],
      })

    renderWorkloadDashboard({ startDate: '2026-05-01', endDate: '2026-06-30' })

    fireEvent.click(await screen.findByRole('button', { name: /^graph$/i }))

    expect(await screen.findByText('Weekly average')).toBeInTheDocument()
    const chart = screen.getByRole('img', { name: 'Workload score chart' })
    expect(chart).toHaveTextContent('May 1-3, May 4-10, May 11-17')
    expect(chart).toHaveTextContent('null, 15, 30')
    expect(chart).toHaveTextContent('May 1-3, 2026: no workload snapshot')
  })

  it('consolidates workload history into monthly averages for long ranges', async () => {
    fetchJsonGet
      .mockResolvedValueOnce({
        status: 'success',
        staff: workloadStaff,
      })
      .mockResolvedValueOnce({
        status: 'success',
        staff: [
          {
            staffKey: '10',
            staffId: 10,
            staffCode: 'ALP',
            staffName: 'Alpha Staff',
            points: [
              { date: '2026-01-05', score: 10, captureMode: 'captured' },
              { date: '2026-01-06', score: 20, captureMode: 'captured' },
              { date: '2026-02-05', score: 25, captureMode: 'reconstructed' },
            ],
          },
        ],
      })

    renderWorkloadDashboard({ startDate: '2026-01-01', endDate: '2026-12-31' })

    fireEvent.click(await screen.findByRole('button', { name: /^graph$/i }))

    expect(await screen.findByText('Monthly average')).toBeInTheDocument()
    const chart = screen.getByRole('img', { name: 'Workload score chart' })
    expect(chart).toHaveTextContent('Jan 2026, Feb 2026, Mar 2026')
    expect(chart).toHaveTextContent('15, 25, null')
    expect(chart).toHaveTextContent('Jan 2026: avg 15 from 2 snapshots')
  })

  it('shows a chart-area error when workload history fails without hiding the snapshot', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchJsonGet
      .mockResolvedValueOnce({
        status: 'success',
        staff: workloadStaff,
      })
      .mockRejectedValueOnce(new Error('history failed'))

    try {
      renderWorkloadDashboard()

      expect(await screen.findByText('Project 1 - Project A for Client A')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /^graph$/i }))

      expect(await screen.findAllByText('Unable to load workload history.')).not.toHaveLength(0)
      expect(screen.getAllByText('ALP').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /^evidence$/i })).toBeInTheDocument()
    } finally {
      consoleError.mockRestore()
    }
  })

  it('opens the native share sheet for a public workload share link when supported', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      staff: workloadStaff,
    })
    fetchJson.mockResolvedValueOnce({
      status: 'success',
      token: 'share-token',
      path: '/share/workload/share-token',
      expiresAt: '2026-06-07T00:00:00+08:00',
    })
    const share = vi.fn(() => Promise.resolve())
    const canShare = vi.fn(() => true)
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShare,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    renderWorkloadDashboard()

    const shareButton = await screen.findByRole('button', { name: /^share$/i })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        expect.stringContaining('stats/workload/share'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ start_date: '2026-05-01', end_date: '2026-05-31' }),
        }),
        undefined,
      )
    })
    expect(canShare).toHaveBeenCalledWith({
      url: 'http://localhost:3000/share/workload/share-token',
    })
    expect(share).toHaveBeenCalledWith({
      title: 'Workload Dashboard',
      text: expect.stringContaining('Workload dashboard snapshot. Expires'),
      url: 'http://localhost:3000/share/workload/share-token',
    })
    expect(writeText).not.toHaveBeenCalled()
    expect(dialog.alert).not.toHaveBeenCalled()
    expect(dialog.confirm).not.toHaveBeenCalled()
  })

  it('silently resets sharing state when native sharing is cancelled', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      staff: workloadStaff,
    })
    fetchJson.mockResolvedValueOnce({
      status: 'success',
      token: 'share-token',
      path: '/share/workload/share-token',
      expiresAt: '2026-06-07T00:00:00+08:00',
    })
    const share = vi.fn(() => Promise.reject(new DOMException('Share cancelled', 'AbortError')))
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    renderWorkloadDashboard()

    const shareButton = await screen.findByRole('button', { name: /^share$/i })
    fireEvent.click(shareButton)

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(shareButton).toBeEnabled())
    expect(writeText).not.toHaveBeenCalled()
    expect(dialog.alert).not.toHaveBeenCalled()
    expect(dialog.confirm).not.toHaveBeenCalled()
  })

  it('copies a public workload share link and shows a toast when native sharing is unavailable', async () => {
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      staff: workloadStaff,
    })
    fetchJson.mockResolvedValueOnce({
      status: 'success',
      token: 'share-token',
      path: '/share/workload/share-token',
      expiresAt: '2026-06-07T00:00:00+08:00',
    })
    const writeText = vi.fn(() => Promise.resolve())
    const toastHandler = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    window.addEventListener(apiClientEvents.name, toastHandler)

    try {
      renderWorkloadDashboard()

      const shareButton = await screen.findByRole('button', { name: /^share$/i })
      fireEvent.click(shareButton)

      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith('http://localhost:3000/share/workload/share-token'),
      )
      expect(dialog.alert).not.toHaveBeenCalled()
      expect(dialog.confirm).not.toHaveBeenCalled()
      await waitFor(() =>
        expect(toastHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              type: 'toast',
              color: 'success',
              message: expect.stringContaining('Share link copied. Expires'),
            }),
          }),
        ),
      )
    } finally {
      window.removeEventListener(apiClientEvents.name, toastHandler)
    }
  })

  it('shows the generated share link when native sharing and clipboard fallback fail', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      asOfDate: '2026-05-31',
      completedWindow: {
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
      staff: workloadStaff,
    })
    fetchJson.mockResolvedValueOnce({
      status: 'success',
      token: 'share-token',
      path: '/share/workload/share-token',
      expiresAt: '2026-06-07T00:00:00+08:00',
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn(() => Promise.reject(new Error('Native share failed'))),
    })
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error('Clipboard failed'))
      .mockResolvedValueOnce(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    try {
      renderWorkloadDashboard()

      const shareButton = await screen.findByRole('button', { name: /^share$/i })
      fireEvent.click(shareButton)

      await waitFor(() =>
        expect(dialog.confirm).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:3000/share/workload/share-token'),
          expect.objectContaining({
            cancelText: 'OK',
            confirmText: 'Copy link',
            onConfirm: expect.any(Function),
          }),
        ),
      )
      const [, options] = dialog.confirm.mock.calls[0]
      await options.onConfirm()
      expect(writeText).toHaveBeenLastCalledWith('http://localhost:3000/share/workload/share-token')
    } finally {
      consoleWarn.mockRestore()
    }
  })

  it('opens first staff row by default and toggles via the accordion header', async () => {
    fetchJsonGet.mockResolvedValueOnce({ status: 'success', staff: workloadStaff })

    renderWorkloadDashboard()

    expect(await screen.findByText('Project 1 - Project A for Client A')).toBeInTheDocument()

    const alphaToggle = screen.getByRole('button', { name: /^ALP/ })
    const betaToggle = screen.getByRole('button', { name: /^BET/ })

    expect(alphaToggle).toHaveAttribute('aria-expanded', 'true')
    expect(betaToggle).toHaveAttribute('aria-expanded', 'false')

    const scoreTrigger = screen.getByLabelText(
      'Show workload score calculation for ALP - Alpha Staff',
    )
    expect(scoreTrigger).toHaveAttribute('role', 'button')
    expect(scoreTrigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(scoreTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0)
    expect(screen.getByText('Technical / Specialist: 1')).toBeInTheDocument()
    expect(alphaToggle).not.toHaveTextContent('Technical / Specialist: 1')

    fireEvent.click(scoreTrigger)

    expect(alphaToggle).toHaveAttribute('aria-expanded', 'true')
    expect(scoreTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Workload score calculation')).toBeInTheDocument()
    expect(screen.getByText('Non Project Tasks Score')).toBeInTheDocument()
    expect(screen.getByText('Project Task / Responsibility Score')).toBeInTheDocument()
    expect(screen.getByText('Deadline Pressure Score')).toBeInTheDocument()
    expect(screen.queryByText('Completed Work Score')).not.toBeInTheDocument()
    expect(screen.getByText('Work type breakdown')).toBeInTheDocument()
    expect(screen.getAllByText('Technical / Specialist').length).toBeGreaterThan(0)
    expect(screen.queryByText('Completed project report')).not.toBeInTheDocument()
    expect(screen.queryByText(/Completed 2026-05-24/)).not.toBeInTheDocument()
    expect(screen.getByText('3 effort x 0.5 overdue weight')).toBeInTheDocument()
    expect(screen.queryByText('3 effort x 35% late completed credit')).not.toBeInTheDocument()
    expect(
      screen.getByText('Deadline pressure capped at lower of 4 or 35% of active workload base.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('0 scored non-project active tasks x 2')).not.toBeInTheDocument()
    expect(
      screen.queryByText('1 project weighted by role, value, tasks, and progress'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Total Score')).toBeInTheDocument()
    expect(screen.getAllByText('8.5').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByLabelText('Show workload score rules'))

    expect(await screen.findByText('Workload score rules')).toBeInTheDocument()
    expect(screen.getByText('Workload matrix')).toBeInTheDocument()
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Moderate').length).toBeGreaterThan(0)
    expect(screen.getAllByText('High').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Extreme').length).toBeGreaterThan(0)
    expect(screen.getByText('Task mark / effort score')).toBeInTheDocument()
    expect(screen.getAllByText('Work type').length).toBeGreaterThan(0)
    expect(screen.getByText(/Workload score measures effort and pressure/i)).toBeInTheDocument()
    expect(screen.getByText('Software / IT')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Waiting states such as approval, client reply, vendor quotation, signoff, or confirmation.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Unclear / Not graded')).toBeInTheDocument()
    expect(screen.getByText(/Unknown or vague task titles/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /active project task effort \+ \(\(base \+ capped manual progress \+ capped value band\) x role weight\)/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Leader / PIC / Owner')).toBeInTheDocument()
    expect(screen.getByText(/within 7 days of the dashboard snapshot date/i)).toBeInTheDocument()
    expect(screen.getByText(/Due-soon tasks add effort score x 0.25/i)).toBeInTheDocument()
    expect(screen.getByText(/capped at the lower of 4 points or 35%/i)).toBeInTheDocument()
    expect(screen.getByText(/Completed tasks are not included in/i)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1))
    await waitFor(() => expect(screen.queryByText('Workload score rules')).not.toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('Close workload score calculation'))

    await waitFor(() =>
      expect(screen.queryByText('Workload score calculation')).not.toBeInTheDocument(),
    )
    expect(scoreTrigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(scoreTrigger)

    expect(await screen.findByText('Workload score calculation')).toBeInTheDocument()
    expect(scoreTrigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(betaToggle)

    expect(alphaToggle).toHaveAttribute('aria-expanded', 'false')
    expect(betaToggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Internal follow up')).toBeInTheDocument()
    expect(screen.queryByText('Project 1 - Project B for Client B')).not.toBeInTheDocument()

    fireEvent.click(betaToggle)

    expect(alphaToggle).toHaveAttribute('aria-expanded', 'false')
    expect(betaToggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('allows only one right drawer between workload score and Knowledge help', async () => {
    fetchJsonGet.mockResolvedValueOnce({ status: 'success', staff: workloadStaff })
    getKnowledgeArticles.mockResolvedValueOnce({ data: [] })

    renderWorkloadKnowledgeDrawerHarness()

    const scoreTrigger = await screen.findByLabelText(
      'Show workload score calculation for ALP - Alpha Staff',
    )

    fireEvent.click(scoreTrigger)

    expect(await screen.findByText('Workload score calculation')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search Knowledge')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Open Help'))

    expect(await screen.findByPlaceholderText('Search Knowledge')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText('Workload score calculation')).not.toBeInTheDocument(),
    )

    fireEvent.click(scoreTrigger)

    expect(await screen.findByText('Workload score calculation')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search Knowledge')).not.toBeInTheDocument()
  })

  it('falls back to the local score calculation when the backend breakdown is absent', async () => {
    const [legacyAlpha, ...legacyRest] = workloadStaff.map((staff) => {
      const { scoreBreakdown, ...legacyStaff } = staff
      return legacyStaff
    })
    fetchJsonGet.mockResolvedValueOnce({
      status: 'success',
      staff: [{ ...legacyAlpha, score: 7 }, ...legacyRest],
    })

    renderWorkloadDashboard()

    const scoreTrigger = await screen.findByLabelText(
      'Show workload score calculation for ALP - Alpha Staff',
    )

    fireEvent.click(scoreTrigger)

    expect(await screen.findByText('Active tasks')).toBeInTheDocument()
    expect(screen.queryByText('1 x 2 = 2')).not.toBeInTheDocument()
    expect(screen.queryByText('1 count x 2 weight')).not.toBeInTheDocument()
    expect(screen.getByText('Overdue tasks')).toBeInTheDocument()
    expect(screen.queryByText('1 x 4 = 4')).not.toBeInTheDocument()
    expect(screen.getByText('Project responsibility')).toBeInTheDocument()
    expect(screen.queryByText('1 x 1 = 1')).not.toBeInTheDocument()
  })

  it('renders the loading state until the fetch resolves', async () => {
    let resolveFetch
    fetchJsonGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    renderWorkloadDashboard()

    expect(screen.getByText('Loading workload snapshot...')).toBeInTheDocument()

    resolveFetch({ status: 'success', staff: workloadStaff })
    await screen.findAllByText('ALP')
    expect(screen.queryByText('Loading workload snapshot...')).not.toBeInTheDocument()
  })

  it('renders an empty-state message when the backend returns no staff', async () => {
    fetchJsonGet.mockResolvedValueOnce({ status: 'success', staff: [] })

    renderWorkloadDashboard()

    expect(await screen.findByText('No workload data found.')).toBeInTheDocument()
  })

  it('renders only a sanitized error and hides the empty-state when the backend reports an error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchJsonGet.mockResolvedValueOnce({
      status: 'error',
      message: 'internal SQL leak: SELECT * FROM tasks',
    })

    renderWorkloadDashboard()

    expect(await screen.findByText(/Unable to load workload data/i)).toBeInTheDocument()
    // Internal/leaky text must never reach the UI
    expect(screen.queryByText(/SELECT \* FROM tasks/)).not.toBeInTheDocument()
    expect(screen.queryByText(/internal SQL leak/)).not.toBeInTheDocument()
    // Error + empty-state must not render simultaneously
    expect(screen.queryByText('No workload data found.')).not.toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('renders the sanitized error when fetchJsonGet rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchJsonGet.mockRejectedValueOnce(new Error('boom: secret stack frame'))

    renderWorkloadDashboard()

    expect(await screen.findByText(/Unable to load workload data/i)).toBeInTheDocument()
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('aborts the in-flight fetch when the date range changes and re-fetches with the new range', async () => {
    fetchJsonGet.mockResolvedValue({ status: 'success', staff: workloadStaff })

    const { rerender } = render(<WorkloadDashboard startDate="2026-05-01" endDate="2026-05-31" />)
    await waitFor(() => expect(fetchJsonGet).toHaveBeenCalledTimes(1))

    rerender(<WorkloadDashboard startDate="2026-06-01" endDate="2026-06-30" />)

    await waitFor(() => expect(fetchJsonGet).toHaveBeenCalledTimes(2))
    expect(fetchJsonGet.mock.calls[1][1]).toEqual({
      start_date: '2026-06-01',
      end_date: '2026-06-30',
    })
  })
})
