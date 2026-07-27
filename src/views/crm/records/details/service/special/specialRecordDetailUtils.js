import {
  formatMoney,
  formatNumber,
  formatPercentage,
  toFiniteNumber,
} from '../../quotationDetailUtils'

export const buildSpecialCalculationRows = (record = {}) => {
  const formData = record.formData || {}
  const items = Array.isArray(record.lineItems) ? record.lineItems : []
  const itemRows = items.map((item, index) => ({
    key: `line-item-${item.id ?? index}`,
    label: item.title || `Line Item ${index + 1}`,
    description: item.description || '',
    calculation: `${formatNumber(item.quantity)} ${item.unit || 'unit(s)'} × ${formatMoney(
      item.unitPrice,
    )}`,
    amount: toFiniteNumber(item.lineTotal),
  }))
  const lineItemsSubtotal = itemRows.reduce((sum, row) => sum + row.amount, 0)
  const discount = toFiniteNumber(record.discountAmount ?? record.discount ?? formData.discount)

  return [
    ...itemRows,
    {
      key: 'line-items-subtotal',
      label: 'Line Items Subtotal',
      calculation: '',
      amount: lineItemsSubtotal,
      emphasis: 'subtotal',
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
      label: 'Subtotal After Discount',
      calculation: '',
      amount: toFiniteNumber(record.subtotal ?? formData.subTotal),
      emphasis: 'subtotal',
    },
    {
      key: 'sst',
      label: 'SST',
      calculation: `${formatPercentage(record.sstPercent ?? formData.sstPercent)} of subtotal`,
      amount: toFiniteNumber(record.sstAmount ?? formData.sstAmount),
    },
    {
      key: 'grand-total',
      label: 'Grand Total',
      calculation: '',
      amount: toFiniteNumber(record.grandTotal ?? record.amount ?? formData.grandTotal),
      emphasis: 'grand-total',
    },
  ]
}
