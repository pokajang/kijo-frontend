import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMock = vi.hoisted(() => ({
  apiJson: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiFetch: vi.fn(),
  apiJson: apiMock.apiJson,
}))

vi.mock('../../notifications/appNotificationEvents', () => ({
  dispatchAppNotificationsChanged: vi.fn(),
}))

import { saveOtherClaimDraft } from './otherClaimRecordStorage'

describe('saveOtherClaimDraft', () => {
  beforeEach(() => {
    apiMock.apiJson.mockReset()
    apiMock.apiJson.mockResolvedValue({
      record: {
        id: 42,
        claimMonthValue: '2026-07',
        status: 'Draft',
        claims: [],
      },
    })
  })

  it('uses multipart POST method override and excludes embedded attachment binary from JSON', async () => {
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })
    const attachment = {
      clientId: 'receipt-1',
      name: 'receipt.pdf',
      type: 'application/pdf',
      size: file.size,
      file,
      dataUrl: 'data:application/pdf;base64,cmVjZWlwdA==',
    }
    const persistedAttachment = {
      id: 99,
      clientId: 'stored-receipt',
      name: 'stored.pdf',
      url: '/files/stored',
      dataUrl: 'data:application/pdf;base64,c3RvcmVk',
    }

    await saveOtherClaimDraft({
      claimMonthValue: '2026-07',
      claims: [
        {
          id: 'expense-1',
          type: 'Expense',
          date: '2026-07-20',
          description: 'Parking',
          amount: 12,
          attachments: [attachment],
        },
      ],
      draftPayload: {
        formData: { claimMonth: '2026-07', expenseAttachment: attachment },
        expenseItems: [{ id: 'expense-1', attachments: [attachment] }],
        allowanceItems: [{ id: 'allowance-1', attachments: [persistedAttachment] }],
      },
    })

    expect(apiMock.apiJson).toHaveBeenCalledTimes(1)
    const [, options] = apiMock.apiJson.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('_method')).toBe('PUT')
    expect(options.body.get('claim_month')).toBe('2026-07')

    const storedDraft = JSON.parse(options.body.get('draft_payload'))
    expect(storedDraft.formData.expenseAttachment).toBeNull()
    expect(storedDraft.expenseItems[0].attachments).toEqual([])
    expect(storedDraft.allowanceItems[0].attachments[0]).toMatchObject({
      id: 99,
      name: 'stored.pdf',
      url: '/files/stored',
    })
    expect(storedDraft.allowanceItems[0].attachments[0].dataUrl).toBeUndefined()
    expect(options.body.get('attachments[expense-1][receipt-1]')).toBeInstanceOf(File)
  })
})
