import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Login from '../views/pages/login/Login'

const authMock = vi.hoisted(() => ({
  checkSession: vi.fn(),
  isAuthenticated: false,
  login: vi.fn(),
  requestPasswordReset: vi.fn(),
}))

vi.mock('src/auth/AuthProvider', () => ({
  useAuth: () => ({
    checkSession: authMock.checkSession,
    isAuthenticated: authMock.isAuthenticated,
    login: authMock.login,
    requestPasswordReset: authMock.requestPasswordReset,
  }),
}))

const renderLogin = ({ initialEntries = ['/login'] } = {}) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/crm" element={<div>CRM</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('Login', () => {
  beforeEach(() => {
    authMock.checkSession.mockResolvedValue(false)
    authMock.isAuthenticated = false
    authMock.requestPasswordReset.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    cleanup()
    authMock.checkSession.mockReset()
    authMock.login.mockReset()
    authMock.requestPasswordReset.mockReset()
  })

  it('submits trimmed credentials through the auth provider', async () => {
    authMock.login.mockResolvedValue({ ok: false, message: 'Detailed backend message.' })

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { name: 'email', value: ' staff@example.com ' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { name: 'password', value: 'secret' },
    })
    fireEvent.click(screen.getByLabelText('Remember me for 30 days'))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(authMock.login).toHaveBeenCalledWith({
        email: 'staff@example.com',
        password: 'secret',
        remember: true,
      })
    })
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
  })

  it('supports native form submit and browser credential autofill hints', async () => {
    authMock.login.mockResolvedValue({ ok: false, message: 'Invalid credentials.' })

    renderLogin()

    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form')

    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    expect(emailInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('required')
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()

    fireEvent.change(emailInput, {
      target: { name: 'email', value: 'staff@example.com' },
    })
    fireEvent.change(passwordInput, {
      target: { name: 'password', value: 'secret' },
    })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(authMock.login).toHaveBeenCalledWith({
        email: 'staff@example.com',
        password: 'secret',
        remember: false,
      })
    })
  })

  it('shows a service availability message when login cannot reach the API', async () => {
    authMock.login.mockRejectedValue(new TypeError('Failed to fetch'))

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { name: 'email', value: 'staff@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { name: 'password', value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Cannot reach the login service. Please try again later.'),
    ).toBeInTheDocument()
  })

  it('shows a session-expired warning from router state', async () => {
    renderLogin({
      initialEntries: [{ pathname: '/login', state: { reason: 'session-expired' } }],
    })

    expect(await screen.findByText('Session expired. Please sign in again.')).toBeInTheDocument()
  })

  it('toggles password visibility with accessible state', async () => {
    renderLogin()

    const passwordInput = screen.getByLabelText('Password')
    const visibilityButton = screen.getByRole('button', { name: 'Show password' })

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(visibilityButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(visibilityButton)

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('requests a password reset from forgot-password mode', async () => {
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))

    expect(
      await screen.findByText(
        'Enter your email address and we will send you a password reset link.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { name: 'email', value: ' staff@example.com ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    await waitFor(() => {
      expect(authMock.requestPasswordReset).toHaveBeenCalledWith({ email: 'staff@example.com' })
    })
    expect(await screen.findByText(/If an active account exists/)).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('redirects authenticated users away from the login page', async () => {
    authMock.isAuthenticated = true

    renderLogin()

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  it('does not probe the session endpoint on login mount when not already authenticated', async () => {
    renderLogin()

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(authMock.checkSession).not.toHaveBeenCalled()
  })
})
