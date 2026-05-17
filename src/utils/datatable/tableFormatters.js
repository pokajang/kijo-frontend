export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]

export const getInitialPageSize = () => {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 991.98px)').matches
  ) {
    return 5
  }
  return 10
}

export const truncateFront = (value, keep = 11) => {
  const text = String(value || '')
  if (!text) return '-'
  if (text.length <= keep) return text
  return `...${text.slice(-keep)}`
}

export const recordsTruncateStyle = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
}

const compactNoWrapColumnPattern =
  /(^|[\s_-])(age|amount|approved|by|category|code|created|date|due|email|end|ic|id|issued|mobile|month|paid|phone|pic|price|qty|quantity|rate|requested|role|start|status|time|timestamp|total|type|version|year)($|[\s_-])/i

export const appendClassNames = (...classNames) => classNames.filter(Boolean).join(' ')

export const shouldNoWrapDataTableColumn = (column = {}) => {
  const sourceColumn = column.sourceColumn || column

  if (
    sourceColumn.wrap === true ||
    sourceColumn.allowWrap === true ||
    sourceColumn.noWrap === false
  ) {
    return false
  }

  if (sourceColumn.noWrap === true || sourceColumn.shrinkToFit === true) return true
  if (sourceColumn.sortType === 'date' || sourceColumn.type === 'date') return true

  const columnIdentity = [
    sourceColumn.key,
    sourceColumn.field,
    sourceColumn.accessor,
    sourceColumn.label,
    column.key,
    column.label,
  ]
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .join(' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')

  return compactNoWrapColumnPattern.test(columnIdentity)
}

export const createStickyHeaderBaseStyle = () => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  backgroundColor: 'var(--app-surface-page)',
})

export const createDataTableHeaderCellBaseStyle = () => ({
  ...createStickyHeaderBaseStyle(),
  backgroundColor: 'var(--app-surface-raised)',
  borderBottom: '1px solid var(--app-border)',
  fontSize: '0.92rem',
  fontWeight: 600,
  color: 'var(--app-text-strong)',
})

export const createStickyActionHeaderStyle = (actionWidth) => ({
  ...createDataTableHeaderCellBaseStyle(),
  width: actionWidth,
  minWidth: actionWidth,
  maxWidth: actionWidth,
  right: 0,
  zIndex: 5,
})

export const createStickyActionCellStyle = (actionWidth) => ({
  width: actionWidth,
  minWidth: actionWidth,
  maxWidth: actionWidth,
  position: 'sticky',
  right: 0,
  zIndex: 2,
  overflow: 'visible',
  backgroundColor: 'var(--app-surface-page)',
})
