import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InvoiceTable from './InvoiceTable'

const recordListMock = vi.hoisted(() => vi.fn())

vi.mock('../../../components/datatable', () => ({
  DataTableRecordList: (props) => {
    recordListMock(props)
    return <div data-testid="invoice-table" />
  },
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))
vi.mock('../../../components/stats', () => ({ StatsStrip: () => null }))

const invoice = (serviceType, status = 'Paid') => ({
  id: `INV-${serviceType}`,
  rawId: serviceType,
  serviceType,
  status,
  requestor: { company: { name: 'Client' }, pic: { name: 'PIC' } },
  paymentTermsDays: 30,
  grandTotal: '100.00',
})

describe('InvoiceTable Word action scope', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('keeps PDF receipts case-insensitive while offering Word invoices for every service', () => {
    render(
      <InvoiceTable
        invoices={[
          invoice('Equipment Supply', 'paid'),
          invoice('Training', 'Paid'),
          invoice('Special', 'Open'),
          invoice('Legacy Service', 'Open'),
        ]}
        onAction={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    const props = recordListMock.mock.calls.at(-1)[0]
    const equipmentActions = props.getActions(props.rows[0]).map((action) => action.label)
    const trainingActions = props.getActions(props.rows[1]).map((action) => action.label)
    const specialActions = props.getActions(props.rows[2]).map((action) => action.label)
    const unsupportedActions = props.getActions(props.rows[3]).map((action) => action.label)

    expect(equipmentActions).toEqual(
      expect.arrayContaining(['PDF Invoice', 'Word Invoice', 'PDF Receipt', 'Word Receipt']),
    )
    expect(trainingActions).toContain('PDF Receipt')
    expect(trainingActions).toContain('Word Invoice')
    expect(trainingActions).not.toContain('Word Receipt')
    expect(specialActions).toContain('Word Invoice')
    expect(unsupportedActions).not.toContain('Word Invoice')
  })
})
