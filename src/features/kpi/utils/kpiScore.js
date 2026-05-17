export const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export const formatScoreNumber = (value) => {
  const number = toFiniteNumber(value)
  const rounded = Math.round(number * 10) / 10

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export const getKpiStatus = (achievementPct) => {
  const pct = toFiniteNumber(achievementPct)

  if (pct > 100) return { badgeColor: 'primary', statusLabel: 'Exceeded' }
  if (pct >= 80) return { badgeColor: 'success', statusLabel: 'On Track' }
  if (pct >= 50) return { badgeColor: 'warning', statusLabel: 'Watch' }
  return { badgeColor: 'danger', statusLabel: 'At Risk' }
}

export const getKpiWeightedScore = (kpi) => {
  const current = toFiniteNumber(kpi.current)
  const target = toFiniteNumber(kpi.annual_target)
  const weightage = Math.max(toFiniteNumber(kpi.weightage), 0)
  const achievementRatio = target > 0 ? current / target : 0
  const cappedRatio = Math.min(Math.max(achievementRatio, 0), 1)
  const achievementPct = achievementRatio * 100
  const earnedWeight = cappedRatio * weightage

  return {
    current,
    target,
    weightage,
    achievementRatio,
    cappedRatio,
    achievementPct,
    earnedWeight,
  }
}

export const buildWeightedScoreSummary = (kpis = []) => {
  const segments = (kpis || [])
    .map((kpi) => {
      const score = getKpiWeightedScore(kpi)

      if (score.weightage <= 0) return null

      const { badgeColor, statusLabel } = getKpiStatus(score.achievementPct)

      return {
        id: kpi.id,
        label: kpi.label,
        unit: kpi.unit,
        color: badgeColor,
        statusLabel,
        ...score,
      }
    })
    .filter(Boolean)

  const totalWeight = segments.reduce((sum, segment) => sum + segment.weightage, 0)
  const totalEarned = segments.reduce((sum, segment) => sum + segment.earnedWeight, 0)
  const overallPct = totalWeight > 0 ? (totalEarned / totalWeight) * 100 : 0

  return {
    segments,
    totalWeight,
    totalEarned,
    overallPct,
  }
}
