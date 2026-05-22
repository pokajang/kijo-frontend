import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  DataTableActionButtonGroup,
  DataTableActionMenu,
  DataTableDetailShell,
  DataTableEmbeddedList,
  DataTableMatrix,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableSheet,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../index'
import { createRowOpenHandlers } from '../../../utils/datatable/rowOpen'
import { normalizeVisibleColumns } from '../../../utils/datatable/columnVisibility'

const columns = [{ key: 'name', label: 'Name', sortable: true }]
const rows = [{ id: 1, name: 'Alpha' }]

afterEach(() => {
  cleanup()
  document.querySelectorAll('[data-test-portal-root="true"]').forEach((node) => node.remove())
})

describe('datatable shared components', () => {
  it('renders detail action buttons from the shared action schema', () => {
    const onPrimary = vi.fn()
    const onDelete = vi.fn()

    render(
      <DataTableActionButtonGroup
        record={rows[0]}
        actions={[
          { key: 'primary', label: 'Primary', onClick: onPrimary },
          { key: 'hidden', label: 'Hidden', hidden: true },
          { key: 'disabled', label: 'Disabled', disabled: true, onClick: vi.fn() },
          { key: 'delete', label: 'Delete', danger: true, onClick: onDelete },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Primary' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByRole('button', { name: 'Hidden' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
    expect(onPrimary).toHaveBeenCalledWith(rows[0])
    expect(onDelete).toHaveBeenCalledWith(rows[0])
  })

  it('opens action menu items and calls their handlers', async () => {
    const onAction = vi.fn()
    const onDisabled = vi.fn()

    render(
      <DataTableActionMenu
        record={rows[0]}
        actionKey="row-1"
        actions={[
          { key: 'hidden', label: 'Hidden', hidden: true },
          { key: 'disabled', label: 'Disabled', disabled: true, onClick: onDisabled },
          { key: 'run', label: 'Run', onClick: onAction, danger: true, dividerBefore: true },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    fireEvent.click(await screen.findByText('Disabled'))
    fireEvent.click(await screen.findByText('Run'))

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    expect(onDisabled).not.toHaveBeenCalled()
    expect(onAction).toHaveBeenCalledWith(rows[0])
  })

  it('opens rows on click and keyboard while ignoring nested controls', () => {
    const onOpen = vi.fn()

    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        onRowOpen={onOpen}
        renderCell={(row, column) =>
          column.key === 'name' ? <button type="button">Inner</button> : row[column.key]
        }
      />,
    )

    const row = screen.getAllByRole('button', { name: /1 Inner/i })[0]
    fireEvent.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })
    fireEvent.click(screen.getByRole('button', { name: 'Inner' }))

    expect(onOpen).toHaveBeenCalledTimes(3)
    expect(onOpen).toHaveBeenCalledWith(rows[0])
  })

  it('applies row-open props to desktop rows and mobile row content', () => {
    const onOpen = vi.fn()

    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        onRowOpen={onOpen}
      />,
    )

    const desktopRow = screen.getByRole('button', { name: /1 Alpha/i })
    const mobileRow = document.querySelector('.records-mobile-item-main[role="button"]')
    expect(mobileRow).toBeTruthy()
    fireEvent.click(desktopRow)
    fireEvent.click(mobileRow)

    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  it('keeps mobile row actions outside the row-open hit target', async () => {
    const onOpen = vi.fn()
    const onAction = vi.fn()

    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        onRowOpen={onOpen}
        getMobileTitle={(row) => row.name}
        getActions={() => [{ key: 'view', label: 'View', onClick: onAction }]}
      />,
    )

    const mobileMain = document.querySelector('.records-mobile-item-main[role="button"]')
    const mobileItem = document.querySelector('.data-table-mobile-item')
    fireEvent.click(within(mobileItem).getByRole('button', { name: 'Actions' }))
    const actionItems = await screen.findAllByText('View')
    fireEvent.click(actionItems[actionItems.length - 1])
    fireEvent.click(mobileMain)

    expect(onAction).toHaveBeenCalledWith(rows[0])
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('renders the standard mobile row index, title, status, and actions', () => {
    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        getMobileTitle={(row) => row.name}
        getMobileStatus={() => 'Open'}
        getMobileStatusTone={() => 'success'}
        getActions={() => [{ key: 'view', label: 'View', onClick: vi.fn() }]}
      />,
    )

    const mobileRow = document.querySelector('.data-table-mobile-item')
    expect(mobileRow).toHaveTextContent('#1')
    expect(mobileRow).toHaveTextContent('Alpha')
    expect(within(mobileRow).getByText('Open')).toHaveClass('records-status-badge--success')
    expect(within(mobileRow).getByRole('button', { name: 'Actions' })).toBeInTheDocument()
  })

  it('merges caller row props with generated row-open props', () => {
    const onOpen = vi.fn()
    const onUserClick = vi.fn()

    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        onRowOpen={onOpen}
        rowProps={() => ({ className: 'custom-row', onClick: onUserClick })}
      />,
    )

    const row = screen.getAllByRole('button', { name: /1 Alpha/i })[0]
    fireEvent.click(row)

    expect(row).toHaveClass('data-table-clickable-row')
    expect(row).toHaveClass('custom-row')
    expect(onUserClick).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('accepts object row props in record lists', () => {
    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        rowProps={{ className: 'object-row-props', 'data-testid': 'object-row' }}
      />,
    )

    const row = screen.getAllByTestId('object-row')[0]
    expect(row).toHaveClass('object-row-props')
  })

  it('uses renderActions on mobile when both renderActions and getActions are supplied', () => {
    const onDefaultAction = vi.fn()

    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        getActions={() => [{ key: 'default', label: 'Default Action', onClick: onDefaultAction }]}
        renderActions={() => <span data-testid="custom-actions">Custom Actions</span>}
      />,
    )

    expect(screen.getAllByTestId('custom-actions')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
  })

  it('renders utility controls in mobile portal placement', async () => {
    const portalTarget = document.createElement('div')
    portalTarget.id = 'mobile-tools'
    portalTarget.dataset.testPortalRoot = 'true'
    document.body.appendChild(portalTarget)

    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId="mobile-tools"
        showMobileUtilityRow={false}
      />,
    )

    await waitFor(() => {
      expect(within(portalTarget).getByLabelText('Show or hide columns')).toBeInTheDocument()
      expect(within(portalTarget).getByLabelText('Export CSV')).toBeInTheDocument()
    })
  })

  it('renders utility controls into record-control portals created in the same render', async () => {
    render(
      <>
        <DataTableRecordControls
          showAdvancedFilters
          setShowAdvancedFilters={vi.fn()}
          desktopToolsId="same-render-desktop-tools"
          mobileToolsId="same-render-mobile-tools"
        />
        <DataTableRecordList
          rows={rows}
          dataColumns={columns}
          defaultVisibleColumns={{ name: true }}
          exportFilename="records.csv"
          desktopUtilityPlacement="portal"
          desktopUtilityPortalId="same-render-desktop-tools"
          mobileUtilityPlacement="portal"
          mobileUtilityPortalId="same-render-mobile-tools"
          showMobileUtilityRow={false}
        />
      </>,
    )

    const desktopTarget = document.getElementById('same-render-desktop-tools')
    const mobileTarget = document.getElementById('same-render-mobile-tools')

    await waitFor(() => {
      expect(within(desktopTarget).getByRole('button', { name: 'Columns' })).toBeInTheDocument()
      expect(within(mobileTarget).getByLabelText('Export CSV')).toBeInTheDocument()
    })
  })

  it('resets sorting when the active sort column is hidden', async () => {
    render(
      <DataTableRecordList
        rows={[
          { id: 1, name: 'Bravo', secret: 'A' },
          { id: 2, name: 'Alpha', secret: 'B' },
        ]}
        dataColumns={[
          { key: 'name', label: 'Name', sortable: true },
          { key: 'secret', label: 'Secret', sortable: true },
        ]}
        defaultVisibleColumns={{ name: true, secret: false }}
        exportFilename="records.csv"
        initialSortField="secret"
        onRowOpen={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /1 Alpha/i }).length).toBeGreaterThan(0)
    })
  })

  it('leaves hidden sort fallback to controlled sort owners', async () => {
    const onControlledSort = vi.fn()

    render(
      <DataTableRecordList
        rows={[
          { id: 1, name: 'Bravo', secret: 'A' },
          { id: 2, name: 'Alpha', secret: 'B' },
        ]}
        dataColumns={[
          { key: 'name', label: 'Name', sortable: true },
          { key: 'secret', label: 'Secret', sortable: true },
        ]}
        defaultVisibleColumns={{ name: true, secret: false }}
        exportFilename="records.csv"
        controlledSortField="secret"
        controlledSortDir="asc"
        onControlledSort={onControlledSort}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Bravo')).toBeInTheDocument()
    })
    expect(onControlledSort).not.toHaveBeenCalled()
  })

  it('renders record controls with active count, chips, reset, and tool portals', () => {
    const onSearchChange = vi.fn()
    const resetFilters = vi.fn()
    const clearChip = vi.fn()

    render(
      <DataTableRecordControls
        searchValue="alpha"
        onSearchChange={onSearchChange}
        showAdvancedFilters
        setShowAdvancedFilters={vi.fn()}
        activeFilterCount={1}
        activeChips={[{ key: 'status', label: 'Status: Open' }]}
        resetFilters={resetFilters}
        clearChip={clearChip}
        desktopToolsId="desktop-tools"
        mobileToolsId="mobile-tools"
      >
        <div>Advanced content</div>
      </DataTableRecordControls>,
    )

    fireEvent.change(screen.getByPlaceholderText('Type to search...'), {
      target: { value: 'beta' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset filters' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Clear Status: Open' }))

    expect(screen.getByText('Filters (1)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle advanced filters' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Advanced content')).toBeInTheDocument()
    expect(document.getElementById('desktop-tools')).toBeTruthy()
    expect(document.getElementById('mobile-tools')).toBeTruthy()
    expect(onSearchChange).toHaveBeenCalledWith('beta')
    expect(resetFilters).toHaveBeenCalled()
    expect(clearChip).toHaveBeenCalledWith('status')
  })

  it('renders detail shell loading, details, and action sections', () => {
    const onBack = vi.fn()
    const onAction = vi.fn()
    const { rerender } = render(
      <DataTableDetailShell title="Record" loading onBack={onBack} record={null}>
        <div>Details</div>
      </DataTableDetailShell>,
    )

    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0)

    rerender(
      <DataTableDetailShell
        title="Record"
        onBack={onBack}
        record={rows[0]}
        actions={[{ key: 'run', label: 'Run', onClick: onAction }]}
      >
        <div>Details</div>
      </DataTableDetailShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(onBack).toHaveBeenCalled()
    expect(onAction).toHaveBeenCalledWith(rows[0])
  })

  it('keeps status badge default classes while accepting size and shape options', () => {
    render(
      <DataTableStatusBadge tone="success" size="md" shape="pill">
        Done
      </DataTableStatusBadge>,
    )

    const badge = screen.getByText('Done')
    expect(badge).toHaveClass('data-table-status-badge')
    expect(badge).toHaveClass('records-status-badge')
    expect(badge).toHaveClass('records-status-badge--success')
    expect(badge).toHaveClass('data-table-status-badge--md')
    expect(badge).toHaveClass('data-table-status-badge--pill')
  })

  it('renders expandable text cells and opens the full text modal without bubbling', async () => {
    const onParentClick = vi.fn()
    const longText = 'This is a long operational record value that needs a modal preview.'

    render(
      <div onClick={onParentClick}>
        <DataTableTextCell
          value={longText}
          maxWidth="120px"
          title="Long Text"
          mode="expandable"
          constrain
          previewCharThreshold={12}
        />
      </div>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'More' }))

    expect(onParentClick).not.toHaveBeenCalled()
    expect(await screen.findByText('Long Text')).toBeInTheDocument()
    expect(screen.getByText('This is a lo...')).toBeInTheDocument()
    expect(screen.getByText(longText)).toBeInTheDocument()
  })

  it('can truncate expandable text by character count while keeping the full modal value', async () => {
    const longText = 'Seeded procedure for Laravel CRUD verification.'

    render(
      <DataTableTextCell
        value={longText}
        title="Brief Description"
        mode="expandable"
        previewCharThreshold={16}
        truncateCharThreshold={16}
      />,
    )

    expect(screen.getByText('Seeded procedure...')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))

    expect(await screen.findByText('Brief Description')).toBeInTheDocument()
    expect(screen.getByText(longText)).toBeInTheDocument()
  })

  it('can truncate text with a native tooltip instead of a modal trigger', () => {
    const longText = 'Effectiveness Of Safety Health Committee - 1 day'

    render(
      <DataTableTextCell
        value={longText}
        title="Project"
        mode="tooltip"
        previewCharThreshold={24}
        truncateCharThreshold={24}
      />,
    )

    const truncatedText = screen.getByText('Effectiveness Of Safety...')
    expect(truncatedText).toBeInTheDocument()
    expect(truncatedText).toHaveAttribute('title', longText)
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
  })

  it('auto-truncates long primitive text cells in record lists', async () => {
    const longText = 'Acme Manufacturing International Operations Department'

    render(
      <DataTableRecordList
        rows={[{ id: 1, name: longText }]}
        dataColumns={[{ key: 'name', label: 'Client', width: '180px', sortable: true }]}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
      />,
    )

    expect(screen.getByText('Acme Manufacturing International O...')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))

    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByText('Client')).toBeInTheDocument()
    expect(within(modal).getByText(longText)).toBeInTheDocument()
  })

  it('passes source column metadata to custom cell renderers', () => {
    const renderCell = vi.fn((row, column) => (
      <DataTableTextCell
        value={row.name}
        title={column.label}
        mode={column.textMode || 'plain'}
        previewCharThreshold={column.previewCharThreshold}
      />
    ))

    render(
      <DataTableRecordList
        rows={[{ id: 1, name: 'Acme Manufacturing International Operations Department' }]}
        dataColumns={[
          {
            key: 'name',
            label: 'Client',
            width: '180px',
            sortable: true,
            textMode: 'expandable',
            previewCharThreshold: 12,
          },
        ]}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        renderCell={renderCell}
      />,
    )

    expect(renderCell).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ key: 'name', textMode: 'expandable', previewCharThreshold: 12 }),
      expect.any(Object),
    )
    expect(screen.getByText('Acme Manufac...')).toBeInTheDocument()
  })

  it('keeps compact columns minimum-sized and nowrap', () => {
    render(
      <DataTableRecordList
        rows={[{ id: 1, code: 'A-100' }]}
        dataColumns={[
          { key: 'code', label: 'Code', width: '84px', sortable: true, shrinkToFit: true },
        ]}
        defaultVisibleColumns={{ code: true }}
        exportFilename="records.csv"
      />,
    )

    const codeHeader = screen.getByRole('columnheader', { name: /Code/i })
    expect(codeHeader).toHaveClass('text-nowrap')
    expect(codeHeader.style.width).toBe('')
    expect(codeHeader.style.minWidth).toBe('84px')
    expect(codeHeader.style.maxWidth).toBe('')
    expect(codeHeader.style.whiteSpace).toBe('')
    expect(screen.getByText('A-100').closest('td').style.minWidth).toBe('84px')
  })

  it('keeps short date and code values on one table row automatically', () => {
    render(
      <DataTableRecordList
        rows={[{ id: 1, createdDate: '2026-05-12', nameCode: 'AK' }]}
        dataColumns={[
          { key: 'createdDate', label: 'Created Date', sortable: true, sortType: 'date' },
          { key: 'nameCode', label: 'Name Code', sortable: true },
        ]}
        defaultVisibleColumns={{ createdDate: true, nameCode: true }}
        exportFilename="records.csv"
      />,
    )

    expect(screen.getByRole('columnheader', { name: /Created Date/i })).toHaveClass('text-nowrap')
    expect(screen.getByRole('columnheader', { name: /Name Code/i })).toHaveClass('text-nowrap')
    expect(screen.getByText('2026-05-12').closest('td')).toHaveClass('text-nowrap')
    expect(screen.getByText('AK').closest('td')).toHaveClass('text-nowrap')
  })

  it('lets callers opt out of automatic nowrap for compact-looking columns', () => {
    render(
      <DataTableRecordList
        rows={[{ id: 1, createdDate: '2026-05-12' }]}
        dataColumns={[
          { key: 'createdDate', label: 'Created Date', sortable: true, allowWrap: true },
        ]}
        defaultVisibleColumns={{ createdDate: true }}
        exportFilename="records.csv"
      />,
    )

    expect(screen.getByRole('columnheader', { name: /Created Date/i })).not.toHaveClass(
      'text-nowrap',
    )
    expect(screen.getByText('2026-05-12').closest('td')).not.toHaveClass('text-nowrap')
  })

  it('keeps generated row number columns content-sized', () => {
    render(
      <DataTableRecordList
        rows={[{ id: 1, name: 'Alpha' }]}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
      />,
    )

    const indexHeader = screen.getByRole('columnheader', { name: '#' })
    const indexCell = screen.getAllByText('1').find((node) => node.closest('td'))

    expect(indexHeader).toHaveClass('data-table-row-index-cell')
    expect(indexHeader).toHaveClass('text-nowrap')
    expect(indexHeader.style.width).toBe('1%')
    expect(indexHeader.style.minWidth).toBe('3.25rem')
    expect(indexCell.closest('td')).toHaveClass('data-table-row-index-cell')
    expect(indexCell.closest('td').style.width).toBe('1%')
  })

  it('keeps action columns sticky and right aligned', () => {
    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        getActions={() => [{ key: 'view', label: 'View', onClick: vi.fn() }]}
      />,
    )

    const actionHeader = screen.getByRole('columnheader', { name: 'Actions' })
    const actionCell = document.querySelector('td.record-action-cell')

    expect(actionHeader.style.position).toBe('sticky')
    expect(actionHeader.style.right).toBe('0px')
    expect(actionCell).toHaveClass('record-action-cell')
    expect(actionCell.style.position).toBe('sticky')
    expect(actionCell.style.right).toBe('0px')
    expect(actionCell).toHaveClass('text-center')
  })

  it('supports controlled pagination for shared table consumers', () => {
    const setPageSize = vi.fn()
    const setCurrentPage = vi.fn()
    const controlledRows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))

    render(
      <DataTableRecordList
        rows={controlledRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        controlledPageSize={5}
        controlledSetPageSize={setPageSize}
        controlledCurrentPage={2}
        controlledSetCurrentPage={setCurrentPage}
      />,
    )

    expect(screen.getByText('Row 6')).toBeInTheDocument()
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument()
    expect(screen.getAllByText('Page 2/3').length).toBeGreaterThan(0)
  })

  it('row-open utility ignores nested controls', () => {
    const onOpen = vi.fn()
    const row = document.createElement('div')
    const button = document.createElement('button')
    row.appendChild(button)
    const handlers = createRowOpenHandlers(rows[0], onOpen)

    handlers.onClick({ target: button, currentTarget: row })
    handlers.onClick({ target: row, currentTarget: row })

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('preserves default hidden columns when preferences are partial', () => {
    expect(normalizeVisibleColumns({}, { name: true, secret: false }, new Set())).toEqual({
      name: true,
      secret: false,
    })
  })

  it('labels row-count selects for assistive technology', () => {
    render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
      />,
    )

    expect(screen.getAllByLabelText('Rows per page').length).toBeGreaterThan(0)
  })

  it('renders embedded tables with shared width, nowrap, summary, and footer support', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, code: 'SVC-1', amount: 25 }]}
        columns={[
          { key: 'code', label: 'Service Code', width: '120px', noWrap: true },
          { key: 'amount', label: 'Amount', align: 'right', render: (row) => row.amount },
        ]}
        summaryRows={[
          {
            key: 'summary',
            cells: [{ key: 'code', content: 'Summary', colSpan: 2, className: 'fw-semibold' }],
          },
        ]}
        footerRows={[
          {
            key: 'total',
            cells: [
              { key: 'code', content: 'Total' },
              { key: 'amount', content: 25, align: 'right' },
            ],
          },
        ]}
        desktopBreakpoint="md"
        shellClassName="dashboard-table-shell"
        hideMobileList
      />,
    )

    expect(container.querySelector('.data-table-embedded-shell')).toHaveClass('d-md-block')
    expect(container.querySelector('.data-table-embedded-shell')).toHaveClass(
      'dashboard-table-shell',
    )
    expect(container.querySelector('.records-mobile-list')).not.toBeInTheDocument()
    const header = screen.getByRole('columnheader', { name: 'Service Code' })
    expect(header).toHaveClass('text-nowrap')
    expect(header.style.minWidth).toBe('120px')
    const desktopCodeCell = screen.getAllByText('SVC-1').find((node) => node.closest('td'))
    expect(desktopCodeCell.closest('td')).toHaveClass('text-nowrap')
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('passes custom table props to embedded tables', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, code: 'SVC-1' }]}
        columns={[{ key: 'code', label: 'Service Code' }]}
        tableProps={{ 'data-testid': 'embedded-table', className: 'custom-table-prop' }}
      />,
    )

    expect(screen.getByTestId('embedded-table')).toHaveClass('custom-table-prop')
    expect(container.querySelector('.records-mobile-list')).toBeInTheDocument()
  })

  it('keeps shrink-to-fit embedded columns content-sized', () => {
    render(
      <DataTableEmbeddedList
        rows={[{ id: 1, rowNumber: 1, name: 'Alpha' }]}
        columns={[
          { key: 'rowNumber', label: '#', width: '3.25rem', shrinkToFit: true },
          { key: 'name', label: 'Name' },
        ]}
      />,
    )

    const header = screen.getByRole('columnheader', { name: '#' })
    const cell = screen
      .getAllByText('1')
      .find((node) => node.closest('td'))
      .closest('td')

    expect(header.style.width).toBe('3.25rem')
    expect(header.style.minWidth).toBe('3.25rem')
    expect(header.style.maxWidth).toBe('3.25rem')
    expect(cell.style.width).toBe('3.25rem')
    expect(cell).not.toHaveClass('text-center')
  })

  it('renders embedded table rows on mobile without a custom mobile renderer', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, code: 'SVC-1' }]}
        columns={[{ key: 'code', label: 'Service Code' }]}
      />,
    )

    const mobileList = container.querySelector('.records-mobile-list')
    expect(within(mobileList).getByText('Service Code')).toBeInTheDocument()
    expect(within(mobileList).getByText('SVC-1')).toBeInTheDocument()
  })

  it('renders two-cell embedded footer rows as compact mobile summaries', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, code: 'SVC-1', amount: 25 }]}
        columns={[
          { key: 'code', label: 'Service Code' },
          { key: 'amount', label: 'Amount', align: 'right' },
        ]}
        footerRows={[
          {
            key: 'total',
            cells: [
              { key: 'code', content: 'Total' },
              { key: 'amount', content: '25', align: 'right' },
            ],
          },
        ]}
      />,
    )

    const mobileFooter = container.querySelector('.data-table-mobile-footer-item--summary')
    expect(mobileFooter).toBeInTheDocument()
    expect(within(mobileFooter).getByText('Total')).toBeInTheDocument()
    expect(within(mobileFooter).getByText('25')).toBeInTheDocument()
  })

  it('supports custom embedded mobile footer rendering', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, code: 'SVC-1', amount: 25 }]}
        columns={[
          { key: 'code', label: 'Service Code' },
          { key: 'amount', label: 'Amount', align: 'right' },
        ]}
        footerRows={[
          {
            key: 'total',
            cells: [
              { key: 'code', content: 'Total' },
              { key: 'amount', content: '25', align: 'right' },
            ],
          },
        ]}
        renderMobileFooterItem={(row, index, cells) => (
          <div className="custom-mobile-footer">
            {row.key}:{index}:{cells.length}
          </div>
        )}
      />,
    )

    const mobileFooter = container.querySelector('.custom-mobile-footer')
    expect(mobileFooter).toBeInTheDocument()
    expect(mobileFooter).toHaveTextContent('total:0:2')
    expect(
      container.querySelector('.data-table-mobile-footer-item--summary'),
    ).not.toBeInTheDocument()
  })

  it('renders multi-cell embedded footer rows with mobile labels', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, service: 'Training', quoted: 5, won: 2 }]}
        columns={[
          { key: 'service', label: 'Service' },
          { key: 'quoted', label: 'Quoted' },
          { key: 'won', label: 'Won' },
        ]}
        footerRows={[
          {
            key: 'totals',
            cells: [
              { key: 'service', content: 'Totals' },
              { key: 'quoted', content: '8', mobileLabel: 'Quote Total' },
              { key: 'won', content: '3' },
            ],
          },
        ]}
      />,
    )

    const mobileFooter = container.querySelector(
      '.data-table-mobile-footer-item:not(.data-table-mobile-footer-item--summary)',
    )
    expect(mobileFooter).toBeInTheDocument()
    expect(within(mobileFooter).getByText('Quote Total')).toBeInTheDocument()
    expect(within(mobileFooter).getByText('Won')).toBeInTheDocument()
    expect(within(mobileFooter).getByText('8')).toBeInTheDocument()
    expect(within(mobileFooter).getByText('3')).toBeInTheDocument()
  })

  it('humanizes unmatched embedded footer cell keys on mobile', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, service: 'Training', amount: 25 }]}
        columns={[
          { key: 'service', label: 'Service' },
          { key: 'amount', label: 'Amount' },
        ]}
        footerRows={[
          {
            key: 'totals',
            cells: [
              { key: 'total-label', content: 'Total', colSpan: 2 },
              { key: 'quoted_value', content: '8' },
              { key: 'realizedJobs', content: '3' },
            ],
          },
        ]}
      />,
    )

    const mobileFooter = container.querySelector(
      '.data-table-mobile-footer-item:not(.data-table-mobile-footer-item--summary)',
    )
    expect(within(mobileFooter).getByText('Total Label')).toBeInTheDocument()
    expect(within(mobileFooter).getByText('Quoted Value')).toBeInTheDocument()
    expect(within(mobileFooter).getByText('Realized Jobs')).toBeInTheDocument()
    expect(within(mobileFooter).queryByText('total-label')).not.toBeInTheDocument()
  })

  it('can render two-cell embedded footer rows as detailed mobile rows', () => {
    const { container } = render(
      <DataTableEmbeddedList
        rows={[{ id: 1, quoted: 5, won: 2 }]}
        columns={[
          { key: 'quoted', label: 'Quoted' },
          { key: 'won', label: 'Won' },
        ]}
        footerRows={[
          {
            key: 'totals',
            mobileLayout: 'details',
            cells: [
              { key: 'quoted', content: '8' },
              { key: 'won', content: '3' },
            ],
          },
        ]}
      />,
    )

    expect(
      container.querySelector('.data-table-mobile-footer-item--summary'),
    ).not.toBeInTheDocument()
    const mobileFooter = container.querySelector('.data-table-mobile-footer-item')
    expect(within(mobileFooter).getByText('Quoted')).toBeInTheDocument()
    expect(within(mobileFooter).getByText('Won')).toBeInTheDocument()
  })

  it('keeps monitoring table mobile cards off Bootstrap light surfaces', () => {
    const monitoringFiles = [
      '../../../views/dashboard/monitoring/MonitoringPipelineStatus.js',
      '../../../views/dashboard/monitoring/MonitoringPipelineToolsContent.js',
      '../../../views/dashboard/monitoring/MonitoringStaffPipelineMatrix.js',
    ]

    monitoringFiles.forEach((filePath) => {
      const source = readFileSync(new URL(filePath, import.meta.url), 'utf8')
      expect(source).toContain('dashboard-table-mobile-card')
      expect(source).not.toMatch(/rounded-4 bg-light p-3|bg-light p-3/)
    })
  })

  it('keeps shared sheet table shells rounded for Monitoring dashboard tables', () => {
    const source = readFileSync('src/scss/custom/_data-table.scss', 'utf8')

    expect(source).toMatch(
      /\.data-table-sheet-shell\s*\{[^}]*border-radius: var\(--app-radius-lg\)/,
    )
    expect(source).toMatch(
      /\.monitoring-table-frame\s*\{[^}]*border-radius: var\(--app-radius-lg\)/,
    )
    expect(source).not.toMatch(/\.monitoring-table-frame\s*\{[^}]*border-radius: 0/)
  })

  it('prevents double-thick bottom borders on Monitoring sheet tables', () => {
    const source = readFileSync('src/scss/custom/_data-table.scss', 'utf8')

    expect(source).toMatch(
      /\.monitoring-table-frame \.monitoring-sheet-table tbody tr:last-child > \*,\s*\.monitoring-table-frame \.monitoring-sheet-table tfoot tr:last-child > \*\s*\{[^}]*border-bottom: 0 !important/,
    )
  })

  it('renders matrix tables with dynamic numeric columns and footer totals', () => {
    render(
      <DataTableMatrix
        rows={[{ id: 1, metric: 'Revenue', jan: 10, feb: 20 }]}
        columns={[
          { key: 'metric', label: 'Metric', width: '160px', noWrap: true },
          { key: 'jan', label: 'Jan', align: 'right' },
          { key: 'feb', label: 'Feb', align: 'right' },
        ]}
        footerRows={[
          {
            key: 'totals',
            cells: [
              { key: 'metric', content: 'Totals' },
              { key: 'jan', content: 10, align: 'right' },
              { key: 'feb', content: 20, align: 'right' },
            ],
          },
        ]}
        stickyFirstColumn
      />,
    )

    const metricHeader = screen.getByRole('columnheader', { name: 'Metric' })
    expect(metricHeader).toHaveClass('data-table-matrix-sticky-cell')
    expect(metricHeader.style.minWidth).toBe('160px')
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Totals')).toBeInTheDocument()
  })

  it('renders sheet tables with grouped headers, spans, footer rows, and jsx cells', () => {
    render(
      <DataTableSheet
        headerRows={[
          {
            key: 'group',
            cells: [
              { key: 'metric', content: 'Metric', rowSpan: 2 },
              { key: 'week', content: 'Week 1', colSpan: 2, className: 'group-heading' },
            ],
          },
          {
            key: 'subhead',
            cells: [
              { key: 'qty', content: 'QTY' },
              { key: 'value', content: 'RM' },
            ],
          },
        ]}
        rows={[
          {
            key: 'training',
            cells: [
              { key: 'metric', content: <strong>Training</strong> },
              { key: 'qty', content: 2, align: 'center' },
              { key: 'value', content: '1,000', align: 'end' },
            ],
          },
        ]}
        footerRows={[
          {
            key: 'total',
            cells: [
              { key: 'metric', content: 'Total' },
              { key: 'qty', content: 2, align: 'center' },
              { key: 'value', content: '1,000', align: 'end' },
            ],
          },
        ]}
        shellClassName="custom-sheet-shell"
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Metric' })).toHaveAttribute('rowspan', '2')
    expect(screen.getByRole('columnheader', { name: 'Week 1' })).toHaveAttribute('colspan', '2')
    expect(screen.getByRole('columnheader', { name: 'Week 1' })).toHaveClass('group-heading')
    expect(screen.getByText('Training')).toBeInTheDocument()
    expect(screen.getAllByText('1,000')[0].closest('td')).toHaveClass('text-end')
    expect(document.querySelector('.data-table-sheet-shell')).toHaveClass('custom-sheet-shell')
    expect(screen.getByText('Total')).toBeInTheDocument()
  })
})
