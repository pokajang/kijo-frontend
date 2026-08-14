import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LegacyTrainingCostModal from './LegacyTrainingCostModal'

afterEach(cleanup)

describe('LegacyTrainingCostModal', () => {
  it('explains the legacy policy and exposes cancel, edit, and generate choices', () => {
    const onCancel = vi.fn()
    const onEdit = vi.fn()
    const onGenerate = vi.fn()

    render(
      <LegacyTrainingCostModal
        visible
        record={{ quoteRefNo: 'QTR26-0005AZA' }}
        onCancel={onCancel}
        onEdit={onEdit}
        onGenerate={onGenerate}
      />,
    )

    expect(screen.getByText(/created before estimated-cost tracking/i)).toBeInTheDocument()
    expect(screen.getByText(/customer price is unchanged/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit quotation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onGenerate).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('only offers Edit and Cancel for a current-policy quote without cost', () => {
    render(
      <LegacyTrainingCostModal
        visible
        mode="cost-required"
        record={{ quoteRefNo: 'QTR26-0201AZA' }}
        onCancel={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
      />,
    )

    expect(screen.getByText(/uses the current approval policy/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit quotation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate PDF' })).not.toBeInTheDocument()
  })
})
