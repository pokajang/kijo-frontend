import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import JD14Table from './JD14Table'
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'

vi.mock('../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../../../components/toast/toastService', () => ({
  showToast: vi.fn(),
}))

vi.mock('../../../components/stats', () => ({
  StatsStrip: () => null,
}))

vi.mock('../../../components/datatable', () => ({
  DataTableRecordList: ({ rows = [], getActions }) => (
    <div>
      {rows.map((row, index) => (
        <div key={row.id || index}>
          <span>{row.approvalNo}</span>
          {getActions(row).map((action) => (
            <button type="button" key={action.key} onClick={() => action.onClick(row)}>
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))

const form = {
  id: 7,
  approval_no: 'JD14-007',
  employer_name: 'ACME Training',
  course_title: 'Safety',
  commenced_date: '2026-01-01',
  end_date: '2026-01-05',
}

const renderTable = (props = {}) =>
  render(
    <MemoryRouter>
      <JD14Table forms={[form]} onRefresh={vi.fn()} {...props} />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'success' }),
    }),
  )
  dialog.confirm.mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('JD14Table actions', () => {
  it('deletes without reloading the page and refreshes the parent table quietly', async () => {
    const onRefresh = vi.fn()

    renderTable({ onRefresh })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('JD14 record deleted.'))
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('jd14-forms/7'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(dialog.alert).not.toHaveBeenCalledWith('JD14 deleted successfully.')
  })
})
