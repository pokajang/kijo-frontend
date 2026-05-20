import {
  formatCount,
  formatMoney,
  getTopGroupBySum,
  normalizeGroupLabel,
  parseMoneyValue,
  sumBy,
} from '../../../../utils/stats/formatStats'

const defaultGetAmount = (record) =>
  record?.__tableMeta?.amountValue ??
  record?.__serviceTableMeta?.amountValue ??
  record?.amount ??
  record?.grandTotal ??
  0

const defaultGetStatusLabel = (record) =>
  record?.__tableMeta?.statusLabel ||
  record?.__serviceTableMeta?.statusLabel ||
  record?.status ||
  ''

const defaultGetStatusTone = (record) =>
  record?.__tableMeta?.statusTone || record?.__serviceTableMeta?.statusTone || ''

const defaultGetCreator = (record) =>
  record?.createdByCode || record?.created_by_code || record?.createdByName

const defaultGetInquirySource = (record) =>
  record?.inquirySource || record?.inquiry_source || record?.source || ''

const defaultGetServiceLabel = (record) =>
  record?.formData?.serviceTitle ||
  record?.formData?.trainingTopic ||
  record?.trainingTitle ||
  record?.training_title ||
  ''

const getRankedGroupsByCount = (rows = [], groupGetter = () => '', valueGetter = () => 0) => {
  const groups = new Map()

  rows.forEach((row) => {
    const label = normalizeGroupLabel(groupGetter(row))
    if (!label) return

    const current = groups.get(label) || { value: label, count: 0, total: 0 }
    groups.set(label, {
      ...current,
      count: current.count + 1,
      total: current.total + parseMoneyValue(valueGetter(row)),
    })
  })

  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (b.total !== a.total) return b.total - a.total
    return a.value.localeCompare(b.value)
  })
}

const getRankedEntriesByCount = (rows = [], entryGetter = () => []) => {
  const groups = new Map()

  rows.forEach((row) => {
    const entries = entryGetter(row)
    const normalizedEntries = Array.isArray(entries) ? entries : [entries]

    normalizedEntries.forEach((entry) => {
      const label = normalizeGroupLabel(entry?.label ?? entry)
      if (!label) return

      const current = groups.get(label) || { value: label, count: 0, total: 0 }
      groups.set(label, {
        ...current,
        count: current.count + 1,
        total: current.total + parseMoneyValue(entry?.amount ?? 0),
      })
    })
  })

  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (b.total !== a.total) return b.total - a.total
    return a.value.localeCompare(b.value)
  })
}

const formatRankedServiceSublabel = (group, fallback, config = {}) => {
  if (!group) return fallback

  const countLabel =
    group.count === 1 ? config.countSingular || 'quote' : config.countPlural || 'quotes'
  return `${formatCount(group.count)} ${countLabel} | ${formatMoney(group.total)}`
}

const buildServiceRankCard = (group, rank, config = {}) => ({
  key: rank === 1 ? config.topKey || 'top-service' : config.secondKey || 'second-top-service',
  label: rank === 1 ? config.topLabel || 'Top Service' : config.secondLabel || '2nd Top Service',
  value: group?.value || '-',
  sublabel: formatRankedServiceSublabel(
    group,
    rank === 1
      ? config.emptyTopLabel || 'No service recorded'
      : config.emptySecondLabel || 'No second service',
    config,
  ),
  tone: rank === 1 ? 'info' : 'secondary',
})

export const buildQuoteRecordStatsItems = (records = [], options = {}) => {
  const rows = Array.isArray(records) ? records : []
  const getAmount = options.getAmount || defaultGetAmount
  const getStatusLabel = options.getStatusLabel || defaultGetStatusLabel
  const getStatusTone = options.getStatusTone || defaultGetStatusTone
  const getCreator = options.getCreator || defaultGetCreator
  const getInquirySource = options.getInquirySource || defaultGetInquirySource
  const finalMetric = options.finalMetric || 'top-creator'

  const awardedRows = rows.filter((record) => {
    const label = String(getStatusLabel(record) || '').toLowerCase()
    const tone = String(getStatusTone(record) || '').toLowerCase()
    return tone === 'success' || label.includes('award') || label.includes('success')
  })
  const terminatedAfterAwardValue = sumBy(
    awardedRows,
    (record) => record?.terminatedProjectValue ?? record?.terminated_project_value ?? 0,
  )

  const pendingFollowUpRows = rows.filter((record) => {
    const label = String(getStatusLabel(record) || '').toLowerCase()
    const hasFollowUp = Array.isArray(record?.followUps) && record.followUps.length > 0
    const isClosed =
      label.includes('award') ||
      label.includes('success') ||
      label.includes('fail') ||
      label.includes('lost')
    return !hasFollowUp && !isClosed
  })

  const topCreator = getTopGroupBySum(rows, getCreator, getAmount)
  const topInquirySource = getTopGroupBySum(rows, getInquirySource, getAmount)
  const finalCard =
    finalMetric === 'top-source'
      ? {
          key: 'top-source',
          label: 'Top Source',
          value: topInquirySource.value,
          sublabel:
            topInquirySource.count > 0
              ? `${formatMoney(topInquirySource.total)} across ${formatCount(
                  topInquirySource.count,
                )} quotes`
              : 'No source recorded',
          tone: 'secondary',
        }
      : {
          key: 'top-creator',
          label: 'Top Creator',
          value: topCreator.value,
          sublabel: `${formatMoney(topCreator.total)} across ${formatCount(
            topCreator.count,
          )} quotes`,
          tone: 'secondary',
        }

  return [
    {
      key: 'total-value',
      label: 'Total Value',
      value: formatMoney(sumBy(rows, getAmount)),
      tone: 'primary',
    },
    {
      key: 'awarded',
      label: 'Awarded',
      value: formatCount(awardedRows.length),
      sublabel:
        terminatedAfterAwardValue > 0
          ? `${formatMoney(sumBy(awardedRows, getAmount))} | Terminated after award: ${formatMoney(
              terminatedAfterAwardValue,
            )}`
          : formatMoney(sumBy(awardedRows, getAmount)),
      tone: 'success',
    },
    {
      key: 'follow-up',
      label: 'Pending Follow-up',
      value: formatCount(pendingFollowUpRows.length),
      tone: pendingFollowUpRows.length ? 'warning' : 'secondary',
    },
    finalCard,
  ]
}

export const buildServiceQuoteRecordStatsItems = (records = [], options = {}) => {
  const rows = Array.isArray(records) ? records : []
  const getAmount = options.getAmount || defaultGetAmount
  const getStatusLabel = options.getStatusLabel || defaultGetStatusLabel
  const getStatusTone = options.getStatusTone || defaultGetStatusTone

  const awardedRows = rows.filter((record) => {
    const label = String(getStatusLabel(record) || '').toLowerCase()
    const tone = String(getStatusTone(record) || '').toLowerCase()
    return tone === 'success' || label.includes('award') || label.includes('success')
  })
  const terminatedAfterAwardValue = sumBy(
    awardedRows,
    (record) => record?.terminatedProjectValue ?? record?.terminated_project_value ?? 0,
  )
  const rankedGroups =
    typeof options.getServiceEntries === 'function'
      ? getRankedEntriesByCount(rows, options.getServiceEntries)
      : getRankedGroupsByCount(rows, options.getServiceLabel || defaultGetServiceLabel, getAmount)

  return [
    {
      key: 'total-value',
      label: 'Total Value',
      value: formatMoney(sumBy(rows, getAmount)),
      tone: 'primary',
    },
    {
      key: 'awarded',
      label: 'Awarded',
      value: formatCount(awardedRows.length),
      sublabel:
        terminatedAfterAwardValue > 0
          ? `${formatMoney(sumBy(awardedRows, getAmount))} | Terminated after award: ${formatMoney(
              terminatedAfterAwardValue,
            )}`
          : formatMoney(sumBy(awardedRows, getAmount)),
      tone: 'success',
    },
    buildServiceRankCard(rankedGroups[0], 1, options),
    buildServiceRankCard(rankedGroups[1], 2, options),
  ]
}
