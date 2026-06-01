import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'

const getWidthValue = (width) => {
  if (typeof width === 'number') return `${width}px`
  return width || undefined
}

const classNames = (...values) => values.filter(Boolean).join(' ')

const RightSideDrawer = ({
  open,
  title,
  onClose,
  width,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  headerActions = null,
  beforeBody = null,
  closeLabel = 'Close right drawer',
  children,
}) => {
  const widthValue = getWidthValue(width)
  const style = widthValue ? { '--right-side-drawer-width': widthValue } : undefined

  return (
    <aside
      aria-hidden={!open}
      className={classNames('right-side-drawer', open && 'is-open', className)}
      style={style}
    >
      {open ? (
        <CCard className="right-side-drawer-card">
          <CCardHeader className={classNames('right-side-drawer-header', headerClassName)}>
            <div className="right-side-drawer-title">{title}</div>
            {headerActions ? (
              <div className="right-side-drawer-header-actions">{headerActions}</div>
            ) : null}
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              className="right-side-drawer-close"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <CIcon icon={cilX} />
            </CButton>
          </CCardHeader>

          {beforeBody}

          <CCardBody className={classNames('right-side-drawer-body', bodyClassName)}>
            {children}
          </CCardBody>
        </CCard>
      ) : null}
    </aside>
  )
}

RightSideDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  headerActions: PropTypes.node,
  beforeBody: PropTypes.node,
  closeLabel: PropTypes.string,
  children: PropTypes.node,
}

export default RightSideDrawer
