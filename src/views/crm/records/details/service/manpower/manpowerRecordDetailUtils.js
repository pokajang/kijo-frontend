import { getManpowerRateOption } from '../../../../quotes/manpower/manpowerRates'
import {
  formatMoney,
  formatNumber,
  formatPercentage,
  toFiniteNumber,
} from '../../quotationDetailUtils'

export const getManpowerRateLabel = (value) =>
  getManpowerRateOption(value)?.label || value || 'Not provided'

export const buildManpowerCalculationRows = (record = {}) => {
  const formData = record.formData || {}
  const isHourly = formData.billingUnit === 'hour'
  const duration = toFiniteNumber(isHourly ? formData.durationHours : formData.durationMonths)
  const personnel = toFiniteNumber(formData.noOfPax)
  const unitCost = toFiniteNumber(formData.unitCost)
  const discount = toFiniteNumber(record.discountAmount ?? formData.discount)
  const subtotal = toFiniteNumber(record.subtotal)
  const manpowerCost = subtotal + discount

  return [
    {
      key: 'manpower-cost',
      label: 'Manpower Cost',
      calculation: `${formatNumber(personnel)} pax × ${formatNumber(duration)} ${
        isHourly ? 'hour(s)' : 'month(s)'
      } × ${formatMoney(unitCost)}`,
      amount: manpowerCost,
    },
    {
      key: 'discount',
      label: 'Discount',
      calculation: discount > 0 ? 'Deduction' : 'No discount',
      amount: discount,
      negative: discount > 0,
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      calculation: '',
      amount: subtotal,
      emphasis: 'subtotal',
    },
    {
      key: 'sst',
      label: 'SST',
      calculation: `${formatPercentage(formData.sstPercent)} of subtotal`,
      amount: toFiniteNumber(record.sstAmount ?? record.sst_amount),
    },
    {
      key: 'grand-total',
      label: 'Grand Total',
      calculation: '',
      amount: toFiniteNumber(record.grandTotal ?? record.amount),
      emphasis: 'grand-total',
    },
  ]
}
