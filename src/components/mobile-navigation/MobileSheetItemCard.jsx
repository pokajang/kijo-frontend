import React from 'react'
import PropTypes from 'prop-types'
import { NavLink } from 'react-router-dom'
import { CBadge } from '@coreui/react'

const MobileSheetItemCard = ({
  active = false,
  ariaLabel,
  badge,
  className = '',
  description,
  disabled = false,
  fullWidth = false,
  href,
  icon,
  meta,
  onClick,
  title,
  to,
  trailing,
}) => {
  const classes = `app-mobile-sheet-card${active ? ' active' : ''}${
    fullWidth ? ' app-mobile-sheet-card--full' : ''
  }${description ? ' app-mobile-sheet-card--with-description' : ''}${className ? ` ${className}` : ''}`
  const content = (
    <>
      {icon ? <span className="app-mobile-sheet-card__icon">{icon}</span> : null}
      <span className="app-mobile-sheet-card__body">
        <span className="app-mobile-sheet-card__title">{title}</span>
        {description ? (
          <span className="app-mobile-sheet-card__description">{description}</span>
        ) : null}
        {meta ? <span className="app-mobile-sheet-card__meta">{meta}</span> : null}
      </span>
      {badge ? (
        <CBadge color={badge.color} className="rounded-pill ms-auto" title={badge.title}>
          {badge.text}
        </CBadge>
      ) : null}
      {trailing}
    </>
  )

  if (to) {
    return (
      <NavLink to={to} className={classes} aria-label={ariaLabel} onClick={onClick}>
        {content}
      </NavLink>
    )
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={classes}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  )
}

MobileSheetItemCard.propTypes = {
  active: PropTypes.bool,
  ariaLabel: PropTypes.string,
  badge: PropTypes.shape({
    color: PropTypes.string,
    text: PropTypes.node,
    title: PropTypes.string,
  }),
  className: PropTypes.string,
  description: PropTypes.node,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  href: PropTypes.string,
  icon: PropTypes.node,
  meta: PropTypes.node,
  onClick: PropTypes.func,
  title: PropTypes.node.isRequired,
  to: PropTypes.string,
  trailing: PropTypes.node,
}

export default MobileSheetItemCard
