import React, { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom'
import { CBadge, CButton } from '@coreui/react'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { getTabNotificationBadge } from '../../notifications/notificationRegistry'

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

  const inferredActiveTab = useMemo(() => {
    if (activeTab) return activeTab
    return tabs.find((tab) => isModuleTabActive(tab, pathname))?.key || tabs[0]?.key || ''
  }, [activeTab, pathname, tabs])

  const shouldHideForNestedRoute = useMemo(
    () =>
      hideOnNestedRoute &&
      !activeTab &&
      !onTabChange &&
      tabs.some((tab) => isModuleTabNestedRoute(tab, pathname)),
    [activeTab, hideOnNestedRoute, onTabChange, pathname, tabs],
  )

  useEffect(() => {
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
  }, [])

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
  }, [tabs])

  if (shouldHideForNestedRoute) return null

  const handleTabClick = (tab) => {
    if (onTabChange) {
      onTabChange(tab.key)
      return
    }

    if (navigate && tab.to && tab.to !== pathname) {
      navigate(tab.to)
    }
  }

  return (
    <div
      className={`module-nav-strip records-service-strip border rounded-3 py-0 px-2 ps-md-0 pe-md-0 mb-3 position-sticky bg-body ${
        hasScrolled ? 'shadow-sm' : 'shadow-none'
      } ${className}`.trim()}
      style={{ top: `${stickyTop + stickyGap}px`, zIndex: 10 }}
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
            role="tablist"
            aria-label={ariaLabel}
          >
            {tabs.map((tab) => {
              const isActive = inferredActiveTab === tab.key
              const notificationCount = tab.notificationTabKey
                ? getTabCount(tab.notificationTabKey)
                : 0
              const notificationBadgeConfig = tab.notificationTabKey
                ? getTabNotificationBadge(tab.notificationTabKey)
                : null
              const badge =
                tab.badge ||
                (notificationCount > 0 && notificationBadgeConfig
                  ? {
                      ...notificationBadgeConfig,
                      text: String(notificationCount),
                    }
                  : null)

              return (
                <CButton
                  key={tab.key}
                  type="button"
                  color="light"
                  variant="ghost"
                  data-api-busy-allow="true"
                  className={`module-nav-strip__tab records-service-strip__tab border-0 ${
                    isActive ? 'is-active fw-semibold' : 'text-muted fw-normal'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-selected={isActive}
                  role="tab"
                  onClick={() => handleTabClick(tab)}
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
    </div>
  )
}

ModuleNavStripShell.propTypes = {
  activeTab: PropTypes.string,
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
