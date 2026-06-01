import React from 'react'
import StatCard from './StatCard'
import { formatStatsScopeLabel } from './formatStatsScopeLabel'

const placeholderItems = Array.from({ length: 4 }, (_, index) => ({
  key: `stats-placeholder-${index}`,
  label: 'Loading',
  value: '...',
  sublabel: 'Calculating',
  tone: 'secondary',
}))

const getDisplayText = (value) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

const resolveItemSize = (item = {}) => {
  if (item.size) return item.size

  const valueText = getDisplayText(item.value)
  const sublabelText = getDisplayText(item.sublabel)
  const hasWordValue = /[a-z]/i.test(valueText)

  if (
    (hasWordValue && valueText.length > 12) ||
    valueText.length > 18 ||
    sublabelText.length > 30
  ) {
    return 'lg'
  }

  if (valueText.length <= 4 && sublabelText.length <= 18) {
    return 'sm'
  }

  return 'md'
}

const StatsStrip = ({
  items = [],
  loading = false,
  className = '',
  scopeLabel = '',
  layout = 'auto',
}) => {
  const displayItems = loading ? placeholderItems : items.filter(Boolean)

  if (!displayItems.length) return null

  const showScopeLabel = !loading && Boolean(scopeLabel)
  const displayScopeLabel = formatStatsScopeLabel(scopeLabel)

  return (
    <div
      className={`stats-strip-shell ${className}`.trim()}
      aria-busy={loading ? 'true' : undefined}
    >
      {showScopeLabel ? <div className="stats-strip-scope">{displayScopeLabel}</div> : null}
      <div
        className={`stats-strip stats-strip--${layout} stats-strip--count-${displayItems.length}`}
      >
        {displayItems.map((item, index) => (
          <StatCard
            key={item.key || item.label}
            label={item.label}
            value={item.value}
            sublabel={loading ? '' : item.sublabel}
            tone={item.tone}
            icon={item.icon}
            iconIndex={index}
            size={resolveItemSize(item)}
            valueSize={item.valueSize}
            onClick={item.onClick}
            actionTooltip={item.actionTooltip}
          />
        ))}
      </div>
    </div>
  )
}

export default StatsStrip
