import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CRMDetailsCard from './CRMDetailsCard'
import { getProjectCrmDetails } from '../projectApi'

vi.mock('../projectApi', () => ({
  getProjectCrmDetails: vi.fn(),
}))

describe('CRMDetailsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProjectCrmDetails.mockResolvedValue({
      quote_ref_no: 'QSS26-0001AZA',
      created_at: '2026-03-13 23:28:22',
      status: 'Awarded',
      created_by_name: 'Azam Bin Husain',
      created_by_code: 'AZA',
      award_date: '2026-03-13',
      status_remarks: 'tests special invoice',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders formatted CRM values and same-day award duration', async () => {
    render(<CRMDetailsCard project={{ id: 12 }} />)

    await waitFor(() => expect(screen.getByText('QSS26-0001AZA')).toBeInTheDocument())

    expect(screen.getByText('2026-03-13 23:28:22')).toBeInTheDocument()
    expect(screen.getByText('Awarded')).toBeInTheDocument()
    expect(screen.getAllByText('2026-03-13').length).toBeGreaterThan(0)
    expect(screen.getByText('0 days')).toBeInTheDocument()
  })

  it('renders the shared CRM loading state', async () => {
    getProjectCrmDetails.mockReturnValue(new Promise(() => {}))

    render(<CRMDetailsCard project={{ id: 12 }} />)

    expect(await screen.findByText('Loading CRM details...')).toBeInTheDocument()
  })

  it('renders the existing empty CRM message when no details are available', async () => {
    getProjectCrmDetails.mockResolvedValueOnce({
      status: 'error',
      message: 'No CRM details found.',
    })

    render(<CRMDetailsCard project={{ id: 12 }} />)

    expect(await screen.findByText('No CRM details found.')).toBeInTheDocument()
  })
})
