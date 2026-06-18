import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ManageProject from './ManageProject'
import { fetchProjects, handleDeleteProject } from './actionHandlers'
import dialog from '../../../components/dialog/dialogService'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('./ProjectTable', () => ({
  default: ({
    projects = [],
    onPeriodRangeChange,
    onManage,
    onClose,
    onGenerateInvoice,
    onGenerateDO,
    onGenerateJD14,
    onGenerateVendorLoa,
    onGenerateSupplierPo,
    onDelete,
    deletingProjectId,
  }) => (
    <div>
      <div data-testid="project-list">
        {projects.map((project) => project.project_name).join(',')}
      </div>
      <div data-testid="deleting-project-id">{deletingProjectId || ''}</div>
      <button
        type="button"
        onClick={() => onPeriodRangeChange({ preset: 'all', startDate: '', endDate: '' })}
      >
        Change Period
      </button>
      <button
        type="button"
        onClick={() =>
          onManage({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          })
        }
      >
        Manage Project
      </button>
      <button
        type="button"
        onClick={() =>
          onClose(
            {
              id: 12,
              project_name: 'Project Alpha',
              project_type: 'Equipment Supply',
            },
            'Completed',
          )
        }
      >
        Complete Project
      </button>
      <button
        type="button"
        onClick={() =>
          onGenerateInvoice({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          })
        }
      >
        Create Invoice From Project
      </button>
      <button
        type="button"
        onClick={() =>
          onGenerateDO({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          })
        }
      >
        Create DO From Project
      </button>
      <button
        type="button"
        onClick={() =>
          onGenerateJD14({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Training',
          })
        }
      >
        Create JD14 From Project
      </button>
      <button
        type="button"
        onClick={() =>
          onGenerateVendorLoa({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          })
        }
      >
        Create Vendor LOA From Project
      </button>
      <button
        type="button"
        onClick={() =>
          onGenerateSupplierPo({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          })
        }
      >
        Create Supplier PO From Project
      </button>
      <button
        type="button"
        disabled={deletingProjectId != null}
        onClick={() =>
          onDelete({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          })
        }
      >
        Delete Project
      </button>
      <button
        type="button"
        onClick={() =>
          onDelete({
            id: 12,
            project_name: 'Project Alpha',
            project_type: 'Equipment Supply',
          })
        }
      >
        Force Delete Project
      </button>
    </div>
  ),
}))

vi.mock('./actionHandlers', () => ({
  fetchProjects: vi.fn(),
  handleDeleteProject: vi.fn(),
}))

vi.mock('./CloseProjectModal', () => ({
  default: ({ onConfirm }) => (
    <button type="button" onClick={onConfirm}>
      Confirm Close
    </button>
  ),
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
  },
}))

const renderManageProject = () =>
  render(
    <MemoryRouter>
      <ManageProject />
    </MemoryRouter>,
  )

const createDeferred = () => {
  let resolve
  let reject
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

describe('ManageProject commercial create routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchProjects.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it.each([
    [
      'invoice',
      /create invoice from project/i,
      '/commercial/invoice/create/12',
      'Equipment Supply',
    ],
    [
      'delivery-order',
      /create do from project/i,
      '/commercial/delivery-order/create/12',
      'Equipment Supply',
    ],
    ['jd14', /create jd14 from project/i, '/commercial/jd14/create/12', 'Training'],
    [
      'vendor-loa',
      /create vendor loa from project/i,
      '/commercial/vendor-loa/create/12',
      'Equipment Supply',
    ],
    [
      'supplier-po',
      /create supplier po from project/i,
      '/commercial/supplier-po/create/12',
      'Equipment Supply',
    ],
  ])(
    'routes project-origin %s creation to the shared create page',
    (_, buttonName, path, projectType) => {
      renderManageProject()

      fireEvent.click(screen.getByRole('button', { name: buttonName }))

      expect(navigateMock).toHaveBeenCalledWith(path, {
        state: {
          project: expect.objectContaining({
            id: 12,
            project_name: 'Project Alpha',
            project_type: projectType,
          }),
        },
      })
    },
  )

  it('routes project management to the canonical slugged detail page', () => {
    renderManageProject()

    fireEvent.click(screen.getByRole('button', { name: /^manage project$/i }))

    expect(navigateMock).toHaveBeenCalledWith('/project/manage/12/equipment-supply/project-alpha', {
      state: {
        project: expect.objectContaining({
          id: 12,
          project_name: 'Project Alpha',
          project_type: 'Equipment Supply',
        }),
        returnTo: '/',
      },
    })
  })
})

describe('ManageProject project loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchProjects.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('loads projects with period range and abort signal', async () => {
    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalled())

    expect(fetchProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        periodRange: expect.objectContaining({ preset: 'ytd' }),
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('ignores abort rejections without alerting the user', async () => {
    const abortError = Object.assign(new Error('Request aborted'), { name: 'AbortError' })
    const request = createDeferred()
    fetchProjects.mockReturnValue(request.promise)

    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalled())

    await act(async () => {
      request.reject(abortError)
      await request.promise.catch(() => {})
    })

    expect(screen.getByTestId('project-list')).toHaveTextContent('')
    expect(dialog.alert).not.toHaveBeenCalled()
  })

  it('alerts and keeps existing projects for real refresh failures', async () => {
    fetchProjects
      .mockResolvedValueOnce([{ id: 1, project_name: 'Existing Project' }])
      .mockRejectedValueOnce(new Error('Failed now'))

    renderManageProject()

    await waitFor(() =>
      expect(screen.getByTestId('project-list')).toHaveTextContent('Existing Project'),
    )

    fireEvent.click(screen.getByRole('button', { name: /change period/i }))

    await waitFor(() => expect(dialog.alert).toHaveBeenCalledWith('Failed now'))
    expect(screen.getByTestId('project-list')).toHaveTextContent('Existing Project')
  })

  it('does not let stale project responses overwrite newer results', async () => {
    const firstRequest = createDeferred()
    const secondRequest = createDeferred()
    fetchProjects
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise)

    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /change period/i }))

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(2))

    await act(async () => {
      secondRequest.resolve([{ id: 2, project_name: 'Newer Project' }])
      await secondRequest.promise
    })
    expect(screen.getByTestId('project-list')).toHaveTextContent('Newer Project')

    await act(async () => {
      firstRequest.resolve([{ id: 1, project_name: 'Older Project' }])
      await firstRequest.promise
    })
    expect(screen.getByTestId('project-list')).toHaveTextContent('Newer Project')
    expect(screen.getByTestId('project-list')).not.toHaveTextContent('Older Project')
  })

  it('does not alert when an aborted previous request rejects after a period change', async () => {
    const firstRequest = createDeferred()
    const secondRequest = createDeferred()
    fetchProjects
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise)

    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /change period/i }))

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(2))

    await act(async () => {
      firstRequest.reject(new Error('Old request failed after abort'))
      await firstRequest.promise.catch(() => {})
    })

    expect(dialog.alert).not.toHaveBeenCalled()

    await act(async () => {
      secondRequest.resolve([{ id: 2, project_name: 'Current Project' }])
      await secondRequest.promise
    })

    expect(screen.getByTestId('project-list')).toHaveTextContent('Current Project')
  })
})

describe('ManageProject delete flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchProjects.mockResolvedValue([])
    handleDeleteProject.mockResolvedValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  it('passes deletingProjectId to ProjectTable while delete is pending', async () => {
    const deleteRequest = createDeferred()
    handleDeleteProject.mockReturnValue(deleteRequest.promise)

    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /^delete project$/i }))

    await waitFor(() => expect(screen.getByTestId('deleting-project-id')).toHaveTextContent('12'))

    await act(async () => {
      deleteRequest.resolve(false)
      await deleteRequest.promise
    })

    await waitFor(() => expect(screen.getByTestId('deleting-project-id')).toHaveTextContent(''))
  })

  it('calls handleDeleteProject when deleting a project', async () => {
    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /^delete project$/i }))

    await waitFor(() => expect(handleDeleteProject).toHaveBeenCalledTimes(1))
    expect(handleDeleteProject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        project_name: 'Project Alpha',
      }),
    )
  })

  it('guards duplicate delete clicks while a delete is pending', async () => {
    const deleteRequest = createDeferred()
    handleDeleteProject.mockReturnValue(deleteRequest.promise)

    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    const deleteButton = screen.getByRole('button', { name: /^force delete project$/i })
    fireEvent.click(deleteButton)
    fireEvent.click(deleteButton)

    expect(handleDeleteProject).toHaveBeenCalledTimes(1)

    await act(async () => {
      deleteRequest.resolve(false)
      await deleteRequest.promise
    })
  })

  it('refreshes project list after successful delete', async () => {
    handleDeleteProject.mockResolvedValue(true)

    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /^delete project$/i }))

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(2))
  })

  it('does not refresh project list after cancelled delete', async () => {
    handleDeleteProject.mockResolvedValue(false)

    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /^delete project$/i }))

    await waitFor(() => expect(handleDeleteProject).toHaveBeenCalledTimes(1))
    expect(fetchProjects).toHaveBeenCalledTimes(1)
  })
})

describe('ManageProject close flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchProjects.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('refreshes project list after close confirmation', async () => {
    renderManageProject()

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /^complete project$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^confirm close$/i }))

    await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(2))
  })
})
