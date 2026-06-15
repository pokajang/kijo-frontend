import React, { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

import PricingCard from './PricingCard'

const baseFormData = {
  unitPrice: 500,
  travelCharge: 100,
  numWorkUnits: 1,
  sampleCounts: 2,
  discount: 50,
  sstPercent: 8,
  hygieneItems: [],
}

const renderPricingCard = (initialFormData = baseFormData) => {
  const Harness = () => {
    const [formData, setFormData] = useState(initialFormData)

    return (
      <>
        <PricingCard formData={formData} setFormData={setFormData} />
        <output data-testid="items-count">{formData.hygieneItems.length}</output>
      </>
    )
  }

  render(<Harness />)
}

const getDraftRow = () => screen.getByText('New').closest('tr')

afterEach(() => {
  cleanup()
})

describe('Hygiene PricingCard additional fees', () => {
  it('hides the draft fee row until the add action is clicked and supports cancel', () => {
    renderPricingCard()

    expect(screen.queryByPlaceholderText('Blank sample')).not.toBeInTheDocument()
    expect(screen.getByText('No miscellaneous fees added.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Miscellaneous Fee' }))

    expect(screen.getByPlaceholderText('Blank sample')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Miscellaneous Fee' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByPlaceholderText('Blank sample')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Miscellaneous Fee' })).toBeInTheDocument()
    expect(screen.getByTestId('items-count')).toHaveTextContent('0')
  })

  it('adds a valid miscellaneous fee and hides the draft row', () => {
    renderPricingCard()

    fireEvent.click(screen.getByRole('button', { name: 'Add Miscellaneous Fee' }))

    const draftRow = within(getDraftRow())
    fireEvent.change(draftRow.getByPlaceholderText('Blank sample'), {
      target: { value: 'Sample analysis' },
    })
    fireEvent.change(draftRow.getByPlaceholderText('Optional notes'), {
      target: { value: 'Lab analysis' },
    })

    const draftInputs = draftRow.getAllByRole('spinbutton')
    fireEvent.change(draftInputs[1], { target: { value: '125' } })

    expect(draftRow.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.queryByPlaceholderText('Blank sample')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Miscellaneous Fee' })).toBeInTheDocument()
    expect(screen.getByTestId('items-count')).toHaveTextContent('1')
    expect(screen.getByText('Sample analysis')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Sample analysis')).not.toBeInTheDocument()
    expect(screen.queryByText('Pricing Summary')).not.toBeInTheDocument()
    expect(screen.queryByText('Grand Total (RM)')).not.toBeInTheDocument()
  })

  it('keeps saved fee rows read-only with kebab edit and delete actions', () => {
    renderPricingCard({
      ...baseFormData,
      hygieneItems: [
        {
          id: 7,
          item_description: 'Blank sample',
          description: 'Control sample',
          quantity: 1,
          unit: 'Lot',
          unit_price: 200,
        },
      ],
    })

    expect(screen.queryByDisplayValue('Blank sample')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Additional fee actions for Blank sample' }))
    fireEvent.click(screen.getByText('Edit'))

    const editRow = within(screen.getByDisplayValue('Blank sample').closest('tr'))
    fireEvent.change(editRow.getByDisplayValue('Blank sample'), {
      target: { value: 'Edited sample' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Edited sample')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Edited sample')).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Additional fee actions for Edited sample' }),
    )
    fireEvent.click(screen.getByText('Delete'))

    expect(screen.getByTestId('items-count')).toHaveTextContent('0')
    expect(screen.getByText('No miscellaneous fees added.')).toBeInTheDocument()
  })
})
