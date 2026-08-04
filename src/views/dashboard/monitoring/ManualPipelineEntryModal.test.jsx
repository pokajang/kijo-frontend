import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ManualPipelineEntryModal from './ManualPipelineEntryModal'

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({ inputId, options, value, onChange }) => (
    <select
      id={inputId}
      aria-label="Source"
      value={value?.value || ''}
      onChange={(event) =>
        onChange(options.find((option) => option.value === event.target.value) || null)
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('@coreui/icons-react', () => ({
  default: () => <span aria-hidden="true" />,
}))

const createForm = () => ({
  entry_type: 'lead',
  entry_date: '2026-08-04',
  source: 'WhatsApp Personal',
  segment_type: '',
  draft: {
    rowId: 'draft-1',
    prospect_name: 'Acme Sdn Bhd',
    service_category: '',
    custom_service_category: '',
    estimated_rm: '',
    notes: '',
    photoFile: null,
  },
  batch: [],
})

const Harness = () => {
  const [manualForm, setManualForm] = useState(createForm)

  return (
    <ManualPipelineEntryModal
      visible
      manualError=""
      manualForm={manualForm}
      manualSaving={false}
      proofCompressing={false}
      proofInputKey={0}
      maxManualEntryDate="2026-08-04"
      startDate="2026-08-01"
      pendingManualEntryCount={0}
      editingBatchIndex={null}
      onAddDraftToBatch={vi.fn()}
      onBulkEntries={vi.fn()}
      onCancelBatchEdit={vi.fn()}
      onClearProofFile={vi.fn()}
      onClose={vi.fn()}
      onDraftChange={(updates) =>
        setManualForm((current) => ({
          ...current,
          draft: {
            ...current.draft,
            ...updates,
            ...(Object.prototype.hasOwnProperty.call(updates, 'service_category') &&
            updates.service_category !== 'other'
              ? { custom_service_category: '' }
              : {}),
          },
        }))
      }
      onEditBatchRow={vi.fn()}
      onFormChange={(updates) => setManualForm((current) => ({ ...current, ...updates }))}
      onProofFileChange={vi.fn()}
      onRemoveBatchRow={vi.fn()}
      onSave={vi.fn()}
    />
  )
}

describe('ManualPipelineEntryModal service category', () => {
  afterEach(cleanup)

  it('shows the required custom field only while Others is selected', () => {
    render(<Harness />)

    expect(screen.queryByLabelText('Specify service category')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Service category'), { target: { value: 'other' } })

    const customInput = screen.getByLabelText('Specify service category')
    expect(customInput).toBeRequired()
    fireEvent.change(customInput, { target: { value: 'Environmental Monitoring' } })
    expect(customInput).toHaveValue('Environmental Monitoring')

    fireEvent.change(screen.getByLabelText('Service category'), {
      target: { value: 'consultancy_osh' },
    })

    expect(screen.queryByLabelText('Specify service category')).not.toBeInTheDocument()
  })
})
