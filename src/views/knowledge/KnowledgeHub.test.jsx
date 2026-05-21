import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import KnowledgeHub from './KnowledgeHub'
import KnowledgeArticleDetail from './KnowledgeArticleDetail'
import { getKnowledgeArticle, getKnowledgeArticles } from './knowledgeApi'

vi.mock('./knowledgeApi', () => ({
  getKnowledgeArticles: vi.fn(),
  getKnowledgeArticle: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ slug: 'how-to-apply-leave' }),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('KnowledgeHub', () => {
  it('renders articles from the API and filters by category', async () => {
    getKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Apply Leave',
          slug: 'how-to-apply-leave',
          summary: 'Apply leave from the staff workspace.',
          category: 'Leave & HR',
          tags: ['leave'],
          published_at: '2026-05-21T08:00:00Z',
          created_by_staff_id: 7,
          created_by_name_code: 'ST1',
          images: [
            {
              id: 10,
              url: '/storage/knowledge/leave-guide.webp',
              description: 'Leave guide screenshot',
            },
          ],
        },
        {
          id: 2,
          title: 'How to Create a Quotation',
          slug: 'how-to-create-a-quotation',
          summary: 'Create a CRM quotation.',
          category: 'CRM',
          tags: ['quotation'],
          published_at: '2026-05-21T09:00:00Z',
          created_by_staff_id: 9,
          created_by_name_code: 'ST2',
        },
      ],
      meta: { categories: ['Leave & HR', 'CRM'], staff_id: 7 },
    })

    renderWithRouter(<KnowledgeHub />)

    expect(await screen.findByText('How to Apply Leave')).toBeInTheDocument()
    expect(screen.getByText('How to Create a Quotation')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Leave guide screenshot' })).toBeInTheDocument()
    expect(screen.getByLabelText('Manage How to Apply Leave')).toBeInTheDocument()
    expect(screen.getByLabelText('Manage How to Create a Quotation')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('All Categories'), {
      target: { value: 'CRM' },
    })

    expect(screen.queryByText('How to Apply Leave')).not.toBeInTheDocument()
    expect(screen.getByText('How to Create a Quotation')).toBeInTheDocument()
  })
})

describe('KnowledgeArticleDetail', () => {
  it('renders article content and related route action without noisy detail metadata', async () => {
    getKnowledgeArticle.mockResolvedValue({
      data: {
        id: 1,
        title: 'How to Apply Leave',
        slug: 'how-to-apply-leave',
        summary: 'Apply leave.',
        body_html: '<p>Open My Leaves and submit the form.</p>',
        category: 'Leave & HR',
        tags: ['leave'],
        related_route: '/my/leaves/apply',
        contributor_note: 'HR guide',
        status: 'published',
        published_at: '2026-05-21T08:00:00Z',
        created_by_staff_id: 7,
        created_by_name_code: 'HR7',
        images: [],
      },
      meta: { staff_id: 8, can_moderate: false },
    })

    renderWithRouter(<KnowledgeArticleDetail />)

    expect(await screen.findByText('How to Apply Leave')).toBeInTheDocument()
    expect(screen.getByText('/my/leaves/apply')).toBeInTheDocument()
    expect(screen.queryByText('Apply leave.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Contributed by HR7/)).not.toBeInTheDocument()
    expect(screen.queryByText('leave')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('Open My Leaves and submit the form.')).toBeInTheDocument(),
    )
  })
})
