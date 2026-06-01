import { describe, expect, it } from 'vitest'
import { getAssistantRelatedPageLinks } from './knowledgeAssistantLinks'

describe('knowledge assistant related page links', () => {
  it('deduplicates matching module routes', () => {
    const links = getAssistantRelatedPageLinks({
      previousUserMessage: { role: 'user', content: 'How do I create quotation?' },
      currentPageName: 'Quotations',
      roles: ['Staff'],
      message: {
        role: 'assistant',
        content: 'Open Quotations, choose the client, and save the quotation.',
        sources: [
          {
            title: 'How to Create a Quotation',
            summary: 'Start a quotation from CRM.',
          },
        ],
      },
      limit: 5,
    })

    const targets = links.map((item) => item.to)
    expect(targets).toContain('/crm/quotes')
    expect(new Set(targets).size).toBe(targets.length)
  })

  it('filters weak generic create matches from assistant route chips', () => {
    const links = getAssistantRelatedPageLinks({
      previousUserMessage: { role: 'user', content: 'How do I create a quotation?' },
      currentPageName: 'Sales Dashboard',
      roles: ['System Admin', 'Staff'],
      message: {
        role: 'assistant',
        content: 'Step-by-step to create a quotation: In CRM, open Quotations.',
        sources: [
          {
            title: 'How to Create a Quotation',
            summary: 'Start a quotation from CRM and select the correct service form.',
          },
        ],
      },
      limit: 5,
    })

    expect(links.map((item) => item.to)).toContain('/crm/quotes')
    expect(links.map((item) => item.label)).not.toContain('System Updates')
  })

  it('does not return related links for user messages', () => {
    expect(
      getAssistantRelatedPageLinks({
        message: { role: 'user', content: 'How do I create quotation?' },
        roles: ['Staff'],
      }),
    ).toEqual([])
  })

  it('filters role-restricted routes through the module search engine', () => {
    const links = getAssistantRelatedPageLinks({
      previousUserMessage: { role: 'user', content: 'Open system admin email test' },
      currentPageName: 'Dashboard',
      roles: ['Staff'],
      message: {
        role: 'assistant',
        content: 'Use System Admin to run mail diagnostics and email test.',
        sources: [],
      },
      limit: 5,
    })

    expect(links.map((item) => item.group)).not.toContain('System Admin')
    expect(links.map((item) => item.label)).not.toContain('Email Test')
  })

  it('excludes Knowledge routes because source chips handle guide links', () => {
    const links = getAssistantRelatedPageLinks({
      previousUserMessage: { role: 'user', content: 'Open knowledge hub' },
      currentPageName: 'Knowledge Hub',
      roles: ['Staff'],
      message: {
        role: 'assistant',
        content: 'Open Knowledge Hub and find the relevant guide.',
        sources: [{ title: 'Knowledge Hub', summary: 'Knowledge articles' }],
      },
      limit: 5,
    })

    expect(links.some((item) => String(item.to || '').startsWith('/knowledge'))).toBe(false)
  })
})
