import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import store from '../../store'
import { RightDrawerProvider } from '../../components/right-drawer/RightDrawerContext'
import KnowledgeHub from './KnowledgeHub'
import KnowledgeArticleDetail from './KnowledgeArticleDetail'
import KnowledgeSidePanel from './KnowledgeSidePanel'
import { KnowledgePanelProvider, useKnowledgePanel } from './KnowledgePanelContext'
import {
  askKnowledgeAssistant,
  clearKnowledgeAssistantThread,
  createKnowledgeAssistantThread,
  getKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeAssistantThread,
  getMyKnowledgeArticles,
  submitKnowledgeAssistantFeedback,
} from './knowledgeApi'

const testState = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { staff_id: 7, roles: ['Staff'] },
}))

vi.mock('./knowledgeApi', () => ({
  askKnowledgeAssistant: vi.fn(),
  clearKnowledgeAssistantThread: vi.fn(),
  createKnowledgeAssistantThread: vi.fn(),
  getKnowledgeArticles: vi.fn(),
  getMyKnowledgeArticles: vi.fn(),
  getKnowledgeArticle: vi.fn(),
  getKnowledgeAssistantThread: vi.fn(),
  submitKnowledgeAssistantFeedback: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => testState.navigate,
    useParams: () => ({ slug: 'how-to-apply-leave' }),
  }
})

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: testState.user }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  testState.user = { staff_id: 7, roles: ['Staff'] }
  getKnowledgeAssistantThread.mockResolvedValue({ messages: [] })
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

const renderKnowledgePanel = ({ initialEntries = ['/'] } = {}) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <RightDrawerProvider>
          <KnowledgePanelProvider>
            <KnowledgePanelHarness />
          </KnowledgePanelProvider>
        </RightDrawerProvider>
      </MemoryRouter>
    </Provider>,
  )

const switchToAiMode = () => fireEvent.click(screen.getByLabelText('AI Mode Off'))
const switchToSearchMode = () => fireEvent.click(screen.getByLabelText('AI Mode On'))

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

    const view = renderKnowledgePanel()
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

    const view = renderKnowledgePanel()
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

  it('asks the Knowledge assistant and opens answer sources', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      answer: { suggested_queries: [''] },
      messages: [
        { id: 1, role: 'user', content: 'How do I create quotation?', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: '1. Open Quotations.\n2. Select the client.',
          sources: [
            {
              title: 'How to Create a Quotation',
              slug: 'how-to-create-a-quotation',
            },
          ],
          confidence: 'high',
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

    const view = renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    expect(
      screen.queryByText('Scoped to Kijo sources. AI can make mistakes; verify answers.'),
    ).not.toBeInTheDocument()
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    expect(await screen.findByLabelText('AI Mode On')).toBeInTheDocument()
    expect(
      await screen.findByText('Scoped to Kijo sources. AI can make mistakes; verify answers.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Kijo/internal sources only')).not.toBeInTheDocument()

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'How do I create quotation?' } })
    fireEvent.submit(input.closest('form'))

    expect(await screen.findByText(/Open Quotations/)).toBeInTheDocument()
    expect(screen.getByText('Open Quotations.').tagName).toBe('LI')
    expect(screen.queryByText('Answered from 1 source')).not.toBeInTheDocument()
    expect(screen.queryByText('High confidence')).not.toBeInTheDocument()
    expect(screen.getByText('Sources')).toBeInTheDocument()
    expect(screen.getByText('Related pages')).toBeInTheDocument()
    expect(screen.queryByText('Try searching')).not.toBeInTheDocument()
    const relatedPages = screen
      .getByText('Related pages')
      .closest('.knowledge-assistant-related-pages')
    const relatedPageButton = within(relatedPages).getAllByRole('button', {
      name: /Quotations|Create Quote/,
    })[0]
    fireEvent.click(relatedPageButton)
    expect(testState.navigate).toHaveBeenCalledWith('/crm/quotes')

    fireEvent.click(screen.getByRole('button', { name: 'How to Create a Quotation' }))

    expect(await screen.findByText('Choose the client and service.')).toBeInTheDocument()
  })

  it('does not repeat source titles in the assistant answer body', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'AI chat' },
      threads: [{ id: 12, title: 'AI chat', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'how do i use this ai chat', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content:
            'I found related Kijo sources, but could not verify the AI response sources.\n\n- How to Set Up and Update Your KPI\n- How to Track and Create Manual Debtors',
          sources: [
            {
              title: 'How to Set Up and Update Your KPI',
              slug: 'how-to-set-up-and-update-your-kpi',
              source_type: 'knowledge',
            },
            {
              title: 'How to Track and Create Manual Debtors',
              slug: 'how-to-track-and-create-manual-debtors',
              source_type: 'knowledge',
            },
          ],
          confidence: 'low',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))
    fireEvent.click(await screen.findByRole('button', { name: 'AI chat' }))

    const answerIntro = await screen.findByText(
      'I found related Kijo sources, but could not verify the AI response sources.',
    )
    const answerBody = answerIntro.closest('.knowledge-assistant-message-content')

    expect(
      within(answerBody).queryByText('How to Set Up and Update Your KPI'),
    ).not.toBeInTheDocument()
    expect(
      within(answerBody).queryByText('How to Track and Create Manual Debtors'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'How to Set Up and Update Your KPI' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'How to Track and Create Manual Debtors' }),
    ).toBeInTheDocument()
  })

  it('renders validated inline route links and suppresses duplicate related page chips', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Quotation help' },
      threads: [{ id: 12, title: 'Quotation help', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'How do I create quotation?', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Open [[kijo-route:route_quotes|Quotation page]] and save the quotation.',
          route_refs: [
            {
              id: 'route_quotes',
              label: 'Quotation page',
              related_route: '/crm/quotes',
              source_slug: 'how-to-create-a-quotation',
            },
          ],
          sources: [
            {
              title: 'How to Create a Quotation',
              slug: 'how-to-create-a-quotation',
              source_type: 'knowledge',
              related_route: '/crm/quotes',
            },
          ],
          confidence: 'high',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Quotation help' }))

    const inlineRoute = (
      await screen.findAllByRole('button', { name: /Quotations|Create Quote/ })
    ).find((button) => button.classList.contains('knowledge-assistant-inline-route'))
    expect(inlineRoute).toBeTruthy()
    fireEvent.click(inlineRoute)

    expect(testState.navigate).toHaveBeenCalledWith('/crm/quotes')
    const relatedPages = screen
      .queryByText('Related pages')
      ?.closest('.knowledge-assistant-related-pages')
    if (relatedPages) {
      expect(
        within(relatedPages).queryByRole('button', { name: /Create Quote/ }),
      ).not.toBeInTheDocument()
    }
    expect(screen.getByText('Sources')).toBeInTheDocument()
  })

  it('hides raw related route text from older assistant answers', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Dashboard help' },
      threads: [{ id: 12, title: 'Dashboard help', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'dashboard', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Open Dashboard Statistics (related route: /dashboard) to inspect performance.',
          sources: [],
          confidence: 'low',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Dashboard help' }))

    expect(
      await screen.findByText('Open Dashboard Statistics to inspect performance.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/related route:/i)).not.toBeInTheDocument()
  })

  it('renders assistant help source labels', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'AI help' },
      threads: [{ id: 12, title: 'AI help', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'how do i use this ai chat', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'You can ask Learn Kijo AI questions about Kijo workflows and app data.',
          sources: [
            {
              title: 'Learn Kijo AI Assistant',
              slug: 'assistant-help:capabilities',
              source_type: 'assistant_help',
            },
          ],
          confidence: 'high',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'AI help' }))

    expect(
      await screen.findByText(
        'You can ask Learn Kijo AI questions about Kijo workflows and app data.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Learn Kijo AI Assistant/i })).toBeDisabled()
    expect(screen.getByText('AI Help')).toBeInTheDocument()
    expect(screen.queryByText('Related pages')).not.toBeInTheDocument()
  })

  it('submits helpful feedback for an assistant answer', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Quotation help' },
      threads: [{ id: 12, title: 'Quotation help', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'How do I create quotation?', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Use the quotation module.',
          sources: [],
          confidence: 'medium',
          answer_mode: 'static',
        },
      ],
    })
    submitKnowledgeAssistantFeedback.mockResolvedValue({ status: 'success' })

    renderKnowledgePanel({ initialEntries: ['/crm/quotes'] })
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Quotation help' }))

    expect(await screen.findByText('Use the quotation module.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark answer helpful' }))

    await waitFor(() => {
      expect(submitKnowledgeAssistantFeedback).toHaveBeenCalledWith({
        messageId: 2,
        rating: 'helpful',
        reasons: [],
        note: '',
        currentRoute: '/crm/quotes',
      })
    })
    expect(await screen.findByText('Thanks, feedback saved')).toBeInTheDocument()
  })

  it('copies assistant answer text from the response controls', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Dashboard help' },
      threads: [{ id: 12, title: 'Dashboard help', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'Open dashboard', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Open [[kijo-route:route_dashboard|Dashboard]] to review metrics.',
          route_refs: [
            {
              id: 'route_dashboard',
              label: 'Dashboard',
              related_route: '/dashboard',
            },
          ],
          sources: [],
          confidence: 'medium',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Dashboard help' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Copy answer' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Open Dashboard to review metrics.')
    })
    expect(screen.getByRole('button', { name: 'Answer copied' })).toBeInTheDocument()
  })

  it('submits structured feedback for a bad assistant answer', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Quotation help' },
      threads: [{ id: 12, title: 'Quotation help', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'How do I create quotation?', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Use the wrong module.',
          sources: [
            {
              title: 'How to Create a Quotation',
              slug: 'how-to-create-a-quotation',
              source_type: 'knowledge',
            },
          ],
          confidence: 'medium',
          answer_mode: 'static',
        },
      ],
    })
    submitKnowledgeAssistantFeedback.mockResolvedValue({ status: 'success' })

    renderKnowledgePanel({ initialEntries: ['/crm/quotes'] })
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Quotation help' }))

    expect(await screen.findByText('Use the wrong module.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Report bad answer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Wrong source' }))
    fireEvent.change(screen.getByPlaceholderText('Add a short note for the developer'), {
      target: { value: 'This points users to the wrong place.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit feedback' }))

    await waitFor(() => {
      expect(submitKnowledgeAssistantFeedback).toHaveBeenCalledWith({
        messageId: 2,
        rating: 'bad',
        reasons: ['Wrong source'],
        note: 'This points users to the wrong place.',
        currentRoute: '/crm/quotes',
      })
    })
    expect(await screen.findByText('Thanks, feedback saved')).toBeInTheDocument()
  })

  it('does not render related page chips for user-only assistant history', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Quotation chat' },
      threads: [{ id: 12, title: 'Quotation chat', message_count: 1 }],
      messages: [{ id: 1, role: 'user', content: 'How do I create quotation?', sources: [] }],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Quotation chat' }))

    expect(await screen.findByText('How do I create quotation?')).toBeInTheDocument()
    expect(screen.queryByText('Related pages')).not.toBeInTheDocument()
  })

  it('shows empty assistant prompt chips and submits a selected prompt', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      messages: [
        { id: 1, role: 'user', content: 'How do I apply leave?', sources: [] },
        { id: 2, role: 'assistant', content: 'Open My Leaves.', sources: [], confidence: 'low' },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    fireEvent.click(await screen.findByRole('button', { name: 'How do I apply leave?' }))

    expect(await screen.findByText('Open My Leaves.')).toBeInTheDocument()
    expect(askKnowledgeAssistant).toHaveBeenCalledWith({
      question: 'How do I apply leave?',
      currentRoute: '/',
      threadId: null,
    })
  })

  it('uses the current route name for the explain page prompt', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      messages: [
        { id: 1, role: 'user', content: 'Explain Quotes page', sources: [] },
        { id: 2, role: 'assistant', content: 'Quotes help.', sources: [], confidence: 'low' },
      ],
    })

    renderKnowledgePanel({ initialEntries: ['/crm/quotes'] })
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Explain Quotes page' }))

    expect(await screen.findByText('Quotes help.')).toBeInTheDocument()
    expect(askKnowledgeAssistant).toHaveBeenCalledWith({
      question: 'Explain Quotes page',
      currentRoute: '/crm/quotes',
      threadId: null,
    })
  })

  it('includes query string in assistant current route for detail-backed quote pages', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      messages: [
        { id: 1, role: 'user', content: 'Explain this quotation detail', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Quotation detail answer.',
          sources: [],
          confidence: 'medium',
        },
      ],
    })

    renderKnowledgePanel({
      initialEntries: ['/crm/quotes?service=training&edit=true&quoteId=31'],
    })
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    fireEvent.change(screen.getByPlaceholderText('Ask about Kijo knowledge or records'), {
      target: { value: 'Explain this quotation detail' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByText('Quotation detail answer.')).toBeInTheDocument()
    expect(askKnowledgeAssistant).toHaveBeenCalledWith({
      question: 'Explain this quotation detail',
      currentRoute: '/crm/quotes?service=training&edit=true&quoteId=31',
      threadId: null,
    })
  })

  it('keeps the assistant composer available with a long answer', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Sales metrics' },
      threads: [{ id: 12, title: 'Sales metrics', message_count: 2 }],
      messages: [
        {
          id: 1,
          role: 'assistant',
          content: Array.from({ length: 30 }, (_, index) => `${index + 1}. Step ${index + 1}`).join(
            '\n',
          ),
          sources: [],
          confidence: 'low',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Sales metrics' }))
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    expect(await screen.findByText('Step 30')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask a Kijo follow-up')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask a Kijo follow-up').closest('form')).toHaveClass(
      'knowledge-assistant-composer',
    )
  })

  it('shows no-source assistant responses with suggested search chips', async () => {
    getKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Create a Quotation',
          slug: 'how-to-create-a-quotation',
          summary: 'Quotation guide.',
          category: 'CRM',
          search_text: 'quotation',
        },
      ],
    })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      answer: { suggested_queries: ['quotation'] },
      messages: [
        { id: 1, role: 'user', content: 'No matching thing', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'I could not find an exact Knowledge guide for that.',
          sources: [],
          confidence: 'low',
        },
      ],
    })

    const view = renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'No matching thing' } })
    fireEvent.submit(input.closest('form'))

    expect(
      await screen.findByText('I could not find an exact Knowledge guide for that.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No matching Kijo source')).not.toBeInTheDocument()
    expect(screen.queryByText('Low confidence - check source')).not.toBeInTheDocument()
    expect(screen.queryByText('Related pages')).not.toBeInTheDocument()
    expect(view.container.querySelector('.knowledge-assistant-suggested-searches')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'quotation' }))

    expect(await screen.findByPlaceholderText('Search Knowledge')).toHaveValue('quotation')
    expect(await screen.findByText('How to Create a Quotation')).toBeInTheDocument()
  })

  it('shows a transparent usage-limit notice on degraded assistant answers', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      answer: {
        ai_status: 'usage_limit',
        degraded_reason: 'usage_limit',
        suggested_queries: [],
      },
      messages: [
        { id: 1, role: 'user', content: 'Create quotation', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content:
            'AI answer generation is temporarily unavailable because the AI usage limit or credit budget has been reached. I found these approved Kijo sources that may help.',
          sources: [
            {
              title: 'How to Create a Quotation',
              slug: 'how-to-create-a-quotation',
              source_type: 'knowledge',
              related_route: '/crm/quotes',
            },
          ],
          confidence: 'low',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'Create quotation' } })
    fireEvent.submit(input.closest('form'))

    expect(
      await screen.findByText('AI usage limit reached - showing Kijo source fallback.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'AI answer generation is temporarily unavailable because the AI usage limit or credit budget has been reached. I found these approved Kijo sources that may help.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'How to Create a Quotation' })).toBeInTheDocument()
  })

  it('does not claim source fallback when usage limit has no approved source', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      answer: {
        ai_status: 'usage_limit',
        degraded_reason: 'usage_limit',
        suggested_queries: [],
      },
      messages: [
        { id: 1, role: 'user', content: 'Unknown policy', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content:
            'AI answer generation is temporarily unavailable because the AI usage limit or credit budget has been reached. I also could not find an approved Kijo source for this question.',
          sources: [],
          confidence: 'low',
          ai_status: 'usage_limit',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'Unknown policy' } })
    fireEvent.submit(input.closest('form'))

    expect(
      await screen.findByText('AI usage limit reached - no approved Kijo source found.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('AI usage limit reached - showing Kijo source fallback.'),
    ).not.toBeInTheDocument()
  })

  it('renders clarification chips and fills the composer without submitting', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      answer: {
        clarification_options: [
          {
            label: 'CEM Chemical Exposure Monitoring',
            source_slug: 'proposal-template:ih:11',
            source_type: 'proposal_template',
            related_route: '/templates/proposals/ih/11',
            reason: 'service',
          },
        ],
        suggested_queries: [],
      },
      messages: [
        { id: 1, role: 'user', content: 'how to quote this service', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Which previous item should I use for this follow-up: CEM?',
          sources: [],
          confidence: 'low',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'how to quote this service' } })
    fireEvent.submit(input.closest('form'))

    expect(await screen.findByText('Choose one previous item to continue.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CEM Chemical Exposure Monitoring' }))

    expect(await screen.findByPlaceholderText('Ask a Kijo follow-up')).toHaveValue(
      'Use CEM Chemical Exposure Monitoring for this follow-up',
    )
    expect(askKnowledgeAssistant).toHaveBeenCalledTimes(1)
  })

  it('shows typed live metric source labels', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Sales metrics' },
      threads: [{ id: 12, title: 'Sales metrics', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'What are current sales numbers?', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'As of now, sales are shown from the Sales dashboard.',
          sources: [
            {
              title: 'Sales dashboard metrics',
              slug: 'dashboard:sales',
              source_type: 'live_metric',
              related_route: '/dashboard/sales',
            },
          ],
          confidence: 'medium',
          answer_mode: 'live',
          freshness_label: 'As of 29 May 2026, 16:40',
          cached: true,
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Sales metrics' }))

    expect(
      await screen.findByText('As of now, sales are shown from the Sales dashboard.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Live data cached')).not.toBeInTheDocument()
    expect(screen.queryByText('As of 29 May 2026, 16:40')).not.toBeInTheDocument()
    expect(screen.getByText('Live data')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Sales dashboard metrics/i }))
    expect(testState.navigate).toHaveBeenCalledWith('/dashboard/sales')
  })

  it('shows new live module source labels and navigates source chips', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Invoice chat' },
      threads: [{ id: 12, title: 'Invoice chat', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'What is invoice INV-1 status?', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'Invoice INV-1 is unpaid.',
          sources: [
            {
              title: 'INV-1',
              slug: 'invoice:1',
              source_type: 'invoice',
              related_route: '/commercial/invoice/1',
              source_status: 'open',
            },
            {
              title: 'Open debtors',
              slug: 'debtor:list',
              source_type: 'debtor',
              related_route: '/commercial/debtors',
            },
            {
              title: 'Vendor registration matches',
              slug: 'vendor-registration:list',
              source_type: 'vendor_registration',
              related_route: '/client/vendor-registration',
            },
            {
              title: 'Quote Q-1',
              slug: 'quote-record:training:1',
              source_type: 'quote_record',
              related_route: '/crm/quotes?service=training',
              source_status: 'archived',
              source_freshness_label: 'Archived',
            },
            {
              title: 'Deleted proposal',
              slug: 'proposal-template:ih:9',
              source_type: 'proposal_template',
              related_route: '/templates/proposals/ih/9',
              source_is_deleted: true,
              source_freshness_label: 'Deleted template',
            },
            {
              title: 'Leave records',
              slug: 'leave:list',
              source_type: 'leave',
              related_route: '/my/leaves',
            },
            {
              title: 'Task records',
              slug: 'task:list',
              source_type: 'task',
              related_route: '/task-manager',
            },
            {
              title: 'Sales inquiry records',
              slug: 'sales-inquiry:list',
              source_type: 'sales_inquiry',
              related_route: '/pipeline/inquiries',
            },
          ],
          confidence: 'medium',
          answer_mode: 'live',
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Invoice chat' }))

    expect(await screen.findByText('Invoice')).toBeInTheDocument()
    expect(screen.getByText('Debtor')).toBeInTheDocument()
    expect(screen.getByText('Vendor Registration')).toBeInTheDocument()
    expect(screen.getByText('Quote')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Deleted')).toBeInTheDocument()
    expect(screen.queryByText('Deleted template')).not.toBeInTheDocument()
    expect(screen.queryByText('open')).not.toBeInTheDocument()
    expect(screen.getByText('Leave')).toBeInTheDocument()
    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText('Sales Inquiry')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /INV-1/i }))
    expect(testState.navigate).toHaveBeenCalledWith('/commercial/invoice/1')
  })

  it('hides route and weak search chips for out-of-scope no-source assistant responses', async () => {
    getKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Create a Quotation',
          slug: 'how-to-create-a-quotation',
          summary: 'Quotation guide.',
          category: 'CRM',
          search_text: 'quotation',
        },
      ],
    })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      answer: { suggested_queries: ['lapar perut makan'] },
      messages: [
        { id: 1, role: 'user', content: 'lapar perut nak makan nasi kat mana ekk', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'I could not find an exact Knowledge guide for that.',
          sources: [],
          confidence: 'low',
        },
      ],
    })

    const view = renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'lapar perut nak makan nasi kat mana ekk' } })
    fireEvent.submit(input.closest('form'))

    expect(
      await screen.findByText('I could not find an exact Knowledge guide for that.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No matching Kijo source')).not.toBeInTheDocument()
    expect(screen.queryByText('Related pages')).not.toBeInTheDocument()
    expect(view.container.querySelector('.knowledge-assistant-related-pages')).toBeNull()
    expect(view.container.querySelector('.knowledge-assistant-suggested-searches')).toBeNull()
    expect(screen.queryByRole('button', { name: 'lapar perut makan' })).not.toBeInTheDocument()
  })

  it('does not show related page chips for low-confidence sourced answers', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'Low confidence chat' },
      threads: [{ id: 12, title: 'Low confidence chat', message_count: 2 }],
      messages: [
        { id: 1, role: 'user', content: 'lapar perut nak makan nasi kat mana ekk', sources: [] },
        {
          id: 2,
          role: 'assistant',
          content: 'The dashboard source does not answer this question.',
          confidence: 'low',
          answer_mode: 'live',
          sources: [
            {
              slug: 'dashboard:sales',
              title: 'Sales dashboard metrics',
              source_type: 'live_metric',
              related_route: '/dashboard/sales',
            },
          ],
        },
      ],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Low confidence chat' }))

    expect(await screen.findByText('Sources')).toBeInTheDocument()
    expect(screen.queryByText('Low confidence - check source')).not.toBeInTheDocument()
    expect(screen.queryByText('Related pages')).not.toBeInTheDocument()
  })

  it('sends assistant chat with Enter and keeps Shift Enter for multiline input', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'New chat' },
      threads: [{ id: 12, title: 'New chat', message_count: 0 }],
      messages: [],
    })
    askKnowledgeAssistant.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'New chat' },
      threads: [{ id: 12, title: 'New chat', message_count: 2 }],
      messages: [{ id: 1, role: 'assistant', content: 'Answer', sources: [] }],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'How do I create quotation?' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(askKnowledgeAssistant).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(await screen.findByText('Answer')).toBeInTheDocument()
    expect(askKnowledgeAssistant).toHaveBeenCalledTimes(1)
  })

  it('shows when a recent assistant chat can be continued', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 11, title: 'Previous chat' },
      threads: [{ id: 11, title: 'Previous chat', message_count: 1 }],
      messages: [{ id: 1, role: 'assistant', content: 'Previous answer', sources: [] }],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))

    expect(await screen.findByLabelText('AI Mode Off')).toBeInTheDocument()
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'Previous chat' }))

    expect(await screen.findByText('Previous answer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back to history' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /History/ }))
    expect(await screen.findByText('Chat history')).toBeInTheDocument()
    expect(screen.getByText('Auto-clears after 30 days')).toBeInTheDocument()
    expect(screen.getByText('Previous chat')).toBeInTheDocument()
  })

  it('shows an empty state in assistant chat history', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      threads: [],
      messages: [],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: /History/ }))

    expect(await screen.findByText('History is empty, start a')).toBeInTheDocument()
    const newChatButtons = screen.getAllByRole('button', { name: /New chat/i })
    expect(newChatButtons.length).toBeGreaterThan(0)
    fireEvent.click(newChatButtons[newChatButtons.length - 1])
    expect(
      await screen.findByPlaceholderText('Ask about Kijo knowledge or records'),
    ).toBeInTheDocument()
  })

  it('creates a new assistant chat from current chat', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 11, title: 'Previous chat' },
      threads: [{ id: 11, title: 'Previous chat', message_count: 1 }],
      messages: [{ id: 1, role: 'assistant', content: 'Previous answer', sources: [] }],
    })
    createKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'New chat' },
      threads: [
        { id: 12, title: 'New chat', message_count: 0 },
        { id: 11, title: 'Previous chat', message_count: 1 },
      ],
      messages: [],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    expect(
      await screen.findByPlaceholderText('Ask about Kijo knowledge or records'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Previous answer')).not.toBeInTheDocument()
    expect(createKnowledgeAssistantThread).toHaveBeenCalledTimes(1)
  })

  it('creates a new assistant chat from history', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 11, title: 'Previous chat' },
      threads: [{ id: 11, title: 'Previous chat', message_count: 1 }],
      messages: [{ id: 1, role: 'assistant', content: 'Previous answer', sources: [] }],
    })
    createKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 12, title: 'New chat' },
      threads: [
        { id: 12, title: 'New chat', message_count: 0 },
        { id: 11, title: 'Previous chat', message_count: 1 },
      ],
      messages: [],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: /History/ }))
    fireEvent.click(await screen.findByRole('button', { name: /New chat/ }))

    expect(
      await screen.findByPlaceholderText('Ask about Kijo knowledge or records'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Previous answer')).not.toBeInTheDocument()
    expect(createKnowledgeAssistantThread).toHaveBeenCalledTimes(1)
  })

  it('deletes an assistant chat from history', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 11, title: 'Previous chat' },
      threads: [
        { id: 11, title: 'Previous chat', message_count: 1 },
        { id: 12, title: 'Old chat', message_count: 2 },
      ],
      messages: [{ id: 1, role: 'assistant', content: 'Previous answer', sources: [] }],
    })
    clearKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 11, title: 'Previous chat' },
      threads: [{ id: 11, title: 'Previous chat', message_count: 1 }],
      messages: [{ id: 1, role: 'assistant', content: 'Previous answer', sources: [] }],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: /History/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete chat Old chat' }))

    expect(clearKnowledgeAssistantThread).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('button', { name: 'Confirm delete chat Old chat' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete chat Old chat' }))

    await waitFor(() => {
      expect(clearKnowledgeAssistantThread).toHaveBeenCalledWith({ threadId: 12 })
    })
    expect(screen.queryByText('Old chat')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous chat' }))
    expect(await screen.findByText('Previous answer')).toBeInTheDocument()
  })

  it('bulk deletes selected assistant chats from history', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 11, title: 'Previous chat' },
      threads: [
        { id: 11, title: 'Previous chat', message_count: 1 },
        { id: 12, title: 'Old chat', message_count: 2 },
        { id: 13, title: 'Stale chat', message_count: 3 },
      ],
      messages: [{ id: 1, role: 'assistant', content: 'Previous answer', sources: [] }],
    })
    clearKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      thread: { id: 11, title: 'Previous chat' },
      threads: [{ id: 11, title: 'Previous chat', message_count: 1 }],
      messages: [{ id: 1, role: 'assistant', content: 'Previous answer', sources: [] }],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: /History/ }))

    fireEvent.click(await screen.findByLabelText('Select chat Old chat'))
    fireEvent.click(screen.getByLabelText('Select chat Stale chat'))

    expect(screen.getByText('2 selected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }))
    expect(clearKnowledgeAssistantThread).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete selected' }))

    await waitFor(() => {
      expect(clearKnowledgeAssistantThread).toHaveBeenCalledWith({ threadId: 12 })
      expect(clearKnowledgeAssistantThread).toHaveBeenCalledWith({ threadId: 13 })
    })
    expect(screen.queryByText('Old chat')).not.toBeInTheDocument()
    expect(screen.queryByText('Stale chat')).not.toBeInTheDocument()
    expect(screen.getByText('Previous chat')).toBeInTheDocument()
  })

  it('switches from assistant chat back to article search', async () => {
    getKnowledgeArticles.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'How to Create a Proposal',
          slug: 'how-to-create-a-proposal',
          summary: 'Proposal guide.',
          category: 'CRM',
        },
      ],
    })
    getKnowledgeAssistantThread.mockResolvedValue({
      assistant: { beta: true, model: 'gpt-5-nano' },
      messages: [],
    })

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    expect(await screen.findByLabelText('AI Mode On')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Current chat' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument()
    expect(screen.queryByText('AI chat')).not.toBeInTheDocument()
    expect(screen.queryByText('gpt-5-nano')).not.toBeInTheDocument()
    switchToSearchMode()

    const input = await screen.findByPlaceholderText('Search Knowledge')
    fireEvent.change(input, { target: { value: 'proposal' } })

    expect(await screen.findByText('How to Create a Proposal')).toBeInTheDocument()
  })

  it('shows a non-blocking Knowledge assistant error', async () => {
    getKnowledgeArticles.mockResolvedValue({ data: [] })
    getKnowledgeAssistantThread.mockResolvedValue({ messages: [] })
    askKnowledgeAssistant.mockRejectedValue(new Error('Assistant unavailable'))

    renderKnowledgePanel()
    fireEvent.click(screen.getByText('Search guides'))
    switchToAiMode()
    fireEvent.click(await screen.findByRole('button', { name: 'New chat' }))

    const input = await screen.findByPlaceholderText('Ask about Kijo knowledge or records')
    fireEvent.change(input, { target: { value: 'How do I create quotation?' } })
    fireEvent.submit(input.closest('form'))

    expect(await screen.findByText('Assistant unavailable')).toBeInTheDocument()
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
          <RightDrawerProvider>
            <KnowledgePanelProvider>
              <KnowledgePanelRouteHarness />
            </KnowledgePanelProvider>
          </RightDrawerProvider>
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
