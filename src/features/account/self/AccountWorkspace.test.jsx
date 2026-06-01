import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AccountWorkspace from './AccountWorkspace'
import StaffProfile from '../../../components/profile/StaffProfile'
import PersonalSignature from '../../../components/signature/PersonalSignature'
import UserSetting from '../../../components/user-setting/UserSetting'
import dialog from '../../../components/dialog/dialogService'

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(() => Promise.resolve(true)),
  },
}))

const jsonResponse = (body, ok = true, status = ok ? 200 : 422) => ({
  ok,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
})

const completeProfilePayload = {
  status: 'success',
  profile: {
    full_name: 'Jane Staff',
    email: 'jane@example.test',
    mobile_number: '0123456789',
    birth_date: '1990-01-01',
    nric: '900101-01-1234',
    current_address: '123 Main Road',
    name_code: 'JAN',
    crm_position: '',
    emergency_name1: 'John Staff',
    emergency_relationship1: 'Spouse',
    emergency_phone1: '0199999999',
    emergency_address1: '123 Main Road',
  },
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('AccountWorkspace', () => {
  it('renders account tabs and active profile section', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('staff/profile')) return jsonResponse(completeProfilePayload)
        return jsonResponse({ status: 'success' })
      }),
    )

    render(
      <MemoryRouter initialEntries={['/my/profile']}>
        <AccountWorkspace routeSection="profile" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /signature/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /password/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/account status/i)).not.toBeInTheDocument()
    expect(await screen.findByText('Jane Staff')).toBeInTheDocument()
  })
})

describe('StaffProfile', () => {
  it('loads in label-value mode, edits, saves, and returns to view mode', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'PUT') {
        return jsonResponse({ status: 'success', data: { staff_id: 1 } })
      }
      return jsonResponse(completeProfilePayload)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<StaffProfile />)

    await screen.findByText('Jane Staff')
    expect(container.querySelector('input[name="fullName"]')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    await screen.findAllByLabelText(/^full name$/i)
    const fullNameInput = container.querySelector('input[name="fullName"]')
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })

    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveClass('btn-sm')
    expect(cancelButton).toHaveClass('btn-sm')
    fireEvent.change(fullNameInput, { target: { value: ' Jane Updated ' } })
    await waitFor(() => expect(fullNameInput).toHaveValue(' Jane Updated '))
    expect(saveButton).not.toBeDisabled()

    fireEvent.click(saveButton)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('staff/profile'),
        expect.objectContaining({ method: 'PUT' }),
      ),
    )
    const saveCall = fetchMock.mock.calls.find(([, options = {}]) => options.method === 'PUT')
    const payload = JSON.parse(saveCall[1].body)
    expect(payload.email).toBeUndefined()
    expect(payload.nameCode).toBeUndefined()
    expect(payload.fullName).toBe('Jane Updated')
    await waitFor(() => expect(screen.getByText('Profile saved.')).toBeInTheDocument())

    expect(screen.getByText('Jane Updated')).toBeInTheDocument()
    expect(container.querySelector('input[name="fullName"]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^edit$/i })).toHaveClass('btn-sm')
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('cancels edits and returns to saved label-value mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(completeProfilePayload)),
    )

    const { container } = render(<StaffProfile />)

    await screen.findByText('Jane Staff')
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    await waitFor(() =>
      expect(container.querySelector('input[name="fullName"]')).toBeInTheDocument(),
    )
    const fullNameInput = container.querySelector('input[name="fullName"]')
    fireEvent.change(fullNameInput, { target: { value: 'Temporary Name' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByText('Jane Staff')).toBeInTheDocument()
    expect(container.querySelector('input[name="fullName"]')).not.toBeInTheDocument()
  })

  it('shows required-field validation before save', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(completeProfilePayload)),
    )

    const { container } = render(<StaffProfile />)

    await screen.findByText('Jane Staff')
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await screen.findByLabelText(/^full name$/i)
    const mobileInput = container.querySelector('input[name="mobileNumber"]')
    fireEvent.change(mobileInput, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Phone Number is required.')).toBeInTheDocument()
    expect(mobileInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('mobileNumber-error'),
    )
  })

  it('blocks editing when profile load fails and retries successfully', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ status: 'error', message: 'Profile unavailable.' }, false, 500),
      )
      .mockResolvedValueOnce(jsonResponse(completeProfilePayload))
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<StaffProfile />)

    expect(await screen.findByText('Profile unavailable.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(screen.getByText('Jane Staff')).toBeInTheDocument())
    expect(container.querySelector('input[name="fullName"]')).not.toBeInTheDocument()
  })

  it('displays backend readonly identity field errors', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'PUT') {
        return jsonResponse(
          {
            status: 'error',
            message: 'Readonly identity fields cannot be changed from My Account.',
            errors: { email: ['Email is managed by your system account.'] },
          },
          false,
        )
      }
      return jsonResponse(completeProfilePayload)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<StaffProfile />)

    await screen.findByText('Jane Staff')
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const fullNameInput = await screen.findByLabelText(/^full name$/i)
    fireEvent.change(fullNameInput, { target: { value: 'Jane Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Email is managed by your system account.')).toBeInTheDocument()
    expect(document.getElementById('email')).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('email-error'),
    )
  })
})

describe('PersonalSignature', () => {
  it('validates file type before upload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ status: 'success', url: null })),
    )

    render(<PersonalSignature />)

    const input = await screen.findByLabelText(/upload signature/i)
    const file = new File(['bad'], 'signature.gif', { type: 'image/gif' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Please select a JPEG or PNG image.')).toBeInTheDocument()
  })

  it('saves a valid signature and dispatches the refresh event', async () => {
    const listener = vi.fn()
    window.addEventListener('kijo:signature-updated', listener)
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'POST') {
        return jsonResponse({ status: 'success', url: '/storage/signatures/1-JAN.png' })
      }
      return jsonResponse({ status: 'success', url: null })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<PersonalSignature />)

    const input = await screen.findByLabelText(/upload signature/i)
    const file = new File(['png'], 'signature.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /save signature/i }))

    await waitFor(() => expect(listener).toHaveBeenCalled())
    window.removeEventListener('kijo:signature-updated', listener)
  })

  it('confirms replacement only when saving over an existing signature', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'POST') {
        return jsonResponse({ status: 'success', url: '/storage/signatures/1-JAN-new.png' })
      }
      return jsonResponse({ status: 'success', url: '/storage/signatures/1-JAN.png' })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<PersonalSignature />)

    const input = await screen.findByLabelText(/upload signature/i)
    const file = new File(['png'], 'signature.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(dialog.confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /save signature/i }))

    await waitFor(() => expect(dialog.confirm).toHaveBeenCalledWith('Replace existing signature?'))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('signature'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})

describe('UserSetting', () => {
  it('keeps submit disabled until the password form is valid', () => {
    render(
      <MemoryRouter>
        <UserSetting />
      </MemoryRouter>,
    )

    const submitButton = screen.getByRole('button', { name: /update password/i })
    expect(submitButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'old-password-123' },
    })
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'short' },
    })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'short' },
    })
    expect(submitButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'new-password-123' },
    })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'new-password-123' },
    })
    expect(submitButton).not.toBeDisabled()
  })

  it('disables the password form while logout redirect is pending after success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ status: 'success', csrf_token: 'next-token' })),
    )

    render(
      <MemoryRouter>
        <UserSetting />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'old-password-123' },
    })
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'new-password-123' },
    })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'new-password-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByRole('button', { name: /logging out/i })).toBeDisabled()
    expect(screen.getByLabelText(/current password/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled()
  })
})
