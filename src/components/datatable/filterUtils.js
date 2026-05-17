const QUICK_FILTER_CHIP_KEYS = new Set(['search', 'period'])

export const isAdvancedFilterChip = (chip) => chip && !QUICK_FILTER_CHIP_KEYS.has(chip.key)

export const getAdvancedFilterCount = (chips = []) => chips.filter(isAdvancedFilterChip).length
