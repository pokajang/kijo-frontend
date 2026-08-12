import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClientFirstTouchTable from '../components/ClientFirstTouchTable'

const undocumentedRecord = {
  companyId: 399,
  companyName: 'Undocumented Client',
  firstTouch: null,
  claims: [],
  contribution: { collected: 0 },
}

const documentedRecord = {
  companyId: 400,
  companyName: 'Documented Client',
  firstTouch: {
    id: 1001,
    status: 'current',
    source: 'Phone call',
    occurredAt: '2024-03-01',
  },
  claims: [{ id: 1001 }],
  contribution: { collected: 640000 },
}

describe('ClientFirstTouchTable row flow', () => {
  const onOpen = vi.fn()
  const onSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  const renderTable = (record, getRowActions) =>
    render(
      <ClientFirstTouchTable
        records={[record]}
        onOpen={onOpen}
        onSubmit={onSubmit}
        getRowActions={getRowActions}
      />,
    )

  it.each([
    ['undocumented', undocumentedRecord],
    ['documented', documentedRecord],
  ])('opens the detail view for an %s row', (_, record) => {
    renderTable(record)

    const row = screen.getAllByRole('button', { name: new RegExp(record.companyName, 'i') })[0]
    fireEvent.click(row)

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ companyId: record.companyId }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('opens the detail view with Enter and Space', () => {
    renderTable(undocumentedRecord)

    const row = screen.getAllByRole('button', { name: /Undocumented Client/i })[0]
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })

    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps Submit Evidence as an explicit action without opening the row', async () => {
    const submitAction = {
      key: 'submit-evidence',
      label: 'Submit Evidence',
      onClick: () => onSubmit(undocumentedRecord),
    }
    const { container } = renderTable(undocumentedRecord, () => [submitAction])
    const desktopRow = container.querySelector('tbody tr[role="button"]')

    fireEvent.click(within(desktopRow).getByRole('button', { name: 'Actions' }))
    const actionItems = await screen.findAllByText('Submit Evidence')
    fireEvent.click(actionItems[actionItems.length - 1])

    expect(onSubmit).toHaveBeenCalledWith(undocumentedRecord)
    expect(onOpen).not.toHaveBeenCalled()
  })
})
