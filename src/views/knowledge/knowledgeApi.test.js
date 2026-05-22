import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  archiveKnowledgeArticle,
  getKnowledgeArticle,
  getKnowledgeArticles,
  getMyKnowledgeArticles,
  publishKnowledgeArticle,
  saveKnowledgeArticle,
  unpublishKnowledgeArticle,
} from './knowledgeApi'

const mockJsonResponse = ({ ok = true, status = 200, body = { status: 'success' } } = {}) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Bad Request',
  json: vi.fn().mockResolvedValue(body),
})

describe('knowledgeApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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
      { credentials: 'include', signal: undefined },
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
