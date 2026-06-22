import React, { useState } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SpecialInvoiceForm from './SpecialInvoiceForm'

vi.mock('@coreui/react', async () => {
  const actual = await vi.importActual('@coreui/react')
  return {
    ...actual,
    CTooltip: ({ children }) => children,
  }
})

const basePricing = {
  special_items: [],
  discount_qty: 1,
  discount_unit: 'Lot',
  discount: 0,
  sst_percent: 0,
  sst_amount: 0,
  sub_total: 0,
  grand_total: 0,
}

const manualNotice =
  'This project has no linked quotation. A draft invoice line has been created from the project value and can be edited before review.'

const renderForm = ({
  project,
  quoteDetails = null,
  pricing = basePricing,
  mode = 'create',
} = {}) => {
  const Harness = () => {
    const [draftPricing, setDraftPricing] = useState(pricing)

    return (
      <SpecialInvoiceForm
        project={project}
        quoteDetails={quoteDetails}
        pricing={draftPricing}
        setPricing={setDraftPricing}
        mode={mode}
      />
    )
  }

  return render(<Harness />)
}

describe('SpecialInvoiceForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows manual project context and seeds a default line item before Discount', async () => {
    const { container } = renderForm({
      project: {
        id: 45,
        project_type: 'Special',
        quote_id: null,
        project_name: 'Manual Special Project',
        description: 'Manual project scope',
        quote_value: 5000,
      },
    })

    expect(screen.getByText(manualNotice)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Manual Special Project')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Manual project scope')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('Lot').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument()
    expect(screen.getAllByText('5000.00').length).toBeGreaterThanOrEqual(3)

    const bodyRows = container.querySelectorAll('tbody tr')
    expect(within(bodyRows[0]).getByDisplayValue('Manual Special Project')).toBeInTheDocument()
    expect(within(bodyRows[1]).getByText('Discount (RM)')).toBeInTheDocument()
  })

  it('treats Special Service as a manual Special project when no quote is linked', async () => {
    const { container } = renderForm({
      project: {
        id: 50,
        project_type: 'Special Service',
        quote_id: null,
        project_name: 'Manual Special Service Project',
        description: 'Special service manual scope',
        quote_value: 3000,
      },
    })

    expect(screen.getByText(manualNotice)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Manual Special Service Project')).toBeInTheDocument()
    })

    const bodyRows = container.querySelectorAll('tbody tr')
    expect(
      within(bodyRows[0]).getByDisplayValue('Special service manual scope'),
    ).toBeInTheDocument()
    expect(within(bodyRows[0]).getByDisplayValue('3000')).toBeInTheDocument()
    expect(within(bodyRows[1]).getByText('Discount (RM)')).toBeInTheDocument()
  })

  it('uses project_value when manual project awarded value is exposed under the list field', async () => {
    const { container } = renderForm({
      project: {
        id: 48,
        project_type: 'Special',
        quote_id: null,
        project_name: 'List Field Special Project',
        description: 'List field scope',
        project_value: 7500,
      },
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('List Field Special Project')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('7500')).toBeInTheDocument()
    expect(screen.getAllByText('7500.00').length).toBeGreaterThanOrEqual(3)

    const bodyRows = container.querySelectorAll('tbody tr')
    expect(within(bodyRows[0]).getByDisplayValue('List Field Special Project')).toBeInTheDocument()
    expect(within(bodyRows[1]).getByText('Discount (RM)')).toBeInTheDocument()
  })

  it('still seeds the manual project line when the project value is missing', async () => {
    const { container } = renderForm({
      project: {
        id: 49,
        project_type: 'Special',
        quote_id: null,
        project_name: 'Zero Value Special Project',
        description: 'Scope without value',
      },
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('Zero Value Special Project')).toBeInTheDocument()
    })

    const bodyRows = container.querySelectorAll('tbody tr')
    expect(within(bodyRows[0]).getByDisplayValue('Zero Value Special Project')).toBeInTheDocument()
    expect(within(bodyRows[1]).getByText('Discount (RM)')).toBeInTheDocument()
  })

  it('does not show the manual project notice for quote-backed Special projects', () => {
    renderForm({
      project: {
        id: 46,
        project_type: 'Special Service',
        quote_id: 99,
        project_name: 'Quote Backed Special',
        quote_value: 5000,
      },
      quoteDetails: {
        id: 99,
        special_items: [],
      },
    })

    expect(screen.queryByText(manualNotice)).not.toBeInTheDocument()
  })

  it('does not show create-only manual project notice while editing an invoice', () => {
    renderForm({
      mode: 'edit',
      project: {
        id: 47,
        project_type: 'Special',
        quote_id: null,
        project_name: 'Manual Special Project',
        quote_value: 5000,
      },
      pricing: {
        ...basePricing,
        special_items: [
          {
            item_description: 'Existing invoice line',
            quantity: 1,
            unit: 'Lot',
            unit_price: 5000,
          },
        ],
      },
    })

    expect(screen.queryByText(manualNotice)).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing invoice line')).toBeInTheDocument()
  })
})
