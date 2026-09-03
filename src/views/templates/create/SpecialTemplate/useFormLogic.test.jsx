import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import dialog from '../../../../components/dialog/dialogService'
import { createTemplateDraftRecord } from '../../shared/templateDrafts'
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

const selectMode = async (result, value) => {
  await act(async () => {
    await result.current.handleInputChange({ target: { name: 'proposalMode', value } })
  })
}

describe('SpecialTemplate useFormLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('defaults new templates to writing the full proposal', () => {
    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })

    expect(result.current.template.proposalMode).toBe('write')
  })

  it('retains a valid upload-mode draft', async () => {
    window.localStorage.setItem(
      'specialProposalDraft',
      JSON.stringify(
        createTemplateDraftRecord('special', {
          template: {
            proposalMode: 'upload',
            serviceTitle: 'Draft service',
            serviceSummary: '<p>Legacy &amp; note</p><p>Second line</p>',
          },
          remarks: 'Draft note',
        }),
      ),
    )

    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })

    await waitFor(() => expect(result.current.draftRestored).toBe(true))
    expect(result.current.template.proposalMode).toBe('upload')
    expect(result.current.template.serviceSummary).toBe('Legacy & note\nSecond line')
  })

  it('defaults a draft with an invalid mode to writing the full proposal', async () => {
    window.localStorage.setItem(
      'specialProposalDraft',
      JSON.stringify(
        createTemplateDraftRecord('special', {
          template: { proposalMode: 'legacy', serviceTitle: 'Draft service' },
          remarks: 'Draft note',
        }),
      ),
    )

    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })

    await waitFor(() => expect(result.current.draftRestored).toBe(true))
    expect(result.current.template.proposalMode).toBe('write')
  })

  it('does not discard selected files when a proposal-mode switch is cancelled', async () => {
    dialog.confirm.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })
    const file = new File(['proposal'], 'proposal.pdf', { type: 'application/pdf' })

    await selectMode(result, 'upload')
    act(() => {
      result.current.handleNewFileChange({ target: { files: [file], value: 'proposal.pdf' } })
    })

    await selectMode(result, 'write')

    expect(dialog.confirm).toHaveBeenCalledTimes(1)
    expect(result.current.template.proposalMode).toBe('upload')
    expect(result.current.newAttachments).toHaveLength(1)
  })

  it('keeps selected files recoverable after confirming a switch to write mode', async () => {
    dialog.confirm.mockResolvedValueOnce(true)
    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })
    const file = new File(['proposal'], 'proposal.pdf', { type: 'application/pdf' })

    await selectMode(result, 'upload')
    act(() => {
      result.current.handleNewFileChange({ target: { files: [file], value: 'proposal.pdf' } })
    })

    await selectMode(result, 'write')

    expect(result.current.template.proposalMode).toBe('write')
    expect(result.current.newAttachments).toHaveLength(1)

    await selectMode(result, 'upload')
    expect(result.current.newAttachments).toHaveLength(1)
  })

  it('protects written proposal content when switching to upload mode', async () => {
    dialog.confirm.mockResolvedValueOnce(false)
    const { result } = renderHook(() => useFormLogic({ isEdit: false, editId: null }), { wrapper })

    act(() => {
      result.current.handleEditorChange('<p>Customer proposal</p>', 'proposalContent')
    })
    await selectMode(result, 'upload')

    expect(dialog.confirm).toHaveBeenCalledWith(
      'Switch to Upload a completed proposal PDF? When you save, the written proposal content will be removed and the uploaded PDF will become the customer-facing proposal.',
    )
    expect(result.current.template.proposalMode).toBe('write')
    expect(result.current.template.proposalContent).toBe('<p>Customer proposal</p>')
  })
})
