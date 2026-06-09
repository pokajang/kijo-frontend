import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ApplyLeave from './ApplyLeave'

vi.mock('../../notifications/appNotificationEvents', () => ({
  dispatchAppNotificationsChanged: vi.fn(),
}))

const addDaysToDateValue = (value, days) => {
  const [year, month, day] = String(value).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

describe('ApplyLeave', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('allows unpaid leave applications when the staff member has no current-year entitlement', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).includes('hr/leaves/entitlements/mine')) {
        return new Response(JSON.stringify({ status: 'success', entitlements: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (String(url).includes('hr/leaves') && options.method === 'POST') {
        return new Response(
          JSON.stringify({
            status: 'success',
            mail_sent: true,
            message: 'Leave application submitted successfully.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ApplyLeave />)

    expect(
      await screen.findByText(`No leave allocated for ${new Date().getFullYear()}.`),
    ).toBeInTheDocument()

    const leaveTypeSelect = screen.getByLabelText('Type of Leave')
    await waitFor(() => {
      expect(leaveTypeSelect).toHaveValue('Unpaid')
    })
    expect(screen.getByRole('option', { name: 'Unpaid Leave' })).toBeInTheDocument()

    fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('hr/leaves'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        }),
      )
    })

    const postCall = fetchMock.mock.calls.find(
      ([url, options]) => String(url).includes('hr/leaves') && options?.method === 'POST',
    )
    expect(JSON.parse(postCall[1].body)).toEqual(
      expect.objectContaining({
        type: 'Unpaid',
        status: 'Pending',
      }),
    )
  })

  it('defaults to unpaid leave when assigned entitlements have zero balance', async () => {
    const currentYear = new Date().getFullYear()
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('hr/leaves/entitlements/mine')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            entitlements: [
              {
                id: 1,
                leave_type: 'Annual',
                year: currentYear,
                total_days: 0,
                used_days: 0,
                remaining: 0,
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ApplyLeave />)

    expect(await screen.findByText('Annual')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()

    const leaveTypeSelect = screen.getByLabelText('Type of Leave')
    await waitFor(() => {
      expect(leaveTypeSelect).toHaveValue('Unpaid')
    })
    expect(
      screen.queryByRole('option', { name: /Annual - Balance: 0 days/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Unpaid Leave' })).toBeInTheDocument()
  })

  it('shows Frozen Leave as an apply option when entitlement has balance', async () => {
    const currentYear = new Date().getFullYear()
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('hr/leaves/entitlements/mine')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            entitlements: [
              {
                id: 2,
                leave_type: 'Frozen Leave',
                year: currentYear,
                total_days: 3,
                used_days: 1,
                remarks: 'Carried forward from last year',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ApplyLeave />)

    expect(await screen.findByText('Frozen Leave')).toBeInTheDocument()
    expect(screen.getByText('Remarks: Carried forward from last year')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Type of Leave')).toHaveValue('Frozen Leave')
    })
    expect(
      screen.getByRole('option', { name: /Frozen Leave - Balance: 2 days/i }),
    ).toBeInTheDocument()
  })

  it('blocks paid leave submission when requested duration exceeds the current balance', async () => {
    const currentYear = new Date().getFullYear()
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).includes('hr/leaves/entitlements/mine')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            entitlements: [
              {
                id: 3,
                leave_type: 'Annual',
                year: currentYear,
                total_days: 1,
                used_days: 0,
                remaining: 1,
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (String(url).includes('hr/leaves') && options.method === 'POST') {
        return new Response(JSON.stringify({ status: 'success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ApplyLeave />)

    const leaveTypeSelect = await screen.findByLabelText('Type of Leave')
    await waitFor(() => {
      expect(leaveTypeSelect).toHaveValue('Annual')
    })

    const endDateInput = screen.getByLabelText('End Date')
    fireEvent.change(endDateInput, {
      target: { value: addDaysToDateValue(screen.getByLabelText('Start Date').value, 1) },
    })

    expect(
      await screen.findByText(/exceeds your remaining Annual balance of 1 day\(s\)/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()

    fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form'))

    expect(
      fetchMock.mock.calls.some(
        ([url, options]) => String(url).includes('hr/leaves') && options?.method === 'POST',
      ),
    ).toBe(false)
  })
})
