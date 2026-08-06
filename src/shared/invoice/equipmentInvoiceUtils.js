const toNumber = (value) => {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const firstPresentValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '') ?? ''

export const getEquipmentInvoiceUnitPriceValue = (item = {}) =>
  firstPresentValue(
    item.marked_up_price,
    item.markedUpPrice,
    item.markedUp,
    item.unit_price,
    item.unitPrice,
  )

export const getEquipmentInvoiceUnitPrice = (item = {}) =>
  toNumber(getEquipmentInvoiceUnitPriceValue(item))

export const getEquipmentInvoiceDescription = (item = {}) => {
  return String(item.description || '').trim()
}

export const normalizeEquipmentInvoiceItem = (item = {}) => ({
  ...item,
  description: getEquipmentInvoiceDescription(item),
  item_remarks: String(item.item_remarks ?? item.itemRemarks ?? '').trim(),
  quantity: toNumber(item.quantity),
  unit_price: toNumber(
    firstPresentValue(item.unit_price, item.unitPrice, item.supplier_price, item.supplierPrice),
  ),
  marked_up_price: getEquipmentInvoiceUnitPrice(item),
})
