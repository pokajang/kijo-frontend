const TRAINING_THRESHOLD = {
  red: 25,
  yellow: 25,
  green: 40,
}

const IH_THRESHOLD = {
  red: 20,
  yellow: 20,
  green: 35,
}

const EQUIPMENT_THRESHOLD = {
  red: 10,
  yellow: 10,
  green: 30,
}

const normalizePositiveNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export const normalizeTrafficLightAmount = (value) => normalizePositiveNumber(value)

export const TRAFFIC_LIGHT_RULE_VERSION = 'v1'

export const TRAFFIC_LIGHT_RULES_BY_SERVICE = {
  training: TRAINING_THRESHOLD,
  ih: IH_THRESHOLD,
  equipment: EQUIPMENT_THRESHOLD,
}

export const DEFAULT_TRAFFIC_LIGHT_RULE = TRAINING_THRESHOLD

export const getTrafficLightRules = (serviceKey) =>
  TRAFFIC_LIGHT_RULES_BY_SERVICE[String(serviceKey || '').toLowerCase()] ||
  DEFAULT_TRAFFIC_LIGHT_RULE

export const getTrafficLightStatus = ({ serviceKey, quoteTotal, estimatedTotalCost }) => {
  const estimated = normalizePositiveNumber(estimatedTotalCost)
  const quote = Number(quoteTotal)
  const rules = getTrafficLightRules(serviceKey)

  if (!estimated || !Number.isFinite(quote)) {
    return {
      status: 'unknown',
      marginPercent: null,
      hasEstimate: false,
      rules,
      estimatedTotalCost: null,
      quoteTotal: Number.isFinite(quote) ? quote : null,
    }
  }

  const marginPercent = ((quote - estimated) / estimated) * 100

  if (marginPercent >= rules.green) {
    return {
      status: 'green',
      marginPercent,
      hasEstimate: true,
      rules,
      estimatedTotalCost: estimated,
      quoteTotal: quote,
    }
  }

  if (marginPercent >= rules.yellow) {
    return {
      status: 'yellow',
      marginPercent,
      hasEstimate: true,
      rules,
      estimatedTotalCost: estimated,
      quoteTotal: quote,
    }
  }

  return {
    status: 'red',
    marginPercent,
    hasEstimate: true,
    rules,
    estimatedTotalCost: estimated,
    quoteTotal: quote,
  }
}
