import React from 'react'
import { readdirSync, readFileSync } from 'node:fs'
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

const setWindowScrollPosition = ({ left = 0, top = 0 }) => {
  Object.defineProperty(window, 'scrollX', { value: left, configurable: true, writable: true })
  Object.defineProperty(window, 'pageXOffset', { value: left, configurable: true, writable: true })
  Object.defineProperty(window, 'scrollY', { value: top, configurable: true, writable: true })
  Object.defineProperty(window, 'pageYOffset', { value: top, configurable: true, writable: true })
}

const installWindowScrollMock = () => {
  const scrollTo = vi.fn((optionsOrLeft, maybeTop) => {
    const nextPosition =
      typeof optionsOrLeft === 'object'
        ? {
            left: optionsOrLeft.left || 0,
            top: optionsOrLeft.top || 0,
          }
        : {
            left: Number(optionsOrLeft) || 0,
            top: Number(maybeTop) || 0,
          }
    setWindowScrollPosition(nextPosition)
  })
  Object.defineProperty(window, 'scrollTo', {
    value: scrollTo,
    configurable: true,
    writable: true,
  })
  return scrollTo
}

const readDataTableScssSource = () => {
  const scssDir = 'src/scss/custom'
  const partialDir = `${scssDir}/data-table`
  const partials = readdirSync(partialDir)
    .filter((fileName) => fileName.endsWith('.scss'))
    .sort()
    .map((fileName) => readFileSync(`${partialDir}/${fileName}`, 'utf8'))

  return [readFileSync(`${scssDir}/_data-table.scss`, 'utf8'), ...partials].join('\n')
}

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  setWindowScrollPosition({ left: 0, top: 0 })
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

  it('keeps existing records visible while a refresh is loading', () => {
    const { rerender } = render(
      <DataTableRecordList
        rows={[]}
        loading
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
      />,
    )

    expect(screen.getByText('Loading records...')).toBeInTheDocument()

    rerender(
      <DataTableRecordList
        rows={rows}
        loading
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
      />,
    )

    expect(screen.queryByText('Loading records...')).not.toBeInTheDocument()
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
  })

  it('renders semantic empty states on desktop and mobile and can hide zero-result pagination', () => {
    render(
      <DataTableRecordList
        rows={[]}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        emptyMessage="No matching records."
        exportFilename="records.csv"
        hideFooterWhenEmpty
      />,
    )

    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(screen.getAllByText('No matching records.')).toHaveLength(2)
    expect(document.querySelectorAll('.data-table-empty-state')).toHaveLength(2)
    expect(screen.queryByLabelText('Rows per page')).not.toBeInTheDocument()
    expect(screen.queryByText('Page 1/1')).not.toBeInTheDocument()
  })

  it('retains pagination for populated tables and does not show an empty state while loading', () => {
    const { rerender } = render(
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        hideFooterWhenEmpty
      />,
    )

    expect(screen.getAllByLabelText('Rows per page').length).toBeGreaterThan(0)

    rerender(
      <DataTableRecordList
        rows={[]}
        loading
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
      />,
    )

    expect(screen.getByText('Loading records...')).toBeInTheDocument()
    expect(document.querySelector('.data-table-empty-state')).not.toBeInTheDocument()
  })

  it('restores desktop viewport scroll after remount', async () => {
    const scrollRows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))

    const { unmount } = render(
      <DataTableRecordList
        rows={scrollRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        scrollStorageKey="test.scroll-memory"
      />,
    )

    const viewport = document.querySelector('.table-scroll-viewport')
    viewport.scrollTop = 123
    fireEvent.scroll(viewport)
    unmount()

    render(
      <DataTableRecordList
        rows={scrollRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        scrollStorageKey="test.scroll-memory"
      />,
    )

    const restoredViewport = document.querySelector('.table-scroll-viewport')
    await waitFor(() => expect(restoredViewport.scrollTop).toBe(123))
  })

  it('restores desktop viewport scroll after in-place row refresh', async () => {
    const scrollRows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))
    const refreshedRows = scrollRows.slice(1)

    const { rerender } = render(
      <DataTableRecordList
        rows={scrollRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        scrollStorageKey="test.scroll-refresh"
      />,
    )

    const viewport = document.querySelector('.table-scroll-viewport')
    viewport.scrollTop = 140
    fireEvent.scroll(viewport)

    viewport.scrollTop = 0
    rerender(
      <DataTableRecordList
        rows={refreshedRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        scrollStorageKey="test.scroll-refresh"
      />,
    )

    await waitFor(() => expect(viewport.scrollTop).toBe(140))
  })

  it('restores window scroll after mobile record rows refresh', async () => {
    const scrollTo = installWindowScrollMock()
    const scrollRows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))
    const refreshedRows = scrollRows.slice(1)

    const { rerender } = render(
      <DataTableRecordList
        rows={scrollRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        scrollStorageKey="test.window-scroll-refresh"
      />,
    )

    setWindowScrollPosition({ top: 420 })
    fireEvent.scroll(window)

    setWindowScrollPosition({ top: 0 })
    rerender(
      <DataTableRecordList
        rows={refreshedRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        scrollStorageKey="test.window-scroll-refresh"
      />,
    )

    await waitFor(() =>
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 420, behavior: 'auto' }),
    )
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

  it('keeps record controls visible during quiet loading by default', () => {
    render(
      <DataTableRecordControls loading searchValue="alpha" onSearchChange={vi.fn()}>
        <div>Advanced content</div>
      </DataTableRecordControls>,
    )

    expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument()
  })

  it('can still hide record controls while loading when explicitly requested', () => {
    render(
      <DataTableRecordControls loading hideWhileLoading searchValue="alpha">
        <div>Advanced content</div>
      </DataTableRecordControls>,
    )

    expect(screen.queryByPlaceholderText('Type to search...')).not.toBeInTheDocument()
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

  it('adds the mobile-flat modifier only when requested', () => {
    const { container, rerender } = render(
      <DataTableDetailShell title="Record" record={rows[0]}>
        <div>Details</div>
      </DataTableDetailShell>,
    )

    expect(container.querySelector('.data-table-detail-shell')).not.toHaveClass(
      'data-table-detail-shell--mobile-flat',
    )

    rerender(
      <DataTableDetailShell title="Record" record={rows[0]} mobileFlat>
        <div>Details</div>
      </DataTableDetailShell>,
    )

    expect(container.querySelector('.data-table-detail-shell')).toHaveClass(
      'data-table-detail-shell--mobile-flat',
    )
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
    expect(setCurrentPage).not.toHaveBeenCalled()
  })

  it('does not reset internal pagination when refreshed row arrays are passed as reset deps', () => {
    const controlledRows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))
    const refreshedRows = controlledRows.map((row) => ({ ...row }))

    const { rerender } = render(
      <DataTableRecordList
        rows={controlledRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        initialPageSize={5}
        resetDeps={[controlledRows]}
      />,
    )

    fireEvent.click(screen.getAllByLabelText('Next page')[0])
    expect(screen.getByText('Row 6')).toBeInTheDocument()

    rerender(
      <DataTableRecordList
        rows={refreshedRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        initialPageSize={5}
        resetDeps={[refreshedRows]}
      />,
    )

    expect(screen.getByText('Row 6')).toBeInTheDocument()
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument()
  })

  it('restores internal pagination and sort after remount', async () => {
    const sortableRows = [
      'Zulu',
      'Yankee',
      'Xray',
      'Whiskey',
      'Victor',
      'Uniform',
      'Tango',
      'Sierra',
      'Romeo',
      'Quebec',
      'Papa',
      'Oscar',
    ].map((name, index) => ({ id: index + 1, name }))

    const props = {
      rows: sortableRows,
      dataColumns: columns,
      defaultVisibleColumns: { name: true },
      exportFilename: 'records.csv',
      initialPageSize: 5,
      scrollStorageKey: 'test.persisted-state',
    }

    const { unmount } = render(<DataTableRecordList {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /Name/i }))
    fireEvent.click(screen.getAllByLabelText('Next page')[0])

    expect(screen.getByText('Uniform')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        JSON.parse(window.sessionStorage.getItem('data-table-state:test.persisted-state')),
      ).toMatchObject({
        sortField: 'name',
        sortDir: 'asc',
        pageSize: 5,
        currentPage: 2,
      })
    })

    unmount()
    render(<DataTableRecordList {...props} />)

    expect(screen.getAllByText('Page 2/3').length).toBeGreaterThan(0)
    expect(screen.getByText('Uniform')).toBeInTheDocument()
    expect(screen.queryByText('Zulu')).not.toBeInTheDocument()
  })

  it('resets controlled pagination only after reset dependencies change', () => {
    const setPageSize = vi.fn()
    const setCurrentPage = vi.fn()
    const controlledRows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }))

    const { rerender } = render(
      <DataTableRecordList
        rows={controlledRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        controlledPageSize={5}
        controlledSetPageSize={setPageSize}
        controlledCurrentPage={2}
        controlledSetCurrentPage={setCurrentPage}
        resetDeps={['open']}
      />,
    )

    expect(setCurrentPage).not.toHaveBeenCalled()

    rerender(
      <DataTableRecordList
        rows={controlledRows}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        controlledPageSize={5}
        controlledSetPageSize={setPageSize}
        controlledCurrentPage={2}
        controlledSetCurrentPage={setCurrentPage}
        resetDeps={['failed']}
      />,
    )

    expect(setCurrentPage).toHaveBeenCalledWith(1)
  })

  it('renders grouped record rows without counting group headers as records', () => {
    const onOpen = vi.fn()
    const { container } = render(
      <DataTableRecordList
        rows={[
          { id: 1, name: 'Alpha', year: '2026' },
          { id: 2, name: 'Bravo', year: '2025' },
        ]}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        onRowOpen={onOpen}
        getRowGroupKey={(row) => row.year}
        getRowGroupLabel={(year) => year}
        rowGroupSortComparator={(left, right) => Number(right) - Number(left)}
      />,
    )

    const groupRows = container.querySelectorAll('tr.data-table-group-row')
    expect(groupRows).toHaveLength(2)
    expect(groupRows[0].querySelector('td')).toHaveAttribute('colspan', '2')
    expect(groupRows[0]).toHaveTextContent('2026')
    expect(screen.getByRole('button', { name: /1 Alpha/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2 Bravo/i })).toBeInTheDocument()

    fireEvent.click(groupRows[0])
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('can reset visible row numbers inside each group', () => {
    const { container } = render(
      <DataTableRecordList
        rows={[
          { id: 1, name: 'Alpha', year: '2026' },
          { id: 2, name: 'Beta', year: '2026' },
          { id: 3, name: 'Bravo', year: '2025' },
        ]}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        getRowGroupKey={(row) => row.year}
        getRowGroupLabel={(year) => year}
        rowGroupSortComparator={(left, right) => Number(right) - Number(left)}
        resetRowIndexOnGroup
      />,
    )

    const recordRows = Array.from(container.querySelectorAll('tbody tr:not(.data-table-group-row)'))

    expect(recordRows).toHaveLength(3)
    expect(recordRows[0].querySelector('.data-table-row-index-cell')).toHaveTextContent('1')
    expect(recordRows[1].querySelector('.data-table-row-index-cell')).toHaveTextContent('2')
    expect(recordRows[2].querySelector('.data-table-row-index-cell')).toHaveTextContent('1')
  })

  it('applies group ordering before pagination for grouped record rows', () => {
    const { container } = render(
      <DataTableRecordList
        rows={[
          { id: 1, name: 'Alpha', year: '2025' },
          { id: 2, name: 'Zulu', year: '2026' },
        ]}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        initialSortField="name"
        initialPageSize={1}
        getRowGroupKey={(row) => row.year}
        getRowGroupLabel={(year) => year}
        rowGroupSortComparator={(left, right) => Number(right) - Number(left)}
      />,
    )

    expect(container.querySelector('.data-table-group-row')).toHaveTextContent('2026')
    expect(screen.getByText('Zulu')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('renders grouped record rows on mobile', () => {
    const { container } = render(
      <DataTableRecordList
        rows={[
          { id: 1, name: 'Alpha', year: '2026' },
          { id: 2, name: 'Bravo', year: '2025' },
        ]}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        getMobileTitle={(row) => row.name}
        getRowGroupKey={(row) => row.year}
        getRowGroupLabel={(year) => year}
      />,
    )

    const mobileGroups = container.querySelectorAll('.data-table-mobile-group-header')
    expect(mobileGroups).toHaveLength(2)
    expect(mobileGroups[0]).toHaveTextContent('2026')
    expect(
      within(container.querySelector('.records-mobile-list')).getByText('Alpha'),
    ).toBeInTheDocument()
  })

  it('exports grouped record lists without group headers', async () => {
    const capturedBlobs = []
    const originalBlob = global.Blob
    const originalCreateObjectUrl = URL.createObjectURL
    const originalRevokeObjectUrl = URL.revokeObjectURL
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    global.Blob = class TestBlob {
      constructor(parts, options) {
        this.parts = parts
        this.options = options
      }
    }
    URL.createObjectURL = vi.fn((blob) => {
      capturedBlobs.push(blob)
      return 'blob:records'
    })
    URL.revokeObjectURL = vi.fn()

    render(
      <DataTableRecordList
        rows={[
          { id: 1, name: 'Alpha', year: '2026' },
          { id: 2, name: 'Bravo', year: '2025' },
        ]}
        dataColumns={columns}
        defaultVisibleColumns={{ name: true }}
        exportFilename="records.csv"
        getRowGroupKey={(row) => row.year}
        getRowGroupLabel={(year) => year}
      />,
    )

    fireEvent.click(screen.getAllByLabelText('Export CSV')[0])
    const csvText = capturedBlobs[0].parts.join('')

    expect(clickSpy).toHaveBeenCalled()
    expect(csvText).toContain('Alpha')
    expect(csvText).toContain('Bravo')
    expect(csvText).not.toContain('2026')
    expect(csvText).not.toContain('2025')

    global.Blob = originalBlob
    URL.createObjectURL = originalCreateObjectUrl
    URL.revokeObjectURL = originalRevokeObjectUrl
    clickSpy.mockRestore()
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
    expect(screen.getAllByLabelText('Previous page').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Next page').length).toBeGreaterThan(0)
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
    const source = readDataTableScssSource()

    expect(source).toMatch(
      /\.data-table-sheet-shell\s*\{[^}]*border-radius: var\(--app-radius-lg\)/,
    )
    expect(source).toMatch(
      /\.monitoring-table-frame\s*\{[^}]*border-radius: var\(--app-radius-lg\)/,
    )
    expect(source).not.toMatch(/\.monitoring-table-frame\s*\{[^}]*border-radius: 0/)
  })

  it('prevents double-thick bottom borders on Monitoring sheet tables', () => {
    const source = readDataTableScssSource()

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
