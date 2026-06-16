import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeCollaborators,
  normalizeProjectFinance,
  normalizeProjectDetails,
  normalizeProjectList,
  normalizeProjectProgress,
  normalizeProjectVendors,
  listActiveProjectOptions,
  normalizeStaffList,
  closeProject,
  deleteCommercialDeliveryOrder,
  deleteCommercialInvoice,
  deleteCommercialJd14,
  deleteCommercialSupplierPo,
  deleteCommercialVendorLoa,
  deleteProject,
  deleteProjectExpense,
  getProjectLoaUrl,
  getCurrentProjectValue,
  getProjectVariationValue,
  listProjects,
  previewProjectValueImpact,
  requestJson,
  toFiniteNumber,
  updateProjectDetails,
  updateProjectCurrentValue,
} from '../projectApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('projectApi normalizers', () => {
  it('accepts raw and wrapped project lists', () => {
    const projects = [{ id: 1, project_name: 'A' }]

    expect(normalizeProjectList(projects)).toEqual(projects)
    expect(normalizeProjectList({ data: projects })).toEqual(projects)
    expect(normalizeProjectList({ projects })).toEqual(projects)
    expect(normalizeProjectList(null)).toEqual([])
  })

  it('normalizes detail support lists from legacy and Laravel shapes', () => {
    const rows = [{ id: 1 }]

    expect(normalizeProjectVendors({ vendors: rows })).toEqual(rows)
    expect(normalizeProjectProgress({ status: 'success', data: rows })).toEqual(rows)
    expect(normalizeCollaborators({ collaborators: rows })).toEqual(rows)
    expect(normalizeStaffList({ data: { data: rows } })).toEqual(rows)
  })

  it('normalizes missing project details to null', () => {
    expect(normalizeProjectDetails({ status: 'success', data: null })).toBeNull()
  })

  it('normalizes finance payloads with empty fallbacks', () => {
    expect(normalizeProjectFinance({ history: [{ id: 1 }], expenses: [{ id: 2 }] })).toEqual({
      history: [{ id: 1 }],
      expenses: [{ id: 2 }],
    })

    expect(normalizeProjectFinance({})).toEqual({ history: [], expenses: [] })
  })

  it('returns numeric fallbacks instead of NaN', () => {
    expect(toFiniteNumber('10.50')).toBe(10.5)
    expect(toFiniteNumber('not-a-number')).toBe(0)
    expect(toFiniteNumber('', 99)).toBe(0)
    expect(toFiniteNumber(undefined, 99)).toBe(99)
  })

  it('resolves current project values with awarded fallback', () => {
    expect(getCurrentProjectValue({ quote_value: 1000 })).toBe(1000)
    expect(getCurrentProjectValue({ quote_value: 1000, current_project_value: 1250 })).toBe(1250)
    expect(getCurrentProjectValue({ quote_value: 1000, resolved_project_value: 1100 })).toBe(1100)
    expect(getProjectVariationValue({ quote_value: 1000, current_project_value: 1250 })).toBe(250)
    expect(getProjectVariationValue({ quote_value: 1000 })).toBe(0)
  })

  it('sends project API requests with credentials by default', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await requestJson('projects')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('includes project_id and strips value fields when updating project details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await updateProjectDetails({
      id: 158,
      project_name: 'A',
      quote_value: 1000,
      current_project_value: 1250,
      resolved_project_value: 1250,
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/158'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"project_id":158'),
      }),
    )
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body).toEqual({ id: 158, project_name: 'A', project_id: 158 })
  })

  it('updates current project value through the dedicated value route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await updateProjectCurrentValue(158, {
      current_project_value: 5000,
      reason: 'Approved variation',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/158/value'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          current_project_value: 5000,
          reason: 'Approved variation',
        }),
      }),
    )
  })

  it('previews project value commercial impact through the dedicated preview route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await previewProjectValueImpact(158, {
      current_project_value: 5000,
      reason: 'Approved variation',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/158/value/impact-preview'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          current_project_value: 5000,
          reason: 'Approved variation',
        }),
      }),
    )
  })

  it('deletes project expenses through the real project route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await deleteProjectExpense({ project_id: 158, expense_id: 7 })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/158/expenses/7'),
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ project_id: 158, expense_id: 7 }),
      }),
    )
  })

  it('deletes projects through the real project route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await deleteProject(158)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/158'),
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        body: JSON.stringify({ id: 158 }),
      }),
    )
  })

  it('closes projects through the real project route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    const payload = {
      project_id: 158,
      closeDate: '2026-05-29',
      closeType: 'Completed',
      reason: 'All deliverables accepted.',
      claims: true,
      vendors: true,
      services: true,
    }

    await closeProject(158, payload)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/158/close'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(payload),
      }),
    )
  })

  it('deletes commercial invoices through the invoice delete route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await deleteCommercialInvoice('INV-001')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('invoices'),
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        body: JSON.stringify({ invoice_ref_no: 'INV-001' }),
      }),
    )
  })

  it('deletes commercial delivery orders through the delivery order route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await deleteCommercialDeliveryOrder(77)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('delivery-orders/77'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('deletes JD14 records through the JD14 route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await deleteCommercialJd14(88)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('jd14-forms/88'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('deletes vendor LOAs through the project vendor assignment route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await deleteCommercialVendorLoa({ projectId: 12, assignmentId: 9 })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/12/vendors/9'),
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        body: JSON.stringify({ project_id: 12, assignment_id: 9 }),
      }),
    )
  })

  it('deletes supplier POs through the catalog purchase order route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await deleteCommercialSupplierPo(45)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('catalog/purchase-orders/45'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('builds project LOA URLs through the project API module', () => {
    expect(getProjectLoaUrl(158, { vendor_id: 7, assignment_id: 9 })).toContain(
      'projects/158/loa?project_id=158&vendor_id=7&assignment_id=9',
    )
  })

  it('loads active project options through the lightweight options route', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'success',
          data: [{ id: 100, projectName: 'Active Project', status: 'Active' }],
        }),
    })

    await expect(listActiveProjectOptions()).resolves.toEqual([
      { id: 100, projectName: 'Active Project', status: 'Active' },
    ])

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/options?status=active&scope=mine'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('loads unbounded project records for all-time periods', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: [{ id: 1, project_name: 'A' }] }),
    })

    await expect(
      listProjects({ periodRange: { preset: 'all', startDate: '', endDate: '' } }),
    ).resolves.toEqual([{ id: 1, project_name: 'A' }])

    expect(global.fetch.mock.calls[0][0]).toMatch(/projects$/)
  })

  it('defaults project records to the current year when no period is provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: [] }),
    })

    await listProjects()

    expect(global.fetch.mock.calls[0][0]).toContain(`projects?year=${new Date().getFullYear()}`)
  })

  it('loads project records once per covered year for cross-year periods', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: [] }),
    })

    await listProjects({
      periodRange: {
        preset: 'custom',
        startDate: '2025-12-01',
        endDate: '2026-01-31',
      },
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining('projects?year=2025'),
      expect.stringContaining('projects?year=2026'),
    ])
  })
})
