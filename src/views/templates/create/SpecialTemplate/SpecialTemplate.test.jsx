import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useFormLogic from './useFormLogic'
import SpecialTemplate from './SpecialTemplate'

vi.mock('./useFormLogic', () => ({ default: vi.fn() }))
vi.mock('../../components/EditorInput', () => ({
  default: ({ field }) => <div data-testid={`${field}-editor`} />,
}))
vi.mock('./UploadAttachment', () => ({
  default: () => <div data-testid="proposal-uploader" />,
}))
vi.mock('../../shared/specialCategoryApi', () => ({
  listSpecialCategories: vi.fn(() => Promise.resolve({ data: [] })),
}))
vi.mock('../../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { roles: [] } }),
}))
vi.mock('../../shared/templateFormUi', () => ({
  useTemplateDirtyState: () => false,
}))

afterEach(cleanup)

const buildFormLogic = (proposalMode) => ({
  template: {
    categoryId: '',
    proposalMode,
    serviceTitle: '',
    serviceCode: '',
    serviceSummary: '',
    proposalContent: '',
    defaultLineItems: [],
  },
  templateMeta: { proposalLanguage: 'en' },
  finalizingBmTranslation: false,
  existingAttachments: [],
  newAttachments: [],
  rejectedAttachments: [],
  remarks: '',
  setRemarks: vi.fn(),
  history: [],
  loading: false,
  loadError: '',
  saving: false,
  saveError: '',
  setSaveError: vi.fn(),
  validationErrors: {},
  setValidationErrors: vi.fn(),
  draftRestored: false,
  handleInputChange: vi.fn(),
  handleEditorChange: vi.fn(),
  handleAddDefaultLineItem: vi.fn(),
  handleDefaultLineItemChange: vi.fn(),
  handleRemoveDefaultLineItem: vi.fn(),
  handleNewFileChange: vi.fn(),
  handleRenameFile: vi.fn(),
  handleRemoveNewAttachment: vi.fn(),
  setRejectedAttachments: vi.fn(),
  removeExistingAttachment: vi.fn(),
  handleSave: vi.fn(),
  handleReset: vi.fn(),
  handleCancel: vi.fn(),
})

describe('SpecialTemplate proposal modes', () => {
  it('shows the full proposal editor and no upload controls in write mode', () => {
    useFormLogic.mockReturnValue(buildFormLogic('write'))

    render(<SpecialTemplate isEdit={false} />)

    expect(screen.getByRole('radio', { name: /write full proposal/i })).toBeChecked()
    expect(screen.getByTestId('proposalContent-editor')).toBeInTheDocument()
    expect(screen.queryByTestId('proposal-uploader')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/internal reference note/i)).not.toBeInTheDocument()
  })

  it('shows the completed PDF uploader before the short internal note in upload mode', () => {
    useFormLogic.mockReturnValue(buildFormLogic('upload'))

    render(<SpecialTemplate isEdit={false} />)

    const uploader = screen.getByTestId('proposal-uploader')
    const note = screen.getByLabelText(/internal reference note/i)
    expect(screen.getByRole('radio', { name: /upload a completed proposal pdf/i })).toBeChecked()
    expect(screen.queryByTestId('proposalContent-editor')).not.toBeInTheDocument()
    expect(uploader.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Completed proposal PDF')).toBeInTheDocument()
  })
})
