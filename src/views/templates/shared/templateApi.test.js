import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  getTemplatePdfUrl,
  getTemplateWordUrl,
  listTemplates,
  updateTemplate,
} from './templateApi'

const jsonResponse = (payload, options = {}) =>
  new Response(JSON.stringify(payload), {
    status: options.status || 200,
    headers: { 'Content-Type': 'application/json' },
  })

describe('templateApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds PDF URLs', () => {
    expect(getTemplatePdfUrl('training', 12)).toContain('proposal-templates/training/12/pdf')
  })

  it('builds Word URLs', () => {
    expect(getTemplateWordUrl('training', 12)).toContain('proposal-templates/training/12/word')
    expect(getTemplateWordUrl('ih', 12)).toContain('proposal-templates/ih/12/word')
    expect(getTemplateWordUrl('manpower', 12)).toContain('proposal-templates/manpower/12/word')
    expect(getTemplateWordUrl('special', 12)).toContain('proposal-templates/special/12/word')
  })

  it('lists and gets templates with credentials', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))

    await listTemplates('ih')
    await getTemplate('ih', 9)

    expect(fetchMock.mock.calls[0][0]).toContain('proposal-templates/ih')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' })
    expect(fetchMock.mock.calls[1][0]).toContain('id=9')
    expect(fetchMock.mock.calls[1][0]).toContain('template_id=9')
  })

  it('loads every backend page for paginated list responses', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: 1 }], current_page: 1, last_page: 3 }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: 2 }], current_page: 2, last_page: 3 }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: 3 }], current_page: 3, last_page: 3 }))

    await expect(listTemplates('training')).resolves.toMatchObject({
      data: [{ id: 1 }, { id: 2 }, { id: 3 }],
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toContain('page=2')
    expect(fetchMock.mock.calls[2][0]).toContain('page=3')
  })

  it('loads every backend page when pagination metadata is nested', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: 1 }],
          pagination: { current_page: 1, last_page: 2, total: 2 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: 2 }],
          pagination: { current_page: 2, last_page: 2, total: 2 },
        }),
      )

    await expect(listTemplates('training', { language: 'ms-MY' })).resolves.toMatchObject({
      data: [{ id: 1 }, { id: 2 }],
      pagination: { current_page: 1, last_page: 1, total: 2 },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('language=ms-MY')
    expect(fetchMock.mock.calls[1][0]).toContain('page=2')
    expect(fetchMock.mock.calls[1][0]).toContain('language=ms-MY')
  })

  it('sends JSON payloads for create and update', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }))

    await createTemplate('training', { title: 'A' })
    await updateTemplate('training', 1, { title: 'B' })

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A' }),
    })
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'B' }),
    })
  })

  it('does not set JSON headers for FormData payloads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ status: 'success' }))
    const formData = new FormData()

    await updateTemplate('special', 1, formData)

    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].body).toBe(formData)
  })

  it('deletes templates and surfaces backend errors', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Nope' }, { status: 422 }))

    await deleteTemplate('manpower', 5)
    await expect(deleteTemplate('manpower', 6)).rejects.toThrow('Nope')

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
  })
})
