import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReactivateProjectModal from './ReactivateProjectModal'
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import { reactivateProject } from './projectApi'

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
  },
}))

vi.mock('../../../components/toast/toastService', () => ({
  showToast: vi.fn(),
}))

vi.mock('./projectApi', () => ({
  reactivateProject: vi.fn(),
}))

const project = {
  id: 158,
  project_name: 'Project Alpha',
  status: 'Terminated',
}

const renderModal = (props = {}) =>
  render(
    <ReactivateProjectModal
      visible
      project={project}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />,
  )

const createDeferred = () => {
  let resolve
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

describe('ReactivateProjectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reactivateProject.mockResolvedValue({ status: 'success' })
  })

  afterEach(() => {
    cleanup()
  })

  it('explains the status transition and requires a reason', () => {
    renderModal()

    expect(screen.getByText(/from/i)).toHaveTextContent(
      'Reactivating Project Alpha will change its status from Terminated to Active.',
    )
    expect(screen.getByRole('button', { name: /^reactivate project$/i })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/reactivation reason/i), {
      target: { value: 'Client resumed the project.' },
    })

    expect(screen.getByRole('button', { name: /^reactivate project$/i })).toBeEnabled()
  })

  it('submits a trimmed reason and reports success', async () => {
    const onConfirm = vi.fn()
    renderModal({ onConfirm })

    fireEvent.change(screen.getByLabelText(/reactivation reason/i), {
      target: { value: '  Client resumed the project.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^reactivate project$/i }))

    await waitFor(() =>
      expect(reactivateProject).toHaveBeenCalledWith(158, {
        reason: 'Client resumed the project.',
      }),
    )
    expect(showToast).toHaveBeenCalledWith('Project reactivated.')
    expect(onConfirm).toHaveBeenCalledWith({ status: 'success' })
  })

  it('surfaces backend transition errors', async () => {
    reactivateProject.mockRejectedValue(new Error('Project is already active.'))
    renderModal()

    fireEvent.change(screen.getByLabelText(/reactivation reason/i), {
      target: { value: 'Duplicate request.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^reactivate project$/i }))

    await waitFor(() => expect(dialog.alert).toHaveBeenCalledWith('Project is already active.'))
    expect(showToast).not.toHaveBeenCalled()
  })

  it('guards duplicate submissions while the request is pending', async () => {
    const request = createDeferred()
    reactivateProject.mockReturnValue(request.promise)
    renderModal()

    fireEvent.change(screen.getByLabelText(/reactivation reason/i), {
      target: { value: 'Resume work.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^reactivate project$/i }))

    await waitFor(() => expect(reactivateProject).toHaveBeenCalledTimes(1))
    const pendingButton = screen.getByRole('button', { name: /reactivating/i })
    expect(pendingButton).toBeDisabled()
    fireEvent.click(pendingButton)
    expect(reactivateProject).toHaveBeenCalledTimes(1)

    await act(async () => {
      request.resolve({ status: 'success' })
      await request.promise
    })
  })
})
