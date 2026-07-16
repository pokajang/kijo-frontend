import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getHandbookAcknowledgementStatus,
  getCurrentHandbook,
  getHandbookChangeLogs,
  getHandbookSignatures,
  getHandbookVersion,
  getHandbookVersions,
  discardHandbookDraft,
  publishHandbook,
  publishHandbookDraft,
  reactivateHandbookVersion,
  saveHandbookDraftSection,
  signHandbook,
} from '../api/handbookApi'

const mockResponse = ({ ok = true, status = 200, body = '' } = {}) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(body),
})

describe('handbookApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes successful signature responses', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true, message: 'Signed', data: [{ id: 1 }] }),
      }),
    )

    const result = await getHandbookSignatures()

    expect(result).toMatchObject({
      success: true,
      message: 'Signed',
      data: [{ id: 1 }],
      status: 200,
    })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('hr/handbook/signatures'), {
      credentials: 'include',
      signal: undefined,
    })
  })

  it('normalizes non-OK server responses', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        ok: false,
        status: 403,
        body: JSON.stringify({ success: false, message: 'Forbidden' }),
      }),
    )

    const result = await getHandbookSignatures()

    expect(result).toMatchObject({
      success: false,
      message: 'Forbidden',
      data: [],
      status: 403,
    })
  })

  it('handles invalid JSON responses', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse({ body: '<html>Oops</html>' }))

    const result = await getHandbookSignatures()

    expect(result).toMatchObject({
      success: false,
      message: 'Invalid server response.',
      data: [],
      status: 200,
    })
  })

  it('posts trimmed acknowledgement values as form data', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true, message: 'Signed' }),
      }),
    )

    await signHandbook({ fullName: 'Jane Doe', icNumber: '900101-01-1234', versionId: 12 })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')
    expect(options.body.get('full_name')).toBe('Jane Doe')
    expect(options.body.get('ic_number')).toBe('900101-01-1234')
    expect(options.body.get('handbook_version_id')).toBe('12')
  })

  it('loads the current handbook version', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({
          success: true,
          data: { id: 1, version_label: 'V2 - 2024-01-05', content: { chapters: [] } },
          can_manage: true,
        }),
      }),
    )

    const result = await getCurrentHandbook()

    expect(result.success).toBe(true)
    expect(result.can_manage).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('hr/handbook/current'), {
      credentials: 'include',
      signal: undefined,
    })
  })

  it('loads the current handbook acknowledgement status', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({
          success: true,
          data: { version_id: 12, version_label: 'REV02 - 2026-07', acknowledged: false },
        }),
      }),
    )

    const result = await getHandbookAcknowledgementStatus()

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ version_id: 12, acknowledged: false })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('hr/handbook/acknowledgement-status'),
      { credentials: 'include', signal: undefined },
    )
  })

  it('loads handbook change logs', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true, data: [{ id: 1, action: 'publish' }] }),
      }),
    )

    const result = await getHandbookChangeLogs()

    expect(result.data).toEqual([{ id: 1, action: 'publish' }])
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('hr/handbook/change-logs'), {
      credentials: 'include',
      signal: undefined,
    })
  })

  it('loads handbook versions and version detail', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true, data: [{ id: 2, version_label: 'V3' }] }),
      }),
    )

    await getHandbookVersions()
    await getHandbookVersion({ versionId: 2 })

    expect(fetchMock.mock.calls[0][0]).toContain('hr/handbook/versions')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      signal: undefined,
    })
    expect(fetchMock.mock.calls[1][0]).toContain('hr/handbook/versions/2')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      credentials: 'include',
      signal: undefined,
    })
  })

  it('reactivates a handbook version as JSON', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true, message: 'Reactivated' }),
      }),
    )

    await reactivateHandbookVersion({
      versionId: 2,
      changeSummary: 'Rollback to previous version.',
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('hr/handbook/versions/2/reactivate')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(options.body)).toEqual({
      change_summary: 'Rollback to previous version.',
    })
  })

  it('publishes handbook content as JSON', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true, message: 'Published' }),
      }),
    )

    await publishHandbook({
      content: {
        title: 'Handbook',
        chapters: [{ id: 'chapter-01', title: 'One', bodyHtml: '<p>A</p>' }],
      },
      changeSummary: 'Updated office hours.',
      sectionId: 'chapter-01',
      sectionTitle: '1.0 Test',
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(options.body)).toEqual({
      content: {
        title: 'Handbook',
        chapters: [{ id: 'chapter-01', title: 'One', bodyHtml: '<p>A</p>' }],
      },
      change_summary: 'Updated office hours.',
      section_id: 'chapter-01',
      section_title: '1.0 Test',
    })
  })

  it('saves handbook draft sections as JSON without publishing a version', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true, message: 'Saved to draft' }),
      }),
    )

    await saveHandbookDraftSection({
      baseHandbookVersionId: 12,
      changeSummary: 'Updated section draft.',
      sectionId: 'chapter-01',
      sectionTitle: '1.0 Test',
      bodyHtml: '<p>A</p>',
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('hr/handbook/draft-section')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toMatchObject({
      base_handbook_version_id: 12,
      change_summary: 'Updated section draft.',
      section_id: 'chapter-01',
      section_title: '1.0 Test',
      body_html: '<p>A</p>',
    })
  })

  it('publishes and discards handbook drafts through draft endpoints', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ success: true }),
      }),
    )

    await publishHandbookDraft({ changeSummary: 'Published draft.' })
    await discardHandbookDraft()

    expect(fetchMock.mock.calls[0][0]).toContain('hr/handbook/publish-draft')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      method: 'POST',
    })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      change_summary: 'Published draft.',
    })
    expect(fetchMock.mock.calls[1][0]).toContain('hr/handbook/draft')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      credentials: 'include',
      method: 'DELETE',
    })
  })
})
