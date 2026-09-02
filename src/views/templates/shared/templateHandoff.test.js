import { describe, expect, it } from 'vitest'
import {
  buildQuoteTemplateCreateNavigation,
  buildTemplateCompletionState,
  getCreatedProposalTemplate,
  getTemplateHandoff,
  getTemplateReturnState,
  withoutCreatedProposalTemplate,
} from './templateHandoff'

describe('templateHandoff', () => {
  it('builds a service-aware return journey and preserves safe quote state', () => {
    const result = buildQuoteTemplateCreateNavigation({
      location: {
        pathname: '/crm/quotes',
        search: '?service=training',
        hash: '#pricing',
        state: { returnTo: '/crm/records/training' },
      },
      serviceKey: 'training',
      proposalLanguage: 'ms-MY',
    })

    expect(result.to).toBe('/templates/create?type=training')
    expect(result.state.returnTo).toBe('/crm/quotes?service=training#pricing')
    expect(result.state.templateHandoff).toMatchObject({
      origin: 'quote',
      serviceKey: 'training',
      proposalLanguage: 'ms-MY',
      quoteState: { returnTo: '/crm/records/training', initialService: 'training' },
    })
  })

  it('rejects unsupported services and unsafe return state', () => {
    expect(
      buildQuoteTemplateCreateNavigation({
        location: { pathname: '/crm/quotes' },
        serviceKey: 'equipment',
        proposalLanguage: 'en',
      }),
    ).toBeNull()

    const handoff = getTemplateHandoff({
      state: {
        returnTo: '/crm/quotes?service=ih',
        templateHandoff: {
          origin: 'quote',
          serviceKey: 'ih',
          proposalLanguage: 'en',
          quoteState: { returnTo: 'https://example.test' },
        },
      },
    })
    expect(handoff.quoteState).toEqual({ initialService: 'ih' })
  })

  it('returns the created template only to its originating quote service', () => {
    const location = {
      state: {
        returnTo: '/crm/quotes?service=manpower',
        templateHandoff: {
          origin: 'quote',
          serviceKey: 'manpower',
          proposalLanguage: 'en',
          quoteState: { returnTo: '/crm/records/manpower' },
        },
      },
    }
    const state = buildTemplateCompletionState({
      location,
      serviceKey: 'manpower',
      response: { status: 'success', data: { id: 42 } },
    })

    expect(state).toMatchObject({
      returnTo: '/crm/records/manpower',
      proposalTemplateCreated: {
        serviceKey: 'manpower',
        templateId: 42,
        proposalLanguage: 'en',
      },
    })
    expect(getCreatedProposalTemplate({ state })).toEqual(state.proposalTemplateCreated)
    expect(getTemplateReturnState(location)).toEqual({
      returnTo: '/crm/records/manpower',
      initialService: 'manpower',
    })
    expect(withoutCreatedProposalTemplate(state)).toEqual({
      returnTo: '/crm/records/manpower',
      initialService: 'manpower',
    })
    expect(
      buildTemplateCompletionState({ location, serviceKey: 'ih', response: { id: 42 } }),
    ).toBeUndefined()
  })
})
