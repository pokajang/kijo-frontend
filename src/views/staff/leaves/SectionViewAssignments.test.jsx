import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import SectionViewAssignments from './SectionViewAssignments'

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({ options = [], value, onChange, placeholder = 'Select...' }) => (
    <select
      aria-label={placeholder}
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

vi.mock('../../../components/datatable', async () => {
  const actual = await vi.importActual('../../../components/datatable')

  return {
    ...actual,
    DataTableRecordControls: ({
      searchValue,
      onSearchChange,
      searchPlaceholder,
      inlineFilter,
      children,
    }) => (
      <div>
        <input
          aria-label="Search entitlements"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
        {inlineFilter}
        <div>{children}</div>
      </div>
    ),
    DataTableRecordList: ({ rows = [], dataColumns = [], renderCell, getActions }) => (
      <div>
        <div data-testid="row-count">{rows.length}</div>
        {rows.map((row) => (
          <div key={row.id} data-testid={`entitlement-row-${row.id}`} data-row-kind={row.rowKind}>
            {dataColumns.map((column) => (
              <span key={column.key} data-testid={`cell-${row.id}-${column.key}`}>
                {renderCell ? renderCell(row, column) : row[column.key]}
              </span>
            ))}
            {(getActions?.(row) || []).map((action) => (
              <button key={action.key} type="button" onClick={() => action.onClick?.(row)}>
                {action.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    ),
  }
})

vi.mock('./actionHandlers', () => ({
  deleteEntitlement: vi.fn(),
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

const currentYear = new Date().getFullYear()

const staffList = [
  { staff_id: 1, full_name: 'Ali Ahmad', name_code: 'ALI' },
  { staff_id: 2, full_name: 'Siti Aminah', name_code: 'SIT' },
  { staff_id: 3, full_name: 'Kumar Das', name_code: 'KUM' },
]

const entitlements = [
  {
    id: 10,
    staff_id: 1,
    full_name: 'Ali Ahmad',
    name_code: 'ALI',
    leave_type: 'Annual',
    year: currentYear,
    total_days: 12,
    used_days: 4,
  },
  {
    id: 20,
    staff_id: 2,
    full_name: 'Siti Aminah',
    name_code: 'SIT',
    leave_type: 'Annual',
    year: currentYear,
    total_days: 0,
    used_days: 0,
  },
  {
    id: 30,
    staff_id: 1,
    full_name: 'Ali Ahmad',
    name_code: 'ALI',
    leave_type: 'Sick',
    year: currentYear - 1,
    total_days: 14,
    used_days: 1,
  },
]

const renderSection = (props = {}) =>
  render(
    <SectionViewAssignments
      staffList={staffList}
      entitlements={entitlements}
      onAssign={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />,
  )

describe('SectionViewAssignments', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows current-year assigned and missing staff rows on fresh load without stats or advanced filters', () => {
    renderSection()

    expect(screen.queryByText('Staff Covered')).not.toBeInTheDocument()
    expect(screen.queryByText('Missing Staff')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('row-count')).toHaveTextContent('3')

    const aliRow = screen.getByTestId('entitlement-row-10')
    expect(within(aliRow).getByText('Ali Ahmad (ALI)')).toBeInTheDocument()
    expect(within(aliRow).getByText('Annual')).toBeInTheDocument()
    expect(within(aliRow).getByText('Assigned')).toBeInTheDocument()
    expect(within(aliRow).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(within(aliRow).getByRole('button', { name: 'Delete' })).toBeInTheDocument()

    const sitiRow = screen.getByTestId('entitlement-row-20')
    expect(within(sitiRow).getByText('Siti Aminah (SIT)')).toBeInTheDocument()
    expect(within(sitiRow).getAllByText('0').length).toBeGreaterThan(0)
    expect(within(sitiRow).getByText('Assigned')).toBeInTheDocument()

    const missingRow = screen.getByTestId(`entitlement-row-missing-3-${currentYear}`)
    expect(within(missingRow).getByText('Kumar Das (KUM)')).toBeInTheDocument()
    expect(within(missingRow).getByText('Not assigned')).toBeInTheDocument()
    expect(within(missingRow).getByText('Missing')).toBeInTheDocument()
    expect(within(missingRow).getByRole('button', { name: 'Assign' })).toBeInTheDocument()
    expect(within(missingRow).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(missingRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('uses staff selection as an optional filter', () => {
    renderSection()

    fireEvent.change(screen.getByLabelText('All staff'), { target: { value: '3' } })

    expect(screen.getByTestId('row-count')).toHaveTextContent('1')
    expect(screen.getByTestId(`entitlement-row-missing-3-${currentYear}`)).toBeInTheDocument()
    expect(screen.queryByTestId('entitlement-row-10')).not.toBeInTheDocument()
  })

  it('filters by search text', () => {
    renderSection()

    fireEvent.change(screen.getByLabelText('Search entitlements'), {
      target: { value: 'kum' },
    })

    expect(screen.getByTestId('row-count')).toHaveTextContent('1')
    expect(screen.getByTestId(`entitlement-row-missing-3-${currentYear}`)).toBeInTheDocument()
  })
})
