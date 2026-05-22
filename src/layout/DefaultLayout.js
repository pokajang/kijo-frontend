import React from 'react'

import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import WhatsNewNotifier from '../components/WhatsNewNotifier'
import { KnowledgePanelProvider, useKnowledgePanel } from '../views/knowledge/KnowledgePanelContext'
import KnowledgeSidePanel from '../views/knowledge/KnowledgeSidePanel'

const DefaultLayoutShell = () => {
  const { isOpen } = useKnowledgePanel()

  return (
    <div>
      <WhatsNewNotifier />
      <AppSidebar />
      <div
        className={`wrapper d-flex flex-column min-vh-100${isOpen ? ' knowledge-panel-open' : ''}`}
      >
        <AppHeader />
        <div className="body flex-grow-1">
          <div className="knowledge-layout-shell">
            <div className="knowledge-layout-main">
              <AppContent />
            </div>
            <KnowledgeSidePanel />
          </div>
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

const DefaultLayout = () => (
  <KnowledgePanelProvider>
    <DefaultLayoutShell />
  </KnowledgePanelProvider>
)

export default DefaultLayout
