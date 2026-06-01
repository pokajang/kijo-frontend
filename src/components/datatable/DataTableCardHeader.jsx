import React from 'react'
import { CCardHeader } from '@coreui/react'
import { formatStatsScopeLabel } from '../stats/formatStatsScopeLabel'

const DataTableCardHeader = ({ title, scopeLabel = '', children, className = '', ...rest }) => {
  const displayScopeLabel = formatStatsScopeLabel(scopeLabel)
  const showScopeLabel = Boolean(displayScopeLabel)

  return (
    <CCardHeader
      className={`data-table-card-header records-page-card-header ${className}`.trim()}
      {...rest}
    >
      <div className="data-table-card-header__title-group">
        {typeof title === 'string' || typeof title === 'number' ? (
          <strong className="data-table-card-header__title">{title}</strong>
        ) : (
          <span className="data-table-card-header__title">{title}</span>
        )}
        {showScopeLabel ? (
          <span className="data-table-card-header__scope">{displayScopeLabel}</span>
        ) : null}
      </div>
      {children ? <div className="data-table-card-header__actions">{children}</div> : null}
    </CCardHeader>
  )
}

export default DataTableCardHeader
