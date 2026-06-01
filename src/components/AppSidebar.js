import React, { useEffect, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'
import { applySidebarBadges } from './appSidebarBadges'
import { useAuth } from '../auth/AuthProvider'
import navigation from '../_nav' // your _nav.js with allowedRoles
import { useAppNotifications } from '../notifications/AppNotificationProvider'
import { extractRolesFromSession, hasAnyAllowedRole } from '../utils/roles'

import logoUrl from 'src/assets/brand/logo.svg'
import sygnetUrl from 'src/assets/brand/sygnet.svg'

/**
 * 1) Filters out any item whose allowedRoles doesn’t overlap user roles.
 * 2) Destructures away allowedRoles so it never reaches the DOM.
 */
const filterNav = (items, roles) =>
  items.reduce((acc, item) => {
    // If restricted and no matching role → skip entirely
    if (Array.isArray(item.allowedRoles) && !hasAnyAllowedRole(roles, item.allowedRoles)) {
      return acc
    }
    // Destructure to remove allowedRoles, keep everything else
    const { allowedRoles, notificationRouteGroups, ...cleanItem } = item

    // Recurse into children if present
    if (Array.isArray(cleanItem.items)) {
      cleanItem.items = filterNav(cleanItem.items, roles)
      // If no children survived, skip this group
      if (cleanItem.items.length === 0) {
        return acc
      }
    }

    acc.push(cleanItem)
    return acc
  }, [])

const AppSidebar = () => {
  const sidebarRef = useRef(null)
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { user } = useAuth()
  const { getRouteGroupCount } = useAppNotifications()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])

  // Now filter _and clean_ your nav items
  const navigationWithBadges = applySidebarBadges(navigation, { getRouteGroupCount })
  const filteredNav = filterNav(navigationWithBadges, roles)

  useEffect(() => {
    const sidebarElement = sidebarRef.current
    if (!sidebarElement) return

    const handleSidebarWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.deltaY === 0) return

      const scrollElement =
        sidebarElement.querySelector('.sidebar-nav .simplebar-content-wrapper') ||
        sidebarElement.querySelector('.sidebar-nav')

      if (!scrollElement) return

      if (event.cancelable) {
        event.preventDefault()
      }

      let deltaY = event.deltaY
      if (event.deltaMode === 1) {
        deltaY *= 16
      } else if (event.deltaMode === 2) {
        deltaY *= scrollElement.clientHeight
      }

      scrollElement.scrollTop += deltaY
    }

    sidebarElement.addEventListener('wheel', handleSidebarWheel, { passive: false })

    return () => {
      sidebarElement.removeEventListener('wheel', handleSidebarWheel)
    }
  }, [])

  return (
    <CSidebar
      ref={sidebarRef}
      className="border-end app-sidebar"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => dispatch({ type: 'set', sidebarShow: visible })}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          <img src={logoUrl} className="sidebar-brand-full" alt="logo" height="32" />
          <img src={sygnetUrl} className="sidebar-brand-narrow" alt="sygnet" height="32" />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>

      {/* Pass only the cleaned nav items here */}
      <AppSidebarNav items={filteredNav} />

      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
