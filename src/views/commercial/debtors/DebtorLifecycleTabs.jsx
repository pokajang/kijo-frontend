import React from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'

import { debtorStatusScopes, normalizeDebtorStatusScope } from './debtorUtils'

const DebtorLifecycleTabs = ({ value, onChange, disabled = false }) => {
  const selected = normalizeDebtorStatusScope(value)

  return (
    <div className="d-flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Debtor lifecycle">
      {debtorStatusScopes.map((scope) => {
        const active = scope.key === selected
        return (
          <CButton
            key={scope.key}
            type="button"
            color={active ? 'primary' : 'secondary'}
            variant={active ? undefined : 'outline'}
            size="sm"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(scope.key)}
            disabled={disabled}
          >
            {scope.label}
          </CButton>
        )
      })}
    </div>
  )
}

DebtorLifecycleTabs.propTypes = {
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
}

export default DebtorLifecycleTabs
