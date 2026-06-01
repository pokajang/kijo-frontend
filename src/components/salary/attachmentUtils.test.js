import { afterEach, describe, expect, it, vi } from 'vitest'
import { maxSalaryAttachmentBytes, prepareSalaryAttachment } from './attachmentUtils'

describe('attachmentUtils', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts PDF attachments without compression', async () => {
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })

    const attachment = await prepareSalaryAttachment(file)

    expect(attachment).toEqual(
      expect.objectContaining({
        file,
        name: 'receipt.pdf',
        type: 'application/pdf',
        originalName: 'receipt.pdf',
        originalSize: file.size,
        compressed: false,
      }),
    )
    expect(attachment.dataUrl).toContain('data:application/pdf')
  })

  it('rejects unsupported attachment types', async () => {
    await expect(
      prepareSalaryAttachment(new File(['text'], 'receipt.txt', { type: 'text/plain' })),
    ).rejects.toThrow('Upload a PDF, JPG, JPEG, or PNG file.')
  })

  it('compresses oversized image attachments and returns compressed metadata', async () => {
    const originalCreateObjectUrl = URL.createObjectURL
    const originalRevokeObjectUrl = URL.revokeObjectURL
    const originalImage = global.Image
    const originalCreateElement = document.createElement.bind(document)

    URL.createObjectURL = vi.fn(() => 'blob:salary-image')
    URL.revokeObjectURL = vi.fn()
    global.Image = class {
      constructor() {
        this.width = 3200
        this.height = 2400
      }

      set src(_value) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName !== 'canvas') return originalCreateElement(tagName)

      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: vi.fn(),
        }),
        toBlob: (callback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }))
        },
      }
    })

    try {
      const file = new File([new Uint8Array(maxSalaryAttachmentBytes + 1)], 'receipt.png', {
        type: 'image/png',
      })

      const attachment = await prepareSalaryAttachment(file)

      expect(attachment).toEqual(
        expect.objectContaining({
          name: 'receipt.jpg',
          type: 'image/jpeg',
          originalName: 'receipt.png',
          originalSize: file.size,
          compressed: true,
        }),
      )
      expect(attachment.size).toBeLessThan(file.size)
      expect(attachment.dataUrl).toContain('data:image/jpeg')
    } finally {
      URL.createObjectURL = originalCreateObjectUrl
      URL.revokeObjectURL = originalRevokeObjectUrl
      global.Image = originalImage
    }
  })
})
