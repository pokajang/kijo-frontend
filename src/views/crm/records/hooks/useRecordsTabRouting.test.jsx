import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { useRecordsTabRouting } from './useRecordsTabRouting'

afterEach(cleanup)

const RoutingProbe = () => {
  const location = useLocation()
  const { activeTab, activeCategoryId, activeNavigationTab, handleTabChange } =
    useRecordsTabRouting()

  return (
    <div>
      <div data-testid="route-state">
        {`${activeTab}|${activeCategoryId || ''}|${activeNavigationTab}`}
      </div>
      <div data-testid="route-location">{`${location.pathname}${location.search}`}</div>
      <button type="button" onClick={() => handleTabChange('special-category:34')}>
        Environment
      </button>
      <button type="button" onClick={() => handleTabChange('special-tab')}>
        Special Service
      </button>
    </div>
  )
}

const renderProbe = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/crm/records" element={<RoutingProbe />} />
        <Route path="/crm/records/:serviceSlug" element={<RoutingProbe />} />
      </Routes>
    </MemoryRouter>,
  )

describe('useRecordsTabRouting', () => {
  it('resolves and clears a custom category through stable query URLs', () => {
    renderProbe('/crm/records/special?categoryId=34')

    expect(screen.getByTestId('route-state')).toHaveTextContent(
      'special-tab|34|special-category:34',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Special Service' }))
    expect(screen.getByTestId('route-location')).toHaveTextContent('/crm/records/special')
    expect(screen.getByTestId('route-state')).toHaveTextContent('special-tab||special-tab')
  })

  it('navigates a custom category without introducing a new service endpoint', () => {
    renderProbe('/crm/records')
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }))

    expect(screen.getByTestId('route-location')).toHaveTextContent(
      '/crm/records/special?categoryId=34',
    )
    expect(screen.getByTestId('route-state')).toHaveTextContent(
      'special-tab|34|special-category:34',
    )
  })
})
