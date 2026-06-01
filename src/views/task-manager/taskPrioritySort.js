const invalidAscDate = Number.POSITIVE_INFINITY
const invalidDescDate = Number.POSITIVE_INFINITY

const toDateTime = (value) => {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

const compareNumber = (left, right) => {
  if (left === right) return 0
  return left < right ? -1 : 1
}

const getStatusRank = (task) => {
  const rank = Number(task?.statusRank)
  return Number.isFinite(rank) ? rank : 99
}

const getAscDateValue = (value) => {
  const time = toDateTime(value)
  return time === null ? invalidAscDate : time
}

const getDescDateValue = (value) => {
  const time = toDateTime(value)
  return time === null ? invalidDescDate : -time
}

const getDescNumberValue = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? -number : Number.POSITIVE_INFINITY
}

const isCompletedTask = (task) => String(task?.statusText || '').startsWith('Completed')

export const compareTaskPriority = (_leftValue, _rightValue, left, right) => {
  const statusComparison = compareNumber(getStatusRank(left), getStatusRank(right))
  if (statusComparison !== 0) return statusComparison

  const leftPrimaryDate = isCompletedTask(left)
    ? getDescDateValue(left?.completedAt || left?.createdAt)
    : getAscDateValue(left?.dueDate)
  const rightPrimaryDate = isCompletedTask(right)
    ? getDescDateValue(right?.completedAt || right?.createdAt)
    : getAscDateValue(right?.dueDate)
  const primaryDateComparison = compareNumber(leftPrimaryDate, rightPrimaryDate)
  if (primaryDateComparison !== 0) return primaryDateComparison

  const createdComparison = compareNumber(
    getDescDateValue(left?.createdAt),
    getDescDateValue(right?.createdAt),
  )
  if (createdComparison !== 0) return createdComparison

  return compareNumber(getDescNumberValue(left?.id), getDescNumberValue(right?.id))
}
