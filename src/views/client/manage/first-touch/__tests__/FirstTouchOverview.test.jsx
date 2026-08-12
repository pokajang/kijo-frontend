import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FirstTouchTimeline from '../components/FirstTouchTimeline'
import ProjectSalesCreditTable from '../components/ProjectSalesCreditTable'
import SalespersonContributionPanel from '../components/SalespersonContributionPanel'

afterEach(cleanup)

describe('First Touch overview disclosures', () => {
  it('summarises credited salespeople and keeps unassigned projects inline', () => {
    render(
      <SalespersonContributionPanel
        projects={[
          { id: 1, salesOwner: 'Nurul Najwa', salesOwnerCode: 'NND', collected: 1200 },
          { id: 2, collected: 300 },
        ]}
        onOpenCommercialHistory={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Sales credited to' })).toBeInTheDocument()
    expect(screen.getByText('Nurul Najwa')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getByText('Needs assignment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View commercial history' })).toBeInTheDocument()
  })

  it('keeps project-level sales credit collapsed until requested', () => {
    render(
      <ProjectSalesCreditTable
        projects={[{ id: 1, name: 'Alpha Project', collected: 1200, status: 'paid' }]}
        onOpenProject={vi.fn()}
      />,
    )

    const toggle = screen.getByRole('button', { name: /View project-level sales credit/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('Alpha Project')).toHaveLength(2)
  })

  it('starts the relationship timeline compact and expands earlier events deliberately', () => {
    render(
      <FirstTouchTimeline
        entries={[
          { id: 'first', date: '2021-01-01', title: 'First touch', description: 'Origin' },
          { id: 'second', date: '2022-01-01', title: 'Second', description: 'Second event' },
          { id: 'third', date: '2023-01-01', title: 'Third', description: 'Third event' },
          { id: 'fourth', date: '2024-01-01', title: 'Fourth', description: 'Fourth event' },
          { id: 'fifth', date: '2025-01-01', title: 'Fifth', description: 'Fifth event' },
        ]}
      />,
    )

    expect(screen.getByText('First touch')).toBeInTheDocument()
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show 1 earlier event' }))
    expect(screen.getByText('Second')).toBeInTheDocument()
  })
})
