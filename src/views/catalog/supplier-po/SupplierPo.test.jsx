import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SupplierPo from './SupplierPo'
import { useSupplierPoServices } from './services'

vi.mock('./services', () => ({
  useSupplierPoServices: vi.fn(),
}))

const noop = vi.fn()

describe('SupplierPo submission state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSupplierPoServices.mockReturnValue({
      supplierList: [],
      selectedSupplier: null,
      selectedProject: null,
      handleSupplierChange: noop,
      catalogItems: [],
      selectedItems: [
        {
          value: {
            id: 1,
            item_name: 'Gas detector',
            description: 'Portable detector',
            unit: 'unit',
          },
        },
      ],
      handleItemsChange: noop,
      quantities: { 1: 1 },
      handleQtyChange: noop,
      unitPrices: { 1: 100 },
      handlePriceChange: noop,
      discount: 0,
      setDiscount: noop,
      deliveryCharge: 0,
      setDeliveryCharge: noop,
      sstPercent: 0,
      setSstPercent: noop,
      subtotal: 100,
      sstAmount: 0,
      grandTotal: 100,
      projectList: [],
      handleProjectChange: noop,
      handleReset: noop,
      handleSave: noop,
      submitting: true,
      quotationRemarks: '',
      setQuotationRemarks: noop,
      equipmentSnapshotItem: () => null,
    })
  })

  it('disables repeat submission and reset while creation is in flight', () => {
    render(
      <MemoryRouter>
        <SupplierPo module="commercial" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Creating PO...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })
})
