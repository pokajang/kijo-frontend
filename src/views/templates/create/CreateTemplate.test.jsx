import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreateTemplate from './CreateTemplate'
import dialog from '../../../components/dialog/dialogService'

vi.mock('../../../components/dialog/dialogService', () => ({
  default: { confirm: vi.fn() },
}))

vi.mock('./TrainingServiceTemplate', () => ({
  default: () => <div>Training form</div>,
}))
vi.mock('./IhServiceTemplate', () => ({
  default: () => <div>IH form</div>,
}))
vi.mock('./ManpowerServiceTemplate', () => ({
  default: () => <div>Manpower form</div>,
}))
vi.mock('./SpecialTemplate', () => ({
  default: ({ onDirtyChange }) => (
    <div>
      Other Services form
      <button type="button" onClick={() => onDirtyChange(true)}>
        Mark dirty
      </button>
    </div>
  ),
}))

const renderRoute = (entry = '/templates/create') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/templates/create" element={<CreateTemplate />} />
      </Routes>
    </MemoryRouter>,
  )

describe('CreateTemplate', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    dialog.confirm.mockResolvedValue(true)
  })

  it('shows the type chooser only until a proposal type is selected', async () => {
    renderRoute()

    expect(screen.getByRole('heading', { name: 'Choose proposal type' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Other Services Proposal' }))

    expect(await screen.findByText('Other Services form')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Choose proposal type' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change type' })).toBeInTheDocument()
  })

  it('protects dirty work before returning to the type chooser', async () => {
    dialog.confirm.mockResolvedValue(false)
    renderRoute('/templates/create?type=special')

    fireEvent.click(screen.getByRole('button', { name: 'Mark dirty' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change type' }))

    await waitFor(() => expect(dialog.confirm).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Other Services form')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Choose proposal type' })).not.toBeInTheDocument()
  })
})
