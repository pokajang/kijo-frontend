import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../views/pages/login/Login'

const loginMock = vi.fn()

vi.mock('src/auth/AuthProvider', () => ({
  useAuth: () => ({ login: loginMock }),
}))

describe('Login', () => {
  afterEach(() => {
    cleanup()
    loginMock.mockReset()
  })

  it('submits credentials through the auth provider', async () => {
    loginMock.mockResolvedValue({ ok: false, message: 'Invalid credentials.' })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { name: 'email', value: 'staff@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { name: 'password', value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'staff@example.com',
        password: 'secret',
      })
    })
    expect(await screen.findByText('Login failed: Invalid credentials.')).toBeInTheDocument()
  })

  it('supports native form submit and browser credential autofill hints', async () => {
    loginMock.mockResolvedValue({ ok: false, message: 'Invalid credentials.' })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    const form = screen.getByRole('button', { name: 'Login' }).closest('form')

    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('button', { name: 'Show Password' })).toBeInTheDocument()

    fireEvent.change(emailInput, {
      target: { name: 'email', value: 'staff@example.com' },
    })
    fireEvent.change(passwordInput, {
      target: { name: 'password', value: 'secret' },
    })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'staff@example.com',
        password: 'secret',
      })
    })
  })
})
