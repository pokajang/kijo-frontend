import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HandbookAcknowledgementNotice from './HandbookAcknowledgementNotice'
import { getHandbookAcknowledgementStatus } from '../../views/handbook/api/handbookApi'

vi.mock('../../views/handbook/api/handbookApi', () => ({
  getHandbookAcknowledgementStatus: vi.fn(),
}))

const LocationDisplay = () => {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

const renderNotice = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <HandbookAcknowledgementNotice staffId={7} />
      <LocationDisplay />
    </MemoryRouter>,
  )

describe('HandbookAcknowledgementNotice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    cleanup()
  })

  it('does not display a notice after the current handbook is acknowledged', async () => {
    getHandbookAcknowledgementStatus.mockResolvedValue({
      success: true,
      data: {
        version_label: 'REV02 - 2026-07',
        acknowledged: true,
        signed_at: '2026-07-16 09:00:00',
      },
    })

    renderNotice()

    await waitFor(() => {
      expect(getHandbookAcknowledgementStatus).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByText('Handbook acknowledgement required.')).not.toBeInTheDocument()
  })

  it('shows an unsigned current-version notice, which can be dismissed for the session', async () => {
    getHandbookAcknowledgementStatus.mockResolvedValue({
      success: true,
      data: {
        version_id: 12,
        version_label: 'REV02 - 2026-07',
        acknowledged: false,
        signed_at: null,
      },
    })

    renderNotice()

    expect(await screen.findByText('Handbook acknowledgement required.')).toBeInTheDocument()
    expect(screen.getByText(/REV02 - 2026-07/)).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss handbook acknowledgement reminder' }),
    )

    expect(screen.queryByText('Handbook acknowledgement required.')).not.toBeInTheDocument()

    cleanup()
    renderNotice()

    await waitFor(() => {
      expect(getHandbookAcknowledgementStatus).toHaveBeenCalledTimes(2)
    })
    expect(screen.queryByText('Handbook acknowledgement required.')).not.toBeInTheDocument()
  })

  it('opens the handbook from an unsigned current-version notice', async () => {
    getHandbookAcknowledgementStatus.mockResolvedValue({
      success: true,
      data: {
        version_id: 12,
        version_label: 'REV02 - 2026-07',
        acknowledged: false,
        signed_at: null,
      },
    })

    renderNotice()

    expect(await screen.findByText('Handbook acknowledgement required.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review & Acknowledge' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/handbook')
  })

  it('shows the unsigned acknowledgement as a delayed mobile modal', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    getHandbookAcknowledgementStatus.mockResolvedValue({
      success: true,
      data: {
        version_id: 12,
        version_label: 'REV02 - 2026-07',
        acknowledged: false,
        signed_at: null,
      },
    })

    renderNotice()

    await act(async () => {})
    expect(screen.queryByText('Handbook acknowledgement required')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('Handbook acknowledgement required')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(screen.queryByText('Handbook acknowledgement required')).not.toBeInTheDocument()
  })

  it('refreshes and removes the notice after the handbook is signed', async () => {
    getHandbookAcknowledgementStatus
      .mockResolvedValueOnce({
        success: true,
        data: { version_label: 'REV02 - 2026-07', acknowledged: false, signed_at: null },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          version_label: 'REV02 - 2026-07',
          acknowledged: true,
          signed_at: '2026-07-16 09:00:00',
        },
      })

    renderNotice()
    expect(await screen.findByText('Handbook acknowledgement required.')).toBeInTheDocument()

    window.dispatchEvent(new Event('kijo:handbook-signed'))

    await waitFor(() => {
      expect(screen.queryByText('Handbook acknowledgement required.')).not.toBeInTheDocument()
    })
  })

  it('shows a retryable status warning when acknowledgement cannot be verified', async () => {
    getHandbookAcknowledgementStatus
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({
        success: true,
        data: { version_label: 'REV02 - 2026-07', acknowledged: false, signed_at: null },
      })

    renderNotice()

    expect(
      await screen.findByText('Handbook acknowledgement status unavailable.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Handbook acknowledgement required.')).toBeInTheDocument()
    expect(getHandbookAcknowledgementStatus).toHaveBeenCalledTimes(2)
  })
})
