import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiJson } from '../../api/apiClient'
import {
  archiveKnowledgeArticle,
  askKnowledgeAssistant,
  clearKnowledgeAssistantThread,
  createKnowledgeAssistantThread,
  getKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeAssistantThread,
  getMyKnowledgeArticles,
  publishKnowledgeArticle,
  saveKnowledgeArticle,
  submitKnowledgeAssistantFeedback,
  unpublishKnowledgeArticle,
} from './knowledgeApi'

vi.mock('../../api/apiClient', () => ({
  apiJson: vi.fn(),
}))

const mockJsonResponse = ({ ok = true, status = 200, body = { status: 'success' } } = {}) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Bad Request',
  json: vi.fn().mockResolvedValue(body),
})

describe('knowledgeApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('loads the article list with session credentials', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(mockJsonResponse())

    await getKnowledgeArticles()

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('knowledge/articles'), {
      credentials: 'include',
      signal: undefined,
    })
  })

  it('loads the staff article workspace with session credentials', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(mockJsonResponse())

    await getMyKnowledgeArticles()

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('knowledge/articles/my'), {
      credentials: 'include',
      signal: undefined,
    })
  })

  it('loads article details by slug or id', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(mockJsonResponse())

    await getKnowledgeArticle({ slugOrId: 'how-to-apply-leave' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('knowledge/articles/how-to-apply-leave'),
      { credentials: 'include', silentError: true, signal: undefined },
    )
  })

  it('loads the assistant thread with session credentials', async () => {
    apiJson.mockResolvedValue({ status: 'success', messages: [] })

    await getKnowledgeAssistantThread()
    await getKnowledgeAssistantThread({ threadId: 7 })

    expect(apiJson).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('knowledge/assistant/thread'),
      {
        credentials: 'include',
        signal: undefined,
      },
    )
    expect(apiJson).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('knowledge/assistant/thread?thread_id=7'),
      {
        credentials: 'include',
        signal: undefined,
      },
    )
  })

  it('creates, asks, and clears the Knowledge assistant thread', async () => {
    apiJson.mockResolvedValue({ status: 'success', messages: [] })

    await createKnowledgeAssistantThread()
    await askKnowledgeAssistant({
      question: 'How do I create quotation?',
      currentRoute: '/crm',
      threadId: 8,
    })
    await clearKnowledgeAssistantThread({ threadId: 8 })

    expect(apiJson).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('knowledge/assistant/thread'),
      {
        method: 'POST',
        credentials: 'include',
        signal: undefined,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    expect(apiJson).toHaveBeenNthCalledWith(2, expect.stringContaining('knowledge/assistant'), {
      method: 'POST',
      credentials: 'include',
      signal: undefined,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'How do I create quotation?',
        current_route: '/crm',
        thread_id: 8,
      }),
    })
    expect(apiJson).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('knowledge/assistant/thread/8'),
      {
        method: 'DELETE',
        credentials: 'include',
        signal: undefined,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  })

  it('submits structured assistant feedback', async () => {
    apiJson.mockResolvedValue({ status: 'success' })

    await submitKnowledgeAssistantFeedback({
      messageId: 9,
      rating: 'bad',
      reasons: ['Wrong source'],
      note: 'Not enough detail.',
      currentRoute: '/crm/quotes',
    })

    expect(apiJson).toHaveBeenCalledWith(
      expect.stringContaining('knowledge/assistant/messages/9/feedback'),
      {
        method: 'POST',
        credentials: 'include',
        signal: undefined,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 'bad',
          reasons: ['Wrong source'],
          note: 'Not enough detail.',
          current_route: '/crm/quotes',
        }),
      },
    )
  })

  it('saves article form data through POST', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(mockJsonResponse())
    const payload = new FormData()

    await saveKnowledgeArticle({ articleId: 5, payload })

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('knowledge/articles/5'), {
      method: 'POST',
      credentials: 'include',
      body: payload,
    })
  })

  it('supports publish, unpublish, and archive actions with optional remarks', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(mockJsonResponse())

    await publishKnowledgeArticle(3, { edit_remarks: 'Ready for staff use.' })
    await unpublishKnowledgeArticle(3)
    await archiveKnowledgeArticle(3)

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/3/publish'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_remarks: 'Ready for staff use.' }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/3/unpublish'), {
      method: 'POST',
      credentials: 'include',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('knowledge/articles/3'), {
      method: 'DELETE',
      credentials: 'include',
    })
  })

  it('throws server messages for failed responses', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mockJsonResponse({
        ok: false,
        status: 422,
        body: { status: 'error', message: 'Title is required.' },
      }),
    )

    await expect(getKnowledgeArticles()).rejects.toThrow('Title is required.')
  })
})
