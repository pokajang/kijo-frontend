import React from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import ProgressTrackerCard from '../views/project/manage/ManageProjectModal/ProgressTrackerCard'

const makeRows = (count) =>
  Array.from({ length: count }, (_, idx) => ({
    id: idx + 1,
    progress_date: `2026-03-${String(idx + 1).padStart(2, '0')}`,
    progress_text: `Update ${idx + 1}`,
    updated_on: `2026-03-${String(idx + 1).padStart(2, '0')} 10:00:00`,
    updated_by: 'TEST',
  }))

describe('ProgressTrackerCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows 5 rows by default and toggles to show all', async () => {
    const rows = makeRows(6)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success', data: rows }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<ProgressTrackerCard projectId={123} />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    await waitFor(() => {
      const renderedRows = container.querySelectorAll('tbody tr')
      expect(renderedRows.length).toBe(5)
    })

    const showMore = screen.getByLabelText('Show more rows')
    fireEvent.click(showMore)

    await waitFor(() => {
      const renderedRows = container.querySelectorAll('tbody tr')
      expect(renderedRows.length).toBe(6)
    })
  })
})
