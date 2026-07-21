import React from 'react'

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import TrafficLightCard from './TrafficLightCard'
import TrafficLightDecisionBadge from './TrafficLightDecisionBadge'

describe('traffic-light guidance', () => {
  afterEach(() => cleanup())

  it('shows a dismissible procedure alert', async () => {
    render(
      <TrafficLightCard
        serviceKey="ih"
        estimatedTotalCost="6000"
        onEstimatedTotalCostChange={() => {}}
      />,
    )

    expect(
      screen.getByText(
        /NEW: Set your estimated cost first\. Keep the quoted price in the Green zone\./i,
      ),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('btn-close')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByText(/NEW: Set your estimated cost first/i)).not.toBeInTheDocument()
    })
  })

  it('shows a traffic-light legend in the card header', () => {
    render(
      <TrafficLightCard
        serviceKey="training"
        estimatedTotalCost="6000"
        onEstimatedTotalCostChange={() => {}}
      />,
    )

    const legend = screen.getByLabelText('Traffic Light Legend')
    expect(within(legend).getByText('Green')).toBeInTheDocument()
    expect(within(legend).getByText('Yellow')).toBeInTheDocument()
    expect(within(legend).getByText('Red')).toBeInTheDocument()
  })

  it('fills the guidance bands with actionable quote ranges', () => {
    render(
      <TrafficLightCard
        serviceKey="ih"
        estimatedTotalCost="6000"
        onEstimatedTotalCostChange={() => {}}
      />,
    )

    expect(
      screen.getByText(/Value must be higher than this value \(quote above this\)/),
    ).toBeInTheDocument()
    expect(screen.getByText(/HOD approval first/)).toBeInTheDocument()
    expect(screen.getByText(/BD final approval first/)).toBeInTheDocument()
    expect(screen.getByText('RM 8,100.00+')).toBeInTheDocument()
    expect(screen.getByText('RM 7,200.00–8,099.99')).toBeInTheDocument()
    expect(screen.getByText('< RM 7,200.00')).toBeInTheDocument()
  })

  it.each([
    ['training', 140, 'Green — You can issue this'],
    ['training', 125, 'Yellow — Need HOD approval first'],
    ['training', 124.99, 'Red — Need BD final approval first'],
    ['ih', 135, 'Green — You can issue this'],
    ['ih', 120, 'Yellow — Need HOD approval first'],
    ['ih', 119.99, 'Red — Need BD final approval first'],
    ['equipment', 130, 'Green — You can issue this'],
    ['equipment', 110, 'Yellow — Need HOD approval first'],
    ['equipment', 109.99, 'Red — Need BD final approval first'],
    ['manpower', 135, 'Green — You can issue this'],
    ['manpower', 120, 'Yellow — Need HOD approval first'],
    ['manpower', 119.99, 'Red — Need BD final approval first'],
  ])('shows the right decision for %s', (serviceKey, quoteTotal, expectedLabel) => {
    render(
      <TrafficLightDecisionBadge
        serviceKey={serviceKey}
        estimatedTotalCost="100"
        quoteTotal={quoteTotal}
      />,
    )

    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('asks for an estimated cost before giving a decision', () => {
    render(<TrafficLightDecisionBadge serviceKey="training" quoteTotal={140} />)

    expect(screen.getByText('Estimated cost required')).toBeInTheDocument()
  })
})
