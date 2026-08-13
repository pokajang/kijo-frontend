const parseArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const formatVendorPaymentPerson = (person = {}) => {
  const fullName =
    person.fullName || person.full_name || person.actorName || person.actor_name || ''
  const nameCode =
    person.nameCode || person.name_code || person.actorCode || person.actor_code || ''
  const staffId = person.staffId || person.staff_id || ''

  if (fullName && nameCode) return `${fullName} (${nameCode})`
  if (fullName) return fullName
  if (nameCode) return nameCode
  return staffId ? `Staff #${staffId}` : ''
}

export const formatVendorPaymentWorkflowDate = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return raw

  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(parsed)
    .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase())
}

const getStageType = (stage = {}) => stage.stageType || stage.stage_type || ''
const getLevelNo = (stage = {}) => Number(stage.levelNo || stage.level_no || 1)

const getStageLabel = (stage = {}) => {
  if (stage.label) return stage.label
  const stageType = getStageType(stage)
  const levelNo = getLevelNo(stage)
  if (stageType === 'review') return levelNo > 1 ? `Review Level ${levelNo}` : 'Review'
  if (stageType === 'approval') return levelNo > 1 ? `Approval Level ${levelNo}` : 'Approval'
  if (stageType === 'finance') return 'Finance'
  return 'Workflow'
}

const getCompletedStatus = (stage = {}) => {
  if (stage.status) return stage.status
  const stageType = getStageType(stage)
  if (stageType === 'review') return 'Reviewed'
  if (stageType === 'approval') return 'Approved'
  if (stageType === 'finance') return 'Paid'
  return 'Completed'
}

const normalizePeople = (value) =>
  parseArray(value)
    .map((person) => ({
      ...person,
      label: formatVendorPaymentPerson(person),
    }))
    .filter((person) => person.label)

const getRecipients = (stage = {}) =>
  normalizePeople(stage.recipients || stage.effectiveRecipients || stage.effective_recipients)

const normalizeWorkflowStage = (stage = {}) => {
  const stageType = getStageType(stage)
  const levelNo = getLevelNo(stage)
  const state = String(stage.state || 'waiting').toLowerCase()
  const actor = stage.actor || stage

  return {
    ...stage,
    key: stage.key || `${stageType || 'workflow'}.${levelNo}`,
    stageType,
    levelNo,
    label: getStageLabel(stage),
    state,
    status: stage.status || (state === 'completed' ? getCompletedStatus(stage) : 'Waiting'),
    actor: {
      ...actor,
      label: formatVendorPaymentPerson(actor),
    },
    recipients: getRecipients(stage),
    completedAt: stage.completedAt || stage.completed_at || '',
    remarks: String(stage.remarks || ''),
  }
}

const legacyProgressStages = (payment = {}) =>
  parseArray(
    payment.workflow_progress || payment.workflowProgress || payment.workflow_progress_json,
  ).map((entry) =>
    normalizeWorkflowStage({
      ...entry,
      state: 'completed',
      actor: {
        staffId: entry.staffId || entry.staff_id,
        fullName: entry.actorName || entry.actor_name,
        nameCode: entry.actorCode || entry.actor_code,
      },
      status: getCompletedStatus(entry),
      completedAt: entry.completedAt || entry.completed_at,
    }),
  )

const legacyCurrentStage = (payment = {}) => {
  if (payment.status === 'Pending') {
    return { stageType: 'review', label: 'Review', state: 'current', status: 'Pending' }
  }
  if (payment.status === 'Checked') {
    return { stageType: 'approval', label: 'Approval', state: 'current', status: 'Pending' }
  }
  if (['Approved', 'Partially Paid'].includes(payment.status)) {
    return {
      stageType: 'finance',
      label: 'Finance',
      state: 'current',
      status: payment.status === 'Partially Paid' ? 'Partially paid' : 'Ready for payment',
    }
  }
  return null
}

export const getVendorPaymentWorkflowStages = (payment = {}) => {
  const flowStages = payment.workflow_flow?.stages || payment.workflowFlow?.stages
  if (Array.isArray(flowStages) && flowStages.length) {
    return flowStages.map(normalizeWorkflowStage)
  }

  const stages = legacyProgressStages(payment)
  const currentStage = legacyCurrentStage(payment)
  if (currentStage) stages.push(normalizeWorkflowStage(currentStage))

  return stages
}

export const getVendorPaymentWorkflowSummary = (payment = {}) => {
  const stages = getVendorPaymentWorkflowStages(payment)
  const completedCount = stages.filter((stage) => stage.state === 'completed').length
  const currentStage = stages.find((stage) => stage.state === 'current')
  const terminalStage = stages.find((stage) => ['returned', 'rejected'].includes(stage.state))
  const focusStage = currentStage || terminalStage
  const isComplete = stages.length > 0 && completedCount === stages.length

  return {
    stages,
    currentStage,
    completedCount,
    totalCount: stages.length,
    primary: focusStage
      ? `${focusStage.label} · ${focusStage.status}`
      : isComplete
        ? 'Workflow complete'
        : payment.status || 'Workflow',
    progress: stages.length
      ? `${completedCount} of ${stages.length} ${stages.length === 1 ? 'stage' : 'stages'} completed`
      : 'Workflow details unavailable',
  }
}

export const getVendorPaymentStagePeopleLabel = (stage = {}) => {
  if (stage.actor?.label) {
    if (stage.state === 'returned') return 'Returned by'
    if (stage.state === 'rejected') return 'Rejected by'
    if (stage.stageType === 'review') return 'Reviewed by'
    if (stage.stageType === 'approval') return 'Approved by'
    if (stage.stageType === 'finance') return 'Paid by'
    return 'Completed by'
  }

  if (stage.state === 'completed') {
    if (stage.stageType === 'review') return 'Configured reviewers'
    if (stage.stageType === 'approval') return 'Configured approvers'
    if (stage.stageType === 'finance') return 'Configured finance personnel'
  }

  return 'Assigned to'
}

export const buildVendorPaymentWorkflowStep = (stage = {}) => {
  const normalized = normalizeWorkflowStage(stage)
  const actor = normalized.actor.label
  const recipients = normalized.recipients.map((person) => person.label)
  const people = actor || recipients.join(', ')
  const peopleLabel = getVendorPaymentStagePeopleLabel(normalized)
  const completedAt = formatVendorPaymentWorkflowDate(normalized.completedAt)

  return [
    `${normalized.label}: ${normalized.status}`,
    people ? `${peopleLabel} ${people}` : '',
    completedAt ? `at ${completedAt}` : '',
    normalized.remarks ? `Remarks: ${normalized.remarks}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export const getVendorPaymentWorkflowSteps = (payment = {}) =>
  getVendorPaymentWorkflowStages(payment).map(buildVendorPaymentWorkflowStep).filter(Boolean)

export const getVendorPaymentCurrentStageLabel = (payment = {}) => {
  const summary = getVendorPaymentWorkflowSummary(payment)
  return summary.currentStage?.label || '-'
}
