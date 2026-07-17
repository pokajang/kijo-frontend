import React from 'react'

import { CBadge } from '@coreui/react'

import { getTrafficLightStatus, normalizeTrafficLightAmount } from './trafficLightConfig'

const DECISIONS = {
  green: { color: 'success', label: 'Green — You can issue this' },
  yellow: { color: 'warning', label: 'Yellow — Need HOD approval first' },
  red: { color: 'danger', label: 'Red — Need BD/MD approval first' },
}

const TrafficLightDecisionBadge = ({ serviceKey, estimatedTotalCost, quoteTotal }) => {
  const estimated = normalizeTrafficLightAmount(estimatedTotalCost)
  const quote = normalizeTrafficLightAmount(quoteTotal)

  if (!estimated) {
    return <CBadge color="secondary">Estimated cost required</CBadge>
  }

  if (!quote) return null

  const { status } = getTrafficLightStatus({
    serviceKey,
    quoteTotal: quote,
    estimatedTotalCost: estimated,
  })
  const decision = DECISIONS[status]

  return decision ? <CBadge color={decision.color}>{decision.label}</CBadge> : null
}

export default TrafficLightDecisionBadge
