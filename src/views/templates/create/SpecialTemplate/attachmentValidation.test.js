import { describe, expect, it } from 'vitest'
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  validateAttachmentCustomNames,
  validateNewAttachments,
} from './attachmentValidation'

const file = (name, type = 'application/pdf', size = 100) =>
  new File([new Uint8Array(size)], name, { type })

describe('attachmentValidation', () => {
  it('accepts supported files and rejects unsupported files', () => {
    const { accepted, rejected } = validateNewAttachments([
      file('proposal.pdf'),
      file('photo.jpg', 'image/jpeg'),
      file('diagram.png', 'image/png'),
      file('script.exe', 'application/x-msdownload'),
      file(
        'slides.pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ),
    ])

    expect(accepted).toHaveLength(1)
    expect(rejected).toEqual([
      { fileName: 'photo.jpg', reason: 'Unsupported file type.' },
      { fileName: 'diagram.png', reason: 'Unsupported file type.' },
      { fileName: 'script.exe', reason: 'Unsupported file type.' },
      { fileName: 'slides.pptx', reason: 'Unsupported file type.' },
    ])
  })

  it('rejects files when extension and MIME type do not match', () => {
    const { accepted, rejected } = validateNewAttachments([
      file('payload.pdf', 'application/x-msdownload'),
    ])

    expect(accepted).toHaveLength(0)
    expect(rejected).toEqual([{ fileName: 'payload.pdf', reason: 'Unsupported file type.' }])
  })

  it('rejects oversized and duplicate files', () => {
    const { rejected } = validateNewAttachments(
      [file('large.pdf', 'application/pdf', MAX_ATTACHMENT_SIZE_BYTES + 1), file('existing.pdf')],
      [{ fileName: 'existing.pdf' }],
    )

    expect(rejected.map((item) => item.reason)).toEqual([
      'File exceeds the 10 MB size limit.',
      'Duplicate file name.',
    ])
  })

  it('validates custom names', () => {
    expect(validateAttachmentCustomNames([{ customName: 'folder/name.pdf' }])).toEqual([
      { index: 0, message: 'Attachment name cannot contain path separators.' },
    ])
  })
})
