import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LegacyQuotationCostModal from './LegacyQuotationCostModal'

afterEach(cleanup)

describe('LegacyQuotationCostModal', () => {
  it.each(['training-tab', 'equipment-tab', 'manpower-tab'])(
    'offers the smooth legacy PDF choices for %s',
    (serviceTab) => {
      const onCancel = vi.fn()
      const onEdit = vi.fn()
      const onGenerate = vi.fn()

      render(
        <LegacyQuotationCostModal
          visible
          record={{ quotationId: 'QUOTE-LEGACY', serviceTab }}
          onCancel={onCancel}
          onEdit={onEdit}
          onGenerate={onGenerate}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Edit quotation' }))
      fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onEdit).toHaveBeenCalledTimes(1)
      expect(onGenerate).toHaveBeenCalledTimes(1)
      expect(onCancel).toHaveBeenCalledTimes(1)
    },
  )

  it('only offers Edit and Cancel for malformed current-policy data', () => {
    render(
      <LegacyQuotationCostModal
        visible
        mode="cost-required"
        record={{ quotationId: 'QUOTE-CURRENT' }}
        onCancel={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Edit quotation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate PDF' })).not.toBeInTheDocument()
  })
})
