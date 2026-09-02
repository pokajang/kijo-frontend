import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SupplierPoEditModal from './SupplierPoEditModal'

describe('SupplierPoEditModal', () => {
  afterEach(cleanup)
  const record = {
    po_id: 29,
    po_ref_no: 'POES26-0001AZA',
    project_id: 245,
    supplier_id: 21,
    supplier_name: 'Supplier One',
    supplier_address: 'Address',
    supplier_contact_name: 'Contact',
    supplier_contact_number: '0123456789',
    quotation_remarks: '',
    discount: 0,
    delivery_charge: 0,
    sst_percent: 0,
    items: [
      {
        item_id: 16,
        item_name: 'Service item',
        description: 'Description',
        item_remarks: 'Remarks',
        unit: 'unit',
        quantity: 1,
        unit_price: 25.5,
      },
    ],
  }

  it('builds an updated unpaid PO payload from editable item values', () => {
    const onSave = vi.fn()
    render(<SupplierPoEditModal visible record={record} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Item 1 quantity'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Item 1 unit price'), { target: { value: '30.25' } })
    fireEvent.change(screen.getByLabelText('Quotation Remarks'), {
      target: { value: 'Updated remarks' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 245,
        quotation_remarks: 'Updated remarks',
        grand_total: 60.5,
        items: [expect.objectContaining({ quantity: 2, unit_price: 30.25, line_total: 60.5 })],
      }),
    )
  })

  it('supports adding and removing unpaid PO line items', () => {
    render(<SupplierPoEditModal visible record={record} onClose={vi.fn()} onSave={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(screen.getAllByLabelText(/Item \d+ name/)).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1])
    expect(screen.getAllByLabelText(/Item \d+ name/)).toHaveLength(1)
  })

  it('cancels without producing a save payload', () => {
    const onClose = vi.fn()
    const onSave = vi.fn()
    render(<SupplierPoEditModal visible record={record} onClose={onClose} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Item 1 quantity'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('disables save for an invalid line item and while submitting', () => {
    const { rerender } = render(
      <SupplierPoEditModal visible record={record} onClose={vi.fn()} onSave={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('Item 1 name'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    rerender(
      <SupplierPoEditModal visible record={record} submitting onClose={vi.fn()} onSave={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
