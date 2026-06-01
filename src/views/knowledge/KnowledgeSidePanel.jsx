import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CFormSwitch } from '@coreui/react'
import RightSideDrawer from '../../components/right-drawer/RightSideDrawer'
import { useAuth } from '../../auth/AuthProvider'
import { extractRolesFromSession } from '../../utils/roles'
import { recordModuleSearchSelection } from '../../components/search/moduleSearchIndex'
import { useKnowledgePanel } from './KnowledgePanelContext'
import { searchKnowledgeArticles } from './knowledgeSearch'
import AssistantTooltip from './side-panel/AssistantTooltip'
import KnowledgeAssistantHeaderActions from './side-panel/KnowledgeAssistantHeaderActions'
import KnowledgeAssistantPanel from './side-panel/KnowledgeAssistantPanel'
import KnowledgePanelArticle from './side-panel/KnowledgePanelArticle'
import KnowledgePanelLoading from './side-panel/KnowledgePanelLoading'
import KnowledgePanelOverview from './side-panel/KnowledgePanelOverview'
import KnowledgePanelSearchResults from './side-panel/KnowledgePanelSearchResults'
import KnowledgePanelSearchSlot from './side-panel/KnowledgePanelSearchSlot'
import { getCurrentPageName } from './side-panel/assistantRouteUtils'
import { assistantSourceType } from './side-panel/assistantSourceUtils'
import useKnowledgeAssistantChat from './side-panel/useKnowledgeAssistantChat'

const BASE_ASSISTANT_PROMPTS = ['How do I create a quotation?', 'How do I apply leave?']

const KnowledgeSidePanel = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])
  const {
    isOpen,
    article,
    articles,
    search,
    loadingArticle,
    loadingArticles,
    error,
    closeKnowledgePanel,
    setKnowledgeSearch,
    loadKnowledgeArticle,
  } = useKnowledgePanel()
  const [mode, setMode] = useState('search')
  const currentAssistantRoute = `${location.pathname || ''}${location.search || ''}`

  const assistant = useKnowledgeAssistantChat({
    currentRoute: currentAssistantRoute,
    isAskMode: mode === 'ask',
    isOpen,
  })

  const filteredArticles = useMemo(
    () => searchKnowledgeArticles(articles, search, { limit: 20 }),
    [articles, search],
  )

  const overviewArticles = useMemo(() => {
    const copy = [...articles]
    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
    }
    return copy.slice(0, 3)
  }, [articles])

  const hasSearch = search.trim().length > 0
  const currentPageName = getCurrentPageName(location.pathname)
  const assistantPrompts = [...BASE_ASSISTANT_PROMPTS, `Explain ${currentPageName} page`]

  const openArticleFromSearch = (slugOrId) => {
    setKnowledgeSearch('')
    loadKnowledgeArticle(slugOrId)
  }

  const openSource = (source) => {
    const sourceType = assistantSourceType(source)
    if (sourceType === 'knowledge' && source?.slug) {
      setMode('search')
      setKnowledgeSearch('')
      loadKnowledgeArticle(source.slug)
      return
    }

    if (source?.related_route) {
      navigate(source.related_route)
    }
  }

  const runSuggestedSearch = (query) => {
    setMode('search')
    setKnowledgeSearch(query)
  }

  const openRelatedPage = (item) => {
    if (!item?.to) return
    recordModuleSearchSelection(item.id)
    navigate(item.to)
  }

  const openInlineRouteRef = (routeRef) => {
    if (!routeRef?.route) return

    if (routeRef.moduleItem?.id) {
      recordModuleSearchSelection(routeRef.moduleItem.id)
    }
    navigate(routeRef.route)
  }

  const changeAssistantMode = (nextMode) => {
    setMode(nextMode)
    if (nextMode === 'ask') assistant.setAssistantView('history')
  }

  const aiModeLabelClass = `knowledge-side-panel-mode-toggle-label ${
    mode === 'ask' ? 'is-active' : ''
  }`

  const modeSwitch = (
    <AssistantTooltip
      content={mode === 'ask' ? 'Switch to Search Mode' : 'Switch to AI Mode'}
      placement="bottom"
    >
      <div className="knowledge-side-panel-mode-toggle" role="group" aria-label="AI mode toggle">
        <CFormSwitch
          id="knowledge-side-panel-mode-toggle"
          aria-label={mode === 'ask' ? 'AI Mode On' : 'AI Mode Off'}
          className="knowledge-side-panel-mode-switch"
          checked={mode === 'ask'}
          onChange={(event) => changeAssistantMode(event.target.checked ? 'ask' : 'search')}
        />
        <span className={aiModeLabelClass}>{mode === 'ask' ? 'AI ON' : 'AI OFF'}</span>
      </div>
    </AssistantTooltip>
  )

  return (
    <RightSideDrawer
      open={isOpen}
      title={
        <span className="knowledge-side-panel-title">
          Learn <strong>kijo</strong>
        </span>
      }
      onClose={closeKnowledgePanel}
      width={440}
      className="knowledge-side-panel"
      headerActions={
        <>
          {mode === 'ask' ? (
            <KnowledgeAssistantHeaderActions
              assistantClearing={assistant.assistantClearing}
              assistantLoading={assistant.assistantLoading}
              assistantSending={assistant.assistantSending}
              assistantView={assistant.assistantView}
              onSetAssistantView={assistant.setAssistantView}
              onStartNewChat={assistant.startNewAssistantChat}
            />
          ) : null}
          {modeSwitch}
        </>
      }
      bodyClassName={`knowledge-side-panel-body ${
        mode === 'ask' ? 'knowledge-side-panel-body--ask' : ''
      }`}
      beforeBody={
        mode === 'search' ? (
          <KnowledgePanelSearchSlot search={search} onSearchChange={setKnowledgeSearch} />
        ) : null
      }
      closeLabel="Close Knowledge panel"
    >
      {error && <CAlert color="danger">{error}</CAlert>}

      {mode === 'ask' ? (
        <KnowledgeAssistantPanel
          articles={articles}
          assistant={assistant}
          assistantPrompts={assistantPrompts}
          currentPageName={currentPageName}
          onOpenInlineRouteRef={openInlineRouteRef}
          onOpenRelatedPage={openRelatedPage}
          onOpenSource={openSource}
          onRunSuggestedSearch={runSuggestedSearch}
          roles={roles}
        />
      ) : null}

      {mode === 'search' && hasSearch && (
        <KnowledgePanelSearchResults
          articles={filteredArticles}
          loadingArticles={loadingArticles}
          onOpenArticle={openArticleFromSearch}
        />
      )}

      {mode === 'search' && !hasSearch && loadingArticle && (
        <KnowledgePanelLoading>Loading article...</KnowledgePanelLoading>
      )}

      {mode === 'search' && !hasSearch && !loadingArticle && !article && (
        <KnowledgePanelOverview
          loadingArticles={loadingArticles}
          overviewArticles={overviewArticles}
          onOpenArticle={loadKnowledgeArticle}
        />
      )}

      {mode === 'search' && !hasSearch && !loadingArticle && article && (
        <KnowledgePanelArticle article={article} />
      )}
    </RightSideDrawer>
  )
}

export default KnowledgeSidePanel
