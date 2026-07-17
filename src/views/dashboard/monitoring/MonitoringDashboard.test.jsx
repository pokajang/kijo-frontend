import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MonitoringDashboard from './MonitoringDashboard'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@coreui/icons-react', () => ({
  default: () => <span aria-hidden="true" />,
}))

vi.mock('@coreui/icons', () => ({
  cilInfo: 'info',
  cilX: 'close',
}))

vi.mock('@coreui/react', () => ({
  CAlert: ({ children, color, dismissible, onClose, ...props }) => (
    <div data-color={color} {...props}>
      {children}
      {dismissible && (
        <button type="button" aria-label="Dismiss save notice" onClick={onClose}>
          Dismiss
        </button>
      )}
    </div>
  ),
  CButton: ({ children, color, size, variant, ...props }) => <button {...props}>{children}</button>,
}))

vi.mock('react-joyride', () => ({
  Joyride: () => null,
  STATUS: {
    FINISHED: 'finished',
    SKIPPED: 'skipped',
  },
}))

vi.mock('./MonitoringTrends', () => ({
  default: () => <div>Monitoring trends</div>,
}))

vi.mock('./MonitoringStaffPipelineMatrix', () => ({
  default: () => <div>Monitoring staff pipeline matrix</div>,
}))

vi.mock('./MonitoringPipelineStatus', () => ({
  default: () => <div>Monitoring pipeline status</div>,
}))

vi.mock('./MonitoringPipelineTools', () => ({
  default: ({ onManualEntrySaved }) => (
    <div>
      <button type="button" onClick={() => onManualEntrySaved({ savedCount: 1 })}>
        Simulate single save
      </button>
      <button type="button" onClick={() => onManualEntrySaved({ savedCount: 3 })}>
        Simulate batch save
      </button>
    </div>
  ),
}))

const renderDashboard = (props = {}) => {
  const onManualEntrySaved = vi.fn()

  render(
    <MonitoringDashboard
      period="custom"
      startDate="2026-07-01"
      endDate="2026-07-31"
      selectedStaffCode=""
      selectedStaffLabel="All staff"
      staffSelector={<span>Staff selector</span>}
      statusData={null}
      statusLoading={false}
      statusError=""
      onManualEntrySaved={onManualEntrySaved}
      {...props}
    />,
  )

  return { onManualEntrySaved }
}

describe('MonitoringDashboard manual entry management', () => {
  afterEach(() => {
    cleanup()
    navigateMock.mockClear()
  })

  it('opens the Pipeline Entries management page from the persistent action', () => {
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Manage Entries' }))

    expect(navigateMock).toHaveBeenCalledWith('/pipeline/entries')
  })

  it('shows singular save feedback and carries management guidance to Pipeline Entries', () => {
    const { onManualEntrySaved } = renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Simulate single save' }))

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(
      'Manual entry saved. You can edit or delete it from Pipeline Entries.',
    )
    expect(onManualEntrySaved).toHaveBeenCalledTimes(1)

    fireEvent.click(within(notice).getByRole('button', { name: 'Manage Entries' }))

    expect(navigateMock).toHaveBeenCalledWith('/pipeline/entries', {
      state: {
        pipelineMessage: 'Manual entry saved. Use the row action menu to edit or delete it.',
      },
    })
  })

  it('shows plural feedback and clears an old notice when another entry is started', () => {
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Simulate batch save' }))

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(
      '3 manual entries saved. You can edit or delete them from Pipeline Entries.',
    )

    fireEvent.click(within(notice).getByRole('button', { name: 'Manage Entries' }))

    expect(navigateMock).toHaveBeenCalledWith('/pipeline/entries', {
      state: {
        pipelineMessage: '3 manual entries saved. Use the row action menu to edit or delete them.',
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Manual Entry' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('allows users to dismiss the post-save notice', () => {
    renderDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Simulate single save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss save notice' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
