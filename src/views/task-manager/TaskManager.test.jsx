import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import TaskManager, { buildPersonalTasksUrl } from './TaskManager'
import dialog from '../../components/dialog/dialogService'
import { toastEvents } from '../../components/toast/toastService'

const projectApiMocks = vi.hoisted(() => ({
  listActiveProjectOptions: vi.fn(),
}))

vi.mock('./TaskTable', () => ({
  default: ({ tasks = [], onCreateTask }) => (
    <>
      <button type="button" onClick={onCreateTask}>
        Open Create Task
      </button>
      <div data-testid="task-table-statuses">
        {tasks.map((task) => `${task.id}:${task.aiClassificationStatus || ''}`).join('|')}
      </div>
    </>
  ),
}))

vi.mock('./CreateTask', () => ({
  default: ({ taskDrafts, projectOptions, onCancel, onDraftChange, onSaveTasks }) => (
    <>
      <div data-testid="project-option-count">{projectOptions.length}</div>
      <div data-testid="project-option-client">{projectOptions[0]?.clientName || ''}</div>
      <div data-testid="draft-task-category">{taskDrafts[0]?.taskCategory}</div>
      <div data-testid="draft-classification-status">{taskDrafts[0]?.classificationStatus}</div>
      <div data-testid="draft-project-client">{taskDrafts[0]?.projectClientName || ''}</div>
      <button type="button" onClick={onCancel}>
        Cancel Task
      </button>
      <button
        type="button"
        onClick={() => {
          const draftId = taskDrafts[0].id
          onDraftChange(draftId, 'title', 'Prepare gantt chart for @Active Project')
          onDraftChange(draftId, 'projectId', '100')
        }}
      >
        Set Project Task
      </button>
      <button
        type="button"
        onClick={() => {
          const draftId = taskDrafts[0].id
          onDraftChange(draftId, 'title', 'Prepare gantt chart for @Saved Project')
          onDraftChange(draftId, 'projectId', '100')
          onDraftChange(draftId, 'projectLabel', 'Saved Project')
          onDraftChange(draftId, 'projectClientName', 'Saved Client')
        }}
      >
        Set Saved Project Task
      </button>
      <button
        type="button"
        onClick={() => {
          const draftId = taskDrafts[0].id
          onDraftChange(draftId, 'title', 'Plain task')
          onDraftChange(draftId, 'projectId', '')
        }}
      >
        Set Plain Task
      </button>
      <button
        type="button"
        onClick={() => {
          const draftId = taskDrafts[0].id
          onDraftChange(draftId, 'title', 'Create training module')
        }}
      >
        Set Training Task
      </button>
      <button
        type="button"
        onClick={() => {
          const draftId = taskDrafts[0].id
          onDraftChange(draftId, 'title', 'Invalid date task')
          onDraftChange(draftId, 'dueDate', '15-05-2026')
        }}
      >
        Set Invalid Date Task
      </button>
      <button type="button" onClick={onSaveTasks}>
        Save Task
      </button>
    </>
  ),
}))

vi.mock('../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
    prompt: vi.fn(),
  },
}))

vi.mock('../project/manage/projectApi', () => ({
  listActiveProjectOptions: projectApiMocks.listActiveProjectOptions,
}))

const LocationProbe = () => {
  const location = useLocation()

  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

const jsonResponse = (data, { ok = true, status = 200, statusText = 'OK' } = {}) => ({
  ok,
  status,
  statusText,
  headers: new Headers({ 'content-type': 'application/json' }),
  clone: () => jsonResponse(data, { ok, status, statusText }),
  json: async () => data,
})

const renderTaskManager = (initialEntry = '/task-manager') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/task-manager"
          element={
            <>
              <TaskManager />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

describe('TaskManager route actions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    projectApiMocks.listActiveProjectOptions.mockReset()
    projectApiMocks.listActiveProjectOptions.mockResolvedValue([
      { id: 100, projectName: 'Active Project', clientName: 'Alpha Client', status: 'Active' },
    ])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) => {
        if (String(url).includes('tasks/classify')) {
          const body = JSON.parse(init.body || '{}')
          const title = String(body.title || '').toLowerCase()
          const isRealEffort = title.includes('training') || title.includes('gantt')

          return jsonResponse({
            status: 'success',
            classification: isRealEffort
              ? {
                  taskCategory: 'real_effort',
                  taskCategoryLabel: 'Real Effort',
                  effortScore: 3,
                  classificationConfidence: 'high',
                  classificationSource: 'system',
                  userOverride: false,
                  matchedPattern: 'rule:real_effort',
                }
              : {
                  taskCategory: 'uncategorised',
                  taskCategoryLabel: 'General Task',
                  effortScore: 1,
                  classificationConfidence: 'low',
                  classificationSource: 'system',
                  userOverride: false,
                  matchedPattern: null,
                },
          })
        }

        return jsonResponse({ status: 'success', tasks: [] })
      }),
    )
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens create task modal from action=create and clears the query when closed', async () => {
    renderTaskManager('/task-manager?action=create')

    expect(await screen.findByText('Create Task')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Task' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/task-manager')
    })
  })

  it('saves inline project mention title with project id', async () => {
    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    await waitFor(() => {
      expect(screen.getByTestId('project-option-count')).toHaveTextContent('1')
      expect(screen.getByTestId('project-option-client')).toHaveTextContent('Alpha Client')
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Set Project Task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    await waitFor(() => {
      const batchCall = global.fetch.mock.calls.find(([url]) => String(url).includes('tasks/batch'))
      expect(batchCall).toBeTruthy()

      const payload = JSON.parse(batchCall[1].body)
      expect(batchCall[1]).toEqual(expect.objectContaining({ method: 'POST' }))
      expect(payload).toEqual({
        tasks: [
          {
            title: 'Prepare gantt chart for',
            due_date: expect.any(String),
            project_id: 100,
          },
        ],
      })
    })
  })

  it('saves a restored project draft without persisting the visible project mention', async () => {
    projectApiMocks.listActiveProjectOptions.mockResolvedValue([])
    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Set Saved Project Task' }))

    await waitFor(() => {
      expect(screen.getByTestId('draft-project-client')).toHaveTextContent('Saved Client')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    await waitFor(() => {
      const batchCall = global.fetch.mock.calls.find(([url]) => String(url).includes('tasks/batch'))
      expect(batchCall).toBeTruthy()

      const payload = JSON.parse(batchCall[1].body)
      expect(payload).toEqual({
        tasks: [
          {
            title: 'Prepare gantt chart for',
            due_date: expect.any(String),
            project_id: 100,
          },
        ],
      })
    })
  })

  it('saves untagged task titles unchanged', async () => {
    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Set Plain Task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    await waitFor(() => {
      const batchCall = global.fetch.mock.calls.find(([url]) => String(url).includes('tasks/batch'))
      expect(batchCall).toBeTruthy()

      const payload = JSON.parse(batchCall[1].body)
      expect(payload).toEqual({
        tasks: [
          {
            title: 'Plain task',
            due_date: expect.any(String),
            project_id: null,
          },
        ],
      })
    })
  })

  it('shows AI pending feedback and polls saved tasks until classification is applied', async () => {
    const apiEvents = []
    const apiEventHandler = (event) => apiEvents.push(event.detail)
    window.addEventListener(toastEvents.name, apiEventHandler)
    let personalLoads = 0

    global.fetch.mockImplementation(async (url, init = {}) => {
      if (String(url).includes('tasks/classify')) {
        return jsonResponse({
          status: 'success',
          classification: {
            taskCategory: 'uncategorised',
            taskCategoryLabel: 'General Task',
            effortScore: 1,
            classificationConfidence: 'low',
            classificationSource: 'system',
            userOverride: false,
            matchedPattern: null,
          },
        })
      }

      if (String(url).includes('tasks/batch')) {
        return jsonResponse({
          status: 'success',
          tasks: [
            {
              id: 501,
              title: 'Plain task',
              aiClassificationStatus: 'pending',
            },
          ],
        })
      }

      if (String(url).includes('tasks/personal')) {
        personalLoads += 1
        const aiClassificationStatus = personalLoads >= 3 ? 'applied' : 'pending'

        return jsonResponse({
          status: 'success',
          tasks:
            personalLoads === 1
              ? []
              : [
                  {
                    id: 501,
                    title: 'Plain task',
                    aiClassificationStatus,
                  },
                ],
        })
      }

      return jsonResponse({ status: 'success', tasks: [] })
    })

    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Set Plain Task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    await waitFor(() => {
      expect(apiEvents).toContainEqual(
        expect.objectContaining({
          type: 'toast',
          message: 'Task saved. AI classification is updating in the background.',
        }),
      )
      expect(screen.getByTestId('task-table-statuses')).toHaveTextContent('501:pending')
    })

    await waitFor(
      () => {
        expect(screen.getByTestId('task-table-statuses')).toHaveTextContent('501:applied')
      },
      { timeout: 6000 },
    )

    window.removeEventListener(toastEvents.name, apiEventHandler)
  }, 10000)

  it('loads backend classification for legacy saved drafts with missing classification fields', async () => {
    window.localStorage.setItem(
      'task-manager.create-task-drafts.v3',
      JSON.stringify([
        {
          id: 'legacy-draft',
          title: 'Create training module',
          dueDate: '2026-05-30',
          projectId: '',
        },
      ]),
    )

    renderTaskManager('/task-manager?action=create')

    expect(await screen.findByTestId('draft-classification-status')).toHaveTextContent('pending')

    await waitFor(() => {
      expect(screen.getByTestId('draft-task-category')).toHaveTextContent('real_effort')
    })
  })

  it('requests backend classification after the draft title debounce', async () => {
    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Set Training Task' }))

    expect(screen.getByTestId('draft-classification-status')).toHaveTextContent('pending')
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes('tasks/classify'))).toBe(
      false,
    )

    await waitFor(() => {
      expect(global.fetch.mock.calls.some(([url]) => String(url).includes('tasks/classify'))).toBe(
        true,
      )
      expect(screen.getByTestId('draft-task-category')).toHaveTextContent('real_effort')
    })
  })

  it('restores project client metadata from saved task drafts', async () => {
    window.localStorage.setItem(
      'task-manager.create-task-drafts.v3',
      JSON.stringify([
        {
          id: 'saved-project-draft',
          title: 'Prepare gantt chart for @Saved Project',
          dueDate: '2026-05-30',
          projectId: '777',
          projectLabel: 'Saved Project',
          projectClientName: 'Saved Client',
        },
      ]),
    )

    renderTaskManager('/task-manager')
    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))

    await waitFor(() => {
      expect(screen.getByTestId('draft-project-client')).toHaveTextContent('Saved Client')
    })
  })

  it('classifies the saved title without the visible project mention', async () => {
    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    await waitFor(() => {
      expect(screen.getByTestId('project-option-count')).toHaveTextContent('1')
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Set Project Task' }))

    await waitFor(() => {
      const classifyCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes('tasks/classify'),
      )
      expect(JSON.parse(classifyCall[1].body)).toEqual({ title: 'Prepare gantt chart for' })
    })
  })

  it('does not let stale backend classification overwrite a newer title', async () => {
    const classifyRequests = []
    global.fetch.mockImplementation((url, init = {}) => {
      if (String(url).includes('tasks/classify')) {
        const body = JSON.parse(init.body || '{}')

        return new Promise((resolve) => {
          classifyRequests.push({
            title: body.title,
            resolve: (classification) =>
              resolve(jsonResponse({ status: 'success', classification })),
          })
        })
      }

      return Promise.resolve(jsonResponse({ status: 'success', tasks: [] }))
    })

    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Set Training Task' }))

    await waitFor(() => {
      expect(classifyRequests).toHaveLength(1)
      expect(classifyRequests[0].title).toBe('Create training module')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Set Plain Task' }))

    await waitFor(() => {
      expect(classifyRequests).toHaveLength(2)
      expect(classifyRequests[1].title).toBe('Plain task')
    })

    classifyRequests[1].resolve({
      taskCategory: 'uncategorised',
      taskCategoryLabel: 'General Task',
      effortScore: 1,
      classificationConfidence: 'low',
      classificationSource: 'system',
      userOverride: false,
      matchedPattern: null,
    })

    await waitFor(() => {
      expect(screen.getByTestId('draft-classification-status')).toHaveTextContent('resolved')
      expect(screen.getByTestId('draft-task-category')).toHaveTextContent('uncategorised')
    })

    classifyRequests[0].resolve({
      taskCategory: 'real_effort',
      taskCategoryLabel: 'Real Effort',
      effortScore: 3,
      classificationConfidence: 'high',
      classificationSource: 'system',
      userOverride: false,
      matchedPattern: 'rule:real_effort',
    })

    await waitFor(() => {
      expect(screen.getByTestId('draft-task-category')).toHaveTextContent('uncategorised')
    })
  })

  it('blocks invalid due date values before posting the batch request', async () => {
    renderTaskManager('/task-manager')

    fireEvent.click(screen.getByRole('button', { name: 'Open Create Task' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Set Invalid Date Task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }))

    await waitFor(() => {
      expect(dialog.alert).toHaveBeenCalledWith('Please choose a valid due date for each task.')
    })

    const batchCall = global.fetch.mock.calls.find(([url]) => String(url).includes('tasks/batch'))
    expect(batchCall).toBeUndefined()
  })
})

describe('buildPersonalTasksUrl', () => {
  it('omits date params for all-time task loading', () => {
    expect(
      buildPersonalTasksUrl('https://example.test/', {
        preset: 'all',
        startDate: '',
        endDate: '',
      }),
    ).toBe('https://example.test/tasks/personal')
  })

  it('uses start and end params for bounded task loading', () => {
    expect(
      buildPersonalTasksUrl('https://example.test/', {
        preset: 'custom',
        startDate: '2025-12-01',
        endDate: '2026-01-31',
      }),
    ).toBe('https://example.test/tasks/personal?start=2025-12-01&end=2026-01-31')
  })
})
