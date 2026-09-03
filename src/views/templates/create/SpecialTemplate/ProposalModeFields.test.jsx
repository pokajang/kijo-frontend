import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InternalReferenceNote from './InternalReferenceNote'
import ProposalModeSelector from './ProposalModeSelector'

afterEach(cleanup)

describe('Special proposal mode fields', () => {
  it('presents writing as the recommended selected option', () => {
    render(<ProposalModeSelector value="write" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /write full proposal/i })).toBeChecked()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: /upload a completed proposal pdf/i }),
    ).not.toBeChecked()
  })

  it('changes mode through the native radio control and shows group validation', () => {
    const onChange = vi.fn()
    render(
      <ProposalModeSelector
        value="write"
        onChange={onChange}
        validationError="Proposal mode is invalid."
      />,
    )

    fireEvent.click(screen.getByText('Upload a completed proposal PDF').closest('label'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Proposal mode is invalid.')).toBeInTheDocument()
  })

  it('renders a short plain internal note with permanent guidance and a counter', () => {
    const onChange = vi.fn()
    render(<InternalReferenceNote value="Brief scope" onChange={onChange} />)

    const note = screen.getByLabelText(/internal reference note/i)
    expect(note).toHaveAttribute('maxlength', '300')
    expect(note).toHaveAttribute('rows', '3')
    expect(screen.getByText('11 / 300')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Visible to staff only. This note is not included in the proposal or quotation PDF.',
      ),
    ).toBeInTheDocument()

    fireEvent.change(note, { target: { value: 'Updated note' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
