import React, { useMemo } from 'react'
import Select from './ThemedSelect'

export const getStaffEmploymentContext = (staff, encounterDate) => {
  if (!staff || !encounterDate) return 'unknown'
  const periods = staff.employmentPeriods?.length
    ? staff.employmentPeriods
    : [{ startedAt: staff.startedAt, endedAt: staff.endedAt }]
  const inServicePeriod = periods.find(
    (period) =>
      (!period.startedAt || encounterDate >= period.startedAt) &&
      (!period.endedAt || encounterDate < period.endedAt),
  )

  if (inServicePeriod) return 'in_service'
  if (periods.some((period) => period.endedAt === encounterDate)) return 'boundary'
  if (periods.every((period) => period.startedAt && encounterDate < period.startedAt)) {
    return 'not_started'
  }
  return 'former'
}

const getStatusLabel = (staff, encounterDate) => {
  const context = getStaffEmploymentContext(staff, encounterDate)
  if (context === 'in_service') return staff.endedAt ? 'In service then' : 'Active'
  if (context === 'former') return 'Former'
  if (context === 'boundary') return 'Left that day'
  if (context === 'not_started') return 'Not yet employed'
  return staff.endedAt ? 'Former' : 'Active'
}

const StaffSelect = ({
  staff = [],
  value,
  encounterDate,
  onChange,
  placeholder = 'Select staff...',
  onlyInService = false,
  specialOptions = [],
  inputId,
  ariaInvalid,
  ariaDescribedBy,
  menuPortalTarget,
  menuPosition,
}) => {
  const options = useMemo(() => {
    const mappedSpecialOptions = specialOptions.map((item) => ({
      value: item.value,
      label: item.label,
      special: item,
      context: 'special',
    }))
    const mapped = staff.map((item) => {
      const context = getStaffEmploymentContext(item, encounterDate)
      return {
        value: item.id,
        label: `${item.fullName}${item.nameCode ? ` (${item.nameCode})` : ''} · ${getStatusLabel(item, encounterDate)}`,
        staff: item,
        context,
        isDisabled: context === 'not_started' || (onlyInService && context !== 'in_service'),
      }
    })

    if (!encounterDate) {
      return [
        mappedSpecialOptions.length
          ? { label: 'Other contact context', options: mappedSpecialOptions }
          : null,
        mapped.length ? { label: 'Staff', options: mapped } : null,
      ].filter(Boolean)
    }
    return [
      mappedSpecialOptions.length
        ? { label: 'Other contact context', options: mappedSpecialOptions }
        : null,
      {
        label: 'In service on encounter date',
        options: mapped.filter((option) => option.context === 'in_service'),
      },
      !onlyInService
        ? {
            label: 'After leaving Amiosh',
            options: mapped.filter((option) => option.context === 'former'),
          }
        : null,
      !onlyInService
        ? {
            label: 'Left on encounter date',
            options: mapped.filter((option) => option.context === 'boundary'),
          }
        : null,
    ].filter((group) => group?.options.length)
  }, [encounterDate, onlyInService, specialOptions, staff])

  const flatOptions = options.flatMap((option) => option.options || [option])
  const selectedOption =
    flatOptions.find((option) => String(option.value) === String(value)) || null

  return (
    <Select
      inputId={inputId}
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option?.staff || option?.special || null)}
      isOptionDisabled={(option) => option.isDisabled}
      placeholder={placeholder}
      isClearable
      aria-invalid={ariaInvalid || undefined}
      aria-describedby={ariaDescribedBy}
      menuPortalTarget={menuPortalTarget}
      menuPosition={menuPosition}
    />
  )
}

export default StaffSelect
