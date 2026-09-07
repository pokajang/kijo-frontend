import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'

const DataTableOptionMenu = ({
  id,
  value,
  options = [],
  onChange,
  ariaLabel = 'Select option',
  placeholder = 'Select',
  disabled = false,
  alignment = 'start',
  className = '',
  menuClassName = '',
  size = 'sm',
  color = 'secondary',
  variant = 'outline',
}) => {
  const [visible, setVisible] = useState(false)
  const [menuWidth, setMenuWidth] = useState()
  const [toggleElement, setToggleElement] = useState(null)
  const availableOptions = useMemo(() => options.filter(Boolean), [options])
  const selectedOption = availableOptions.find((option) => Object.is(option.value, value))
  const selectedLabel = selectedOption?.label || placeholder
  const isReadOnly = availableOptions.length === 1
  const isDisabled = disabled || availableOptions.length === 0 || isReadOnly

  const syncMenuWidth = useCallback(
    (nextToggleElement) => {
      const target = nextToggleElement || toggleElement
      const width = Math.ceil(target?.getBoundingClientRect().width || 0)
      setMenuWidth((currentWidth) => (currentWidth === width ? currentWidth : width || undefined))
    },
    [toggleElement],
  )

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !toggleElement) return undefined

    const observer = new ResizeObserver(() => syncMenuWidth(toggleElement))
    observer.observe(toggleElement)

    return () => observer.disconnect()
  }, [syncMenuWidth, toggleElement])

  const handleSelect = (option) => {
    if (option.disabled) return
    onChange?.(option.value, option)
    setVisible(false)
  }

  return (
    <CDropdown
      portal
      alignment={alignment}
      className={`data-table-option-menu ${isReadOnly ? 'data-table-option-menu--read-only' : ''} ${className}`.trim()}
      visible={visible}
      onShow={() => {
        syncMenuWidth()
        setVisible(true)
      }}
      onHide={() => setVisible(false)}
    >
      <CDropdownToggle
        id={id}
        type="button"
        size={size}
        color={color}
        variant={variant}
        caret={!isReadOnly}
        disabled={isDisabled}
        className="data-table-option-menu__toggle"
        aria-label={`${ariaLabel}: ${selectedLabel}`}
        onMouseDown={(event) => {
          setToggleElement(event.currentTarget)
          syncMenuWidth(event.currentTarget)
        }}
        onKeyDown={(event) => {
          if (!['Enter', ' '].includes(event.key)) return
          setToggleElement(event.currentTarget)
          syncMenuWidth(event.currentTarget)
        }}
      >
        <span className="data-table-option-menu__label">{selectedLabel}</span>
      </CDropdownToggle>
      {!isReadOnly && (
        <CDropdownMenu
          className={`data-table-option-menu__menu data-table-action-menu record-action-menu ${menuClassName}`.trim()}
          style={{ zIndex: 1080, ...(menuWidth ? { width: `${menuWidth}px` } : {}) }}
        >
          {availableOptions.map((option) => {
            const selected = Object.is(option.value, value)

            return (
              <CDropdownItem
                key={option.key || option.value}
                as="button"
                type="button"
                className={selected ? 'active' : ''}
                disabled={option.disabled}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </CDropdownItem>
            )
          })}
        </CDropdownMenu>
      )}
    </CDropdown>
  )
}

export default DataTableOptionMenu
