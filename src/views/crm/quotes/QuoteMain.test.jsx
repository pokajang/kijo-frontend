import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import QuoteMain from './QuoteMain'

vi.mock('./SelectClientCard', () => ({
  default: ({ onClientChange }) => (
    <button
      type="button"
      onClick={() =>
        onClientChange({
          company_id: 7,
          company_name: 'Smoke Client Sdn Bhd',
          selected_pic: {
            full_name: 'Test PIC',
            email: 'pic@example.test',
            mobile_number: '0123456789',
            position: 'Manager',
          },
          selected_pics: [
            {
              full_name: 'Test PIC',
              email: 'pic@example.test',
              mobile_number: '0123456789',
              position: 'Manager',
            },
          ],
        })
      }
    >
      Select mock client
    </button>
  ),
}))

const renderQuoteMain = () =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/crm/quotes',
          search: '?service=training',
          state: { returnTo: '/crm/records/training', initialService: 'training' },
        },
      ]}
    >
      <Routes>
        <Route path="/crm/quotes" element={<QuoteMain />} />
      </Routes>
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.clearAllMocks()
})

describe('QuoteMain service defaulting', () => {
  it('defaults from the records service route without locking the create service selector', async () => {
    renderQuoteMain()

    fireEvent.click(screen.getByRole('button', { name: /select mock client/i }))

    const serviceSelect = await screen.findByLabelText(/service type/i)
    expect(serviceSelect).toHaveValue('training')

    fireEvent.change(serviceSelect, { target: { value: 'ih' } })

    await waitFor(() => expect(serviceSelect).toHaveValue('ih'))
    expect(serviceSelect).toHaveValue('ih')
  })
})
