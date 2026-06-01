import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VendorLoaCreateFlow from './VendorLoaCreateFlow'
import { listAllVendors, saveProjectVendor } from '../../../project/manage/projectApi'

const listAllVendorsMock = vi.hoisted(() => vi.fn())
const saveProjectVendorMock = vi.hoisted(() => vi.fn())

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
  },
}))

vi.mock('../../../project/manage/commercialDocsWarning', () => ({
  confirmExistingCommercialDocs: vi.fn(() => true),
  hasProjectCommercialDocGroups: vi.fn(() => false),
  ProjectCommercialDocsNotice: () => null,
  useProjectCommercialDocs: () => ({ groups: [], loading: false, error: '' }),
}))

vi.mock('../../../project/manage/projectApi', () => ({
  listAllVendors: listAllVendorsMock,
  saveProjectVendor: saveProjectVendorMock,
}))

const project = {
  id: 12,
  project_name: 'Project Alpha',
  project_type: 'Equipment Supply',
  client_name: 'Client A',
}

const renderFlow = (props = {}) =>
  render(
    <MemoryRouter>
      <VendorLoaCreateFlow project={project} onBack={vi.fn()} {...props} />
    </MemoryRouter>,
  )

const fillRequiredFields = async () => {
  fireEvent.change(await screen.findByLabelText(/vendor/i), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText(/sum professional fee/i), {
    target: { value: '1200' },
  })
  fireEvent.change(screen.getByLabelText(/payment terms/i), { target: { value: '30 days' } })
  await waitFor(() => expect(screen.getByLabelText(/vendor/i)).toHaveValue('5'))
}

const createVendorLoaThroughReview = async () => {
  await fillRequiredFields()
  fireEvent.click(screen.getByRole('button', { name: /^review vendor loa$/i }))
  await screen.findByRole('heading', { name: /^review vendor loa$/i })
  fireEvent.click(screen.getByRole('button', { name: /^create vendor loa$/i }))
  await screen.findByText('Vendor LOA Created')
}

describe('VendorLoaCreateFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAllVendors.mockResolvedValue([{ vendor_id: 5, vendor_name: 'Vendor A' }])
    saveProjectVendor.mockResolvedValue({ status: 'success', assignment_id: 99 })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows review without posting, then posts from review', async () => {
    renderFlow()

    await fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /^review vendor loa$/i }))

    expect(await screen.findByRole('heading', { name: /^review vendor loa$/i })).toBeInTheDocument()
    expect(saveProjectVendor).not.toHaveBeenCalled()
    expect(screen.getByText('Vendor A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^create vendor loa$/i }))

    await waitFor(() => expect(saveProjectVendor).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Vendor LOA Created')).toBeInTheDocument()
  })

  it('shows list return for vendor-loa-list origin', async () => {
    renderFlow({ origin: 'vendor-loa-list' })

    await createVendorLoaThroughReview()

    expect(screen.getByRole('button', { name: /return to vendor loa list/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage project/i })).toBeInTheDocument()
  })

  it('keeps project-origin success focused on project and LOA actions', async () => {
    renderFlow({ origin: 'project' })

    await createVendorLoaThroughReview()

    expect(
      screen.queryByRole('button', { name: /return to vendor loa list/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate loa/i })).toBeInTheDocument()
  })
})
