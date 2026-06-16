export const RECORD_ACTION_TOAST_MESSAGES = {
  deleted: 'Quotation record deleted.',
  followUpAdded: 'Follow-up added.',
  negotiationSubmitted: 'Negotiation request submitted for approval.',
  quotationEmailSent: 'Quotation email sent.',
  syncedClientDetails: 'Client details synced.',
  unAwarded: 'Quotation un-awarded. Record list refreshed.',
}

export const buildRecordMovedToastMessage = (to, filterContext = {}) => {
  const baseMessage = `Marked as ${to}.`
  const statusFilter = filterContext?.statusFilter
  const activeFilterCount = Number(filterContext?.activeFilterCount || 0)
  const hasSearch = Boolean(String(filterContext?.searchInput || '').trim())

  if (statusFilter && statusFilter !== 'all' && statusFilter !== to) {
    return `${baseMessage} Hidden from this view because Status: ${statusFilter} is active.`
  }

  if (activeFilterCount > 0 || hasSearch) {
    return `${baseMessage} Record list refreshed with current filters.`
  }

  return `${baseMessage} Record list refreshed.`
}

export const buildRecordDetailStatusToastMessage = (to) => `Marked as ${to}. Record updated.`
