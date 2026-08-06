export const getEquipmentDeliveryDescription = (item = {}) => {
  return String(item.description || '').trim()
}

export const getEquipmentDeliveryRemarks = (item = {}) =>
  String(item.item_remarks ?? item.itemRemarks ?? '').trim()
