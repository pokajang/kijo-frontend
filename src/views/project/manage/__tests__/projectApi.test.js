import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeCollaborators,
  normalizeProjectFinance,
  normalizeProjectList,
  normalizeProjectProgress,
  normalizeProjectVendors,
  normalizeStaffList,
  requestJson,
  toFiniteNumber,
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
})
