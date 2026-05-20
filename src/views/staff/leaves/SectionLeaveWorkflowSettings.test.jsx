import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as AH from './actionHandlers'
import SectionLeaveWorkflowSettings from './SectionLeaveWorkflowSettings'

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({ options = [], value = [], onChange, placeholder }) => (
    <div>
      <button type="button" onClick={() => onChange(options.length ? [options[0]] : [])}>
        Pick First
      </button>
      <span data-testid={placeholder}>
        {(Array.isArray(value) ? value : []).map((option) => option.label).join(', ')}
      </span>
    </div>
  ),
}))

vi.mock('./actionHandlers', () => ({
  getLeaveWorkflowRecipients: vi.fn(),
  updateLeaveWorkflowRecipients: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SectionLeaveWorkflowSettings', () => {
  it('loads workflow stages and saves stage staff ids', async () => {
    AH.getLeaveWorkflowRecipients.mockResolvedValue([
      {
        key: 'leave.submitted.recommenders',
        label: 'New Application',
        description: 'Receives new applications.',
        fallback: 'Active HR staff',
        recipients: [{ staff_id: 20 }],
        effective_recipients: [
          {
            staff_id: 20,
            full_name: 'HR User',
            name_code: 'HR1',
            email: 'hr@example.test',
          },
        ],
      },
      {
        key: 'leave.recommended.approvers',
        label: 'Recommended Leave',
        description: 'Receives recommended applications.',
        fallback: 'Active Manager or System Admin staff',
        recipients: [],
        effective_recipients: [],
      },
    ])
    AH.updateLeaveWorkflowRecipients.mockResolvedValue({
      status: 'success',
      stages: [],
    })

    render(
      <SectionLeaveWorkflowSettings
        staffList={[
          {
            staff_id: 20,
            full_name: 'HR User',
            name_code: 'HR1',
            email: 'hr@example.test',
            status: 'Active',
          },
        ]}
      />,
    )

    await screen.findByText('New Application')
    expect(screen.getByText(/HR User \(HR1\)/)).toBeInTheDocument()
    expect(screen.queryByText('Pick First')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    fireEvent.click(screen.getAllByText('Pick First')[1])
    fireEvent.click(screen.getByRole('button', { name: /save workflow/i }))

    await waitFor(() => {
      expect(AH.updateLeaveWorkflowRecipients).toHaveBeenCalledWith({
        'leave.submitted.recommenders': [20],
        'leave.recommended.approvers': [20],
      })
    })
  })
})
