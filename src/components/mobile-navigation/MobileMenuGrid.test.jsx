import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import MobileMenuGrid from './MobileMenuGrid'

const items = [
  { name: 'Dashboard', to: '/dashboard' },
  { name: 'CRM Management' },
  { name: 'Clients', to: '/client/manage' },
  { name: 'Projects', items: [{ name: 'Manage Projects', to: '/project/manage' }] },
]

describe('MobileMenuGrid', () => {
  it('renders a full-width primary route, section heading, and drill-down group', () => {
    const onNavigate = vi.fn()
    const onOpenGroup = vi.fn()

    render(
      <MemoryRouter initialEntries={['/client/manage']}>
        <MobileMenuGrid
          items={items}
          onNavigate={onNavigate}
          onOpenGroup={onOpenGroup}
          primaryItemFullWidth
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass(
      'app-mobile-sheet-card--full',
    )
    expect(screen.getByRole('heading', { name: 'CRM Management' })).toHaveClass(
      'app-mobile-menu-grid__section',
    )
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveClass('active')

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))
    expect(onOpenGroup).toHaveBeenCalledWith(items[3])
  })
})
