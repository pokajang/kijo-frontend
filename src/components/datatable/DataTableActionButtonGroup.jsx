import React from 'react'
import { CButton, CTooltip } from '@coreui/react'

const getButtonColor = (action) => {
  if (action.buttonColor) return action.buttonColor
  if (action.danger) return 'danger'
  return 'primary'
}

const DataTableActionButtonGroup = ({
  record,
  actions = [],
  size = 'sm',
  defaultVariant = 'outline',
  className = '',
}) => {
  const visibleActions = actions.filter((action) => action && !action.hidden)

  return (
    <div className={`d-flex flex-wrap gap-2 ${className}`.trim()}>
      {visibleActions.map((action) => {
        const {
          key,
          label,
          buttonLabel,
          onClick,
          disabled = false,
          className: actionClassName = '',
          tooltip,
          buttonVariant,
        } = action

        const button = (
          <CButton
            key={key || label}
            size={size}
            color={getButtonColor(action)}
            variant={buttonVariant || defaultVariant}
            className={actionClassName}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              if (typeof onClick === 'function') onClick(record)
            }}
          >
            {buttonLabel || label}
          </CButton>
        )

        return tooltip ? (
          <CTooltip key={key || label} content={tooltip} placement="top">
            <span className="d-inline-flex">{button}</span>
          </CTooltip>
        ) : (
          button
        )
      })}
    </div>
  )
}

export default DataTableActionButtonGroup
