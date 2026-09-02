import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TemplateRemarksSection from './TemplateRemarksSection'

vi.mock('../components/EditorInput', () => ({
  default: ({ value, onChange, invalid, feedbackInvalid }) => (
    <div>
      <textarea
        aria-label="Internal change note"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {invalid && <div>{feedbackInvalid}</div>}
    </div>
  ),
}))

describe('TemplateRemarksSection', () => {
  afterEach(cleanup)

  it('keeps previous remarks collapsed until requested and exposes validation', () => {
    const setRemarks = vi.fn()
    render(
      <TemplateRemarksSection
        isEdit
        history={[
          { id: 1, created_at: '2026-08-28', created_by_code: 'AZA', remarks: '<p>Initial</p>' },
        ]}
        remarks=""
        setRemarks={setRemarks}
        invalid
        feedbackInvalid="Internal change note is required."
      />,
    )

    expect(screen.getByRole('button', { name: 'View previous remarks (1)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByText('Internal change note is required.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View previous remarks (1)' }))
    expect(screen.getByRole('button', { name: 'Hide previous remarks (1)' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Initial')).toBeInTheDocument()
  })
})
