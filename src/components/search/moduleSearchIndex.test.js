import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getModuleSearchResults,
  getRecentModuleSearchItems,
  recordModuleSearchSelection,
  searchModuleItems,
} from './moduleSearchIndex'

const recentStorageKey = 'kijo:module-search:recent:v1'
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

  it('finds vendor payment records for vendor payment intent', () => {
    const results = searchModuleItems('vendor payment', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Payment Records',
      group: 'Vendors',
      to: '/vendor/payment-records',
    })
  })

  it('finds vendor payment records for supplier payment intent', () => {
    const results = searchModuleItems('supplier payment', ['Staff'])

    expect(results[0]).toMatchObject({
      label: 'Payment Records',
      group: 'Vendors',
      to: '/vendor/payment-records',
    })
  })

  it('finds vendor payment records and suggests a correction for vendor typo', () => {
    const result = getModuleSearchResults('venodr payment', ['Staff'])

    expect(result.results[0]).toMatchObject({
      label: 'Payment Records',
      group: 'Vendors',
      to: '/vendor/payment-records',
    })
    expect(result.suggestion?.correctedQuery).toBe('vendor payment')
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

  it('hides leave entitlement workflow actions from managers without backend permission', () => {
    const managerLabels = searchModuleItems('leave workflow', ['Manager']).map((item) => item.label)
    const hrLabels = searchModuleItems('leave workflow', ['HR']).map((item) => item.label)

    expect(managerLabels).not.toContain('Leave Workflow')
    expect(hrLabels).toContain('Leave Workflow')
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
