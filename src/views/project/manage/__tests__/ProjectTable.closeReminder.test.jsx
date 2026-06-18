import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectTable from '../ProjectTable'

vi.mock('../../../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      staff_id: 10,
      name_code: 'EMP',
    },
  }),
}))

vi.mock('../../../../components/datatable', () => ({
  DataTableCardHeader: ({ title, children }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
  DataTableRecordControls: ({ children }) => <div>{children}</div>,
  DataTableRecordList: () => <div data-testid="record-list" />,
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
  DataTableStatsToggle: () => <button type="button">Toggle Stats</button>,
  DataTableTextCell: ({ value }) => <span>{value}</span>,
  getAdvancedFilterCount: (chips = []) => chips.length,
}))

vi.mock('../../../../components/filters', () => ({
  PeriodRangeSelector: () => <div data-testid="period-range-selector" />,
  getPeriodRangeLabel: () => 'Year to date',
  getPeriodRangePreset: (preset) => ({ preset, startDate: '', endDate: '' }),
  getPeriodRangeScopeLabel: () => 'Year to date',
  isDateInPeriodRange: () => true,
  isDefaultPeriodRange: (range) => range?.preset === 'ytd',
}))

vi.mock('../../../../components/stats', () => ({
  StatsStrip: () => <div data-testid="stats-strip" />,
}))

vi.mock('../../../../hooks/datatable', () => ({
  useDataTableStatsVisibility: () => ({
    statsVisible: false,
    toggleStatsVisible: vi.fn(),
    controlsVisible: true,
    toggleControlsVisible: vi.fn(),
  }),
}))

vi.mock('../../../../components/navigation/ModuleNavStrip', () => ({
  default: ({ tabs = [], activeTab, onTabChange }) => (
    <div>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          aria-pressed={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}))

const readyProject = {
  id: 501,
  project_name: 'Exact Match Project',
  client_name: 'Reminder Client',
  quote_value: 5000,
  status: 'Active',
  award_date: '2026-05-01',
  close_reminder_ready: true,
  fully_invoiced_at: '2026-05-20',
  close_reminder_signature: 'sig-501',
  close_reminder_billing_state: 'matched',
  assigned_staff: [{ staff_id: 10, name_code: 'EMP', project_role: 'Leader' }],
}

const exceededProject = {
  id: 504,
  project_name: 'Exceeded Billing Project',
  client_name: 'Exceeded Client',
  quote_value: 4200,
  status: 'Active',
  award_date: '2026-05-02',
  close_reminder_ready: true,
  fully_invoiced_at: '2026-05-24',
  close_reminder_signature: 'sig-504',
  close_reminder_billing_state: 'exceeded',
  assigned_staff: [{ staff_id: 10, name_code: 'EMP', project_role: 'Leader' }],
}

const otherReadyProject = {
  id: 502,
  project_name: 'Other Staff Project',
  client_name: 'Other Client',
  quote_value: 3000,
  status: 'Active',
  award_date: '2026-05-03',
  close_reminder_ready: true,
  fully_invoiced_at: '2026-05-22',
  close_reminder_signature: 'sig-502',
  close_reminder_billing_state: 'matched',
  assigned_staff: [{ staff_id: 99, name_code: 'OTH', project_role: 'Leader' }],
}

const notReadyProject = {
  id: 503,
  project_name: 'Partial Project',
  client_name: 'Partial Client',
  quote_value: 2000,
  status: 'Active',
  award_date: '2026-05-05',
  close_reminder_ready: false,
  assigned_staff: [{ staff_id: 10, name_code: 'EMP', project_role: 'Leader' }],
}

const renderTable = (props = {}) =>
  render(
    <ProjectTable
      projects={[readyProject, exceededProject, otherReadyProject, notReadyProject]}
      loading={false}
      onClose={vi.fn()}
      {...props}
    />,
  )

describe('ProjectTable close reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T12:00:00'))
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('does not render close reminders on the All tab', () => {
    renderTable()

    expect(screen.queryByText('Already invoiced? Close the project.')).not.toBeInTheDocument()
    expect(screen.queryByText('Exact Match Project')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^close project$/i })).not.toBeInTheDocument()
  })

  it('renders warning reminders for owned eligible projects on the My Project tab', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /^my project$/i }))

    expect(screen.getAllByText('Already invoiced? Close the project.')).toHaveLength(2)
    expect(screen.queryByText('Returns if value/invoices change.')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        /Exact Match Project \| Reminder Client \| RM 5,000.00 \| Awarded 48 days ago \| Fully invoiced 29 days ago/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Exceeded Billing Project \| Exceeded Client \| RM 4,200.00 \| Awarded 47 days ago \| Fully invoiced 25 days ago/,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Other Staff Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Partial Project')).not.toBeInTheDocument()
  })

  it('uses the existing close flow with Completed close type', () => {
    const onClose = vi.fn()
    renderTable({ projects: [readyProject], onClose })

    fireEvent.click(screen.getByRole('button', { name: /^my project$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^close project$/i }))

    expect(onClose).toHaveBeenCalledWith(readyProject, 'Completed')
  })

  it('persists dismissed project reminders by user, project, and signature', () => {
    const { rerender } = renderTable({ projects: [readyProject] })

    fireEvent.click(screen.getByRole('button', { name: /^my project$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^dismiss for now$/i }))

    expect(screen.queryByText('Exact Match Project')).not.toBeInTheDocument()
    expect(
      window.localStorage.getItem('kijo:project-close-reminder:dismissed:10:501:sig-501'),
    ).toBe('1')

    rerender(<ProjectTable projects={[readyProject]} loading={false} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^my project$/i }))
    expect(screen.queryByText('Exact Match Project')).not.toBeInTheDocument()
  })

  it('keeps reminders hidden when switching back to the All tab', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /^my project$/i }))
    expect(screen.getByText(/Exact Match Project \| Reminder Client/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^all$/i }))

    expect(screen.queryByText('Exact Match Project')).not.toBeInTheDocument()
  })
})
