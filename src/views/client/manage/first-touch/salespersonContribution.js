const normalizeText = (value) => String(value || '').trim()

export const getSalespersonContributionRows = (projects = []) => {
  const groups = new Map()

  projects.forEach((project) => {
    const salesOwner = normalizeText(project?.salesOwner)
    const salesOwnerCode = normalizeText(project?.salesOwnerCode)
    const isUnassigned = !salesOwner
    const key = isUnassigned
      ? 'unassigned'
      : `salesperson:${salesOwnerCode || salesOwner.toLocaleLowerCase()}`
    const current = groups.get(key) || {
      key,
      salesOwner: salesOwner || 'Unassigned',
      salesOwnerCode,
      projectCount: 0,
      collected: 0,
      isUnassigned,
    }

    current.projectCount += 1
    current.collected += Number(project?.collected || 0)
    groups.set(key, current)
  })

  return Array.from(groups.values()).sort((left, right) => {
    if (left.isUnassigned !== right.isUnassigned) return left.isUnassigned ? 1 : -1
    if (right.collected !== left.collected) return right.collected - left.collected
    return left.salesOwner.localeCompare(right.salesOwner)
  })
}

export const hasFirstTouchEvidenceHistory = (record) => {
  const claims = record?.claims || []

  return Boolean(
    record?.conflict ||
      (record?.disputes || []).length ||
      (record?.clarifications || []).length ||
      claims.length > 1 ||
      claims.some((claim) => (claim?.revisions || []).length),
  )
}
