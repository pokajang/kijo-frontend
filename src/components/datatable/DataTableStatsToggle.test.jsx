import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import DataTableStatsToggle from './DataTableStatsToggle'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DataTableStatsToggle', () => {
  const openSettings = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Table display' }))
  }

  const toggleDraftVisibility = () => {
    openSettings()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show statistics' }))
  }

  it('renders a compact statistics display button', () => {
    render(<DataTableStatsToggle visible onToggle={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Table display' })).toHaveAttribute(
      'title',
      'Table display',
    )
    expect(screen.queryByText('HIDE STATS')).not.toBeInTheDocument()
    expect(screen.queryByText('SHOW STATS')).not.toBeInTheDocument()
  })

  it('surfaces when the search and filters row is hidden', () => {
    render(
      <DataTableStatsToggle
        visible
        onToggle={vi.fn()}
        controlsVisible={false}
        onControlsToggle={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Table display' })).toHaveAttribute(
      'title',
      'Table display - search and filters row hidden',
    )
  })

  it('opens settings with controls for the stats and search rows', () => {
    render(<DataTableStatsToggle visible onToggle={vi.fn()} onControlsToggle={vi.fn()} />)

    openSettings()

    expect(screen.getByText('Table display')).toBeInTheDocument()
    expect(screen.getByText('Statistics row')).toBeInTheDocument()
    expect(screen.getByText('Summary cards above the table.')).toBeInTheDocument()
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Visible').length).toBeGreaterThan(0)
    expect(screen.getByRole('checkbox', { name: 'Show statistics' })).toHaveAttribute(
      'title',
      'Statistics visible',
    )
    expect(screen.getByText('Search and filters row')).toBeInTheDocument()
    expect(
      screen.getByText('Search, filters, reset, export, and column tools.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show search and filters row' })).toHaveAttribute(
      'title',
      'Search and filters row visible',
    )
    expect(screen.getByRole('button', { name: 'This page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All data tables' })).toBeInTheDocument()
  })

  it('omits the search row toggle when no controls handler is provided', () => {
    render(<DataTableStatsToggle visible onToggle={vi.fn()} />)

    openSettings()

    expect(screen.getByText('Statistics row')).toBeInTheDocument()
    expect(screen.queryByText('Search and filters row')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Show search and filters row' })).toBeNull()
  })

  it('opens settings with a show action when stats are hidden', () => {
    render(<DataTableStatsToggle visible={false} onToggle={vi.fn()} />)

    openSettings()

    expect(screen.getByText('Hidden')).toBeInTheDocument()
    expect(screen.getByText('Visible')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show statistics' })).toHaveAttribute(
      'title',
      'Statistics hidden',
    )
  })

  it('enables the apply action after changing visibility', () => {
    const onToggle = vi.fn()
    render(<DataTableStatsToggle visible onToggle={onToggle} />)

    openSettings()

    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show statistics' }))

    expect(screen.getByRole('button', { name: 'Apply changes' })).not.toBeDisabled()
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('closes the dialog without toggling when cancelled', async () => {
    const onToggle = vi.fn()
    render(<DataTableStatsToggle visible onToggle={onToggle} />)

    toggleDraftVisibility()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByText('Visible')).not.toBeInTheDocument()
    })
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('closes the settings dialog without toggling', async () => {
    const onToggle = vi.fn()
    render(<DataTableStatsToggle visible onToggle={onToggle} />)

    openSettings()
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1))

    await waitFor(() => {
      expect(screen.queryByText('Visible')).not.toBeInTheDocument()
    })
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('calls onToggle with the selected page scope', () => {
    const onToggle = vi.fn()
    render(<DataTableStatsToggle visible onToggle={onToggle} />)

    toggleDraftVisibility()
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(onToggle).toHaveBeenCalledWith('page')
  })

  it('calls onToggle with the selected systemwide scope', () => {
    const onToggle = vi.fn()
    render(<DataTableStatsToggle visible={false} onToggle={onToggle} />)

    toggleDraftVisibility()
    fireEvent.click(screen.getByRole('button', { name: 'All data tables' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(onToggle).toHaveBeenCalledWith('systemwide')
  })

  it('calls onControlsToggle when the search row visibility changes', () => {
    const onToggle = vi.fn()
    const onControlsToggle = vi.fn()
    render(<DataTableStatsToggle visible onToggle={onToggle} onControlsToggle={onControlsToggle} />)

    openSettings()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show search and filters row' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(onToggle).not.toHaveBeenCalled()
    expect(onControlsToggle).toHaveBeenCalledWith('page')
  })

  it('applies both row visibility changes with the selected scope', () => {
    const onToggle = vi.fn()
    const onControlsToggle = vi.fn()
    render(<DataTableStatsToggle visible onToggle={onToggle} onControlsToggle={onControlsToggle} />)

    openSettings()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show statistics' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show search and filters row' }))
    fireEvent.click(screen.getByRole('button', { name: 'All data tables' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(onToggle).toHaveBeenCalledWith('systemwide')
    expect(onControlsToggle).toHaveBeenCalledWith('systemwide')
  })
})
