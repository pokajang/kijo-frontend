import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFeedback, postFeedbackComment, verifyFeedback } from './actionHandlers'

const response = (payload) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(payload),
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('feedback workflow action handlers', () => {
  it('loads feedback directly by id', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ status: 'success', feedback: { id: 9 } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchFeedback(9)).resolves.toMatchObject({ feedback: { id: 9 } })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('feedback/9'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('posts comments and reporter verification decisions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: 'success' }))
    vi.stubGlobal('fetch', fetchMock)

    await postFeedbackComment(9, 'Still occurs')
    await verifyFeedback(9, 'reject', 'Still occurs')

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ message: 'Still occurs' }),
    })
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ decision: 'reject', message: 'Still occurs' }),
    })
  })
})
