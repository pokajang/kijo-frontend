import React, { useMemo } from 'react'
import {
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CFormLabel,
} from '@coreui/react'

export const PERIOD_RANGE_PRESETS = [
  { key: 'ytd', label: 'Year to Date' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'last-30-days', label: 'Last 30 Days' },
  { key: 'last-3-months', label: 'Last 3 Months' },
  { key: 'last-6-months', label: 'Last 6 Months' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom Range' },
]

const pad = (value) => String(value).padStart(2, '0')

export const formatLocalDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const parseLocalDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const getMonthStart = (date, monthOffset = 0) =>
  new Date(date.getFullYear(), date.getMonth() + monthOffset, 1)

export const getPeriodRangePreset = (preset, today = new Date()) => {
  const endDate = formatLocalDate(today)

  if (preset === 'all') {
    return { preset, startDate: '', endDate: '' }
  }

  if (preset === 'this-month') {
    return {
      preset,
      startDate: formatLocalDate(getMonthStart(today)),
      endDate,
    }
  }

  if (preset === 'last-month') {
    return {
      preset,
      startDate: formatLocalDate(getMonthStart(today, -1)),
      endDate: formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }

  if (preset === 'last-30-days') {
    return {
      preset,
      startDate: formatLocalDate(addDays(today, -29)),
      endDate,
    }
  }

  if (preset === 'last-3-months') {
    return {
      preset,
      startDate: formatLocalDate(getMonthStart(today, -2)),
      endDate,
    }
  }

  if (preset === 'last-6-months') {
    return {
      preset,
      startDate: formatLocalDate(getMonthStart(today, -5)),
      endDate,
    }
  }

  return {
    preset: 'ytd',
    startDate: formatLocalDate(new Date(today.getFullYear(), 0, 1)),
    endDate,
  }
}

export const createPeriodRangeValue = (preset = 'ytd', currentValue = {}, today = new Date()) => {
  if (preset !== 'custom') return getPeriodRangePreset(preset, today)

  const fallback = getPeriodRangePreset('ytd', today)
  return {
    preset,
    startDate: currentValue.startDate || fallback.startDate,
    endDate: currentValue.endDate || fallback.endDate,
  }
}

export const getPeriodRangePresetLabel = (preset) =>
  PERIOD_RANGE_PRESETS.find((option) => option.key === preset)?.label || 'Period'

const formatShortDate = (value) => {
  const date = parseLocalDate(value)
  if (!date) return ''

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const getPeriodRangeLabel = (value = {}) => {
  if (value.preset === 'all') return 'All Time'
  if (value.preset !== 'custom') return getPeriodRangePresetLabel(value.preset)

  const start = formatShortDate(value.startDate)
  const end = formatShortDate(value.endDate)

  if (start && end) return `${start} - ${end}`
  if (start) return `From ${start}`
  if (end) return `Until ${end}`
  return 'Custom Range'
}

export const getPeriodRangeScopeLabel = (value = {}) => {
  if (value.preset === 'all') return 'All Time'

  const start = formatShortDate(value.startDate)
  const end = formatShortDate(value.endDate)

  if (start && end) return `${start} - ${end}`
  if (start) return `From ${start}`
  if (end) return `Until ${end}`
  return getPeriodRangeLabel(value)
}

export const isDefaultPeriodRange = (value = {}) => value.preset === 'ytd'

export const isDateInPeriodRange = (dateValue, periodRange) => {
  if (!periodRange || periodRange.preset === 'all') return true

  const dateOnly = String(dateValue || '').split(/[T ]/)[0]
  if (!dateOnly) return false

  if (periodRange.startDate && dateOnly < periodRange.startDate) return false
  if (periodRange.endDate && dateOnly > periodRange.endDate) return false

  return true
}

const PeriodRangeSelector = ({
  value,
  onChange,
  presets = PERIOD_RANGE_PRESETS,
  className = '',
  buttonColor = 'secondary',
  buttonVariant = 'outline',
  size = 'sm',
}) => {
  const selectedValue = value || getPeriodRangePreset('ytd')
  const selectedLabel = useMemo(() => getPeriodRangeLabel(selectedValue), [selectedValue])

  const handlePresetSelect = (preset) => {
    onChange?.(createPeriodRangeValue(preset, selectedValue))
  }

  const handleCustomDateChange = (field, nextDate) => {
    onChange?.({
      ...createPeriodRangeValue('custom', selectedValue),
      [field]: nextDate,
    })
  }

  return (
    <CDropdown autoClose="outside" className={`period-range-selector ${className}`.trim()}>
      <CDropdownToggle
        size={size}
        color={buttonColor}
        variant={buttonVariant}
        className="period-range-selector__toggle"
      >
        {selectedLabel}
      </CDropdownToggle>
      <CDropdownMenu className="period-range-selector__menu">
        {presets.map((preset) => (
          <CDropdownItem
            key={preset.key}
            active={selectedValue.preset === preset.key}
            className="py-1"
            onClick={() => handlePresetSelect(preset.key)}
          >
            {preset.label}
          </CDropdownItem>
        ))}
        {selectedValue.preset === 'custom' ? (
          <div className="period-range-selector__custom border-top mt-1 px-2 pb-2 pt-2">
            <CFormLabel className="small text-muted mb-1">Custom Range</CFormLabel>
            <div className="d-flex gap-2">
              <CFormInput
                type="date"
                size="sm"
                aria-label="Period start date"
                value={selectedValue.startDate || ''}
                onChange={(event) => handleCustomDateChange('startDate', event.target.value)}
              />
              <CFormInput
                type="date"
                size="sm"
                aria-label="Period end date"
                value={selectedValue.endDate || ''}
                onChange={(event) => handleCustomDateChange('endDate', event.target.value)}
              />
            </div>
          </div>
        ) : null}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default PeriodRangeSelector
