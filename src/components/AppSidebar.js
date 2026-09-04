import React, { useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
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
import { buildAppNavigation } from './navigation/buildAppNavigation'
import { useAuth } from '../auth/AuthProvider'
import navigation from '../_nav'
import { useAppNotifications } from '../notifications/AppNotificationProvider'
import { useWorkflowSetupStatus } from '../workflows/WorkflowSetupStatusProvider'
import { extractRolesFromSession } from '../utils/roles'

import logoUrl from 'src/assets/brand/logo.svg'
import sygnetUrl from 'src/assets/brand/sygnet.svg'

const AppSidebar = () => {
  const sidebarRef = useRef(null)
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { user } = useAuth()
  const { getRouteGroupCount } = useAppNotifications()
  const { getWorkflowSetupTotal } = useWorkflowSetupStatus()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])
  const filteredNav = buildAppNavigation({
    navigation,
    roles,
    getRouteGroupCount,
    getWorkflowSetupTotal,
  })

  useEffect(() => {
    const sidebarElement = sidebarRef.current
    if (!sidebarElement) return undefined

    const handleSidebarWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.deltaY === 0) return

      const scrollElement =
        sidebarElement.querySelector('.sidebar-nav .simplebar-content-wrapper') ||
        sidebarElement.querySelector('.sidebar-nav')

      if (!scrollElement) return
      if (event.cancelable) event.preventDefault()

      let deltaY = event.deltaY
      if (event.deltaMode === 1) deltaY *= 16
      else if (event.deltaMode === 2) deltaY *= scrollElement.clientHeight

      scrollElement.scrollTop += deltaY
    }

    sidebarElement.addEventListener('wheel', handleSidebarWheel, { passive: false })
    return () => sidebarElement.removeEventListener('wheel', handleSidebarWheel)
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const mobileQuery = window.matchMedia('(max-width: 991.98px)')
    const closeSidebarForMobile = (event = mobileQuery) => {
      if (event.matches) dispatch({ type: 'set', sidebarShow: false })
    }

    closeSidebarForMobile()
    mobileQuery.addEventListener('change', closeSidebarForMobile)
    return () => mobileQuery.removeEventListener('change', closeSidebarForMobile)
  }, [dispatch])

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
