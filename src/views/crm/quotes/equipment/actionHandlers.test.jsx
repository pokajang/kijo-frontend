import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useEquipmentForm } from './actionHandlers'

const { saveQuoteMock } = vi.hoisted(() => ({ saveQuoteMock: vi.fn() }))

vi.mock('../helpers/useQuoteSave', () => ({
  useQuoteSave: () => saveQuoteMock,
}))

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>

const client = {
  company_id: 42,
  company_name: 'Client A',
  ssm_number: 'SSM-42',
  address: 'Test address',
  city: 'Kuala Lumpur',
  state: 'Kuala Lumpur',
  zip: '50000',
  selected_pic: {
    full_name: 'Client PIC',
    email: 'pic@example.test',
    mobile_number: '60123456789',
    position: 'Manager',
  },
}

const item = {
  id: 701,
  item_name: 'Gas detector',
  supplier_price: 100,
  unit: 'unit',
  supplier_name: 'Supplier A',
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useEquipmentForm remarks', () => {
  it('stores quote and item remarks in the save payload without changing totals', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ status: 'success', data: [item] }),
      })),
    )
    const { result } = renderHook(() => useEquipmentForm(client), { wrapper })

    await waitFor(() => expect(result.current.selectOptions).toHaveLength(1))

    act(() => {
      result.current.handleSelectChange([{ label: 'Gas detector', value: item }])
    })
    act(() => {
      result.current.setQuotationRemarks('Deliver all equipment together.')
      result.current.handleItemRemarksChange(701, 'Colour: navy blue')
      result.current.setEstimatedTotalCost(100)
    })

    expect(result.current.grandTotal).toBe(150)

    await act(async () => {
      await result.current.handleSaveQuote()
    })

    expect(saveQuoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quotation_remarks: 'Deliver all equipment together.',
        grand_total: 150,
        items: [expect.objectContaining({ item_id: 701, item_remarks: 'Colour: navy blue' })],
      }),
      expect.any(Object),
    )
  })

  it('removes item remarks when the corresponding equipment item is removed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ status: 'success', data: [item] }),
      })),
    )
    const { result } = renderHook(() => useEquipmentForm(client), { wrapper })

    await waitFor(() => expect(result.current.selectOptions).toHaveLength(1))
    act(() => result.current.handleSelectChange([{ label: 'Gas detector', value: item }]))
    act(() => result.current.handleItemRemarksChange(701, 'Size: compact'))
    expect(result.current.itemRemarks[701]).toBe('Size: compact')

    act(() => result.current.handleSelectChange([]))
    expect(result.current.itemRemarks).toEqual({})
  })

  it('hydrates and resubmits remarks when editing an existing quotation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ status: 'success', data: [item] }),
      })),
    )
    const initialFormData = {
      quotationRemarks: 'Existing quotation requirement.',
      estimatedTotalCost: 100,
      items: [
        {
          item_id: 701,
          item_name: 'Gas detector',
          item_remarks: 'Existing item specification.',
          quantity: 1,
          unit_price: 100,
          marked_up_price: 150,
          unit: 'unit',
        },
      ],
    }
    const { result } = renderHook(
      () =>
        useEquipmentForm(client, {
          initialFormData,
          isEditMode: true,
          quoteId: 99,
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.selectedItems).toHaveLength(1))
    expect(result.current.quotationRemarks).toBe('Existing quotation requirement.')
    expect(result.current.itemRemarks[701]).toBe('Existing item specification.')

    await act(async () => {
      await result.current.handleSaveQuote()
    })

    expect(saveQuoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 99,
        quotation_remarks: 'Existing quotation requirement.',
        items: [expect.objectContaining({ item_remarks: 'Existing item specification.' })],
      }),
      expect.any(Object),
    )
  })
})
