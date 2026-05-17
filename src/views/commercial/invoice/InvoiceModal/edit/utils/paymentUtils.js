export const normalizePaymentMethod = (type, grantApprovalNo) => {
  const typeLower = String(type || '')
    .trim()
    .toLowerCase()
  if (typeLower !== 'training') return 'Direct Payment'
  const grantNo = String(grantApprovalNo || '').trim()
  return grantNo ? 'HRD Grant' : 'Direct Payment'
}
