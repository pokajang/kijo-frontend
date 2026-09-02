import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SupplierPoEditItems from './SupplierPoEditItems'

const item = {
  item_id: 16,
  item_name: 'Service item',
  description: 'Description',
  item_remarks: 'Remarks',
  unit: 'unit',
  quantity: 2,
  unit_price: 25.5,
}

describe('SupplierPoEditItems', () => {
  afterEach(cleanup)

  it('renders one accessible control set with mobile field labels', () => {
    const { container } = render(
      <SupplierPoEditItems
        items={[item]}
        onItemChange={vi.fn()}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    )

    expect(screen.getAllByLabelText('Item 1 name')).toHaveLength(1)
    expect(screen.getByText('RM 51.00')).toBeInTheDocument()
    expect(container.querySelector('[data-label="Description / Remarks"]')).toBeInTheDocument()
    expect(container.querySelector('.supplier-po-edit-item')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled()
  })

  it('routes item edits and add/remove actions to the parent', () => {
    const onItemChange = vi.fn()
    const onAddItem = vi.fn()
    const onRemoveItem = vi.fn()
    render(
      <SupplierPoEditItems
        items={[item, { ...item, item_id: 17, item_name: 'Second item' }]}
        onItemChange={onItemChange}
        onAddItem={onAddItem}
        onRemoveItem={onRemoveItem}
      />,
    )

    fireEvent.change(screen.getByLabelText('Item 2 quantity'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1])

    expect(onItemChange).toHaveBeenCalledWith(1, 'quantity', '3')
    expect(onAddItem).toHaveBeenCalledOnce()
    expect(onRemoveItem).toHaveBeenCalledWith(1)
  })

  it('keeps an empty legacy item collection recoverable', () => {
    const onAddItem = vi.fn()
    render(
      <SupplierPoEditItems
        items={[]}
        onItemChange={vi.fn()}
        onAddItem={onAddItem}
        onRemoveItem={vi.fn()}
      />,
    )

    expect(screen.getByText('No line items yet. Add an item to continue.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(onAddItem).toHaveBeenCalledOnce()
  })
})
