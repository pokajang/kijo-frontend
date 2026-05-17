import React, { useCallback, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
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
import navigation from '../_nav' // your _nav.js with allowedRoles
import { extractRolesFromSession, hasAnyAllowedRole } from '../utils/roles'
import { quoteApiUrl } from '../views/crm/quotes/quoteApi'

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
    const { allowedRoles, ...cleanItem } = item

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
  const dispatch = useDispatch()
  const location = useLocation()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  // Local state for roles
  const [roles, setRoles] = useState([])
  const [priceExceptionPendingCount, setPriceExceptionPendingCount] = useState(0)
  const [priceExceptionBadgeScope, setPriceExceptionBadgeScope] = useState('')

  // Fetch session info (and roles) once on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}auth/session`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          const userRoles = extractRolesFromSession(data)
          setRoles(userRoles)
        } else {
          setRoles([])
        }
      })
      .catch(() => setRoles([]))
  }, [])

  const fetchPriceExceptionPendingCount = useCallback(() => {
    fetch(quoteApiUrl('quote-price-exceptions/pending-count'), {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        setPriceExceptionPendingCount(Number(data?.count || 0))
        setPriceExceptionBadgeScope(data?.scope || '')
      })
      .catch(() => {
        setPriceExceptionPendingCount(0)
        setPriceExceptionBadgeScope('')
      })
  }, [])

  useEffect(() => {
    fetchPriceExceptionPendingCount()
  }, [fetchPriceExceptionPendingCount, location.pathname])

  useEffect(() => {
    const refresh = () => fetchPriceExceptionPendingCount()
    const intervalId = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    window.addEventListener('quote-price-exceptions:changed', refresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('quote-price-exceptions:changed', refresh)
    }
  }, [fetchPriceExceptionPendingCount])

  // Now filter _and clean_ your nav items
  const navigationWithBadges = navigation.map((item) =>
    item.to === '/crm/price-exceptions' && priceExceptionPendingCount > 0
      ? {
          ...item,
          badge: {
            color: 'primary',
            text: String(priceExceptionPendingCount),
            title:
              priceExceptionBadgeScope === 'ready_to_apply'
                ? 'Negotiations ready to apply'
                : 'Negotiations pending approval',
          },
        }
      : item,
  )
  const filteredNav = filterNav(navigationWithBadges, roles)

  return (
    <CSidebar
      className="border-end bg-light"
      colorScheme="light"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => dispatch({ type: 'set', sidebarShow: visible })}
    >
      <CSidebarHeader className="border-bottom bg-light">
        <CSidebarBrand to="/">
          <img src={logoUrl} className="sidebar-brand-full" alt="logo" height="32" />
          <img src={sygnetUrl} className="sidebar-brand-narrow" alt="sygnet" height="32" />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>

      {/* Pass only the cleaned nav items here */}
      <AppSidebarNav items={filteredNav} />

      <CSidebarFooter className="border-top bg-light d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
