import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom'
import { CBadge, CButton } from '@coreui/react'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { getTabNotificationBadge } from '../../notifications/notificationRegistry'
import { useWorkflowSetupStatus } from '../../workflows/WorkflowSetupStatusProvider'
import { AuthContext } from '../../auth/AuthProvider'
import {
  extractRolesFromSession,
  hasAnyAllowedRole,
  hasExplicitAllowedRole,
} from '../../utils/roles'

const normalizePath = (path) => {
  if (!path) return ''
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

const isPathActive = (targetPath, currentPath) => {
  if (!targetPath) return false
  const target = normalizePath(targetPath)
  const current = normalizePath(currentPath)
  if (target === '/') return current === '/'
  return current === target || current.startsWith(`${target}/`)
}

const isPathNestedUnder = (targetPath, currentPath) => {
  if (!targetPath) return false
  const target = normalizePath(targetPath)
  const current = normalizePath(currentPath)
  if (target === '/') return current !== '/' && current.startsWith('/')
  return current.startsWith(`${target}/`)
}

export const isModuleTabActive = (tab, pathname) =>
  isPathActive(tab?.to, pathname) ||
  (Array.isArray(tab?.activePaths) && tab.activePaths.some((path) => isPathActive(path, pathname)))

export const isModuleTabNestedRoute = (tab, pathname) =>
  isPathNestedUnder(tab?.to, pathname) ||
  (Array.isArray(tab?.activePaths) &&
    tab.activePaths.some((path) => isPathNestedUnder(path, pathname)))

const ModuleNavStripShell = ({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
  hideOnNestedRoute = true,
  rightControls = null,
  asNavigation = false,
  flat = false,
  className = '',
  pathname = '',
  navigate = null,
}) => {
  const stickyGap = 8
  const tabsRef = useRef(null)
  const [stickyTop, setStickyTop] = useState(0)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [tabScrollHint, setTabScrollHint] = useState(false)
  const { getTabCount } = useAppNotifications()
  const { getWorkflowSetupCount } = useWorkflowSetupStatus()
  const auth = useContext(AuthContext)
  const roles = useMemo(() => extractRolesFromSession({ user: auth?.user }), [auth?.user])
  const visibleTabs = useMemo(
    () =>
      tabs.filter(
        (tab) =>
          !Array.isArray(tab.allowedRoles) ||
          (tab.requireExplicitRole
            ? hasExplicitAllowedRole(roles, tab.allowedRoles)
            : hasAnyAllowedRole(roles, tab.allowedRoles)),
      ),
    [roles, tabs],
  )

  const inferredActiveTab = useMemo(() => {
    if (activeTab) return activeTab
    return (
      visibleTabs.find((tab) => isModuleTabActive(tab, pathname))?.key || visibleTabs[0]?.key || ''
    )
  }, [activeTab, pathname, visibleTabs])

  const shouldHideForNestedRoute = useMemo(
    () =>
      hideOnNestedRoute &&
      !activeTab &&
      !onTabChange &&
      visibleTabs.some((tab) => isModuleTabNestedRoute(tab, pathname)),
    [activeTab, hideOnNestedRoute, onTabChange, pathname, visibleTabs],
  )

  useEffect(() => {
    if (flat) return undefined

    const setTopOffset = () => {
      const isMobileViewport =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(max-width: 767.98px)').matches
          : false
      if (isMobileViewport) {
        setStickyTop(0)
        return
      }

      const appHeader = document.querySelector('.app-main-header, .header')
      if (!(appHeader instanceof HTMLElement)) {
        setStickyTop(0)
        return
      }

      setStickyTop(appHeader.offsetHeight)
    }

    const setScrollState = () => {
      setHasScrolled(window.scrollY > 0)
    }

    setTopOffset()
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(setTopOffset)
    }
    setScrollState()
    window.addEventListener('resize', setTopOffset)
    window.addEventListener('scroll', setScrollState, { passive: true })

    return () => {
      window.removeEventListener('resize', setTopOffset)
      window.removeEventListener('scroll', setScrollState)
    }
  }, [flat])

  useEffect(() => {
    const tabsNode = tabsRef.current
    if (!tabsNode) return undefined

    let animationFrameId = 0

    const updateScrollHint = () => {
      const maxScrollLeft = Math.max(0, tabsNode.scrollWidth - tabsNode.clientWidth)
      const hasHiddenEnd = tabsNode.scrollLeft < maxScrollLeft - 1

      setTabScrollHint((current) => (current === hasHiddenEnd ? current : hasHiddenEnd))
    }

    const scheduleScrollHintUpdate = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }

      if (typeof window.requestAnimationFrame === 'function') {
        animationFrameId = window.requestAnimationFrame(updateScrollHint)
        return
      }

      updateScrollHint()
    }

    updateScrollHint()
    tabsNode.addEventListener('scroll', scheduleScrollHintUpdate, { passive: true })
    window.addEventListener('resize', scheduleScrollHintUpdate)

    let resizeObserver = null
    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(scheduleScrollHintUpdate)
      resizeObserver.observe(tabsNode)
    }

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
      tabsNode.removeEventListener('scroll', scheduleScrollHintUpdate)
      window.removeEventListener('resize', scheduleScrollHintUpdate)
      resizeObserver?.disconnect()
    }
  }, [visibleTabs])

  if (shouldHideForNestedRoute) return null
  if (visibleTabs.length === 0) return null

  const Container = asNavigation ? 'nav' : 'div'

  const handleTabClick = (event, tab) => {
    if (asNavigation) event.preventDefault()
    if (onTabChange) {
      onTabChange(tab.key)
      return
    }

    if (navigate && tab.to && tab.to !== pathname) {
      navigate(tab.to)
    }
  }

  return (
    <Container
      className={`module-nav-strip records-service-strip ${
        flat ? 'module-nav-strip--flat' : 'border rounded-3 py-0 px-2 ps-md-0 pe-md-0 mb-3 bg-body'
      } ${flat ? '' : 'position-sticky'} ${hasScrolled && !flat ? 'shadow-sm' : 'shadow-none'} ${className}`.trim()}
      style={flat ? { top: 0, zIndex: 1020 } : { top: `${stickyTop + stickyGap}px`, zIndex: 10 }}
      aria-label={asNavigation ? ariaLabel : undefined}
    >
      <div className="module-nav-strip__inner records-service-strip__inner">
        <div
          className={`module-nav-strip__tabs-viewport records-service-strip__tabs-viewport ${
            tabScrollHint ? 'has-scroll-hint-end' : ''
          }`.trim()}
        >
          <div
            ref={tabsRef}
            className="module-nav-strip__tabs records-service-strip__tabs"
            role={asNavigation ? undefined : 'tablist'}
            aria-label={ariaLabel}
          >
            {visibleTabs.map((tab) => {
              const isActive = inferredActiveTab === tab.key
              const notificationCount = tab.notificationTabKey
                ? getTabCount(tab.notificationTabKey)
                : 0
              const notificationBadgeConfig = tab.notificationTabKey
                ? getTabNotificationBadge(tab.notificationTabKey)
                : null
              const workflowSetupCount = tab.workflowSetupKey
                ? getWorkflowSetupCount(tab.workflowSetupKey)
                : 0
              const badge =
                tab.badge ||
                (notificationCount > 0 && notificationBadgeConfig
                  ? {
                      ...notificationBadgeConfig,
                      text: String(notificationCount),
                    }
                  : null) ||
                (workflowSetupCount > 0
                  ? {
                      color: 'warning',
                      text: String(workflowSetupCount),
                      title: 'Workflow recipients not configured',
                    }
                  : null)

              return (
                <CButton
                  key={tab.key}
                  component={asNavigation ? 'a' : undefined}
                  href={asNavigation ? tab.to : undefined}
                  type={asNavigation ? undefined : 'button'}
                  color="light"
                  variant="ghost"
                  data-api-busy-allow="true"
                  className={`module-nav-strip__tab records-service-strip__tab border-0 ${
                    isActive ? 'is-active fw-semibold' : 'text-muted fw-normal'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-selected={asNavigation ? undefined : isActive}
                  role={asNavigation ? undefined : 'tab'}
                  onClick={(event) => handleTabClick(event, tab)}
                >
                  <span className="d-inline-flex align-items-center gap-2">
                    <span>{tab.label}</span>
                    {badge ? (
                      <CBadge
                        color={badge.color || 'primary'}
                        className="rounded-pill"
                        title={badge.title || undefined}
                      >
                        {badge.text}
                      </CBadge>
                    ) : null}
                  </span>
                </CButton>
              )
            })}
          </div>
        </div>
        {rightControls && (
          <div className="module-nav-strip__controls records-service-strip__controls">
            {rightControls}
          </div>
        )}
      </div>
    </Container>
  )
}

ModuleNavStripShell.propTypes = {
  activeTab: PropTypes.string,
  asNavigation: PropTypes.bool,
  flat: PropTypes.bool,
  ariaLabel: PropTypes.string.isRequired,
  className: PropTypes.string,
  hideOnNestedRoute: PropTypes.bool,
  navigate: PropTypes.func,
  onTabChange: PropTypes.func,
  pathname: PropTypes.string,
  rightControls: PropTypes.node,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      activePaths: PropTypes.arrayOf(PropTypes.string),
      badge: PropTypes.shape({
        color: PropTypes.string,
        text: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        title: PropTypes.string,
      }),
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      notificationTabKey: PropTypes.string,
      to: PropTypes.string,
      allowedRoles: PropTypes.arrayOf(PropTypes.string),
      requireExplicitRole: PropTypes.bool,
      workflowSetupKey: PropTypes.string,
    }),
  ).isRequired,
}

const ModuleNavStripWithRouter = (props) => {
  const location = useLocation()
  const navigate = useNavigate()

  return <ModuleNavStripShell {...props} pathname={location.pathname} navigate={navigate} />
}

const ModuleNavStrip = (props) => {
  const inRouterContext = useInRouterContext()

  if (!inRouterContext) {
    const pathname = typeof window === 'undefined' ? '' : window.location?.pathname || ''
    return <ModuleNavStripShell {...props} pathname={pathname} />
  }

  return <ModuleNavStripWithRouter {...props} />
}

ModuleNavStrip.propTypes = ModuleNavStripShell.propTypes

export default ModuleNavStrip
