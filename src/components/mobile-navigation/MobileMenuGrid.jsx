import React from 'react'
import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilChevronRight } from '@coreui/icons'

import MobileSheetItemCard from './MobileSheetItemCard'

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

const itemIsActive = (item, pathname) =>
  isPathActive(item.to, pathname) ||
  item.activePaths?.some((path) => isPathActive(path, pathname)) ||
  item.items?.some((child) => itemIsActive(child, pathname))

const MobileMenuGrid = ({ items, onNavigate, onOpenGroup, primaryItemFullWidth = false }) => {
  const { pathname } = useLocation()
  let linkIndex = 0

  return (
    <div className="app-mobile-menu-grid">
      {items.map((item, index) => {
        const isSection = !item.to && !item.href && !item.items
        if (isSection) {
          return (
            <h3 className="app-mobile-menu-grid__section" key={`section-${index}`}>
              {item.name}
            </h3>
          )
        }

        const isPrimary = primaryItemFullWidth && linkIndex === 0
        linkIndex += 1
        const trailing = item.items ? (
          <CIcon icon={cilChevronRight} className="app-mobile-sheet-card__chevron" />
        ) : null

        if (item.items) {
          return (
            <MobileSheetItemCard
              key={item.name || index}
              title={item.name}
              icon={item.icon}
              badge={item.badge}
              active={itemIsActive(item, pathname)}
              fullWidth={isPrimary}
              trailing={trailing}
              onClick={() => onOpenGroup(item)}
            />
          )
        }

        if (item.to) {
          return (
            <MobileSheetItemCard
              to={item.to}
              key={item.to}
              title={item.name}
              icon={item.icon}
              badge={item.badge}
              active={itemIsActive(item, pathname)}
              fullWidth={isPrimary}
              onClick={() => onNavigate(item)}
            />
          )
        }

        return (
          <MobileSheetItemCard
            href={item.href}
            key={item.href || index}
            title={item.name}
            icon={item.icon}
            badge={item.badge}
            active={itemIsActive(item, pathname)}
            fullWidth={isPrimary}
            onClick={() => onNavigate(item)}
          />
        )
      })}
    </div>
  )
}

MobileMenuGrid.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onNavigate: PropTypes.func.isRequired,
  onOpenGroup: PropTypes.func.isRequired,
  primaryItemFullWidth: PropTypes.bool,
}

export default MobileMenuGrid
