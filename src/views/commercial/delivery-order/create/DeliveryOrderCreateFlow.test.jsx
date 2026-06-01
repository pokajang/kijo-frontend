import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import DeliveryOrderCreateFlow from './DeliveryOrderCreateFlow'
import { createDeliveryOrder } from './deliveryOrderCreatePayload'

const navigateMock = vi.hoisted(() => vi.fn())
const createDeliveryOrderMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../../../project/manage/commercialDocsWarning', () => ({
  confirmExistingCommercialDocs: vi.fn(() => true),
  hasProjectCommercialDocGroups: vi.fn(() => false),
  ProjectCommercialDocsNotice: () => null,
  useProjectCommercialDocs: () => ({ groups: [], loading: false, error: '' }),
}))

vi.mock('./DeliveryOrderDeliveryDetailsStep', async () => {
  const ReactModule = await vi.importActual('react')
  const MockDeliveryDetails = ({ client, setClient, setCompany }) => {
    ReactModule.useEffect(() => {
      if (client.name) return
      setClient({
        name: 'Client A',
        address: 'Client Address',
        contact: { name: 'PIC A', position: '', email: 'pic@example.com', phone: '' },
      })
      setCompany({
        name: 'AMIOSH',
        address: 'Company Address',
        contact: { name: 'Admin', email: 'admin@example.com', phone: '123' },
      })
    }, [client.name, setClient, setCompany])
    return <div>Delivery details form</div>
  }

  return {
    default: MockDeliveryDetails,
  }
})

vi.mock('./DeliveryOrderProjectDetailsStep', async () => {
  const ReactModule = await vi.importActual('react')
  const MockProjectDetails = ({ project, setProject }) => {
    ReactModule.useEffect(() => {
      if (project.name === 'Project Alpha') return
      setProject((current) => ({ ...current, name: 'Project Alpha' }))
    }, [project.name, setProject])
    return <div>Project details form</div>
  }

  return {
    default: MockProjectDetails,
  }
})

vi.mock('./DeliveryOrderItemsDetailsStep', async () => {
  const ReactModule = await vi.importActual('react')
  const MockItemsDetails = ({ items, setItems }) => {
    ReactModule.useEffect(() => {
      if (items.length) return
      setItems([{ name: 'Item A', description: 'Desc A', quantity: 1, unit: 'unit' }])
    }, [items.length, setItems])
    return <div>Items details form</div>
  }

  return {
    default: MockItemsDetails,
  }
})

vi.mock('./deliveryOrderCreatePayload', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createDeliveryOrder: createDeliveryOrderMock,
  }
})

const project = {
  id: 12,
  project_name: 'Project Alpha',
  project_type: 'Equipment Supply',
  client_name: 'Client A',
  equipment_items: [
    { id: 1, item_name: 'Item A', description: 'Desc A', quantity: 1, unit: 'unit' },
  ],
}

const renderFlow = (props = {}) =>
  render(
    <MemoryRouter>
      <DeliveryOrderCreateFlow project={project} onBack={vi.fn()} {...props} />
    </MemoryRouter>,
  )

const clickReviewDeliveryOrder = async () => {
  expect(await screen.findByText('Items details form')).toBeInTheDocument()
  const reviewButton = screen.getByRole('button', { name: /^review delivery order$/i })
  await waitFor(() => expect(reviewButton).not.toBeDisabled())
  fireEvent.click(reviewButton)
}

describe('DeliveryOrderCreateFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 'success', data: { breakdown: [] } }),
      }),
    )
    createDeliveryOrder.mockResolvedValue({ status: 'success', do_id: 77, do_number: 'DO-77' })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows review without posting, then posts from review', async () => {
    renderFlow({ origin: 'delivery-order-list' })

    await clickReviewDeliveryOrder()

    expect(
      await screen.findByRole('heading', { name: /^review delivery order$/i }),
    ).toBeInTheDocument()
    expect(createDeliveryOrder).not.toHaveBeenCalled()
    expect(screen.getByText('Item A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^create delivery order$/i }))

    await waitFor(() => expect(createDeliveryOrder).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Delivery Order Created')).toBeInTheDocument()
  })

  it('preserves project-origin navigation to delivery order detail after creation', async () => {
    renderFlow()

    await clickReviewDeliveryOrder()
    await screen.findByRole('heading', { name: /^review delivery order$/i })
    fireEvent.click(screen.getByRole('button', { name: /^create delivery order$/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/commercial/delivery-order/77', {
        state: { fromProjectId: 12 },
      }),
    )
  })
})
