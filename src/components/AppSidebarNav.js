import React, { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CSidebarNav } from '@coreui/react'

export const AppSidebarNav = ({ items }) => {
  const location = useLocation()
  const navRef = useRef(null)

  const normalizePath = (path) => {
    if (!path) return ''
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1)
    }
    return path
  }

  const isPathActive = (targetPath, currentPath) => {
    if (!targetPath) return false
    const target = normalizePath(targetPath)
    const current = normalizePath(currentPath)
    if (target === '/') return current === '/'
    return current === target || current.startsWith(`${target}/`)
  }

  const isItemActive = (item) =>
    isPathActive(item?.to, location.pathname) ||
    (Array.isArray(item?.activePaths) &&
      item.activePaths.some((path) => isPathActive(path, location.pathname)))

  const isGroupActive = (item) => {
    if (isItemActive(item)) return true
    if (!Array.isArray(item?.items)) return false
    return item.items.some((child) => (child.items ? isGroupActive(child) : isItemActive(child)))
  }

  useEffect(() => {
    if (!navRef.current) return
    const scrollElement = navRef.current.getScrollElement
      ? navRef.current.getScrollElement()
      : navRef.current
    if (!scrollElement?.querySelector) return
    const activeLink = scrollElement.querySelector('.custom-sidebar-link.active')
    if (activeLink?.scrollIntoView) {
      activeLink.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [location.pathname])

  const navLink = (name, icon, badge, indent = false) => {
    return (
      <>
        {icon
          ? icon
          : indent && (
              <span className="nav-icon">
                <span className="nav-icon-bullet"></span>
              </span>
            )}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto" size="sm" title={badge.title || ''}>
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, activePaths, ...rest } = item
    const Component = component
    const baseClassName = `custom-sidebar-link${indent ? ' custom-sidebar-link--child' : ''}`
    const isActive = isItemActive({ to: rest.to, activePaths })
    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            className={baseClassName}
            {...(rest.to && { active: isActive })}
            {...rest}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, ...rest } = item
    const Component = component
    return (
      <Component
        compact
        as="div"
        key={index}
        toggler={navLink(name, icon)}
        visible={isGroupActive(item)}
        {...rest}
      >
        {items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index, true),
        )}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar} ref={navRef}>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
