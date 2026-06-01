import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CloseProjectModal from './CloseProjectModal'
import dialog from '../../../components/dialog/dialogService'
import { closeProject } from './projectApi'

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('./projectApi', () => ({
  closeProject: vi.fn(),
}))

const project = {
  id: 158,
  project_name: 'Project Alpha',
}

const renderModal = (props = {}) =>
  render(
    <CloseProjectModal
      visible
      project={project}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />,
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

describe('CloseProjectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dialog.confirm.mockResolvedValue(true)
    closeProject.mockResolvedValue({ status: 'success' })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('defaults closing date to the local calendar date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 29, 0, 30, 0))

    renderModal()

    expect(screen.getByLabelText(/closing date/i)).toHaveValue('2026-05-29')
  })

  it('requires all checks and remarks before completing a project', () => {
    renderModal()

    const submitButton = screen.getByRole('button', { name: /^complete project$/i })
    expect(submitButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/closure remarks/i), {
      target: { value: 'All deliverables accepted.' },
    })
    expect(submitButton).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/all claims received/i))
    fireEvent.click(screen.getByLabelText(/all vendors paid/i))
    expect(submitButton).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/all due services completed/i))
    expect(submitButton).toBeEnabled()
  })

  it('requires remarks only before terminating a project', () => {
    renderModal({ initialCloseType: 'Terminated' })

    const submitButton = screen.getByRole('button', { name: /^terminate project$/i })
    expect(submitButton).toBeDisabled()
    expect(screen.queryByLabelText(/all claims received/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/termination cause/i), {
      target: { value: 'Client cancelled the project.' },
    })

    expect(submitButton).toBeEnabled()
  })

  it('submits completed closure through projectApi', async () => {
    const onConfirm = vi.fn()
    renderModal({ onConfirm })

    fireEvent.change(screen.getByLabelText(/closure remarks/i), {
      target: { value: 'All deliverables accepted.' },
    })
    fireEvent.click(screen.getByLabelText(/all claims received/i))
    fireEvent.click(screen.getByLabelText(/all vendors paid/i))
    fireEvent.click(screen.getByLabelText(/all due services completed/i))
    fireEvent.click(screen.getByRole('button', { name: /^complete project$/i }))

    await waitFor(() => expect(closeProject).toHaveBeenCalled())

    expect(closeProject).toHaveBeenCalledWith(
      158,
      expect.objectContaining({
        project_id: 158,
        closeType: 'Completed',
        reason: 'All deliverables accepted.',
        claims: true,
        vendors: true,
        services: true,
      }),
    )
    expect(dialog.alert).toHaveBeenCalledWith('Project completed successfully.')
    expect(onConfirm).toHaveBeenCalled()
  })

  it('keeps non-success API payload behavior unchanged', async () => {
    closeProject.mockResolvedValue({ status: 'error', message: 'Already closed.' })
    renderModal({ initialCloseType: 'Terminated' })

    fireEvent.change(screen.getByLabelText(/termination cause/i), {
      target: { value: 'Client cancelled the project.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^terminate project$/i }))

    await waitFor(() =>
      expect(dialog.alert).toHaveBeenCalledWith('Failed to close project: Already closed.'),
    )
  })

  it('keeps thrown API error behavior unchanged', async () => {
    closeProject.mockRejectedValue(new Error('Network failed'))
    renderModal({ initialCloseType: 'Terminated' })

    fireEvent.change(screen.getByLabelText(/termination cause/i), {
      target: { value: 'Client cancelled the project.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^terminate project$/i }))

    await waitFor(() => expect(dialog.alert).toHaveBeenCalledWith('Server error occurred.'))
  })

  it('guards duplicate submit clicks while the close request is pending', async () => {
    const closeRequest = createDeferred()
    closeProject.mockReturnValue(closeRequest.promise)
    renderModal({ initialCloseType: 'Terminated' })

    fireEvent.change(screen.getByLabelText(/termination cause/i), {
      target: { value: 'Client cancelled the project.' },
    })

    const submitButton = screen.getByRole('button', { name: /^terminate project$/i })
    fireEvent.click(submitButton)

    await waitFor(() => expect(closeProject).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: /submitting/i }))
    expect(closeProject).toHaveBeenCalledTimes(1)

    await act(async () => {
      closeRequest.resolve({ status: 'success' })
      await closeRequest.promise
    })
  })

  it('guards duplicate submit clicks while confirmation is pending', async () => {
    const confirmRequest = createDeferred()
    dialog.confirm.mockReturnValue(confirmRequest.promise)
    renderModal({ initialCloseType: 'Terminated' })

    fireEvent.change(screen.getByLabelText(/termination cause/i), {
      target: { value: 'Client cancelled the project.' },
    })

    const submitButton = screen.getByRole('button', { name: /^terminate project$/i })
    fireEvent.click(submitButton)

    await waitFor(() => expect(dialog.confirm).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: /submitting/i }))
    expect(dialog.confirm).toHaveBeenCalledTimes(1)
    expect(closeProject).not.toHaveBeenCalled()

    await act(async () => {
      confirmRequest.resolve(false)
      await confirmRequest.promise
    })
  })
})
