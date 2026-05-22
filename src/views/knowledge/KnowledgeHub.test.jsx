import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it, vi } from 'vitest'
import store from '../../store'
import KnowledgeHub from './KnowledgeHub'
import KnowledgeArticleDetail from './KnowledgeArticleDetail'
import KnowledgeSidePanel from './KnowledgeSidePanel'
import { KnowledgePanelProvider, useKnowledgePanel } from './KnowledgePanelContext'
import { getKnowledgeArticle, getKnowledgeArticles, getMyKnowledgeArticles } from './knowledgeApi'

vi.mock('./knowledgeApi', () => ({
  getKnowledgeArticles: vi.fn(),
  getMyKnowledgeArticles: vi.fn(),
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

const KnowledgePanelHarness = () => {
  const { openKnowledgeArticle, openKnowledgeSearch } = useKnowledgePanel()

  return (
    <>
      <button type="button" onClick={() => openKnowledgeArticle('how-to-apply-leave')}>
        Open leave guide
      </button>
      <button type="button" onClick={openKnowledgeSearch}>
        Search guides
      </button>
      <KnowledgeSidePanel />
    </>
  )
}

const KnowledgePanelRouteHarness = () => {
  const { openKnowledgeArticle } = useKnowledgePanel()

  return (
    <>
      <Link to="/other-module">Change module</Link>
      <button type="button" onClick={() => openKnowledgeArticle('how-to-apply-leave')}>
        Open leave guide
      </button>
      <KnowledgeSidePanel />
    </>
  )
}

const renderKnowledgePanel = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <KnowledgePanelProvider>
          <KnowledgePanelHarness />
        </KnowledgePanelProvider>
      </MemoryRouter>
    </Provider>,
  )

describe('KnowledgeHub', () => {
  it('renders articles from the API and filters by category', async () => {
    getMyKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Apply Leave',
          slug: 'how-to-apply-leave',
          summary: 'Apply leave from the staff workspace.',
          category: 'Leave & HR',
          tags: ['leave'],
          status: 'published',
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
          status: 'published',
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

  it('shows draft and archived workspace articles with status filtering', async () => {
    getMyKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'Published Guide',
          slug: 'published-guide',
          summary: 'Visible guide.',
          category: 'CRM',
          tags: ['crm'],
          status: 'published',
          published_at: '2026-05-21T08:00:00Z',
        },
        {
          id: 2,
          title: 'Draft Guide',
          slug: 'draft-guide',
          summary: 'Draft guide.',
          category: 'CRM',
          tags: ['crm'],
          status: 'draft',
          published_at: null,
        },
        {
          id: 3,
          title: 'Archived Guide',
          slug: 'archived-guide',
          summary: 'Archived guide.',
          category: 'CRM',
          tags: ['crm'],
          status: 'archived',
          published_at: null,
        },
      ],
      meta: { categories: ['CRM'], staff_id: 7 },
    })

    renderWithRouter(<KnowledgeHub />)

    expect(await screen.findByText('Published Guide')).toBeInTheDocument()
    expect(screen.queryByText('Draft Guide')).not.toBeInTheDocument()
    expect(screen.queryByText('Archived Guide')).not.toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Published'), {
      target: { value: 'archived' },
    })

    expect(screen.queryByText('Published Guide')).not.toBeInTheDocument()
    expect(screen.queryByText('Draft Guide')).not.toBeInTheDocument()
    expect(screen.getByText('Archived Guide')).toBeInTheDocument()
  })

  it('uses rich search while respecting status filters', async () => {
    getMyKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Create a Proposal',
          slug: 'how-to-create-a-proposal',
          summary: 'Reusable proposal templates.',
          category: 'Proposals',
          tags: ['proposal'],
          related_route: '/templates/create',
          search_text: 'Create BM Proposal Bahasa Melayu machine translated copy',
          status: 'published',
          published_at: '2026-05-21T08:00:00Z',
        },
        {
          id: 2,
          title: 'Draft BM Notes',
          slug: 'draft-bm-notes',
          summary: 'Draft only.',
          category: 'Proposals',
          tags: ['bm'],
          search_text: 'Bahasa Melayu draft guide',
          status: 'draft',
          published_at: null,
        },
      ],
      meta: { categories: ['Proposals'], staff_id: 7 },
    })

    renderWithRouter(<KnowledgeHub />)

    expect(await screen.findByText('How to Create a Proposal')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search guides, tags, modules...'), {
      target: { value: 'bahsa' },
    })

    expect(screen.getByText('How to Create a Proposal')).toBeInTheDocument()
    expect(screen.queryByText('Draft BM Notes')).not.toBeInTheDocument()
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

describe('KnowledgeSidePanel', () => {
  it('opens an article by slug and sanitizes the article body', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeArticle.mockResolvedValue({
      data: {
        id: 1,
        title: 'How to Apply Leave',
        slug: 'how-to-apply-leave',
        body_html: '<p>Submit the leave form.</p><script>alert("bad")</script>',
        category: 'Leave & HR',
        related_route: '/my/leaves/apply',
        published_at: '2026-05-21T08:00:00Z',
        images: [],
      },
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Open leave guide'))

    expect(await screen.findByText('How to Apply Leave')).toBeInTheDocument()
    expect(screen.getByText('Submit the leave form.')).toBeInTheDocument()
    expect(screen.queryByText('alert("bad")')).not.toBeInTheDocument()
    expect(screen.getByText('/my/leaves/apply')).toBeInTheDocument()
  })

  it('filters search results and loads the selected result', async () => {
    getKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Apply Leave',
          slug: 'how-to-apply-leave',
          summary: 'Leave request flow.',
          category: 'Leave & HR',
          tags: ['leave'],
        },
        {
          id: 2,
          title: 'How to Create a Quotation',
          slug: 'how-to-create-a-quotation',
          summary: 'CRM quote flow.',
          category: 'CRM',
          tags: ['quotation'],
        },
      ],
    })
    getKnowledgeArticle.mockResolvedValue({
      data: {
        id: 2,
        title: 'How to Create a Quotation',
        slug: 'how-to-create-a-quotation',
        body_html: '<p>Choose the client and service.</p>',
        category: 'CRM',
        images: [],
      },
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    fireEvent.change(screen.getByPlaceholderText('Search Knowledge'), {
      target: { value: 'crm' },
    })

    expect(await screen.findByText('How to Create a Quotation')).toBeInTheDocument()
    expect(screen.queryByText('How to Apply Leave')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('How to Create a Quotation'))

    expect(await screen.findByText('Choose the client and service.')).toBeInTheDocument()
  })

  it('finds side panel results by search_text and typo-tolerant keywords', async () => {
    getKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Create a Proposal',
          slug: 'how-to-create-a-proposal',
          summary: 'Reusable proposal templates.',
          category: 'Proposals',
          tags: ['proposal'],
          related_route: '/templates/create',
          search_text: 'Create BM Proposal Bahasa Melayu machine translated copy',
        },
        {
          id: 2,
          title: 'How to Apply Leave',
          slug: 'how-to-apply-leave',
          summary: 'Leave request flow.',
          category: 'Leave & HR',
          tags: ['leave'],
          search_text: 'Annual leave workflow',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    fireEvent.change(screen.getByPlaceholderText('Search Knowledge'), {
      target: { value: 'bahsa' },
    })

    expect(await screen.findByText('How to Create a Proposal')).toBeInTheDocument()
    expect(screen.queryByText('How to Apply Leave')).not.toBeInTheDocument()
  })

  it('keeps the panel article open when the main route changes', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeArticle.mockResolvedValue({
      data: {
        id: 1,
        title: 'How to Apply Leave',
        slug: 'how-to-apply-leave',
        body_html: '<p>Submit the leave form.</p>',
        category: 'Leave & HR',
        images: [],
      },
    })

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/my/leaves/apply']}>
          <KnowledgePanelProvider>
            <KnowledgePanelRouteHarness />
          </KnowledgePanelProvider>
        </MemoryRouter>
      </Provider>,
    )

    fireEvent.click(screen.getByText('Open leave guide'))

    expect(await screen.findByText('How to Apply Leave')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Change module'))

    expect(screen.getByText('How to Apply Leave')).toBeInTheDocument()
    expect(screen.getByText('Submit the leave form.')).toBeInTheDocument()
  })
})
