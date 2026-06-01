import React from 'react'
import PropTypes from 'prop-types'
import { CListGroup, CListGroupItem } from '@coreui/react'

export const WorkloadCompactListGroup = ({ children, className = '' }) => (
  <CListGroup flush className={`border rounded overflow-hidden ${className}`.trim()}>
    {children}
  </CListGroup>
)

WorkloadCompactListGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

export const WorkloadCompactListItem = ({ children, className = '' }) => (
  <CListGroupItem className={`px-3 py-1 ${className}`.trim()}>{children}</CListGroupItem>
)

WorkloadCompactListItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}
