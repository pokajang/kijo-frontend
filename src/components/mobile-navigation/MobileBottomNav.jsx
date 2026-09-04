import React from 'react'
import { NavLink } from 'react-router-dom'
import { CButton, CHeaderNav, CHeaderToggler, CNavItem, CNavLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilApplications, cilBell, cilMenu, cilPlus, cilSpeedometer, cilUser } from '@coreui/icons'

import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { useMobileNavSheet } from './MobileNavSheetContext'
import { MOBILE_NAV_ROOTS } from './mobileNavSheetViews'

const MobileBottomNav = () => {
  const { activeRoot, isOpen, openRoot, resetAfterRoute } = useMobileNavSheet()
  const { summary, getRouteGroupCount } = useAppNotifications()
  const unreadCount = Number(summary?.listable_total ?? 0)
  const personalNotificationCount =
    Number(getRouteGroupCount('/my/leaves') || 0) + Number(getRouteGroupCount('/my/salary') || 0)

  const openSheet = (section) => (event) => openRoot(section, event.currentTarget)
  const rootClass = (section) =>
    `app-bottom-nav-link--button${isOpen && activeRoot === section ? ' active' : ''}`

  return (
    <>
      <CHeaderToggler
        id="mobile-nav-menu-trigger"
        className={`app-bottom-nav-item app-bottom-nav-menu d-md-none${
          isOpen && activeRoot === MOBILE_NAV_ROOTS.menu ? ' active' : ''
        }`}
        onClick={openSheet(MOBILE_NAV_ROOTS.menu)}
        aria-label="Open menu"
        aria-pressed={isOpen && activeRoot === MOBILE_NAV_ROOTS.menu}
      >
        <span className="app-bottom-nav-icon" aria-hidden="true">
          <CIcon icon={cilMenu} />
        </span>
        <span className="app-bottom-nav-label">Menu</span>
      </CHeaderToggler>

      <CHeaderNav className="d-md-none align-items-center ms-auto app-bottom-nav-actions">
        <CNavItem className="app-bottom-nav-entry d-md-none">
          <CButton
            id="mobile-nav-tools-trigger"
            type="button"
            color="link"
            className={rootClass(MOBILE_NAV_ROOTS.tools)}
            onClick={openSheet(MOBILE_NAV_ROOTS.tools)}
            aria-label="Open tools"
            aria-pressed={isOpen && activeRoot === MOBILE_NAV_ROOTS.tools}
          >
            <span className="app-bottom-nav-icon" aria-hidden="true">
              <CIcon icon={cilApplications} />
            </span>
            <span className="app-bottom-nav-label">Tools</span>
          </CButton>
        </CNavItem>

        <CNavItem className="app-bottom-nav-entry d-md-none">
          <CNavLink
            to="/dashboard"
            as={NavLink}
            className={`app-bottom-nav-link${isOpen ? ' app-bottom-nav-link--route-muted' : ''}`}
            onClick={resetAfterRoute}
          >
            <span className="app-bottom-nav-icon" aria-hidden="true">
              <CIcon icon={cilSpeedometer} />
            </span>
            <span className="app-bottom-nav-label">Home</span>
          </CNavLink>
        </CNavItem>

        <CNavItem className="app-bottom-nav-entry d-md-none">
          <CButton
            id="mobile-nav-create-trigger"
            type="button"
            color="link"
            className={rootClass(MOBILE_NAV_ROOTS.create)}
            onClick={openSheet(MOBILE_NAV_ROOTS.create)}
            aria-label="Open create menu"
            aria-pressed={isOpen && activeRoot === MOBILE_NAV_ROOTS.create}
          >
            <span className="app-bottom-nav-icon" aria-hidden="true">
              <CIcon icon={cilPlus} />
            </span>
            <span className="app-bottom-nav-label">Create</span>
          </CButton>
        </CNavItem>

        <CNavItem className="app-bottom-nav-entry d-md-none">
          <CButton
            id="mobile-nav-alerts-trigger"
            type="button"
            color="link"
            className={rootClass(MOBILE_NAV_ROOTS.alerts)}
            onClick={openSheet(MOBILE_NAV_ROOTS.alerts)}
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'Notifications'
            }
            aria-pressed={isOpen && activeRoot === MOBILE_NAV_ROOTS.alerts}
          >
            <span
              className={`app-bottom-nav-icon${unreadCount > 0 ? ' app-bottom-nav-icon--with-badge' : ''}`}
              aria-hidden="true"
            >
              <CIcon icon={cilBell} />
              {unreadCount > 0 && <span className="app-bottom-nav-unread-dot" />}
            </span>
            <span className="app-bottom-nav-label">Alerts</span>
          </CButton>
        </CNavItem>

        <CNavItem className="app-bottom-nav-entry d-md-none">
          <CButton
            id="mobile-nav-account-trigger"
            type="button"
            color="link"
            className={rootClass(MOBILE_NAV_ROOTS.account)}
            onClick={openSheet(MOBILE_NAV_ROOTS.account)}
            aria-label="Account"
            aria-pressed={isOpen && activeRoot === MOBILE_NAV_ROOTS.account}
          >
            <span
              className={`app-bottom-nav-icon app-bottom-nav-icon--account${
                personalNotificationCount > 0 ? ' app-bottom-nav-icon--with-badge' : ''
              }`}
              aria-hidden="true"
            >
              <CIcon icon={cilUser} className="app-bottom-nav-account-icon" />
              {personalNotificationCount > 0 && <span className="app-bottom-nav-unread-dot" />}
            </span>
            <span className="app-bottom-nav-label">Account</span>
          </CButton>
        </CNavItem>
      </CHeaderNav>
    </>
  )
}

export default MobileBottomNav
