import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VendorDetailsCard, { buildEquipmentServicesDescription } from './VendorDetailsCard'
import { listAllVendors, listAssignedVendors } from '../projectApi'

vi.mock('../projectApi', () => ({
  getProjectLoaUrl: vi.fn(() => 'https://example.test/loa'),
  listAllVendors: vi.fn(),
  listAssignedVendors: vi.fn(),
  removeProjectVendor: vi.fn(),
  saveProjectVendor: vi.fn(),
  toFiniteNumber: (value, fallback = 0) => {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
  },
}))

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

const renderVendorDetails = (props = {}) =>
  render(
    <MemoryRouter>
      <VendorDetailsCard project={{ id: 12 }} {...props} />
    </MemoryRouter>,
  )

describe('VendorDetailsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAllVendors.mockResolvedValue([])
    listAssignedVendors.mockResolvedValue([
      {
        assignment_id: 5,
        vendor_id: 7,
        vendor_name: 'Mohd Radzi Sufian Bin Zakaria',
        contact_person_name: 'Mohd Radzi',
        mobile_number: '60192202635',
        email: 'yanbotakbangi@gmail.com',
        position: 'Lead',
        award_value: '2000',
        fee_breakdown: 'Professional Fee - RM 2000',
      },
    ])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders vendor count, total awarded, formatted award value, and standalone action toggle', async () => {
    renderVendorDetails()

    await waitFor(() =>
      expect(screen.getByText('Mohd Radzi Sufian Bin Zakaria')).toBeInTheDocument(),
    )

    expect(screen.getByText('(1) | Total Awarded RM 2,000.00')).toBeInTheDocument()
    expect(screen.getByText('RM 2,000.00')).toBeInTheDocument()
    expect(screen.getByLabelText('Vendor actions')).toBeInTheDocument()
    expect(screen.getByLabelText('Vendor actions')).not.toHaveClass('dropdown-toggle-split')
  })

  it('reloads assigned vendors when refreshKey changes', async () => {
    const { rerender } = renderVendorDetails({ refreshKey: 0 })

    await waitFor(() => expect(listAssignedVendors).toHaveBeenCalledTimes(1))

    rerender(
      <MemoryRouter>
        <VendorDetailsCard project={{ id: 12 }} refreshKey={1} />
      </MemoryRouter>,
    )

    await waitFor(() => expect(listAssignedVendors).toHaveBeenCalledTimes(2))
  })

  it('builds an untruncated equipment LOA scope with separate item specifications', () => {
    const services = buildEquipmentServicesDescription({
      project_type: 'Equipment Supply',
      equipment_items: [
        {
          item_name: 'Gas detector',
          description: 'Portable calibrated detector',
          item_remarks: 'Colour: navy blue',
        },
      ],
    })

    expect(services).toContain('Gas detector')
    expect(services).toContain('Portable calibrated detector')
    expect(services).toContain('Specifications / remarks:\nColour: navy blue')
  })
})
