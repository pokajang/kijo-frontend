import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../auth/AuthProvider'
import WorkflowSetupStatusProvider, {
  RoleAwareWorkflowSetupStatusProvider,
  useWorkflowSetupStatus,
} from './WorkflowSetupStatusProvider'

const Consumer = () => {
  const { getWorkflowSetupTotal, getWorkflowSetupCount } = useWorkflowSetupStatus()

  return (
    <div>
      <span data-testid="total">{getWorkflowSetupTotal()}</span>
      <span data-testid="leave">{getWorkflowSetupCount('leave-application')}</span>
      <span data-testid="salary">{getWorkflowSetupCount('salary-application')}</span>
    </div>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('WorkflowSetupStatusProvider', () => {
  it('fetches workflow setup status and exposes total and template helpers', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        status: 'success',
        data: {
          total_missing: 3,
          templates: {
            'leave-application': { missing: 2 },
            'salary-application': { missing: 1 },
          },
        },
      }),
    })

    render(
      <WorkflowSetupStatusProvider>
        <Consumer />
      </WorkflowSetupStatusProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('3'))
    expect(screen.getByTestId('leave')).toHaveTextContent('2')
    expect(screen.getByTestId('salary')).toHaveTextContent('1')
  })

  it('keeps last-known setup status when a focus refresh fails', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 'success',
          data: {
            total_missing: 4,
            templates: {
              'leave-application': { missing: 4 },
            },
          },
        }),
      })
      .mockRejectedValueOnce(new Error('network down'))

    render(
      <WorkflowSetupStatusProvider>
        <Consumer />
      </WorkflowSetupStatusProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('4'))

    fireEvent.focus(window)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId('total')).toHaveTextContent('4')
    expect(screen.getByTestId('leave')).toHaveTextContent('4')
  })

  it('coalesces focus refreshes while a setup-status request is running', async () => {
    let resolveRequest
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    render(
      <WorkflowSetupStatusProvider>
        <Consumer />
      </WorkflowSetupStatusProvider>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fireEvent.focus(window)
    fireEvent.focus(window)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveRequest({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: 'success', data: { total_missing: 0 } }),
      })
    })
  })

  it('does not fetch or start polling when workflow status is disabled', () => {
    const fetchMock = vi.spyOn(global, 'fetch')
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    render(
      <WorkflowSetupStatusProvider enabled={false}>
        <Consumer />
      </WorkflowSetupStatusProvider>,
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(setIntervalSpy).not.toHaveBeenCalled()
    expect(screen.getByTestId('total')).toHaveTextContent('0')
  })

  it('does not request workflow status for a role that cannot access workflows', () => {
    const fetchMock = vi.spyOn(global, 'fetch')

    render(
      <AuthContext.Provider value={{ user: { roles: ['Staff'] } }}>
        <RoleAwareWorkflowSetupStatusProvider>
          <Consumer />
        </RoleAwareWorkflowSetupStatusProvider>
      </AuthContext.Provider>,
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('total')).toHaveTextContent('0')
  })

  it('uses a five-minute setup-status polling interval', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'success', data: { total_missing: 0 } }),
    })

    render(
      <WorkflowSetupStatusProvider>
        <Consumer />
      </WorkflowSetupStatusProvider>,
    )

    await waitFor(() => expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000))
  })
})
