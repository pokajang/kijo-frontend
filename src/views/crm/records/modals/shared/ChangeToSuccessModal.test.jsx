import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ChangeToSuccessModal from './ChangeToSuccessModal'
import { listStaff } from '../../../../project/manage/projectApi'

vi.mock('../../../../project/manage/projectApi', () => ({
  listStaff: vi.fn(),
}))

const baseProps = {
  visible: true,
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
  record: {
    id: 44,
    amount: 4000,
    createdById: 10,
    createdByName: 'Quote Owner',
    createdByCode: 'QO',
  },
  currentUser: { staff_id: 10, full_name: 'Quote Owner', name_code: 'QO' },
  value: 'Client awarded the quote.',
  onChange: vi.fn(),
  loaRefNo: '',
  onLoaChange: vi.fn(),
  awardDate: null,
  onAwardDateChange: vi.fn(),
  description: 'Awarded project description',
  onDescriptionChange: vi.fn(),
}

const renderModal = (props = {}) => render(<ChangeToSuccessModal {...baseProps} {...props} />)

describe('ChangeToSuccessModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('submits adjusted current project value payload when enabled', async () => {
    const onConfirm = vi.fn()
    listStaff.mockResolvedValue([
      {
        staff_id: 10,
        full_name: 'Quote Owner',
        name_code: 'QO',
      },
    ])

    renderModal({ onConfirm })

    expect(await screen.findByText('RM 4,000.00')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Award with a different current project value'))
    fireEvent.change(screen.getByLabelText('Current Project Value (RM)'), {
      target: { value: '4500' },
    })
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Client awarded with approved variation.' },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm Award' })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Award' }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          staff_id: 10,
          project_role: 'Leader',
        }),
      ]),
      {
        project_value_decision: 'adjusted',
        current_project_value: 4500,
        project_value_reason: 'Client awarded with approved variation.',
      },
    )
  })
})
