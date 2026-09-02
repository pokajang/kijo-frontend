import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SpecialCategoryManager from './SpecialCategoryManager'
import {
  createSpecialCategory,
  listSpecialCategories,
  updateSpecialCategory,
} from './specialCategoryApi'

vi.mock('./specialCategoryApi', () => ({
  createSpecialCategory: vi.fn(),
  deleteSpecialCategory: vi.fn(),
  listSpecialCategories: vi.fn(),
  setSpecialCategoryStatus: vi.fn(),
  updateSpecialCategory: vi.fn(),
}))

vi.mock('../../../components/dialog/dialogService', () => ({
  default: { confirm: vi.fn(() => Promise.resolve(true)) },
}))

const categories = [
  { id: 1, name: 'Special Service', isActive: true, isSystem: true, templateCount: 12 },
  { id: 2, name: 'Environment', isActive: true, isSystem: false, templateCount: 0 },
  { id: 3, name: 'Engineering', isActive: true, isSystem: false, templateCount: 2 },
  { id: 4, name: 'Legacy Service', isActive: false, isSystem: false, templateCount: 0 },
]

describe('SpecialCategoryManager', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    listSpecialCategories.mockResolvedValue({ data: categories })
    createSpecialCategory.mockResolvedValue({ status: 'success' })
    updateSpecialCategory.mockResolvedValue({ status: 'success' })
  })

  it('keeps management name-only and shows lifecycle actions in context', async () => {
    render(<SpecialCategoryManager visible onClose={vi.fn()} />)

    expect(await screen.findByText('Special Service')).toBeInTheDocument()
    expect(screen.getByLabelText('Category name')).toBeInTheDocument()
    expect(screen.queryByLabelText('Code')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Order')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Active')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Rename' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Deactivate' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Reactivate' })).toHaveLength(1)
  })

  it('creates and renames with only the category name', async () => {
    render(<SpecialCategoryManager visible onClose={vi.fn()} />)
    await screen.findByText('Environment')

    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: '  Technical Services  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }))
    await waitFor(() =>
      expect(createSpecialCategory).toHaveBeenCalledWith({ name: 'Technical Services' }),
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Rename' })[1])
    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: 'Environmental Services' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Rename' }))
    await waitFor(() =>
      expect(updateSpecialCategory).toHaveBeenCalledWith(2, { name: 'Environmental Services' }),
    )
  })
})
