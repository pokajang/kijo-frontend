import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCsrfToken } from '../../api/apiClient'
import SectionMonthlyReportSchedulerTest from './SectionMonthlyReportSchedulerTest'

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const triggerResponse = () =>
  jsonResponse({
    status: 'success',
    message: 'Year-to-date dashboard report test email sent.',
    data: {
      sent: 1,
      recipientCount: 1,
      reportMonth: '2026-05',
      url: 'http://localhost/stats/monthly-dashboard-report/public/test-token',
      publicTokenExpiresAt: '2026-08-30 08:30:00',
    },
  })

const statusResponse = (logs = []) =>
  jsonResponse({
    status: 'success',
    data: {
      configuredRecipientCount: 1,
      previousMonth: '2026-05',
      latestReport: null,
      schedule: {
        enabled: true,
        intervalValue: 1,
        intervalUnit: 'months',
        startDate: '2026-06-01',
        sendTime: '08:30',
        nextSendAt: '2026-07-01 08:30:00',
        lastStatus: null,
        summary: 'Every 1 month at 08:30',
      },
      logs,
    },
  })

describe('SectionMonthlyReportSchedulerTest', () => {
  beforeEach(() => {
    setCsrfToken('csrf-test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(statusResponse()))
  })

  afterEach(() => {
    cleanup()
    setCsrfToken(null)
    vi.unstubAllGlobals()
  })

  it('renders the schedule controls and compact monthly report test form without month selector', async () => {
    render(<SectionMonthlyReportSchedulerTest />)

    expect(screen.queryByLabelText(/report month/i)).not.toBeInTheDocument()
    expect(await screen.findByText('Enabled')).toBeInTheDocument()
    expect(screen.getByLabelText(/every/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/send time/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate and send report/i })).toBeDisabled()
    expect(screen.getAllByText('No monthly report test records yet.')).not.toHaveLength(0)

    expect(screen.queryByLabelText(/max runs/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start interval/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^stop$/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/force regenerate pdf/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/latest report/i)).not.toBeInTheDocument()
  })

  it('saves a free-range dashboard report email schedule', async () => {
    window.fetch.mockResolvedValueOnce(statusResponse()).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        message: 'Dashboard report email schedule saved.',
        data: {
          schedule: {
            enabled: true,
            intervalValue: 2,
            intervalUnit: 'months',
            startDate: '2026-06-01',
            sendTime: '09:15',
            nextSendAt: '2026-08-01 09:15:00',
            lastStatus: null,
          },
        },
      }),
    )

    render(<SectionMonthlyReportSchedulerTest />)

    fireEvent.change(await screen.findByLabelText(/every/i), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText(/unit/i), {
      target: { value: 'months' },
    })
    fireEvent.change(screen.getByLabelText(/send time/i), {
      target: { value: '09:15' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }))

    expect(await screen.findByText('Dashboard report email schedule saved.')).toBeInTheDocument()

    const [, init] = window.fetch.mock.calls.find(
      ([, requestInit]) => requestInit?.method === 'PUT',
    )
    expect(JSON.parse(init.body)).toEqual({
      enabled: true,
      intervalValue: 2,
      intervalUnit: 'months',
      startDate: '2026-06-01',
      sendTime: '09:15',
    })
  })

  it('posts one recipient with forced generation and uses the backend default report month', async () => {
    window.fetch.mockResolvedValueOnce(statusResponse()).mockResolvedValueOnce(triggerResponse())

    render(<SectionMonthlyReportSchedulerTest />)

    fireEvent.change(screen.getByLabelText(/recipient email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate and send report/i }))

    expect(
      await screen.findAllByText('Year-to-date dashboard report test email sent.'),
    ).not.toHaveLength(0)
    expect(screen.getAllByText('sent')).not.toHaveLength(0)
    expect(screen.getAllByText('2026-05')).not.toHaveLength(0)
    expect(screen.getByRole('link', { name: /open/i })).toHaveAttribute(
      'href',
      'http://localhost/stats/monthly-dashboard-report/public/test-token',
    )

    const [, init] = window.fetch.mock.calls.find(
      ([, requestInit]) => requestInit?.method === 'POST',
    )
    expect(JSON.parse(init.body)).toEqual({
      recipients: 'test@example.com',
      force: true,
    })
  })

  it('shows a sending row before the request completes', async () => {
    let resolveRequest
    window.fetch.mockResolvedValueOnce(statusResponse()).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    render(<SectionMonthlyReportSchedulerTest />)

    fireEvent.change(screen.getByLabelText(/recipient email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate and send report/i }))

    expect(await screen.findAllByText('Generating report and sending email...')).not.toHaveLength(0)
    expect(screen.getAllByText('sending')).not.toHaveLength(0)

    resolveRequest(triggerResponse())
    await screen.findAllByText('Year-to-date dashboard report test email sent.')
  })

  it('updates the row to failed with backend validation message', async () => {
    window.fetch.mockResolvedValueOnce(statusResponse()).mockResolvedValueOnce(
      jsonResponse(
        {
          message: 'The recipients field must be a valid email address.',
          errors: {
            recipients: ['The recipients field must be a valid email address.'],
          },
        },
        422,
      ),
    )

    render(<SectionMonthlyReportSchedulerTest />)

    fireEvent.change(screen.getByLabelText(/recipient email/i), {
      target: { value: 'bad@example' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate and send report/i }))

    await waitFor(() => {
      expect(screen.getAllByText('failed')).not.toHaveLength(0)
    })
    expect(
      screen.getAllByText('The recipients field must be a valid email address.'),
    ).not.toHaveLength(0)
  })

  it('loads existing monthly report test records from the backend', async () => {
    window.fetch.mockResolvedValueOnce(
      statusResponse([
        {
          id: 9,
          reportMonth: '2026-05',
          recipient: 'saved@example.com',
          status: 'sent',
          response: 'Year-to-date dashboard report test email sent.',
          url: 'http://localhost/stats/monthly-dashboard-report/public/saved-token',
          publicTokenExpiresAt: '2026-08-30 08:30:00',
          completedAt: '2026-06-01 15:45:00',
        },
      ]),
    )

    render(<SectionMonthlyReportSchedulerTest />)

    expect(await screen.findByText('saved@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('2026-05')).not.toHaveLength(0)
    expect(screen.getByRole('link', { name: /open/i })).toHaveAttribute(
      'href',
      'http://localhost/stats/monthly-dashboard-report/public/saved-token',
    )
  })
})
