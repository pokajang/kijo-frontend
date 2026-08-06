import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FeedbackTable from './FeedbackTable'

vi.mock('../../hooks/datatable', () => ({
  useDataTableStatsVisibility: () => ({
    statsVisible: false,
    toggleStatsVisible: vi.fn(),
    controlsVisible: true,
    toggleControlsVisible: vi.fn(),
  }),
}))

vi.mock('../../components/stats', () => ({ StatsStrip: () => null }))

vi.mock('../../components/datatable', () => ({
  DataTableCardHeader: ({ title, children }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
  DataTableRecordControls: ({ children }) => <div>{children}</div>,
  DataTableRecordList: ({ rows, dataColumns, renderCell, getActions }) => (
    <div>
      <div>
        {dataColumns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id}>
          {dataColumns.map((column) => (
            <span key={column.key}>{renderCell(row, column)}</span>
          ))}
          {getActions(row).map((action) => (
            <span key={action.key}>{action.label}</span>
          ))}
        </div>
      ))}
    </div>
  ),
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
  DataTableStatsToggle: () => null,
  DataTableTextCell: ({ value }) => <span>{value}</span>,
  getAdvancedFilterCount: () => 0,
}))

afterEach(cleanup)

describe('FeedbackTable activity', () => {
  it('shows the latest immutable activity and has no Delete action', () => {
    const year = new Date().getFullYear()
    render(
      <FeedbackTable
        allFeedbacks={[
          {
            id: 1,
            feedback: 'Export issue',
            reported_by: 'REP',
            reported_by_id: 22,
            date_reported: `${year}-01-10`,
            status: 'In Progress',
            resolution_track: '30-Day Fix',
            last_event_type: 'fix_rejected',
            last_actor_name: 'REP',
            last_activity_at: `${year}-01-12 10:00:00`,
            history_count: 5,
          },
        ]}
        isAdmin
        currentStaffId={10}
      />,
    )

    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Reporter rejected the fix by REP')).toBeInTheDocument()
    expect(screen.getByText(/5 events/)).toBeInTheDocument()
    expect(screen.getByText('Update Fix')).toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })
})
