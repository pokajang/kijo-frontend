import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VendorLoaCreateFlow from './VendorLoaCreateFlow'
import { listAllVendors, saveProjectVendor } from '../../../project/manage/projectApi'

const listAllVendorsMock = vi.hoisted(() => vi.fn())
const saveProjectVendorMock = vi.hoisted(() => vi.fn())
const choiceMock = vi.hoisted(() => vi.fn())

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    choice: choiceMock,
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
  quotation_remarks: 'Use the client-approved navy colour scheme.',
  equipment_items: [
    {
      item_name: 'Gas detector',
      description: 'Portable calibrated detector.\r\nIncludes:\r\n• charging dock',
      item_remarks: 'Compact enclosure; navy blue.',
    },
  ],
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
  await waitFor(() => expect(choiceMock).toHaveBeenCalledTimes(1))
}

describe('VendorLoaCreateFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    choiceMock.mockResolvedValue('project')
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
    expect(saveProjectVendor).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        remarks: 'Use the client-approved navy colour scheme.',
        services_description: [
          'Gas detector',
          'Description: Portable calibrated detector.; Includes: charging dock',
          'Remarks: Compact enclosure; navy blue.',
        ].join('\n'),
      }),
    )
    await waitFor(() => expect(choiceMock).toHaveBeenCalledTimes(1))
    expect(choiceMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ title: 'Vendor LOA Created' }),
    )
  })

  it('omits blank equipment wording so the backend can apply its authoritative snapshot', async () => {
    renderFlow({
      project: {
        id: 12,
        project_name: 'Project Alpha',
        project_type: 'Equipment Supply',
      },
    })

    await createVendorLoaThroughReview()

    const payload = saveProjectVendor.mock.calls[0][1]
    expect(payload).not.toHaveProperty('remarks')
    expect(payload).not.toHaveProperty('services_description')
  })

  it('shows list return for vendor-loa-list origin', async () => {
    renderFlow({ origin: 'vendor-loa-list' })

    await createVendorLoaThroughReview()

    const [, options] = choiceMock.mock.calls[0]
    expect(options.actions.map((action) => action.key)).toEqual([
      'project',
      'list',
      'generate',
      'view',
    ])
  })

  it('keeps project-origin success focused on project and LOA actions', async () => {
    renderFlow({ origin: 'project' })

    await createVendorLoaThroughReview()

    const [, options] = choiceMock.mock.calls[0]
    expect(options.dismissAction).toBe('project')
    expect(options.actions.find((action) => action.key === 'view')).toEqual(
      expect.objectContaining({ label: 'View Vendor LOA', color: 'primary' }),
    )
  })
})
