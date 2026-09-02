import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSpecialCategory,
  deleteSpecialCategory,
  listSpecialCategories,
  setSpecialCategoryStatus,
  updateSpecialCategory,
} from './specialCategoryApi'

const response = (payload = {}) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

describe('specialCategoryApi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses active and management category endpoints', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(response({ data: [] })))
    await listSpecialCategories()
    await listSpecialCategories({ manage: true })
    expect(fetchMock.mock.calls[0][0]).toContain('special-categories')
    expect(fetchMock.mock.calls[0][0]).not.toContain('/manage')
    expect(fetchMock.mock.calls[1][0]).toContain('special-categories/manage')
  })

  it('creates, renames, changes status, and deletes categories with credentials', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(response({ status: 'success' })))
    await createSpecialCategory({ name: 'Engineering' })
    await updateSpecialCategory(4, { name: 'Engineering Services' })
    await setSpecialCategoryStatus(4, false)
    await deleteSpecialCategory(4)
    expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual([
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ])
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ isActive: false })
    expect(fetchMock.mock.calls.every((call) => call[1].credentials === 'include')).toBe(true)
  })
})
