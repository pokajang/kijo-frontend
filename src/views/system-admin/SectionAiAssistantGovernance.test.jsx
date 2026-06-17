import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCsrfToken } from '../../api/apiClient'
import { systemAdminModuleTabs } from '../../components/navigation/moduleNavConfigs'
import SectionAiAssistantGovernance from './SectionAiAssistantGovernance'

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const overviewResponse = () =>
  jsonResponse({
    status: 'success',
    summary: {
      helpful_rate: 75,
      bad_rate: 25,
      low_confidence_rate: 10,
      no_source_rate: 5,
      static_cache_hits: 12,
      live_cache_hits: 8,
      blocked_signature_count: 2,
      input_tokens: 100,
      output_tokens: 50,
      ai_unavailable_count: 2,
      usage_limit_count: 1,
      rate_limit_count: 1,
      source_fallback_count: 3,
      ai_status_counts: {
        usage_limit: 1,
        rate_limit: 1,
        source_fallback: 3,
      },
      estimated_cost: { amount: 0.0012, currency: 'USD', known: true },
    },
  })

describe('SectionAiAssistantGovernance', () => {
  beforeEach(() => {
    setCsrfToken('csrf-test')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    setCsrfToken(null)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('is available from the System Admin navigation config', () => {
    expect(systemAdminModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'ai-assistant-governance',
          label: 'AI Assistant Governance',
        }),
      ]),
    )
  })

  it('renders overview tiles and feedback rows', async () => {
    window.fetch.mockResolvedValueOnce(overviewResponse()).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: [
          {
            id: 1,
            message_id: 91,
            rating: 'bad',
            blocked: true,
            question: 'How do I create quotation?',
            answer_excerpt: 'Use the quotation screen.',
            reasons: ['Wrong source'],
            confidence: 'low',
            answer_mode: 'static',
            created_at: '2026-05-30T03:00:00.000Z',
          },
        ],
      }),
    )

    render(<SectionAiAssistantGovernance />)

    expect(await screen.findByText('AI Assistant Governance')).toBeInTheDocument()
    expect(screen.getByText('Helpful Rate')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('AI Unavailable')).toBeInTheDocument()
    expect(screen.getByText('Usage Limits')).toBeInTheDocument()
    expect(screen.getByText('Source Fallbacks')).toBeInTheDocument()
    expect(screen.getByText('Usage limit: 1')).toBeInTheDocument()
    expect(screen.getByText('Rate limit: 1')).toBeInTheDocument()
    expect(screen.getByText('Source fallback: 3')).toBeInTheDocument()
    expect(screen.getByText('USD 0.0012')).toBeInTheDocument()
    expect(await screen.findByText('How do I create quotation?')).toBeInTheDocument()
    expect(screen.getByText('Wrong source')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('opens assistant diagnostics from a feedback row', async () => {
    window.fetch.mockImplementation((input) => {
      const url = String(input)
      if (url.includes('admin/assistant/analytics/overview')) {
        return Promise.resolve(overviewResponse())
      }
      if (url.includes('admin/assistant/messages/91/diagnostics')) {
        return Promise.resolve(
          jsonResponse({
            status: 'success',
            data: {
              message_id: 91,
              question: 'How do I create quotation?',
              current_route: '/crm/quotes',
              diagnostics: {
                retrieval_question: 'create quotation',
                ai_status: 'ok',
                planner: { domains: ['knowledge'] },
                providers: [{ provider_key: 'knowledge', status: 'ran' }],
                score_stages: {
                  after_intent_ranking: [
                    {
                      title: 'How to Create a Quotation',
                      source_type: 'knowledge',
                      score: 700,
                      score_explanations: ['quote_intent_tag_match +350'],
                    },
                  ],
                },
                suppressed_sources: [
                  { title: 'Old quote guide', suppression_reason: 'not_in_top_ranked_sources' },
                ],
                denied_retrievals: [
                  {
                    provider_key: 'detail_record',
                    record_type: 'salary',
                    reason: 'self_scope_record_denied_or_missing',
                  },
                ],
                source_gap: null,
                selected_source_fingerprints: ['abc'],
              },
            },
          }),
        )
      }

      return Promise.resolve(
        jsonResponse({
          status: 'success',
          data: [
            {
              id: 1,
              message_id: 91,
              rating: 'bad',
              blocked: false,
              question: 'How do I create quotation?',
              answer_excerpt: 'Use the quotation screen.',
              reasons: ['Wrong source'],
              confidence: 'low',
              answer_mode: 'static',
              created_at: '2026-05-30T03:00:00.000Z',
            },
          ],
        }),
      )
    })

    render(<SectionAiAssistantGovernance />)

    fireEvent.click(await screen.findByRole('button', { name: 'Diagnostics' }))

    expect(await screen.findByText('Assistant Diagnostics')).toBeInTheDocument()
    expect(await screen.findByText('/crm/quotes')).toBeInTheDocument()
    expect(screen.getByText('Request Summary')).toBeInTheDocument()
    expect(screen.getByText('Providers')).toBeInTheDocument()
    expect(screen.getByText('Suppressed Sources')).toBeInTheDocument()
    expect(screen.getByText('Denied Retrievals')).toBeInTheDocument()
    expect(screen.getByText('Raw JSON')).toBeInTheDocument()
    expect(screen.getByText(/retrieval_question/)).toBeInTheDocument()
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining('admin/assistant/messages/91/diagnostics'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('loads source gaps and saves status changes', async () => {
    window.fetch.mockImplementation((input, init = {}) => {
      const url = String(input)
      if (url.includes('admin/assistant/analytics/overview'))
        return Promise.resolve(overviewResponse())
      if (url.includes('admin/assistant/source-gaps/4/status') && init.method === 'POST') {
        expect(JSON.parse(init.body)).toEqual({
          status: 'planned',
          priority: 'medium',
          notes: 'Needs provider coverage',
        })
        return Promise.resolve(jsonResponse({ status: 'success' }))
      }
      if (url.includes('admin/assistant/analytics/source-gaps')) {
        return Promise.resolve(
          jsonResponse({
            status: 'success',
            data: [
              {
                id: 4,
                normalized_intent: 'unknown module',
                sample_question: 'unknown module',
                current_route: '/dashboard/sales',
                occurrence_count: 3,
                provider_keys: ['knowledge'],
                last_seen_at: '2026-05-30T03:00:00.000Z',
                status: 'open',
                priority: 'low',
                notes: '',
              },
            ],
          }),
        )
      }
      return Promise.resolve(jsonResponse({ status: 'success', data: [] }))
    })

    render(<SectionAiAssistantGovernance />)
    fireEvent.click(await screen.findByRole('button', { name: 'Source Gaps' }))

    expect((await screen.findAllByText('unknown module')).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByDisplayValue('Open'), { target: { value: 'planned' } })
    fireEvent.change(screen.getByDisplayValue('Low priority'), { target: { value: 'medium' } })
    fireEvent.change(screen.getByPlaceholderText('Notes'), {
      target: { value: 'Needs provider coverage' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('admin/assistant/source-gaps/4/status'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('runs source gap backlog action from the governance table', async () => {
    window.fetch.mockImplementation((input, init = {}) => {
      const url = String(input)
      if (url.includes('admin/assistant/analytics/overview'))
        return Promise.resolve(overviewResponse())
      if (
        url.includes('admin/assistant/source-gaps/4/promote-provider-backlog') &&
        init.method === 'POST'
      ) {
        return Promise.resolve(
          jsonResponse({ status: 'success', message: 'Provider backlog action created.' }),
        )
      }
      if (url.includes('admin/assistant/analytics/source-gaps')) {
        return Promise.resolve(
          jsonResponse({
            status: 'success',
            data: [
              {
                id: 4,
                normalized_intent: 'unknown module',
                sample_question: 'unknown module',
                current_route: '/dashboard/sales',
                occurrence_count: 3,
                provider_keys: ['knowledge'],
                last_seen_at: '2026-05-30T03:00:00.000Z',
                status: 'open',
                priority: 'medium',
                notes: '',
                actions: [],
              },
            ],
          }),
        )
      }
      return Promise.resolve(jsonResponse({ status: 'success', data: [] }))
    })

    render(<SectionAiAssistantGovernance />)
    fireEvent.click(await screen.findByRole('button', { name: 'Source Gaps' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Backlog' }))

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('admin/assistant/source-gaps/4/promote-provider-backlog'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
