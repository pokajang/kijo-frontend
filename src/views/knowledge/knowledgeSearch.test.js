import { describe, expect, it } from 'vitest'
import { searchKnowledgeArticles } from './knowledgeSearch'

const articles = [
  {
    id: 1,
    title: 'How to Create a Proposal',
    summary: 'Create reusable templates.',
    category: 'Proposals',
    tags: ['proposal', 'template', 'bm'],
    related_route: '/templates/create',
    search_text: 'Create BM Proposal Bahasa Melayu machine translated copy',
  },
  {
    id: 2,
    title: 'How to Apply Leave',
    summary: 'Submit a leave application.',
    category: 'Leave & HR',
    tags: ['leave'],
    related_route: '/my/leaves/apply',
    search_text: 'Annual leave balances half day submission workflow',
  },
  {
    id: 3,
    title: 'Reference Page',
    summary: 'Route-only guide.',
    category: 'System',
    tags: [],
    related_route: '/commercial/delivery-order',
    search_text: '',
  },
]

describe('knowledgeSearch', () => {
  it('finds and ranks articles by title', () => {
    expect(searchKnowledgeArticles(articles, 'proposal').map((article) => article.id)).toEqual([1])
  })

  it('finds articles by body-only search_text keywords', () => {
    expect(
      searchKnowledgeArticles(articles, 'machine translated').map((article) => article.id),
    ).toEqual([1])
  })

  it('finds articles by tag and route keywords', () => {
    expect(searchKnowledgeArticles(articles, 'bm').map((article) => article.id)).toEqual([1])
    expect(
      searchKnowledgeArticles(articles, 'templates create').map((article) => article.id),
    ).toEqual([1])
    expect(
      searchKnowledgeArticles(articles, 'delivery order').map((article) => article.id),
    ).toEqual([3])
  })

  it('tolerates common keyword typos', () => {
    expect(searchKnowledgeArticles(articles, 'proposl').map((article) => article.id)).toEqual([1])
    expect(searchKnowledgeArticles(articles, 'bahsa').map((article) => article.id)).toEqual([1])
  })

  it('falls back to body_html when search_text is missing', () => {
    expect(
      searchKnowledgeArticles(
        [
          {
            id: 4,
            title: 'Legacy Payload',
            summary: '',
            category: 'System',
            tags: [],
            body_html: '<p>Recovered legacy content keyword.</p>',
          },
        ],
        'legacy content',
      ).map((article) => article.id),
    ).toEqual([4])
  })
})
