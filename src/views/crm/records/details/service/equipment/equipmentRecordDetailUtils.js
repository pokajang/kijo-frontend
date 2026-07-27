import {
  formatMoney,
  formatNumber,
  formatPercentage,
  toFiniteNumber,
} from '../../quotationDetailUtils'

export const buildEquipmentCalculationRows = (record = {}) => {
  const formData = record.formData || {}
  const items = Array.isArray(record.lineItems) ? record.lineItems : []
  const itemRows = items.map((item, index) => ({
    key: `equipment-item-${item.id ?? index}`,
    label: item.itemName || `Equipment Item ${index + 1}`,
    description: item.description || '',
    calculation: `${formatNumber(item.quantity)} ${item.unit || 'unit(s)'} × ${formatMoney(
      item.markedUp,
    )}`,
    amount: toFiniteNumber(item.lineTotal),
  }))
  const itemsTotal = itemRows.reduce((sum, row) => sum + row.amount, 0)
  const deliveryCharge = toFiniteNumber(record.deliveryCharge)
  const miscCharge = toFiniteNumber(record.miscCharge)
  const discount = toFiniteNumber(record.discount)

  return [
    ...itemRows,
    {
      key: 'items-total',
      label: 'Items Total',
      calculation: '',
      amount: itemsTotal,
      emphasis: 'subtotal',
    },
    {
      key: 'delivery',
      label: 'Delivery Charge',
      calculation: deliveryCharge > 0 ? 'Fixed charge' : 'No charge',
      amount: deliveryCharge,
    },
    {
      key: 'miscellaneous',
      label: 'Miscellaneous Charge',
      calculation: miscCharge > 0 ? 'Fixed charge' : 'No charge',
      amount: miscCharge,
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
      amount: toFiniteNumber(record.subtotal),
      emphasis: 'subtotal',
    },
    {
      key: 'sst',
      label: 'SST',
      calculation: `${formatPercentage(record.sstPercent ?? formData.sstPercent)} of subtotal`,
      amount: toFiniteNumber(record.sstAmount),
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
