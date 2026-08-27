import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import dialog from '../../../components/dialog/dialogService'
import { downloadCommercialWord } from './commercialWordDownload'

vi.mock('../../../components/dialog/dialogService', () => ({ default: { alert: vi.fn() } }))

describe('downloadCommercialWord', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:docx'), revokeObjectURL: vi.fn() })
    vi.spyOn(document.body, 'appendChild')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('downloads a valid DOCX using the server filename', async () => {
    fetch.mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'content-disposition': "attachment; filename*=UTF-8''INV26-001.docx",
      }),
      blob: vi.fn().mockResolvedValue(new Blob(['docx'])),
    })

    await downloadCommercialWord('/invoices/1/word', 'invoice-1.docx')

    expect(fetch).toHaveBeenCalledWith('/invoices/1/word', {
      credentials: 'include',
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    })
    const link = HTMLAnchorElement.prototype.click.mock.instances[0]
    expect(link.download).toBe('INV26-001.docx')
    expect(dialog.alert).not.toHaveBeenCalled()
  })

  it('reports a JSON error without navigating or changing the record', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ message: 'Only paid invoices can generate a receipt.' }),
    })

    await downloadCommercialWord('/invoices/1/receipt-word', 'receipt-1.docx')

    expect(dialog.alert).toHaveBeenCalledWith(
      expect.stringContaining('Only paid invoices can generate a receipt.'),
    )
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled()
  })
})
