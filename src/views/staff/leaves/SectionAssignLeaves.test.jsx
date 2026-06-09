import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectionAssignLeaves from './SectionAssignLeaves'
import * as AH from './actionHandlers'
import dialog from '../../../components/dialog/dialogService'

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

const currentYear = new Date().getFullYear()

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
        remarks: 'Prorated entitlement',
      },
    })

    expect(screen.getByLabelText('Staff Name')).toHaveValue('8')
    expect(screen.getByLabelText('Staff Name')).toBeDisabled()
    expect(screen.getByLabelText('For the Year')).toHaveValue(2025)
    expect(screen.getByLabelText('Type of Leave')).toHaveValue('Annual')
    expect(screen.getByLabelText('Entitlement (Days)')).toHaveValue(14)
    expect(screen.getByLabelText('Remarks')).toHaveValue('Prorated entitlement')
  })

  it('allows decimal entitlement days and submits them as numbers', async () => {
    AH.assignLeaveEntitlement.mockResolvedValueOnce({ status: 'success' })
    renderSection()

    fireEvent.change(screen.getByLabelText('Staff Name'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Type of Leave'), { target: { value: 'Annual' } })
    fireEvent.change(screen.getByLabelText('Remarks'), {
      target: { value: '  Manual entitlement note  ' },
    })

    const entitlementInput = screen.getByLabelText('Entitlement (Days)')
    expect(entitlementInput).toHaveAttribute('step', '0.01')
    expect(entitlementInput).toHaveAttribute('inputMode', 'decimal')

    fireEvent.change(entitlementInput, { target: { value: '12.25' } })
    fireEvent.submit(entitlementInput.closest('form'))

    expect(AH.assignLeaveEntitlement).toHaveBeenCalledWith({
      staff_id: 7,
      year: expect.any(Number),
      type: 'Annual',
      days: 12.25,
      remarks: '  Manual entitlement note  ',
    })
  })

  it('marks assigned leave types and disables duplicate assignment options', () => {
    renderSection({
      entitlements: [
        {
          id: 1,
          staff_id: 7,
          year: currentYear,
          leave_type: 'Annual',
          total_days: 14,
        },
      ],
    })

    fireEvent.change(screen.getByLabelText('Staff Name'), { target: { value: '7' } })

    expect(screen.getByRole('option', { name: 'Annual - Assigned' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Sick' })).not.toBeDisabled()
    expect(screen.getByText('Annual (14d)')).toBeInTheDocument()
    expect(screen.getAllByText('Sick').length).toBeGreaterThan(0)
  })

  it('clears a stale leave type when the selected staff already has that entitlement', async () => {
    renderSection({
      entitlements: [
        {
          id: 1,
          staff_id: 7,
          year: currentYear,
          leave_type: 'Annual',
          total_days: 14,
        },
      ],
    })

    fireEvent.change(screen.getByLabelText('Staff Name'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Type of Leave'), { target: { value: 'Annual' } })
    expect(screen.getByLabelText('Type of Leave')).toHaveValue('Annual')

    fireEvent.change(screen.getByLabelText('Staff Name'), { target: { value: '7' } })

    await waitFor(() => {
      expect(screen.getByLabelText('Type of Leave')).toHaveValue('')
    })
  })

  it('keeps the current edit leave type enabled and disables other assigned types', async () => {
    AH.updateEntitlement.mockResolvedValueOnce({ status: 'success' })
    renderSection({
      entitlements: [
        {
          id: 99,
          staff_id: 8,
          year: 2025,
          leave_type: 'Annual',
          total_days: 14,
          remarks: 'Current note',
        },
        {
          id: 101,
          staff_id: 8,
          year: 2025,
          leave_type: 'Medical',
          total_days: 10,
        },
      ],
      editEntitlement: {
        id: 99,
        staff_id: 8,
        year: 2025,
        leave_type: 'Annual',
        total_days: 14,
        remarks: 'Current note',
      },
    })

    expect(screen.getByRole('option', { name: 'Annual - Current' })).not.toBeDisabled()
    expect(screen.getByRole('option', { name: 'Medical - Assigned' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Remarks'), { target: { value: 'Updated note' } })
    fireEvent.submit(screen.getByLabelText('Remarks').closest('form'))

    expect(AH.updateEntitlement).toHaveBeenCalledWith({
      id: 99,
      staff_id: 8,
      year: 2025,
      type: 'Annual',
      days: 14,
      remarks: 'Updated note',
    })
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

  it('locks used entitlement identity fields, keeps remarks editable, and enforces used days minimum', () => {
    renderSection({
      editEntitlement: {
        id: 102,
        staff_id: 8,
        year: 2026,
        leave_type: 'Annual',
        total_days: 8,
        used_days: 4,
        remarks: 'Original remark',
      },
    })

    expect(screen.getByText(/This entitlement has used days/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Staff Name')).toBeDisabled()
    expect(screen.getByLabelText('For the Year')).toBeDisabled()
    expect(screen.getByLabelText('Type of Leave')).toBeDisabled()

    const entitlementInput = screen.getByLabelText('Entitlement (Days)')
    expect(entitlementInput).toHaveAttribute('min', '4')

    const remarksInput = screen.getByLabelText('Remarks')
    expect(remarksInput).toBeEnabled()
    fireEvent.change(remarksInput, { target: { value: 'Still editable' } })
    expect(remarksInput).toHaveValue('Still editable')

    fireEvent.change(entitlementInput, { target: { value: '3' } })
    fireEvent.submit(entitlementInput.closest('form'))

    expect(dialog.alert).toHaveBeenCalledWith('Entitlement days cannot be lower than used days.')
    expect(AH.updateEntitlement).not.toHaveBeenCalled()
  })
})
