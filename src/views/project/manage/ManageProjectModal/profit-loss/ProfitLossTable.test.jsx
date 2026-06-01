import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ProfitLossTable from './ProfitLossTable'

describe('ProfitLossTable', () => {
  afterEach(() => {
    cleanup()
  })

  it('formats all visible money values with RM', () => {
    render(
      <ProfitLossTable
        revenue={4500}
        totalApproved={1000}
        totalPending={250.5}
        totalManualExpenses={125}
        confirmedNetProfit={3375}
        projectedNetProfit={3124.5}
        projectExpenses={[
          {
            id: 1,
            date: '2026-03-15',
            remarks: 'Parking',
            created_by_name_code: 'AZA',
            amount: 125,
          },
        ]}
        onViewReceipt={vi.fn()}
        onDeleteExpense={vi.fn()}
      />,
    )

    expect(screen.getByText('RM 4,500.00')).toBeInTheDocument()
    expect(screen.getByText('RM 1,000.00')).toBeInTheDocument()
    expect(screen.getByText('RM 250.50')).toBeInTheDocument()
    expect(screen.getAllByText('RM 125.00')).toHaveLength(2)
    expect(screen.getByText('RM 3,375.00')).toBeInTheDocument()
    expect(screen.getByText('RM 3,124.50')).toBeInTheDocument()
  })
})
