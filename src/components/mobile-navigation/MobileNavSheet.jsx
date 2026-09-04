import React from 'react'
import { CButton, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'

import { useMobileNavSheet } from './MobileNavSheetContext'
import { MOBILE_NAV_VIEWS, MOBILE_NAV_VIEW_TITLES } from './mobileNavSheetViews'
import MobileAccountAppraisalView from './views/MobileAccountAppraisalView'
import MobileAccountView from './views/MobileAccountView'
import MobileAlertsView from './views/MobileAlertsView'
import MobileCreateView from './views/MobileCreateView'
import MobileKnowledgeView from './views/MobileKnowledgeView'
import MobileMainMenuView from './views/MobileMainMenuView'
import MobileMenuGroupView from './views/MobileMenuGroupView'
import MobileModuleSearchView from './views/MobileModuleSearchView'
import MobileSignOutView from './views/MobileSignOutView'
import MobileSupportTicketView from './views/MobileSupportTicketView'
import MobileToolsView from './views/MobileToolsView'

const viewComponents = {
  [MOBILE_NAV_VIEWS.menu]: MobileMainMenuView,
  [MOBILE_NAV_VIEWS.menuGroup]: MobileMenuGroupView,
  [MOBILE_NAV_VIEWS.tools]: MobileToolsView,
  [MOBILE_NAV_VIEWS.create]: MobileCreateView,
  [MOBILE_NAV_VIEWS.moduleSearch]: MobileModuleSearchView,
  [MOBILE_NAV_VIEWS.knowledge]: MobileKnowledgeView,
  [MOBILE_NAV_VIEWS.alerts]: MobileAlertsView,
  [MOBILE_NAV_VIEWS.account]: MobileAccountView,
  [MOBILE_NAV_VIEWS.accountAppraisal]: MobileAccountAppraisalView,
  [MOBILE_NAV_VIEWS.supportTicket]: MobileSupportTicketView,
  [MOBILE_NAV_VIEWS.signOut]: MobileSignOutView,
}

const MobileNavSheet = () => {
  const { canGoBack, closeSheet, currentView, goBack, isOpen } = useMobileNavSheet()
  const View = currentView ? viewComponents[currentView.id] : null

  return (
    <CModal
      scrollable
      visible={isOpen}
      onClose={closeSheet}
      className="app-mobile-nav-sheet"
      aria-label="Mobile navigation"
    >
      <CModalHeader closeButton>
        <CModalTitle className="d-flex align-items-center gap-2">
          {canGoBack && (
            <CButton
              type="button"
              color="link"
              className="app-mobile-nav-sheet__back"
              aria-label="Back"
              onClick={goBack}
            >
              <CIcon icon={cilArrowLeft} />
            </CButton>
          )}
          <span>{currentView?.title || MOBILE_NAV_VIEW_TITLES[currentView?.id] || 'Menu'}</span>
        </CModalTitle>
      </CModalHeader>
      <CModalBody>{View ? <View /> : null}</CModalBody>
    </CModal>
  )
}

export default MobileNavSheet
