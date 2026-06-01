export const assistantSourceType = (source) =>
  String(source?.source_type || source?.type || 'knowledge').toLowerCase()

export const isAssistantHelpSource = (source) => assistantSourceType(source) === 'assistant_help'

export const assistantSourceCanOpen = (source) =>
  (assistantSourceType(source) === 'knowledge' && Boolean(source?.slug)) ||
  Boolean(source?.related_route)

export const assistantSourceTypeLabel = (source) => {
  const type = assistantSourceType(source)
  const labels = {
    knowledge: '',
    assistant_help: 'AI Help',
    handbook: 'Handbook',
    dashboard: 'Dashboard',
    live_metric: 'Live data',
    live_entity: 'Live data',
    project: 'Project',
    client: 'Client',
    vendor: 'Vendor',
    invoice: 'Invoice',
    debtor: 'Debtor',
    vendor_registration: 'Vendor Registration',
    quote_record: 'Quote',
    sales_inquiry: 'Sales Inquiry',
    leave: 'Leave',
    task: 'Task',
    staff: 'Staff',
    legal_compliance: 'Legal Compliance',
    proposal_template: 'Proposal Template',
    jd14: 'JD14',
    system_feedback: 'System Feedback',
    catalog: 'Catalog',
    purchase_order: 'Purchase Order',
    meeting: 'Meeting',
    procedure: 'Procedure',
    appraisal: 'Appraisal',
    whats_new: "What's New",
  }

  return labels[type] ?? type.replace(/_/g, ' ')
}

export const assistantSourceStatusLabels = (source) => {
  const labels = []
  const deleted = source?.source_is_deleted === true || source?.source_is_deleted === 1
  const freshness = String(source?.source_freshness_label || '').trim()
  const status = String(source?.source_status || '').trim()
  const notableStatuses = new Set(['deleted', 'archived', 'draft', 'stale', 'inactive'])
  const addLabel = (label) => {
    const normalized = String(label || '').trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (!labels.some((existing) => existing.toLowerCase() === key)) {
      labels.push(normalized)
    }
  }

  if (deleted) {
    addLabel('Deleted')
  }
  if (freshness && !(deleted && freshness.toLowerCase().includes('deleted'))) {
    addLabel(freshness)
  } else if (status && notableStatuses.has(status.toLowerCase())) {
    addLabel(status)
  }

  return labels.slice(0, 2)
}
