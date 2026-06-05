import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectionAssignLeaves from './SectionAssignLeaves'

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    'aria-label': ariaLabel,
    isDisabled,
  }) => (
    <select
      aria-label={ariaLabel || placeholder}
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
  ),
}))

vi.mock('./actionHandlers', () => ({
  assignLeaveEntitlement: vi.fn(),
  updateEntitlement: vi.fn(),
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
  },
}))

const staffList = [
  {
    staff_id: 7,
    full_name: 'Azam Bin Husain',
    name_code: 'AZA',
    position: 'Manager',
    department: 'Operations',
  },
  {
    staff_id: 8,
    full_name: 'Bina Noor',
    name_code: 'BIN',
    position: 'Executive',
    department: 'HR',
  },
  {
    staff_id: 9,
    full_name: 'Cas Tan',
    name_code: 'CAS',
  },
  {
    staff_id: 10,
    full_name: 'Dina Inactive',
    name_code: 'DIN',
    status: 'Inactive',
    terminated_at: '2025-12-31 00:00:00',
  },
]

const renderSection = ({ routeState, ...props } = {}) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/staff/leaves/assign', state: routeState }]}>
      <SectionAssignLeaves staffList={staffList} {...props} />
    </MemoryRouter>,
  )

describe('SectionAssignLeaves', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('includes Frozen Leave in the leave type selector', () => {
    renderSection()

    expect(screen.getByRole('option', { name: 'Frozen Leave' })).toBeInTheDocument()
  })

  it('does not render undefined staff label parts when optional fields are missing', () => {
    renderSection()

    expect(screen.getByRole('option', { name: 'Cas Tan (CAS)' })).toBeInTheDocument()
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
  })

  it('hides inactive staff from new leave assignment selection', () => {
    renderSection()

    expect(screen.queryByRole('option', { name: 'Dina Inactive (DIN)' })).not.toBeInTheDocument()
  })

  it('prefills staff year and leave type from missing-row route state', () => {
    renderSection({
      routeState: {
        assignLeavePrefill: {
          staff_id: 7,
          year: 2026,
          leave_type: 'Frozen Leave',
        },
      },
    })

    expect(screen.getByLabelText('Staff Name')).toHaveValue('7')
    expect(screen.getByLabelText('For the Year')).toHaveValue(2026)
    expect(screen.getByLabelText('Type of Leave')).toHaveValue('Frozen Leave')
  })

  it('does not preselect inactive staff from new assignment route state', () => {
    renderSection({
      routeState: {
        assignLeavePrefill: {
          staff_id: 10,
          year: 2026,
          leave_type: 'Frozen Leave',
        },
      },
    })

    expect(screen.getByRole('option', { name: 'Select staff...' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Dina Inactive (DIN)' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Staff Name')).toHaveValue('')
    expect(screen.getByLabelText('For the Year')).toHaveValue(2026)
    expect(screen.getByLabelText('Type of Leave')).toHaveValue('Frozen Leave')
  })

  it('uses edit entitlement values instead of route prefill', () => {
    renderSection({
      routeState: {
        assignLeavePrefill: {
          staff_id: 7,
          year: 2026,
          leave_type: 'Frozen Leave',
        },
      },
      editEntitlement: {
        id: 99,
        staff_id: 8,
        year: 2025,
        leave_type: 'Annual',
        total_days: 14,
      },
    })

    expect(screen.getByLabelText('Staff Name')).toHaveValue('8')
    expect(screen.getByLabelText('Staff Name')).toBeDisabled()
    expect(screen.getByLabelText('For the Year')).toHaveValue(2025)
    expect(screen.getByLabelText('Type of Leave')).toHaveValue('Annual')
    expect(screen.getByLabelText('Entitlement (Days)')).toHaveValue(14)
  })

  it('loads inactive staff in edit entitlement mode', () => {
    renderSection({
      editEntitlement: {
        id: 100,
        staff_id: 10,
        year: 2025,
        leave_type: 'Annual',
        total_days: 7,
      },
    })

    expect(screen.getByRole('option', { name: 'Dina Inactive (DIN)' })).toBeInTheDocument()
    expect(screen.getByLabelText('Staff Name')).toHaveValue('10')
    expect(screen.getByLabelText('Staff Name')).toBeDisabled()
  })
})
