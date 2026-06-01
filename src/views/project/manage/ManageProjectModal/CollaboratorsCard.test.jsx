import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CollaboratorsCard from './CollaboratorsCard'
import { listProjectCollaborators, listStaff, removeProjectCollaborator } from '../projectApi'
import dialog from '../../../../components/dialog/dialogService'

vi.mock('../../../../components/datatable', () => ({
  DataTableActionMenu: ({ record, actions = [], ariaLabel }) => (
    <div>
      <button
        type="button"
        aria-label={ariaLabel}
        className="data-table-action-toggle"
        data-testid={`collaborator-action-toggle-${record.staff_id}`}
      />
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled={action.disabled}
          onClick={() => {
            if (!action.disabled) action.onClick(record)
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
  DataTableLoadingState: ({ message }) => <span>{message}</span>,
}))

vi.mock('../projectApi', () => ({
  addProjectCollaborator: vi.fn(),
  listProjectCollaborators: vi.fn(),
  listStaff: vi.fn(),
  removeProjectCollaborator: vi.fn(),
}))

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

const collaborator = {
  staff_id: 9,
  name: 'Azam Bin Husain',
  code: 'AZA',
  project_role: 'Leader',
  role_description: 'Lead this project',
  mobileNumber: '601140228157',
  email: 'azam@example.com',
}

describe('CollaboratorsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listStaff.mockResolvedValue([])
    listProjectCollaborators.mockResolvedValue([collaborator])
    removeProjectCollaborator.mockResolvedValue({ status: 'success' })
    dialog.confirm.mockResolvedValue(true)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders collaborator count and the shared standalone action menu trigger', async () => {
    render(<CollaboratorsCard projectId={12} />)

    await waitFor(() => expect(screen.getByText('Azam Bin Husain')).toBeInTheDocument())

    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(screen.getByLabelText('Collaborator actions')).toBeInTheDocument()
    expect(screen.getByLabelText('Collaborator actions')).toHaveClass('data-table-action-toggle')
    expect(screen.getByLabelText('Collaborator actions')).not.toHaveClass('dropdown-toggle-split')
  })

  it('removes collaborators through the existing confirmation and API flow', async () => {
    const onProgressUpdate = vi.fn()

    render(<CollaboratorsCard projectId={12} onProgressUpdate={onProgressUpdate} />)

    await waitFor(() => expect(screen.getByText('Azam Bin Husain')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Remove Collaborator' }))

    await waitFor(() =>
      expect(removeProjectCollaborator).toHaveBeenCalledWith({
        project_id: 12,
        staff_id: 9,
      }),
    )
    expect(dialog.confirm).toHaveBeenCalledWith('Remove this collaborator from the project?', {
      confirmText: 'Remove',
      confirmColor: 'danger',
    })
    expect(onProgressUpdate).toHaveBeenCalled()
  })

  it('does not call remove when confirmation is cancelled', async () => {
    dialog.confirm.mockResolvedValueOnce(false)

    render(<CollaboratorsCard projectId={12} />)

    await waitFor(() => expect(screen.getByText('Azam Bin Husain')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Remove Collaborator' }))

    await waitFor(() => expect(dialog.confirm).toHaveBeenCalled())
    expect(removeProjectCollaborator).not.toHaveBeenCalled()
  })
})
