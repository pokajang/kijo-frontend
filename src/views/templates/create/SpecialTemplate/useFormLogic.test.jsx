import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import dialog from '../../../../components/dialog/dialogService'
import useFormLogic from './useFormLogic'

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('../../shared/templateApi', () => ({
  createTemplate: vi.fn(),
  getTemplate: vi.fn(),
  isAbortError: vi.fn(() => false),
  updateTemplate: vi.fn(),
}))

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>

describe('SpecialTemplate useFormLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('does not discard selected files when a proposal-mode switch is cancelled', async () => {
    dialog.confirm.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })
    const file = new File(['proposal'], 'proposal.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.handleNewFileChange({ target: { files: [file], value: 'proposal.pdf' } })
    })
    expect(result.current.newAttachments).toHaveLength(1)

    await act(async () => {
      await result.current.handleInputChange({
        target: { name: 'proposalMode', value: 'write' },
      })
    })

    expect(dialog.confirm).toHaveBeenCalledTimes(1)
    expect(result.current.template.proposalMode).toBe('upload')
    expect(result.current.newAttachments).toHaveLength(1)
  })

  it('clears selected files only after confirming the mode switch', async () => {
    dialog.confirm.mockResolvedValueOnce(true)
    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })
    const file = new File(['proposal'], 'proposal.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.handleNewFileChange({ target: { files: [file], value: 'proposal.pdf' } })
    })

    await act(async () => {
      await result.current.handleInputChange({
        target: { name: 'proposalMode', value: 'write' },
      })
    })

    expect(result.current.template.proposalMode).toBe('write')
    expect(result.current.newAttachments).toHaveLength(0)
  })
})
