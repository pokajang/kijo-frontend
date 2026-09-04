import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import WhatsNewNotifier from '../components/WhatsNewNotifier'
import { RightDrawerProvider, useRightDrawer } from '../components/right-drawer/RightDrawerContext'
import { KnowledgePanelProvider, useKnowledgePanel } from '../views/knowledge/KnowledgePanelContext'
import KnowledgeSidePanel from '../views/knowledge/KnowledgeSidePanel'
import { GlobalPromptProvider } from '../components/global-prompts/GlobalPromptCoordinator'
import MobileNavSheet from '../components/mobile-navigation/MobileNavSheet'
import {
  MobileNavSheetProvider,
  useMobileNavSheet,
} from '../components/mobile-navigation/MobileNavSheetContext'

export const SidebarRightDrawerCoordinator = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { activeDrawerId, closeRightDrawer } = useRightDrawer()
  const previousStateRef = useRef({ activeDrawerId, sidebarShow })
  const drawerHidSidebarRef = useRef(false)

  useEffect(() => {
    const previousState = previousStateRef.current
    const drawerJustOpened =
      Boolean(activeDrawerId) && activeDrawerId !== previousState.activeDrawerId
    const drawerJustClosed = !activeDrawerId && Boolean(previousState.activeDrawerId)
    const sidebarJustOpened = sidebarShow && sidebarShow !== previousState.sidebarShow

    if (drawerJustOpened && sidebarShow) {
      drawerHidSidebarRef.current = true
      dispatch({ type: 'set', sidebarShow: false })
    } else if (sidebarJustOpened && activeDrawerId) {
      drawerHidSidebarRef.current = false
      closeRightDrawer()
    } else if (drawerJustClosed && !sidebarShow && drawerHidSidebarRef.current) {
      drawerHidSidebarRef.current = false
      dispatch({ type: 'set', sidebarShow: true })
    } else if (drawerJustClosed) {
      drawerHidSidebarRef.current = false
    }

    previousStateRef.current = { activeDrawerId, sidebarShow }
  }, [activeDrawerId, closeRightDrawer, dispatch, sidebarShow])

  return null
}

const MobileSheetCoordinator = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { activeDrawerId, closeRightDrawer } = useRightDrawer()
  const { closeSheet, isOpen } = useMobileNavSheet()

  useEffect(() => {
    if (isOpen) {
      if (sidebarShow) dispatch({ type: 'set', sidebarShow: false })
      if (activeDrawerId) closeRightDrawer()
      return
    }
    if (activeDrawerId) closeSheet()
  }, [activeDrawerId, closeRightDrawer, closeSheet, dispatch, isOpen, sidebarShow])

  return null
}

const DefaultLayoutShell = () => {
  const { isOpen } = useKnowledgePanel()

  return (
    <div>
      <SidebarRightDrawerCoordinator />
      <MobileSheetCoordinator />
      <WhatsNewNotifier />
      <AppSidebar />
      <div
        className={`wrapper d-flex flex-column min-vh-100${isOpen ? ' knowledge-panel-open' : ''}`}
      >
        <AppHeader />
        <MobileNavSheet />
        <div className="body flex-grow-1">
          <div className="knowledge-layout-shell">
            <div className="knowledge-layout-main">
              <div id="app-page-navigation-slot" className="app-page-navigation-slot" />
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
  <RightDrawerProvider>
    <MobileNavSheetProvider>
      <KnowledgePanelProvider>
        <GlobalPromptProvider>
          <DefaultLayoutShell />
        </GlobalPromptProvider>
      </KnowledgePanelProvider>
    </MobileNavSheetProvider>
  </RightDrawerProvider>
)

export default DefaultLayout
