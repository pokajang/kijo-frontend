import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CTooltip,
} from '@coreui/react'

const DataTableActionMenu = ({
  record,
  actions = [],
  popperConfig,
  actionKey,
  openActionKey,
  setOpenActionKey,
  ariaLabel = 'Actions',
}) => {
  const [localVisible, setLocalVisible] = React.useState(false)
  const isControlled =
    typeof openActionKey !== 'undefined' && typeof setOpenActionKey === 'function'
  const isVisible = isControlled ? openActionKey === actionKey : localVisible

  const handleClose = () => {
    if (isControlled) {
      setOpenActionKey(null)
      return
    }
    setLocalVisible(false)
  }

  const handleToggleClick = (event) => {
    event.stopPropagation()
    if (isControlled) {
      setOpenActionKey(isVisible ? null : actionKey)
      return
    }
    setLocalVisible((visible) => !visible)
  }

  const renderAction = (action) => {
    if (!action || action.hidden) return null

    const {
      key,
      label,
      onClick,
      className = '',
      danger = false,
      dividerBefore = false,
      disabled = false,
      tooltip,
    } = action

    const item = (
      <CDropdownItem
        key={key || label}
        className={`${danger ? 'text-danger' : ''} ${className}`.trim()}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          if (disabled) return
          if (typeof onClick === 'function') onClick(record)
          handleClose()
        }}
      >
        {label}
      </CDropdownItem>
    )

    return (
      <React.Fragment key={key || label}>
        {dividerBefore && <CDropdownDivider />}
        {tooltip ? (
          <CTooltip content={tooltip} placement="left">
            <span onClick={(event) => event.stopPropagation()}>{item}</span>
          </CTooltip>
        ) : (
          item
        )}
      </React.Fragment>
    )
  }

  return (
    <CDropdown
      portal
      alignment="end"
      className="data-table-action-dropdown record-action-dropdown"
      popperConfig={popperConfig}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      visible={isVisible}
      onShow={() => {
        if (isControlled) {
          setOpenActionKey(actionKey)
          return
        }
        setLocalVisible(true)
      }}
      onHide={handleClose}
    >
      <CDropdownToggle
        color="transparent"
        size="sm"
        caret={false}
        className="p-0 border-0 data-table-action-toggle record-action-toggle"
        aria-label={ariaLabel}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={handleToggleClick}
      >
        <CIcon icon={cilOptions} className="data-table-action-kebab record-action-kebab" />
      </CDropdownToggle>
      <CDropdownMenu
        className="data-table-action-menu record-action-menu"
        style={{ zIndex: 1080 }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {actions.map(renderAction)}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default DataTableActionMenu
