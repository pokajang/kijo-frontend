import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import AppToastProvider from './AppToastProvider'
import { showApiToast } from '../../api/apiClient'
import { showToast } from './toastService'

vi.mock('@coreui/react', () => ({
  CToaster: ({ children, placement, className }) => (
    <div data-testid="toaster" data-placement={placement} className={className}>
      {children}
    </div>
  ),
  CToast: ({ children, autohide, color, delay, visible, onClose }) => (
    <div
      role="status"
      data-autohide={String(Boolean(autohide))}
      data-color={color}
      data-delay={String(delay)}
      data-visible={String(Boolean(visible))}
    >
      {children}
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
  CToastBody: ({ children }) => <div>{children}</div>,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AppToastProvider', () => {
  it('renders global success toasts with the standard delay', async () => {
    render(
      <AppToastProvider>
        <div>App</div>
      </AppToastProvider>,
    )

    showToast('Saved')

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Saved')
    expect(toast).toHaveAttribute('data-color', 'success')
    expect(toast).toHaveAttribute('data-delay', '4000')
    expect(screen.getByTestId('toaster')).toHaveAttribute('data-placement', 'top-end')
  })

  it('keeps existing API toast calls compatible with the global provider', async () => {
    render(
      <AppToastProvider>
        <div>App</div>
      </AppToastProvider>,
    )

    showApiToast('API saved', 'warning')

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('API saved'))
    expect(screen.getByRole('status')).toHaveAttribute('data-color', 'warning')
    expect(screen.getByRole('status')).toHaveAttribute('data-delay', '6000')
  })
})
