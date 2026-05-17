import React from 'react'
import { CTooltip, CWidgetStatsF } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCheckCircle,
  cilDescription,
  cilGroup,
  cilInfo,
  cilList,
  cilMoney,
  cilWarning,
} from '@coreui/icons'

const toneIconMap = {
  primary: cilChartPie,
  success: cilCheckCircle,
  warning: cilWarning,
  danger: cilWarning,
  info: cilInfo,
  secondary: cilList,
}

const iconCycle = [
  cilChartPie,
  cilMoney,
  cilCalculator,
  cilGroup,
  cilDescription,
  cilBell,
  cilCheckCircle,
  cilInfo,
]

const StatCard = ({
  label,
  value,
  sublabel,
  tone = 'secondary',
  icon,
  iconIndex = 0,
  size = 'md',
  valueSize = 'auto',
  onClick,
}) => {
  const isActionable = typeof onClick === 'function'
  const valueText = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  const hasWordValue = /[a-z]/i.test(valueText)
  const autoValueSize = valueSize === 'auto' ? 'md' : valueSize
  const shouldTruncateValue = hasWordValue && valueText.length > 12
  const widgetIcon =
    icon ||
    iconCycle[Number(iconIndex) % iconCycle.length] ||
    toneIconMap[tone] ||
    toneIconMap.secondary

  const handleKeyDown = (event) => {
    if (!isActionable || (event.key !== 'Enter' && event.key !== ' ')) return

    event.preventDefault()
    onClick(event)
  }

  return (
    <CWidgetStatsF
      className={`stats-strip-widget stats-strip-widget--${tone} stats-strip-widget--${size} stats-strip-widget--value-${autoValueSize}${isActionable ? ' stats-strip-widget--action' : ''}`}
      color={tone}
      icon={<CIcon icon={widgetIcon} size="xl" />}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      padding={false}
      role={isActionable ? 'button' : undefined}
      tabIndex={isActionable ? 0 : undefined}
      title={
        <span className="stats-strip-widget__title">
          <span className="stats-strip-widget__label">{label}</span>
          {sublabel ? <span className="stats-strip-widget__helper">{sublabel}</span> : null}
        </span>
      }
      value={
        shouldTruncateValue ? (
          <CTooltip content={valueText} placement="top">
            <span className="stats-strip-widget__value stats-strip-widget__value--truncate">
              {value ?? '-'}
            </span>
          </CTooltip>
        ) : (
          <span className="stats-strip-widget__value">{value ?? '-'}</span>
        )
      }
    />
  )
}

export default StatCard
