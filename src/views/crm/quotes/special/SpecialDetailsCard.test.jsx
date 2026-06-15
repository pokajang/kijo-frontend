import React, { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

import SpecialDetailsCard from './SpecialDetailsCard'

const baseFormData = {
  specialId: null,
  serviceTitle: 'Special Service',
  serviceCode: 'SS',
  generalRemarks: '',
  lineItems: [],
}

const renderSpecialDetails = (initialFormData = baseFormData) => {
  const Harness = () => {
    const [formData, setFormData] = useState(initialFormData)

    return (
      <MemoryRouter>
        <SpecialDetailsCard formData={formData} setFormData={setFormData} isEditMode />
        <output data-testid="items-count">{formData.lineItems.length}</output>
      </MemoryRouter>
    )
  }

  render(<Harness />)
}

const getDraftRow = () => screen.getByText('New').closest('tr')

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      }),
    ),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SpecialDetailsCard line item editor', () => {
  it('hides the draft line item row until add is clicked and supports cancel', () => {
    renderSpecialDetails()

    expect(screen.queryByPlaceholderText('e.g. Site Audit - Basic')).not.toBeInTheDocument()
    expect(screen.getByText('No line items added.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Line Item' }))

    expect(screen.getByPlaceholderText('e.g. Site Audit - Basic')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Line Item' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByPlaceholderText('e.g. Site Audit - Basic')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Line Item' })).toBeInTheDocument()
    expect(screen.getByTestId('items-count')).toHaveTextContent('0')
  })

  it('adds, edits, and deletes special line items through the table actions', () => {
    renderSpecialDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Add Line Item' }))

    const draftRow = within(getDraftRow())
    fireEvent.change(draftRow.getByPlaceholderText('e.g. Site Audit - Basic'), {
      target: { value: 'Site audit' },
    })
    fireEvent.change(draftRow.getByPlaceholderText('Short description of this line item'), {
      target: { value: 'Initial visit' },
    })
    fireEvent.change(draftRow.getByRole('combobox'), { target: { value: 'Hour' } })

    expect(draftRow.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByTestId('items-count')).toHaveTextContent('1')
    expect(screen.getByText('Site audit')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Site audit')).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Special line item actions for Site audit' }),
    )
    fireEvent.click(screen.getByText('Edit'))

    const editRow = within(screen.getByDisplayValue('Site audit').closest('tr'))
    fireEvent.change(editRow.getByDisplayValue('Site audit'), {
      target: { value: 'Edited audit' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Edited audit')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Edited audit')).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Special line item actions for Edited audit' }),
    )
    fireEvent.click(screen.getByText('Delete'))

    expect(screen.getByTestId('items-count')).toHaveTextContent('0')
    expect(screen.getByText('No line items added.')).toBeInTheDocument()
  })

  it('allows unit to stay optional when adding a line item', () => {
    renderSpecialDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Add Line Item' }))

    const draftRow = within(getDraftRow())
    fireEvent.change(draftRow.getByPlaceholderText('e.g. Site Audit - Basic'), {
      target: { value: 'Custom service' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByTestId('items-count')).toHaveTextContent('1')
    expect(screen.getByText('Custom service')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })
})
