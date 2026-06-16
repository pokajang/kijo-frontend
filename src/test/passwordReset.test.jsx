import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PasswordReset from '../views/pages/login/PasswordReset'
import { toastEvents } from '../components/toast/toastService'

const authMock = vi.hoisted(() => ({
  resetPassword: vi.fn(),
}))

vi.mock('src/auth/AuthProvider', () => ({
  useAuth: () => ({
    resetPassword: authMock.resetPassword,
  }),
}))

const renderPasswordReset = () =>
  render(
    <MemoryRouter initialEntries={['/reset-password/token-123?email=staff@example.com']}>
      <Routes>
        <Route path="/reset-password/:token" element={<PasswordReset />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('PasswordReset', () => {
  beforeEach(() => {
    authMock.resetPassword.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    cleanup()
    authMock.resetPassword.mockReset()
  })

  it('submits a reset token and redirects after success', async () => {
    const toastHandler = vi.fn()
    window.addEventListener(toastEvents.name, toastHandler)
    renderPasswordReset()

    try {
      expect(screen.getByLabelText('Email address')).toHaveValue('staff@example.com')

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { name: 'newPassword', value: 'new-secret-123' },
      })
      fireEvent.change(screen.getByLabelText('Confirm password'), {
        target: { name: 'confirmPassword', value: 'new-secret-123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

      await waitFor(() => {
        expect(authMock.resetPassword).toHaveBeenCalledWith({
          email: 'staff@example.com',
          token: 'token-123',
          newPassword: 'new-secret-123',
          confirmPassword: 'new-secret-123',
        })
      })
      await waitFor(() =>
        expect(toastHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              type: 'toast',
              message: 'Password reset successfully. You can now sign in with your new password.',
            }),
          }),
        ),
      )

      expect(await screen.findByText('Login page', {}, { timeout: 2000 })).toBeInTheDocument()
    } finally {
      window.removeEventListener(toastEvents.name, toastHandler)
    }
  })

  it('shows reset failures without redirecting', async () => {
    authMock.resetPassword.mockResolvedValue({
      ok: false,
      message: 'This password reset link is invalid or has expired.',
    })

    renderPasswordReset()

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { name: 'newPassword', value: 'new-secret-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { name: 'confirmPassword', value: 'new-secret-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(
      await screen.findByText('This password reset link is invalid or has expired.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('shows short password validation without calling the reset api', async () => {
    renderPasswordReset()

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { name: 'newPassword', value: 'dok ghok' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { name: 'confirmPassword', value: 'dok ghok' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('Use at least 12 characters.')).toBeInTheDocument()
    expect(authMock.resetPassword).not.toHaveBeenCalled()
  })

  it('shows mismatched passwords without calling the reset api', async () => {
    renderPasswordReset()

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { name: 'newPassword', value: 'new-secret-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { name: 'confirmPassword', value: 'different-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(authMock.resetPassword).not.toHaveBeenCalled()
  })

  it('toggles password visibility independently for both reset fields', () => {
    renderPasswordReset()

    const newPasswordInput = screen.getByLabelText('New password')
    const confirmPasswordInput = screen.getByLabelText('Confirm password')
    const showNewPassword = screen.getByRole('button', { name: 'Show new password' })
    const showConfirmPassword = screen.getByRole('button', { name: 'Show confirm password' })

    expect(newPasswordInput).toHaveAttribute('type', 'password')
    expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    expect(showNewPassword).toHaveAttribute('aria-pressed', 'false')
    expect(showConfirmPassword).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(showNewPassword)

    expect(newPasswordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Hide new password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(showConfirmPassword)

    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide confirm password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
