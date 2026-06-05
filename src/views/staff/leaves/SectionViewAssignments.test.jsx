import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import SectionViewAssignments from './SectionViewAssignments'
import { ASSIGNABLE_LEAVE_TYPES } from '../../../components/leave/leaveTypes'

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
      searchAriaLabel,
      inlineFilter,
      children,
    }) => (
      <div>
        <input
          aria-label={searchAriaLabel || 'Search records'}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
        {inlineFilter}
        <div>{children}</div>
      </div>
    ),
    DataTableRecordList: ({
      rows = [],
      dataColumns = [],
      defaultVisibleColumns = {},
      requiredColumns = new Set(),
      renderCell,
      getActions,
      onRowOpen,
      idPrefix,
      getRowGroupKey,
      getRowGroupLabel,
      rowGroupSortComparator,
      initialSortField,
      initialSortDir,
      sortComparators = {},
      resetRowIndexOnGroup = false,
      showColumnMenu = true,
      showExport = true,
    }) => {
      const sortedRows =
        initialSortField && typeof sortComparators[initialSortField] === 'function'
          ? [...rows].sort((left, right) => {
              const result = sortComparators[initialSortField](
                left[initialSortField],
                right[initialSortField],
                left,
                right,
              )
              return initialSortDir === 'desc' ? -result : result
            })
          : rows
      const groupedRows =
        typeof getRowGroupKey === 'function'
          ? Array.from(
              sortedRows
                .reduce((groups, row) => {
                  const groupKey = getRowGroupKey(row)
                  if (!groups.has(groupKey)) groups.set(groupKey, [])
                  groups.get(groupKey).push(row)
                  return groups
                }, new Map())
                .entries(),
            ).sort(([leftKey, leftRows], [rightKey, rightRows]) =>
              typeof rowGroupSortComparator === 'function'
                ? rowGroupSortComparator(leftKey, rightKey, leftRows, rightRows)
                : 0,
            )
          : null
      const displayRows = groupedRows
        ? groupedRows.flatMap(([, groupRows]) => groupRows)
        : sortedRows

      return (
        <div>
          <div
            data-testid={
              idPrefix === 'staff-leave-entitlement-history' ? 'history-row-count' : 'row-count'
            }
          >
            {rows.length}
          </div>
          {idPrefix === 'staff-leave-entitlement-history' && (
            <>
              <div data-testid="history-show-column-menu">{String(showColumnMenu)}</div>
              <div data-testid="history-show-export">{String(showExport)}</div>
            </>
          )}
          {idPrefix === 'staff-leave-entitlement' && (
            <>
              <div data-testid="entitlement-initial-sort-field">{initialSortField}</div>
              <div data-testid="entitlement-initial-sort-dir">{initialSortDir}</div>
            </>
          )}
          {groupedRows &&
            groupedRows.map(([groupKey, groupRows]) => (
              <div key={`group-${groupKey}`} data-testid={`group-row-${groupKey}`}>
                {typeof getRowGroupLabel === 'function'
                  ? getRowGroupLabel(groupKey, groupRows)
                  : groupKey}
              </div>
            ))}
          {(() => {
            let groupRecordIndex = -1

            return displayRows.map((row, index) => {
              const previousRow = displayRows[index - 1]
              if (!previousRow || getRowGroupKey?.(previousRow) !== getRowGroupKey?.(row)) {
                groupRecordIndex = -1
              }
              groupRecordIndex += 1
              const displayIndex = resetRowIndexOnGroup ? groupRecordIndex : index

              return (
                <div
                  key={row.id}
                  data-testid={`${
                    idPrefix === 'staff-leave-entitlement-history'
                      ? 'history-row'
                      : 'entitlement-row'
                  }-${row.id}`}
                  data-row-index={displayIndex + 1}
                  data-row-kind={row.rowKind}
                  role={onRowOpen ? 'button' : undefined}
                  tabIndex={onRowOpen ? 0 : undefined}
                  onClick={() => onRowOpen?.(row)}
                >
                  {dataColumns
                    .filter(
                      (column) =>
                        requiredColumns.has(column.key) || defaultVisibleColumns[column.key],
                    )
                    .map((column) => (
                      <span key={column.key} data-testid={`cell-${row.id}-${column.key}`}>
                        {renderCell ? renderCell(row, column) : row[column.key]}
                      </span>
                    ))}
                  {(getActions?.(row) || []).map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        action.onClick?.(row)
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )
            })
          })()}
        </div>
      )
    },
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
  {
    staff_id: 4,
    full_name: 'Ceri Terminated',
    name_code: 'CER',
    status: 'Terminated',
    terminated_at: '2025-12-31 00:00:00',
  },
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
    remaining: 9,
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
  {
    id: 40,
    staff_id: 4,
    full_name: 'Ceri Terminated',
    name_code: 'CER',
    staff_status: 'Terminated',
    staff_terminated_at: '2025-12-31 00:00:00',
    leave_type: 'Annual',
    year: currentYear,
    total_days: 20,
    used_days: 6,
    remaining: 14,
  },
]

const activeEntitlementCount = entitlements.filter((record) => record.staff_id !== 4).length

const entitlementHistory = [
  {
    id: 100,
    event_type: 'Assigned',
    staff: 'Ali Ahmad (ALI)',
    leave_type: 'Frozen Leave',
    year: currentYear,
    days: 3,
    assigned_by: 'Azam Bin Husain (AZA)',
    description: `Assigned leave entitlement #100 to staff #1, Frozen Leave, ${currentYear}, 3 days`,
    created_at: `${currentYear}-01-15 09:00:00`,
  },
]

const renderSection = (props = {}) =>
  render(
    <SectionViewAssignments
      staffList={staffList}
      entitlements={entitlements}
      entitlementHistory={entitlementHistory}
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

  it('shows assigned rows and hides generated unassigned rows by default for assigned staff', () => {
    renderSection()

    expect(screen.queryByText('Staff Covered')).not.toBeInTheDocument()
    expect(screen.queryByText('Missing Staff')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('row-count')).toHaveTextContent(
      String(activeEntitlementCount + ASSIGNABLE_LEAVE_TYPES.length),
    )
    expect(screen.getByTestId('entitlement-initial-sort-field')).toHaveTextContent(
      'entitlementOrder',
    )
    expect(screen.getByTestId('entitlement-initial-sort-dir')).toHaveTextContent('asc')
    expect(screen.getByTestId('group-row-Ali Ahmad (ALI)')).toHaveTextContent('Ali Ahmad (ALI)')
    expect(
      within(screen.getByTestId('group-row-Ali Ahmad (ALI)')).getByLabelText(
        'Show unassigned leave for Ali Ahmad (ALI)',
      ),
    ).not.toBeChecked()
    expect(screen.getByTestId('group-row-Siti Aminah (SIT)')).toHaveTextContent('Siti Aminah (SIT)')
    expect(screen.getByTestId('group-row-Kumar Das (KUM)')).toHaveTextContent('Kumar Das (KUM)')
    expect(screen.queryByTestId('group-row-Ceri Terminated (CER)')).not.toBeInTheDocument()
    expect(
      within(screen.getByLabelText('All staff')).queryByRole('option', {
        name: 'Ceri Terminated (CER)',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('group-row-Kumar Das (KUM)')).queryByLabelText(/show unassigned/i),
    ).not.toBeInTheDocument()

    const aliRow = screen.getByTestId('entitlement-row-10')
    expect(aliRow).toHaveAttribute('data-row-index', '1')
    expect(within(aliRow).queryByText('Ali Ahmad (ALI)')).not.toBeInTheDocument()
    expect(within(aliRow).getByText('Annual')).toBeInTheDocument()
    expect(within(aliRow).getByText('Assigned')).toBeInTheDocument()
    expect(within(aliRow).getByTestId('cell-10-totalDays')).toHaveTextContent('12')
    expect(within(aliRow).getByTestId('cell-10-usedDays')).toHaveTextContent('4')
    expect(within(aliRow).getByTestId('cell-10-remaining')).toHaveTextContent('9')
    expect(within(aliRow).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(within(aliRow).getByRole('button', { name: 'Delete' })).toBeInTheDocument()

    const sitiRow = screen.getByTestId('entitlement-row-20')
    expect(sitiRow).toHaveAttribute('data-row-index', '1')
    expect(within(sitiRow).queryByText('Siti Aminah (SIT)')).not.toBeInTheDocument()
    expect(within(sitiRow).getAllByText('0').length).toBeGreaterThan(0)
    expect(within(sitiRow).getByText('Assigned')).toBeInTheDocument()

    const missingRow = screen.getByTestId(`entitlement-row-missing-3-${currentYear}-annual`)
    expect(missingRow).toHaveAttribute('data-row-index', '1')
    expect(within(missingRow).queryByText('Kumar Das (KUM)')).not.toBeInTheDocument()
    expect(within(missingRow).getByText('Annual')).toBeInTheDocument()
    expect(within(missingRow).getByText('Missing')).toBeInTheDocument()
    expect(
      within(missingRow).getByTestId(`cell-missing-3-${currentYear}-annual-totalDays`),
    ).toHaveTextContent('-')
    expect(
      within(missingRow).getByTestId(`cell-missing-3-${currentYear}-annual-usedDays`),
    ).toHaveTextContent('-')
    expect(
      within(missingRow).getByTestId(`cell-missing-3-${currentYear}-annual-remaining`),
    ).toHaveTextContent('-')
    expect(within(missingRow).getByRole('button', { name: 'Assign' })).toBeInTheDocument()
    expect(within(missingRow).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(missingRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    expect(
      screen.queryByTestId(`entitlement-row-missing-1-${currentYear}-frozen-leave`),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Leave Assignment History/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show history' })).toBeInTheDocument()
    expect(screen.queryByTestId('history-row-count')).not.toBeInTheDocument()
  })

  it('shows inactive entitlement records only when inactive staff are included', () => {
    renderSection()

    expect(screen.queryByTestId('entitlement-row-40')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Include inactive staff'))

    expect(screen.getByTestId('row-count')).toHaveTextContent(
      String(activeEntitlementCount + ASSIGNABLE_LEAVE_TYPES.length + 1),
    )
    expect(screen.getByTestId('group-row-Ceri Terminated (CER)')).toBeInTheDocument()
    expect(screen.getByTestId('entitlement-row-40')).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('All staff')).getByRole('option', {
        name: 'Ceri Terminated (CER)',
      }),
    ).toBeInTheDocument()
  })

  it('reveals generated unassigned leave rows from the staff group header checkbox', () => {
    renderSection()

    const aliGroup = screen.getByTestId('group-row-Ali Ahmad (ALI)')
    fireEvent.click(within(aliGroup).getByLabelText('Show unassigned leave for Ali Ahmad (ALI)'))

    expect(screen.getByTestId('row-count')).toHaveTextContent(
      String(
        activeEntitlementCount + ASSIGNABLE_LEAVE_TYPES.length + ASSIGNABLE_LEAVE_TYPES.length - 1,
      ),
    )
    expect(
      screen.getByTestId(`entitlement-row-missing-1-${currentYear}-frozen-leave`),
    ).toBeInTheDocument()
    expect(screen.getByTestId(`entitlement-row-missing-1-${currentYear}-sick`)).toBeInTheDocument()
  })

  it('includes past-year assigned entitlement rows with edit actions', () => {
    renderSection()

    const pastRow = screen.getByTestId('entitlement-row-30')
    expect(within(pastRow).queryByText('Ali Ahmad (ALI)')).not.toBeInTheDocument()
    expect(within(pastRow).getByText('Sick')).toBeInTheDocument()
    expect(within(pastRow).getByText(String(currentYear - 1))).toBeInTheDocument()
    expect(within(pastRow).getByRole('button', { name: 'Edit' })).toBeInTheDocument()

    expect(
      screen.queryByTestId(`entitlement-row-missing-1-${currentYear}-sick`),
    ).not.toBeInTheDocument()
  })

  it('renders and searches leave assignment history rows', () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Show history' }))

    const historyRow = screen.getByTestId('history-row-100')
    expect(within(historyRow).getByText('Ali Ahmad (ALI)')).toBeInTheDocument()
    expect(within(historyRow).getByText('Frozen Leave')).toBeInTheDocument()
    expect(within(historyRow).getByText('Azam Bin Husain (AZA)')).toBeInTheDocument()
    expect(within(historyRow).getByTestId('cell-100-days')).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: 'Hide history' })).toBeInTheDocument()
    expect(screen.getByTestId('history-show-column-menu')).toHaveTextContent('false')
    expect(screen.getByTestId('history-show-export')).toHaveTextContent('false')

    fireEvent.change(screen.getByLabelText('Search assignment history'), {
      target: { value: 'azam' },
    })

    expect(screen.getByTestId('history-row-count')).toHaveTextContent('1')

    fireEvent.change(screen.getByLabelText('Search assignment history'), {
      target: { value: 'medical' },
    })

    expect(screen.getByTestId('history-row-count')).toHaveTextContent('0')
  })

  it('uses staff selection as an optional filter', () => {
    renderSection()

    fireEvent.change(screen.getByLabelText('All staff'), { target: { value: '3' } })

    expect(screen.getByTestId('row-count')).toHaveTextContent(String(ASSIGNABLE_LEAVE_TYPES.length))
    expect(
      screen.getByTestId(`entitlement-row-missing-3-${currentYear}-annual`),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('entitlement-row-10')).not.toBeInTheDocument()
  })

  it('filters by search text', () => {
    renderSection()

    fireEvent.change(screen.getByLabelText('Search entitlements'), {
      target: { value: 'kum' },
    })

    expect(screen.getByTestId('row-count')).toHaveTextContent(String(ASSIGNABLE_LEAVE_TYPES.length))
    expect(
      screen.getByTestId(`entitlement-row-missing-3-${currentYear}-annual`),
    ).toBeInTheDocument()
  })

  it('filters missing rows by Frozen Leave search text', () => {
    renderSection()

    fireEvent.change(screen.getByLabelText('Search entitlements'), {
      target: { value: 'frozen' },
    })

    expect(screen.getByTestId('row-count')).toHaveTextContent('1')
    expect(
      screen.getByTestId(`entitlement-row-missing-3-${currentYear}-frozen-leave`),
    ).toBeInTheDocument()
  })

  it('passes staff year and leave type context for missing-row assignment', () => {
    const onAssign = vi.fn()
    renderSection({ onAssign })

    const missingRow = screen.getByTestId(`entitlement-row-missing-3-${currentYear}-frozen-leave`)
    fireEvent.click(within(missingRow).getByRole('button', { name: 'Assign' }))

    expect(onAssign).toHaveBeenCalledWith(
      expect.objectContaining({
        rowKind: 'missing',
        staff_id: 3,
        year: currentYear,
        leave_type: 'Frozen Leave',
      }),
    )
  })

  it('opens staff entitlement detail from row click', () => {
    const onViewAssignment = vi.fn()
    renderSection({ onViewAssignment })

    fireEvent.click(screen.getByTestId('entitlement-row-10'))

    expect(onViewAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        staff_id: 1,
        leave_type: 'Annual',
      }),
    )
  })
})
