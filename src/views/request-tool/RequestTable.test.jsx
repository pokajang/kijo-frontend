import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RequestTable from './RequestTable'

const renderTable = () =>
  render(
    <RequestTable
      records={[]}
      loading={false}
      showRequestForm={false}
      openModal={vi.fn()}
      showModal={false}
      setShowModal={vi.fn()}
      modalRecord={null}
      newAchievement=""
      setNewAchievement={vi.fn()}
      handleSaveAchievement={vi.fn()}
      onViewRecord={vi.fn()}
    />,
  )

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.clearAllMocks()
})

describe('RequestTable stats toggle', () => {
  it('hides stats without hiding filters or the table shell', () => {
    renderTable()

    expect(screen.getByText('Requests')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Table display' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show statistics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(screen.queryByText('Requests')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Search usage records')).toBeInTheDocument()
    expect(screen.getAllByText('No usage records found.').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Table display' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show statistics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(screen.getByText('Requests')).toBeInTheDocument()
  })

  it('hides the search row without hiding stats or the table shell', () => {
    renderTable()

    expect(screen.getByText('Requests')).toBeInTheDocument()
    expect(screen.getByLabelText('Search usage records')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Table display' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show search and filters row' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    expect(screen.getByText('Requests')).toBeInTheDocument()
    expect(screen.queryByLabelText('Search usage records')).not.toBeInTheDocument()
    expect(screen.getAllByText('No usage records found.').length).toBeGreaterThan(0)
  })
})
