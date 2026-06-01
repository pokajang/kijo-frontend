import { formatCount, formatMoney, getTopGroupBySum, sumBy } from '../../../utils/stats/formatStats'
import { isProjectActive, normalizeProjectStatus, shouldIncludeProjectValue } from './projectStatus'

export const buildProjectTableStats = (normalizedProjects = [], nowTime = Date.now()) => {
  const activeRows = normalizedProjects.filter(isProjectActive)
  const valueRows = normalizedProjects.filter(shouldIncludeProjectValue)
  const terminatedValue = sumBy(
    normalizedProjects.filter((project) => normalizeProjectStatus(project) === 'terminated'),
    (project) => project.value,
  )
  const needsUpdateRows = activeRows.filter((project) => {
    if (!project.update) return true
    const updateDate = new Date(project.update)
    if (Number.isNaN(updateDate.getTime())) return true
    return nowTime - updateDate.getTime() > 14 * 86400000
  })
  const missingUpdateRows = activeRows.filter((project) => !project.update)
  const topLeader = getTopGroupBySum(
    valueRows,
    (project) => project.owner,
    (project) => project.value,
  )

  return [
    {
      key: 'total-value',
      label: 'Total Value',
      value: formatMoney(sumBy(valueRows, (project) => project.value)),
      sublabel: terminatedValue > 0 ? `Excludes terminated: ${formatMoney(terminatedValue)}` : '',
      tone: 'primary',
    },
    {
      key: 'active',
      label: 'Active',
      value: formatCount(activeRows.length),
      tone: 'info',
    },
    {
      key: 'needs-update',
      label: 'Needs Update',
      value: formatCount(needsUpdateRows.length),
      sublabel: `${formatCount(missingUpdateRows.length)} missing update`,
      tone: needsUpdateRows.length ? 'warning' : 'success',
    },
    {
      key: 'top-leader',
      label: 'Top Leader',
      value: topLeader.value,
      sublabel: `${formatMoney(topLeader.total)} across ${formatCount(topLeader.count)} projects`,
      tone: 'secondary',
    },
  ]
}
