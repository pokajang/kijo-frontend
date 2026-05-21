import { describe, expect, it, vi } from 'vitest'
import { apiJson } from '../../../../api/apiClient'
import { sendRecordEmailDraft } from './recordEmail'

vi.mock('../../../../api/apiClient', () => ({
  apiJson: vi.fn(),
}))

describe('sendRecordEmailDraft', () => {
  it('sends quotation email through the shared API client', async () => {
    apiJson.mockResolvedValueOnce({
      status: 'success',
      message: 'Quotation email sent successfully.',
    })

    const payload = await sendRecordEmailDraft(
      {
        id: 42,
        serviceTab: 'training-tab',
        quotationId: 'Q-42',
        clientDetails: { email: 'client@example.test' },
      },
      {
        subject: 'Custom subject',
        body: 'Custom body',
      },
    )

    expect(payload.status).toBe('success')
    expect(apiJson).toHaveBeenCalledWith(
      expect.stringMatching(/quote-records\/training\/42\/email$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          subject: 'Custom subject',
          body: 'Custom body',
        }),
      }),
    )
  })
})
