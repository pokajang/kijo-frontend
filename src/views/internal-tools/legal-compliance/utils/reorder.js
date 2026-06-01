export const clampIndex = (index, length) => {
  if (length <= 0) return 0
  const numericIndex = Number(index)
  if (!Number.isFinite(numericIndex)) return length
  return Math.min(Math.max(Math.trunc(numericIndex), 0), length)
}

export const moveItem = (items = [], fromIndex, toIndex) => {
  if (!Array.isArray(items) || items.length === 0) return []

  const sourceIndex = clampIndex(fromIndex, items.length - 1)
  const targetIndex = clampIndex(toIndex, items.length - 1)

  if (sourceIndex === targetIndex) return items

  const nextItems = [...items]
  const [item] = nextItems.splice(sourceIndex, 1)
  nextItems.splice(targetIndex, 0, item)
  return nextItems
}

export const insertItem = (items = [], item, index = items.length) => {
  const sourceItems = Array.isArray(items) ? items : []
  const insertIndex = clampIndex(index, sourceItems.length)
  const nextItems = [...sourceItems]
  nextItems.splice(insertIndex, 0, item)
  return nextItems
}
