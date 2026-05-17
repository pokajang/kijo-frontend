const normalizeToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const isQuoteOwnedByUser = (record = {}, user = {}) => {
  const userStaffId = String(user?.staff_id || user?.id || '').trim()
  const userNameCode = normalizeToken(user?.name_code || user?.code)

  const recordCreatorId = String(record?.createdById || record?.created_by_id || '').trim()
  const recordCreatorCode = normalizeToken(record?.createdByCode || record?.created_by_code)

  if (userStaffId && recordCreatorId && userStaffId === recordCreatorId) return true
  if (userNameCode && recordCreatorCode && userNameCode === recordCreatorCode) return true

  return false
}
