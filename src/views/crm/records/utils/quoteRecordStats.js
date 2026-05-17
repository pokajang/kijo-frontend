import {
  formatCount,
  formatMoney,
  getTopGroupBySum,
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
      sublabel: formatMoney(sumBy(awardedRows, getAmount)),
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
