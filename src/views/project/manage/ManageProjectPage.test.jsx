import React from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ManageProjectPage from './ManageProjectPage'
import { getProjectDetails, getProjectFinanceData } from './projectApi'

const routeState = vi.hoisted(() => ({
  location: { state: null },
  navigate: vi.fn(),
  params: { id: '12' },
}))
const childProps = vi.hoisted(() => ({
  commercial: null,
  vendor: null,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => routeState.location,
    useNavigate: () => routeState.navigate,
    useParams: () => routeState.params,
  }
})

vi.mock('../../../components/datatable', () => ({
  DataTableActionButtonGroup: ({ actions = [] }) => (
    <div
      data-testid="project-actions"
      data-action-keys={actions.map((action) => action.key).join(',')}
    >
      {actions.map((action) => (
        <button key={action.key || action.label} type="button">
          {action.buttonLabel || action.label}
        </button>
      ))}
    </div>
  ),
  DataTableLoadingState: ({ message }) => <div>{message}</div>,
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))

vi.mock('./actionHandlers', () => ({
  handleDeleteProject: vi.fn(),
}))

vi.mock('./projectApi', () => ({
  getProjectDetails: vi.fn(),
  getProjectFinanceData: vi.fn(),
  getAwardedProjectValue: (project) => project?.quote_value ?? project?.project_value ?? 0,
  getCurrentProjectValue: (project) => project?.quote_value ?? project?.project_value ?? 0,
  getProjectVariationValue: (project) => project?.quote_value ?? project?.project_value ?? 0,
}))

vi.mock('./CloseProjectModal', () => ({
  default: () => null,
}))

vi.mock('./ManageProjectModal/ClientDetailsCard', () => ({
  default: () => <div>Client Details</div>,
}))

vi.mock('./ManageProjectModal/CommercialTrailsCard', () => ({
  default: (props) => {
    childProps.commercial = props
    return <div>Commercial Trails</div>
  },
}))

vi.mock('./ManageProjectModal/CRMDetailsCard', () => ({
  default: () => <div>CRM Details</div>,
}))

vi.mock('./ManageProjectModal/ProjectDetailsCard', () => ({
  default: () => <div>Project Details</div>,
}))

vi.mock('./ManageProjectModal/ProgressTrackerCard', () => ({
  default: () => <div>Progress Tracker</div>,
}))

vi.mock('./ManageProjectModal/VendorDetailsCard', () => ({
  default: (props) => {
    childProps.vendor = props
    return <div>Vendor Details</div>
  },
}))

vi.mock('./ManageProjectModal/PaymentRequestsCard', () => ({
  default: () => <div>Payment Requests</div>,
}))

vi.mock('./ManageProjectModal/profit-loss/ProfitLossCard', () => ({
  default: () => <div>Profit Loss</div>,
}))

vi.mock('./ManageProjectModal/CollaboratorsCard', () => ({
  default: () => <div>Collaborators</div>,
}))

const currentProject = {
  id: 12,
  project_name: 'Project Alpha',
  project_type: 'Equipment Supply',
  status: 'Active',
  quote_value: 4500,
  award_date: '2026-03-13',
  assigned_staff: [{ project_role: 'Leader', full_name: 'Azam Bin Husain', name_code: 'AZA' }],
  progress_updates: [{ progress_date: '2026-03-20', progress_text: 'Updated' }],
}

const staleProject = {
  id: 12,
  project_name: 'Old Name',
  project_type: 'Old Type',
  status: 'Active',
}

describe('ManageProjectPage canonical routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    childProps.commercial = null
    childProps.vendor = null
    routeState.location = { state: null }
    routeState.navigate = vi.fn()
    routeState.params = { id: '12' }
    getProjectDetails.mockResolvedValue(currentProject)
    getProjectFinanceData.mockResolvedValue({ history: [], expenses: [] })
  })

  afterEach(() => {
    cleanup()
  })

  it('replaces missing slugs with the canonical project detail route', async () => {
    routeState.location = { state: { project: currentProject } }
    routeState.params = { id: '12' }

    render(<ManageProjectPage />)

    await waitFor(() =>
      expect(routeState.navigate).toHaveBeenCalledWith(
        '/project/manage/12/equipment-supply/project-alpha',
        {
          replace: true,
          state: { project: currentProject },
        },
      ),
    )
  })

  it('refreshes stale route state and replaces stale slugs with the current canonical route', async () => {
    routeState.location = { state: { project: staleProject } }
    routeState.params = { id: '12', type: 'old-type', name: 'old-name' }

    render(<ManageProjectPage />)

    await waitFor(() => expect(getProjectDetails).toHaveBeenCalledWith('12', expect.any(Object)))
    await waitFor(() =>
      expect(routeState.navigate).toHaveBeenCalledWith(
        '/project/manage/12/equipment-supply/project-alpha',
        {
          replace: true,
          state: { project: currentProject },
        },
      ),
    )
  })

  it('renders summary and bottom actions without a duplicate top action block', async () => {
    routeState.location = { state: { project: currentProject } }
    routeState.params = { id: '12', type: 'equipment-supply', name: 'project-alpha' }

    render(<ManageProjectPage />)

    await waitFor(() => expect(screen.getAllByText('RM 4,500.00').length).toBeGreaterThan(0))

    const actionGroups = screen.getAllByTestId('project-actions')
    expect(actionGroups).toHaveLength(3)
    expect(actionGroups[0]).toHaveAttribute(
      'data-action-keys',
      'invoice,delivery-order,vendor-loa,supplier-po',
    )
    expect(actionGroups[1]).toHaveAttribute('data-action-keys', 'complete,terminate')
    expect(actionGroups[2]).toHaveAttribute('data-action-keys', 'delete')
    expect(screen.getByRole('button', { name: /generate invoice/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete project/i })).toBeInTheDocument()

    const collaborators = screen.getByText('Collaborators')
    expect(
      collaborators.compareDocumentPosition(actionGroups[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('wires commercial record refresh callbacks into nearby project sections', async () => {
    routeState.location = { state: { project: currentProject } }
    routeState.params = { id: '12', type: 'equipment-supply', name: 'project-alpha' }

    render(<ManageProjectPage />)

    await waitFor(() => expect(childProps.commercial).toBeTruthy())
    expect(childProps.commercial.onCommercialRecordsChanged).toEqual(expect.any(Function))
    expect(childProps.commercial.onProgressUpdate).toEqual(expect.any(Function))
    expect(childProps.commercial.onVendorAssignmentsChanged).toEqual(expect.any(Function))
    expect(childProps.vendor.refreshKey).toBe(0)

    act(() => {
      childProps.commercial.onVendorAssignmentsChanged()
    })

    await waitFor(() => expect(childProps.vendor.refreshKey).toBe(1))
  })
})
