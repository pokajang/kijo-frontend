import React, { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SelectClientCard from './SelectClientCard'

const mocks = vi.hoisted(() => ({
  fetchAllPagedRecords: vi.fn(),
  fetchJson: vi.fn(),
}))

vi.mock('../../../utils/detailPages', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchAllPagedRecords: mocks.fetchAllPagedRecords,
  fetchJson: mocks.fetchJson,
}))

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({ options = [], value, onChange, placeholder }) => (
    <select
      aria-label="Client / Company"
      value={value?.value ?? ''}
      onChange={(event) => {
        const option = options.find((candidate) => String(candidate.value) === event.target.value)
        onChange(option || null)
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

const previewPics = [
  {
    pic_id: 11,
    full_name: 'PIC One',
    email: 'one@example.test',
    mobile_number: '6011',
    position: 'Manager',
  },
  {
    pic_id: 12,
    full_name: 'PIC Two',
    email: 'two@example.test',
    mobile_number: '6012',
    position: 'Executive',
  },
]

const allPics = [
  ...previewPics,
  {
    pic_id: 13,
    full_name: 'PIC Three',
    email: 'three@example.test',
    mobile_number: '6013',
    position: 'Director',
  },
  {
    pic_id: 14,
    full_name: 'PIC Four',
    email: 'four@example.test',
    mobile_number: '6014',
    position: 'Coordinator',
  },
]

const clients = [
  {
    company_id: 7,
    company_name: 'Four PIC Client',
    ssm_number: 'SSM-7',
    address: '1 Test Street',
    city: 'Kuala Lumpur',
    state: 'Kuala Lumpur',
    zip: '50000',
    pic_count: 4,
    pic_preview: previewPics,
  },
]

const jsonResponse = (data) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(data),
})

const Harness = ({ initialClient = null, onChange = vi.fn() }) => {
  const [selectedClient, setSelectedClient] = useState(initialClient)

  return (
    <SelectClientCard
      selectedClient={selectedClient}
      onClientChange={(client) => {
        setSelectedClient(client)
        onChange(client)
      }}
    />
  )
}

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <Harness {...props} />
    </MemoryRouter>,
  )

beforeEach(() => {
  mocks.fetchAllPagedRecords.mockResolvedValue(clients)
  mocks.fetchJson.mockResolvedValue({ status: 'success', data: allPics })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'success', data: [] })))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
})

describe('SelectClientCard full contact loading', () => {
  it('loads and renders all PICs, then selects all of them', async () => {
    const onChange = vi.fn()
    renderCard({ onChange })

    await screen.findByRole('option', { name: /Four PIC Client/i })
    fireEvent.change(screen.getByRole('combobox', { name: 'Client / Company' }), {
      target: { value: '7' },
    })

    await screen.findByRole('checkbox', { name: /PIC Four/i })
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(screen.getByText('Contact Information (4)')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '4 client contacts' })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(screen.getByRole('checkbox', { name: /PIC One/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /PIC Three/i })).not.toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }))

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox').every((checkbox) => checkbox.checked)).toBe(true)
    })
    expect(onChange.mock.calls.at(-1)[0].selected_pics).toHaveLength(4)
  })

  it.each([1, 2])('does not create a scroll region for %i PICs', async (picCount) => {
    mocks.fetchJson.mockResolvedValue({ status: 'success', data: allPics.slice(0, picCount) })
    renderCard()

    await screen.findByRole('option', { name: /Four PIC Client/i })
    fireEvent.change(screen.getByRole('combobox', { name: 'Client / Company' }), {
      target: { value: '7' },
    })

    await screen.findByText(`Contact Information (${picCount})`)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    if (picCount === 2) expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('preserves a saved PIC beyond the two-record preview during draft hydration', async () => {
    const savedPic = allPics[2]
    renderCard({
      initialClient: {
        ...clients[0],
        all_pics: previewPics,
        selected_pic: savedPic,
        selected_pics: [savedPic],
      },
    })

    await screen.findByRole('checkbox', { name: /PIC Four/i })
    expect(screen.getByRole('checkbox', { name: /PIC Three/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /PIC One/i })).not.toBeChecked()
  })

  it('shows preview contacts and supports retry when the full PIC request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.fetchJson
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ status: 'success', data: allPics })

    renderCard()
    await screen.findByRole('option', { name: /Four PIC Client/i })
    fireEvent.change(screen.getByRole('combobox', { name: 'Client / Company' }), {
      target: { value: '7' },
    })

    expect(await screen.findByText(/Could not load all contacts/i)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await screen.findByRole('checkbox', { name: /PIC Four/i })
    expect(screen.queryByText(/Could not load all contacts/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
  })

  it('ignores stale PIC data when clients are switched rapidly', async () => {
    const secondClient = {
      ...clients[0],
      company_id: 8,
      company_name: 'Second Client',
      pic_count: 1,
      pic_preview: [{ ...previewPics[0], pic_id: 21, full_name: 'Second Preview' }],
    }
    const stalePics = [{ ...allPics[0], pic_id: 31, full_name: 'Stale Client PIC' }]
    const currentPics = [{ ...allPics[0], pic_id: 21, full_name: 'Current Client PIC' }]
    let resolveStaleRequest

    mocks.fetchAllPagedRecords.mockResolvedValue([clients[0], secondClient])
    mocks.fetchJson.mockImplementation((url) => {
      if (url.includes('/7/pics')) {
        return new Promise((resolve) => {
          resolveStaleRequest = resolve
        })
      }
      return Promise.resolve({ status: 'success', data: currentPics })
    })

    renderCard()
    await screen.findByRole('option', { name: /Four PIC Client/i })
    fireEvent.change(screen.getByRole('combobox', { name: 'Client / Company' }), {
      target: { value: '7' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Client / Company' }), {
      target: { value: '8' },
    })

    expect(await screen.findByText('Current Client PIC')).toBeInTheDocument()
    resolveStaleRequest({ status: 'success', data: stalePics })

    await waitFor(() => expect(screen.queryByText('Stale Client PIC')).not.toBeInTheDocument())
    expect(screen.getByText('Current Client PIC')).toBeInTheDocument()
  })
})
