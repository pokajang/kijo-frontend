import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeCollaborators,
  normalizeProjectFinance,
  normalizeProjectDetails,
  normalizeProjectList,
  normalizeProjectProgress,
  normalizeProjectVendors,
  normalizeStaffList,
  deleteProjectExpense,
  requestJson,
  toFiniteNumber,
  updateProjectDetails,
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

  it('includes project_id when updating project details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success' }),
    })

    await updateProjectDetails({ id: 158, project_name: 'A' })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projects/158'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"project_id":158'),
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
})
