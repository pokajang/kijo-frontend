import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SystemAdminDashboard from './SystemAdminDashboard'

vi.mock('./SectionMailDiagnostics', () => ({
  default: () => <div>Mail diagnostics mock</div>,
}))

vi.mock('./SectionAiAssistantGovernance', () => ({
  default: () => <div>AI assistant governance mock</div>,
}))

vi.mock('./SectionAiWorkloadGovernance', () => ({
  default: () => <div>AI workload governance mock</div>,
}))

vi.mock('./SectionMonthlyReportSchedulerTest', () => ({
  default: () => <div>Monthly report test mock</div>,
}))

const migrationStatusResponse = () =>
  new Response(
    JSON.stringify({
      status: 'success',
      user: { authorized: true, can_run: false, read_only: true },
      summary: { total_files: 0, synced_count: 0, pending_count: 0 },
      environment: { migration_source: 'laravel' },
      pending: [],
      missing_files: [],
      files: [],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )

describe('SystemAdminDashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(migrationStatusResponse()))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the monthly report test tab and renders its page', async () => {
    render(<SystemAdminDashboard />)

    fireEvent.click(await screen.findByRole('tab', { name: /monthly report test/i }))

    expect(screen.getByText('Monthly report test mock')).toBeInTheDocument()
  })
})
