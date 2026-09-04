import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getModuleSearchResults,
  getQuickCreateModuleItems,
  getRecentModuleSearchItems,
  moduleSearchItems,
  recordModuleSearchSelection,
  searchModuleItems,
} from './moduleSearchIndex'
import {
  accountModuleTabs,
  administrationModuleTabs,
  catalogModuleTabs,
  clientModuleTabs,
  commercialModuleTabs,
  dashboardModuleTabs,
  financialModuleTabs,
  pipelineCrmModuleTabs,
  salarySelfModuleTabs,
  staffModuleTabs,
  supportModuleTabs,
  vendorModuleTabs,
  workflowModuleTabs,
} from '../navigation/moduleNavConfigs'

const recentStorageKey = 'kijo:module-search:recent:v1'
const indexedModuleTabs = [
  ...accountModuleTabs,
  ...administrationModuleTabs,
  ...catalogModuleTabs,
  ...clientModuleTabs,
  ...commercialModuleTabs,
  ...dashboardModuleTabs,
  ...financialModuleTabs,
  ...pipelineCrmModuleTabs,
  ...salarySelfModuleTabs,
  ...staffModuleTabs,
  ...supportModuleTabs,
  ...vendorModuleTabs,
  ...workflowModuleTabs,
]

const installLocalStorageMock = () => {
  const store = new Map()
  const storage = {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  }

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  })
}

describe('module search index', () => {
  it('exposes ordered, role-filtered quick-create actions', () => {
    expect(getQuickCreateModuleItems(['Staff'])).toMatchObject([
      { label: 'Create Quote', to: '/crm/quotes' },
      { label: 'Create Task', to: '/task-manager?action=create' },
    ])
  })

  beforeEach(() => {
    installLocalStorageMock()
  })

  afterEach(() => {
    window.localStorage.removeItem(recentStorageKey)
  })

  it('finds staff leave records for leave intent', () => {
    const results = searchModuleItems('leave', ['HR'])

    expect(results[0]).toMatchObject({
      label: 'Leave Records',
      group: 'Staff Management',
      to: '/staff/leaves',
    })
  })

  it('finds leave destinations for mc intent without fuzzy matching the short acronym', () => {
    const labels = searchModuleItems('mc', ['HR']).map((item) => item.label)

    expect(labels).toContain('Leave Records')
    expect(labels).toContain('My Leaves')
  })

  it('finds quotations for quote intent', () => {
    const labels = searchModuleItems('quote', ['Staff']).map((item) => item.label)

    expect(labels).toContain('Quotations')
  })

  it('finds quotations and suggests a correction for quote typo', () => {
    const result = getModuleSearchResults('qoute', ['Staff'])

    expect(result.results[0]).toMatchObject({ label: 'Quotations' })
    expect(result.suggestion).toMatchObject({
      query: 'qoute',
      correctedQuery: 'quote',
      reason: 'typo',
    })
  })

  it('opens payment queue for vendor payment intent', () => {
    const results = searchModuleItems('vendor payment', ['Staff'])

    expect(results[0]).toMatchObject({
      to: '/vendor/payment-records',
    })
  })

  it('opens payment queue for supplier payment intent', () => {
    const results = searchModuleItems('supplier payment', ['Staff'])

    expect(results[0]).toMatchObject({
      to: '/vendor/payment-records',
    })
  })

  it('opens payment queue and suggests a correction for vendor typo', () => {
    const result = getModuleSearchResults('venodr payment', ['Staff'])

    expect(result.results[0]).toMatchObject({
      to: '/vendor/payment-records',
    })
    expect(result.suggestion?.correctedQuery).toBe('vendor payment')
  })

  it('opens vendor ledger for ledger intent', () => {
    const results = searchModuleItems('vendor ledger', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Vendor Ledger',
      to: '/vendor/paid',
    })
  })

  it('finds frozen vendors for inactive vendor intent', () => {
    const results = searchModuleItems('inactive vendor', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Frozen Vendors',
      group: 'Vendors',
      to: '/vendor/frozen',
    })
  })

  it('finds commercial invoice for invoice intent', () => {
    const results = searchModuleItems('invoice', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Invoice',
      group: 'Commercial',
      to: '/commercial/invoice',
    })
  })

  it('finds invoice and suggests a correction for invoice typo', () => {
    const result = getModuleSearchResults('invioce', ['Staff'])

    expect(result.results[0]).toMatchObject({
      label: 'Invoice',
      group: 'Commercial',
    })
    expect(result.suggestion?.correctedQuery).toBe('invoice')
  })

  it('finds manual debtor creation from debtor form intent', () => {
    const results = searchModuleItems('invoice not in system', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Create Manual Debtor',
      group: 'Commercial',
      to: '/commercial/debtors/create',
    })
  })

  it('finds meetings for mom intent', () => {
    const results = searchModuleItems('mom', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Meetings',
      group: 'Administration',
      to: '/administration/meetings',
    })
  })

  it('finds procedures and suggests a correction for procedure typo', () => {
    const result = getModuleSearchResults('proceduer', ['Staff'])

    expect(result.results[0]).toMatchObject({
      label: 'Procedures',
      group: 'Administration',
      to: '/administration/procedures',
    })
    expect(result.suggestion?.correctedQuery).toBe('procedure')
  })

  it('finds meeting minute creation from meeting form fields', () => {
    const results = searchModuleItems('guest attendees', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Add Meeting Minute',
      group: 'Administration',
      to: '/administration/meetings/add',
    })
  })

  it('finds bulk pipeline entries from bulk-add intent', () => {
    const results = searchModuleItems('estimated rm', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Bulk Add Pipeline Entries',
      group: 'Pipeline CRM',
      to: '/pipeline/entries/bulk-add',
    })
  })

  it('finds service-specific quote actions from form fields', () => {
    expect(searchModuleItems('training topic', ['Staff'])[0]).toMatchObject({
      label: 'Create Training Quote',
      to: '/crm/quotes?service=training',
    })
    expect(searchModuleItems('sample count', ['Staff'])[0]).toMatchObject({
      label: 'Create Industrial Hygiene Quote',
      to: '/crm/quotes?service=ih',
    })
    expect(searchModuleItems('duration months', ['Staff'])[0]).toMatchObject({
      label: 'Create Manpower Quote',
      to: '/crm/quotes?service=manpower',
    })
    expect(searchModuleItems('delivery charge', ['Staff'])[0]).toMatchObject({
      label: 'Create Equipment Quote',
      to: '/crm/quotes?service=equipment',
    })
  })

  it('finds typed proposal template creation from template fields', () => {
    expect(searchModuleItems('tentative program', ['Staff'])[0]).toMatchObject({
      label: 'Create Training Template',
      to: '/templates/create?type=training',
    })
    expect(searchModuleItems('chra template', ['Staff'])[0]).toMatchObject({
      label: 'Create IH Template',
      to: '/templates/create?type=ih',
    })
    expect(searchModuleItems('supplied manpower deliverables', ['Staff'])[0]).toMatchObject({
      label: 'Create Manpower Template',
      to: '/templates/create?type=manpower',
    })
  })

  it('finds staff creation from employee form fields for allowed roles', () => {
    const results = searchModuleItems('emergency contact', ['HR'])

    expect(results[0]).toMatchObject({
      label: 'Create Staff',
      group: 'Staff Management',
      to: '/staff/create',
    })
  })

  it('finds KPI sub-actions from KPI form fields', () => {
    expect(searchModuleItems('monthly remarks', ['Staff'])[0]).toMatchObject({
      to: '/my/kpi/update',
    })
    expect(searchModuleItems('weightage', ['Staff'])[0]).toMatchObject({
      to: '/my/kpi/parameters',
    })
  })

  it('finds handbook and system admin submodules for allowed roles', () => {
    expect(searchModuleItems('handbook signatures', ['HR'])[0]).toMatchObject({
      label: 'Handbook Signatures',
      to: '/handbook/signatures',
    })
    expect(searchModuleItems('mail diagnostics', ['System Admin'])[0]).toMatchObject({
      label: 'Email Test',
      to: '/system-admin/dashboard',
    })
  })

  it('indexes all route-backed shared module tab configs', () => {
    const indexedRoutes = new Set(moduleSearchItems.map((item) => item.to))
    const routeBackedTabs = indexedModuleTabs.filter((tab) => typeof tab.to === 'string')

    routeBackedTabs.forEach((tab) => {
      expect(indexedRoutes).toContain(tab.to)
    })
  })

  it('finds dashboard sections from shared dashboard tabs', () => {
    expect(searchModuleItems('Sales Tracking', ['Staff'])[0]).toMatchObject({
      label: 'Sales Tracking',
      group: 'Dashboard',
      to: '/dashboard/sales',
    })
    expect(searchModuleItems('CRM Tracking', ['Staff'])[0]).toMatchObject({
      label: 'CRM Tracking',
      group: 'Dashboard',
      to: '/dashboard/crm',
    })
    expect(searchModuleItems('Financial Tracking', ['Staff'])[0]).toMatchObject({
      label: 'Financial Tracking',
      group: 'Dashboard',
      to: '/dashboard/financial',
    })
    expect(searchModuleItems('Pipeline Monitoring', ['Staff'])[0]).toMatchObject({
      label: 'Pipeline Monitoring',
      group: 'Dashboard',
      to: '/dashboard/monitoring',
    })
    expect(searchModuleItems('Workload Tracking', ['Staff'])[0]).toMatchObject({
      label: 'Workload Tracking',
      group: 'Dashboard',
      to: '/dashboard/workload',
    })
  })

  it('finds account workspace tabs', () => {
    expect(searchModuleItems('my profile', ['Staff'])[0]).toMatchObject({
      label: 'Profile',
      group: 'My Account',
      to: '/my/profile',
    })
    expect(searchModuleItems('my signature', ['Staff'])[0]).toMatchObject({
      label: 'Signature',
      group: 'My Account',
      to: '/my/signature',
    })
    expect(searchModuleItems('change password', ['Staff'])[0]).toMatchObject({
      label: 'Password',
      group: 'My Account',
      to: '/my/password',
    })
  })

  it('finds salary and other claim self-service destinations', () => {
    const labels = searchModuleItems('my salary', ['Staff'], 20).map((item) => item.label)

    expect(labels).toContain('Salary')
    expect(labels).toContain('Other Claims')
    expect(labels).not.toContain('My Payments')
    expect(labels).not.toContain('Apply Salary')
    expect(labels).not.toContain('Apply Other Claim')
  })

  it('finds financial operation tabs for allowed roles', () => {
    const managerLabels = searchModuleItems('financial', ['Manager'], 20).map((item) => item.label)
    const financeLabels = searchModuleItems('financial', ['Finance'], 20).map((item) => item.label)

    expect(managerLabels).not.toContain('Payment Queue')
    expect(managerLabels).toContain('Review Salary')
    expect(managerLabels).toContain('Review Claims')
    expect(managerLabels).toContain('Balance Sheet')
    expect(financeLabels).toContain('Payment Queue')
  })

  it('finds workflow setup tabs for workflow-capable roles', () => {
    const labels = searchModuleItems('workflow setup', ['Manager'], 20).map((item) => item.label)

    expect(labels).toContain('Salary')
    expect(labels).toContain('Vendor Payment')
    expect(labels).toContain('Leave Application')
    expect(labels).toContain('Negotiation')
  })

  it('finds explicit action and standalone coverage gaps', () => {
    expect(searchModuleItems('learn kijo', ['Staff'])[0]).toMatchObject({
      label: 'Knowledge Hub',
      to: '/knowledge',
    })
    expect(searchModuleItems('create knowledge article', ['Staff'])[0]).toMatchObject({
      label: 'Create Knowledge Article',
      to: '/knowledge/create',
    })
    expect(searchModuleItems('pay vendor', ['Staff'])[0]).toMatchObject({
      label: 'Pay Vendor',
      to: '/vendor/pay',
    })
    expect(searchModuleItems('choose legal assessment template', ['Staff'])[0]).toMatchObject({
      label: 'Choose Legal Compliance Template',
      to: '/internal-tools/legal-compliance/select-template',
    })
  })

  it('shows system admin dashboard sections only to system admins', () => {
    const staffLabels = searchModuleItems('ai assistant governance', ['Staff'], 20).map(
      (item) => item.label,
    )
    const adminLabels = searchModuleItems('ai assistant governance', ['System Admin'], 20).map(
      (item) => item.label,
    )
    const monthlyReportLabels = searchModuleItems('monthly report test', ['System Admin'], 20).map(
      (item) => item.label,
    )
    const workloadLabels = searchModuleItems('ai workload governance', ['System Admin'], 20).map(
      (item) => item.label,
    )

    expect(staffLabels).not.toContain('AI Assistant Governance')
    expect(adminLabels).toContain('AI Assistant Governance')
    expect(monthlyReportLabels).toContain('Monthly Report Test')
    expect(workloadLabels).toContain('AI Workload Governance')
  })

  it('does not typo-correct short acronyms into unrelated modules', () => {
    const result = getModuleSearchResults('po', ['Staff'])

    expect(result.suggestion).toBeNull()
  })

  it('hides role-restricted staff and system admin results from regular users', () => {
    const staffLabels = searchModuleItems('staff', ['Staff']).map((item) => item.label)
    const systemAdminLabels = searchModuleItems('system admin', ['Staff']).map((item) => item.label)

    expect(staffLabels).not.toContain('Staff Management')
    expect(staffLabels).not.toContain('Manage Staff')
    expect(systemAdminLabels).not.toContain('System Admin')
  })

  it('hides system admin actions from regular users', () => {
    const labels = searchModuleItems('create system update', ['Staff']).map((item) => item.label)

    expect(labels).not.toContain('Create System Update')
  })

  it('shows centralized leave workflow to workflow-capable roles', () => {
    const managerLabels = searchModuleItems('leave workflow', ['Manager']).map((item) => item.label)
    const hrLabels = searchModuleItems('leave workflow', ['HR']).map((item) => item.label)

    expect(managerLabels).toContain('Leave Workflow')
    expect(hrLabels).toContain('Leave Workflow')
  })

  it('hides vendor workflow settings from regular users', () => {
    const staffLabels = searchModuleItems('vendor workflow', ['Staff']).map((item) => item.label)
    const managerLabels = searchModuleItems('vendor workflow', ['Manager']).map(
      (item) => item.label,
    )

    expect(staffLabels).not.toContain('Workflow Settings')
    expect(managerLabels).toContain('Workflow Settings')
  })

  it('records and returns recent accessible selections', () => {
    const invoice = searchModuleItems('invoice', ['Staff'])[0]

    recordModuleSearchSelection(invoice.id)

    expect(getRecentModuleSearchItems(['Staff'])[0]).toMatchObject({
      label: 'Invoice',
      group: 'Commercial',
    })
  })

  it('filters role-restricted recent selections by current roles', () => {
    const leaveRecords = searchModuleItems('leave', ['HR'])[0]

    recordModuleSearchSelection(leaveRecords.id)

    expect(getRecentModuleSearchItems(['Staff']).map((item) => item.label)).not.toContain(
      'Leave Records',
    )
  })
})
