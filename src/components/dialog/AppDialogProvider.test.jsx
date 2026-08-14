import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppDialogProvider from './AppDialogProvider'
import dialog from './dialogService'

const ChoiceLauncher = ({ onResult }) => {
  const openChoice = () => {
    dialog
      .choice('Invoice INV-001 was created successfully.', {
        title: 'Invoice Created',
        dismissAction: 'project',
        actions: [
          { key: 'project', label: 'Back to Project', color: 'secondary', variant: 'outline' },
          { key: 'list', label: 'View Invoice List', color: 'secondary', variant: 'outline' },
          { key: 'view', label: 'View Invoice', color: 'primary', autoFocus: true },
        ],
      })
      .then(onResult)
  }

  return (
    <button type="button" onClick={openChoice}>
      Show choice
    </button>
  )
}

const renderChoice = (onResult) =>
  render(
    <MemoryRouter>
      <AppDialogProvider>
        <ChoiceLauncher onResult={onResult} />
      </AppDialogProvider>
    </MemoryRouter>,
  )

describe('AppDialogProvider choice dialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders responsive actions and resolves the selected action key', async () => {
    const onResult = vi.fn()
    renderChoice(onResult)
    fireEvent.click(screen.getByRole('button', { name: 'Show choice' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Invoice Created')).toBeInTheDocument()
    expect(screen.getByText(/INV-001 was created successfully/)).toBeInTheDocument()
    expect(document.querySelector('.modal-footer')).toHaveClass('flex-wrap')

    const viewButton = screen.getByRole('button', { name: 'View Invoice', exact: true })
    await waitFor(() => expect(viewButton).toHaveFocus())
    fireEvent.click(viewButton)

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('view'))
  })

  it('maps close-button dismissal to the configured safe action', async () => {
    const onResult = vi.fn()
    renderChoice(onResult)
    fireEvent.click(screen.getByRole('button', { name: 'Show choice' }))

    fireEvent.click(await screen.findByRole('button', { name: /close/i }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('project'))
  })
})
