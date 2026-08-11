import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ClientContributionPanel from '../components/ClientContributionPanel'

describe('ClientContributionPanel', () => {
  it('separates client contribution from project salesperson credit', () => {
    render(
      <ClientContributionPanel
        contribution={{
          awarded: 1460000,
          invoiced: 1320000,
          collected: 1280000,
          grossProfit: 312000,
          asOf: '2026-08-11',
        }}
      />,
    )

    expect(screen.getByText('RM 1.28M')).toBeInTheDocument()
    expect(screen.getByText('Collected sales')).toBeInTheDocument()
    expect(
      screen.getByText(/Sales credit belongs to the salesperson assigned to each project or job/),
    ).toBeInTheDocument()
  })
})
