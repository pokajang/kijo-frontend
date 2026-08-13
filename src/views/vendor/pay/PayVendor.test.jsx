import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PayVendor from './PayVendor'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../components/navigation/ModuleNavStrip', () => ({
  default: () => <nav aria-label="Vendor sections" />,
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
    prompt: vi.fn(),
  },
}))

import dialog from '../../../components/dialog/dialogService'

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({
    options = [],
    value,
    onChange,
    placeholder = 'Select',
    isDisabled,
    isLoading,
    noOptionsMessage,
    formatOptionLabel,
  }) => (
    <div>
      <select
        aria-label={placeholder}
        disabled={isDisabled}
        value={value?.value ?? ''}
        onChange={(event) => {
          const selected = options.find((option) => String(option.value) === event.target.value)
          onChange?.(selected || null)
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {formatOptionLabel && options.length > 0 ? (
        <div data-testid={`${placeholder}-formatted-options`}>
          {options.map((option) => (
            <div key={option.value}>{formatOptionLabel(option, { context: 'menu' })}</div>
          ))}
        </div>
      ) : null}
      {!isLoading && options.length === 0 && noOptionsMessage ? (
        <div>
          {typeof noOptionsMessage === 'function' ? noOptionsMessage({}) : noOptionsMessage}
        </div>
      ) : null}
    </div>
  ),
}))

const renderPayVendor = (initialEntry = '/vendor/pay') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PayVendor />
    </MemoryRouter>,
  )

const mockFetchForProjectFlow = ({ assignedVendors = [] } = {}) => {
  global.fetch = vi.fn(async (url) => {
    const textUrl = String(url)

    if (textUrl.includes('projects/options?status=active&scope=mine')) {
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          data: [
            {
              id: 101,
              projectName: 'Linked Active Project',
              clientName: 'Acme Client',
              projectType: 'Training',
              status: 'Active',
            },
          ],
        }),
      }
    }

    if (textUrl.includes('projects/101/vendors')) {
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          vendors: assignedVendors,
        }),
      }
    }

    return {
      ok: true,
      json: async () => ({ status: 'success', data: [] }),
    }
  })
}

describe('PayVendor project vendor selection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
    navigateMock.mockClear()
  })

  it('uses context cards and loads linked active projects for project payments', async () => {
    mockFetchForProjectFlow()

    renderPayVendor()

    fireEvent.click(screen.getByRole('radio', { name: /project-related/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('projects/options?status=active&scope=mine'),
        expect.objectContaining({ credentials: 'include' }),
      )
    })

    expect(screen.getByLabelText('Select project')).toBeInTheDocument()
  })

  it('loads assigned vendors after project selection', async () => {
    mockFetchForProjectFlow({
      assignedVendors: [
        {
          vendor_id: 7,
          vendor_name: 'Assigned Vendor Sdn Bhd',
          bank_name: 'Test Bank',
          bank_account: '123',
          bank_holder_name: 'Assigned Vendor Sdn Bhd',
        },
      ],
    })

    renderPayVendor()

    fireEvent.click(screen.getByRole('radio', { name: /project-related/i }))
    await screen.findByText('Linked Active Project')
    expect(screen.getByText('Acme Client · #101')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select project'), { target: { value: '101' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('projects/101/vendors'),
        expect.objectContaining({ credentials: 'include' }),
      )
    })

    expect(await screen.findByText('Assigned Vendor Sdn Bhd')).toBeInTheDocument()
    expect(screen.queryByText(/all-time payment records/i)).not.toBeInTheDocument()
  })

  it('shows Assign One when a selected project has no vendors assigned', async () => {
    mockFetchForProjectFlow({ assignedVendors: [] })

    renderPayVendor()

    fireEvent.click(screen.getByRole('radio', { name: /project-related/i }))
    await screen.findByText('Linked Active Project')
    fireEvent.change(screen.getByLabelText('Select project'), { target: { value: '101' } })

    expect(await screen.findByText('No vendor assigned to this project.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /assign one/i }))

    expect(navigateMock).toHaveBeenCalledWith(
      '/project/manage/101/training/linked-active-project',
      {
        state: {
          openVendorAssignment: true,
          returnTo: '/vendor/pay',
          paymentProjectId: 101,
        },
      },
    )
  })

  it('preselects the returned project and reloads vendors after assignment handoff', async () => {
    mockFetchForProjectFlow({
      assignedVendors: [
        {
          vendor_id: 8,
          vendor_name: 'Freshly Assigned Vendor',
        },
      ],
    })

    renderPayVendor({
      pathname: '/vendor/pay',
      state: { paymentContext: 'Project', paymentProjectId: 101, paymentVendorId: 8 },
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('projects/101/vendors'),
        expect.objectContaining({ credentials: 'include' }),
      )
    })

    expect(await screen.findByText('Freshly Assigned Vendor')).toBeInTheDocument()
    expect(screen.getByLabelText('Select vendor')).toHaveValue('8')
  })

  it('blocks submission when amount is blank or zero', async () => {
    mockFetchForProjectFlow({
      assignedVendors: [
        {
          vendor_id: 9,
          vendor_name: 'Amount Guard Vendor',
        },
      ],
    })

    renderPayVendor()

    fireEvent.click(screen.getByRole('radio', { name: /project-related/i }))
    await screen.findByText('Linked Active Project')
    fireEvent.change(screen.getByLabelText('Select project'), { target: { value: '101' } })
    await screen.findByText('Amount Guard Vendor')
    fireEvent.change(screen.getByLabelText('Select vendor'), { target: { value: '9' } })

    fireEvent.change(screen.getByLabelText('Payment Type'), { target: { value: 'Deposit' } })
    fireEvent.change(screen.getByLabelText('Payment Method'), {
      target: { value: 'Online Transfer' },
    })

    fireEvent.click(screen.getByRole('button', { name: /submit payment/i }))

    expect(dialog.alert).toHaveBeenCalledWith('Please enter a valid amount greater than 0.')
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('vendor-payments'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
