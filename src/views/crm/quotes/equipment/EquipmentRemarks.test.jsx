import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import PricingInput from './PricingInput'
import ReviewQuotation from './ReviewQuotation'
import EquipmentSelection from './EquipmentSelection'
import {
  getEquipmentInvoiceDescription,
  normalizeEquipmentInvoiceItem,
} from '../../../../shared/invoice/equipmentInvoiceUtils'

const item = {
  id: 701,
  item_name: 'Gas detector',
  description: 'Portable detector',
  supplier_name: 'Supplier A',
  supplier_price: 100,
  unit: 'unit',
}

describe('equipment quotation remarks', () => {
  it('provides a separate quotation-level remarks field', () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <EquipmentSelection
          selectOptions={[]}
          selectedItems={[]}
          handleSelectChange={vi.fn()}
          quotationRemarks=""
          onQuotationRemarksChange={onChange}
        />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Quotation Remarks/i), {
      target: { value: 'Deliver all equipment together.' },
    })
    expect(onChange).toHaveBeenCalledWith('Deliver all equipment together.')
  })

  it('edits an item specification without changing displayed totals', () => {
    const onRemarksChange = vi.fn()
    render(
      <PricingInput
        selectedItems={[{ value: item }]}
        quantities={{ 701: 1 }}
        handleQtyChange={vi.fn()}
        unitPrices={{ 701: 100 }}
        markedUp={{ 701: 150 }}
        handleMarkedUpChange={vi.fn()}
        itemRemarks={{ 701: '' }}
        handleItemRemarksChange={onRemarksChange}
        deliveryCharge={0}
        setDeliveryCharge={vi.fn()}
        miscCharge={0}
        setMiscCharge={vi.fn()}
        discount={0}
        setDiscount={vi.fn()}
        sstPercent={0}
        setSstPercent={vi.fn()}
        itemsTotal={150}
        subtotal={150}
        sstAmount={0}
        grandTotal={150}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Client Specifications/i), {
      target: { value: 'Colour: navy blue' },
    })

    expect(onRemarksChange).toHaveBeenCalledWith(701, 'Colour: navy blue')
    expect(screen.getAllByDisplayValue('150.00')).toHaveLength(4)
    expect(screen.getByLabelText('Quantity')).toHaveValue(1)
    expect(screen.getByLabelText('Marked Up Price (RM)')).toHaveValue(150)
    expect(screen.getByLabelText('Grand Total (RM)')).toHaveValue('150.00')
  })

  it('shows the complete catalogue description as compact muted quotation text', () => {
    render(
      <PricingInput
        selectedItems={[
          {
            value: {
              ...item,
              description: 'Portable detector\nIncludes:\n• pump\n• charging dock',
            },
          },
        ]}
        quantities={{ 701: 1 }}
        handleQtyChange={vi.fn()}
        unitPrices={{ 701: 100 }}
        markedUp={{ 701: 150 }}
        handleMarkedUpChange={vi.fn()}
        itemRemarks={{ 701: '' }}
        handleItemRemarksChange={vi.fn()}
        deliveryCharge={0}
        setDeliveryCharge={vi.fn()}
        miscCharge={0}
        setMiscCharge={vi.fn()}
        discount={0}
        setDiscount={vi.fn()}
        sstPercent={0}
        setSstPercent={vi.fn()}
        itemsTotal={150}
        subtotal={150}
        sstAmount={0}
        grandTotal={150}
      />,
    )

    const description = screen.getByText(/Portable detector; Includes: pump; charging dock/)
    expect(description).toHaveClass('text-muted')
    expect(description.textContent).not.toContain('...')
    expect(description.textContent).not.toContain('•')
  })

  it('shows both remark scopes in the review', () => {
    render(
      <ReviewQuotation
        selectedItems={[{ value: item }]}
        quantities={{ 701: 1 }}
        markedUp={{ 701: 150 }}
        itemRemarks={{ 701: 'Colour: navy blue' }}
        quotationRemarks="Deliver all equipment together."
        deliveryCharge={0}
        miscCharge={0}
        discount={0}
        sstPercent={0}
        subtotal={150}
        sstAmount={0}
        grandTotal={150}
        estimatedTotalCost={100}
        attachProposal={false}
        onAttachProposalChange={vi.fn()}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText('Deliver all equipment together.')).toBeInTheDocument()
    expect(screen.getByText(/Specifications: Colour: navy blue/)).toBeInTheDocument()
    const mobileSummary = screen.getByLabelText('Equipment quotation summary')
    expect(within(mobileSummary).getByText('Gas detector')).toBeInTheDocument()
    expect(within(mobileSummary).getAllByText('RM 150.00')).toHaveLength(3)
  })

  it('carries item specifications separately from downstream invoice descriptions', () => {
    const source = {
      description: 'Portable detector',
      item_remarks: 'Colour: navy blue',
      quantity: 1,
      marked_up_price: 150,
    }

    expect(getEquipmentInvoiceDescription(source)).toBe('Portable detector')
    expect(normalizeEquipmentInvoiceItem(source)).toEqual(
      expect.objectContaining({
        description: 'Portable detector',
        item_remarks: 'Colour: navy blue',
        marked_up_price: 150,
      }),
    )
  })
})
