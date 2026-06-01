export const workloadWorkTypes = [
  {
    key: 'clerical_admin',
    label: 'Clerical / Admin',
    examples: 'Data entry, upload, print, scan, filing, record updates, basic forms.',
  },
  {
    key: 'coordination_followup',
    label: 'Coordination / Follow-up',
    examples: 'Chasing, arranging, reminders, schedules, liaison, meeting coordination.',
  },
  {
    key: 'commercial_sales',
    label: 'Commercial / Sales',
    examples: 'Proposal, quotation, tender, RFQ/RFP/RFI, pricing, client pitch.',
  },
  {
    key: 'operations_logistics',
    label: 'Operations / Logistics',
    examples: 'Delivery, collection, equipment movement, booking, site arrangement.',
  },
  {
    key: 'technical_specialist',
    label: 'Technical / Specialist',
    examples: 'HSE/IH, CHRA, HIRARC, audit response, risk assessment, technical report.',
  },
  {
    key: 'software_it',
    label: 'Software / IT',
    examples: 'Feature development, bug fix, API, database, deployment, automation.',
  },
  {
    key: 'finance_hr',
    label: 'Finance / HR',
    examples: 'Payroll, reconciliation, claims, month-end, recruitment, appraisal.',
  },
  {
    key: 'management_strategy',
    label: 'Management / Strategy',
    examples: 'KPI, resource planning, restructuring, policy, framework design.',
  },
  {
    key: 'training_delivery',
    label: 'Training / Delivery',
    examples: 'Conduct training, class/session delivery, workshop, participant handling.',
  },
  {
    key: 'creative_content',
    label: 'Creative / Content',
    examples: 'Video, poster, slides, storyboard, script, campaign assets.',
  },
  {
    key: 'non_work',
    label: 'Non-work',
    examples: 'Personal, leisure, food, or trash input.',
  },
  {
    key: 'unclear',
    label: 'Unclear',
    examples: 'No usable company work signal.',
  },
]

export const getWorkTypeLabel = (workType) =>
  workloadWorkTypes.find((type) => type.key === workType)?.label || 'Unclear'

export const topWorkTypes = (breakdown = [], limit = 2) =>
  [...breakdown]
    .filter((line) => Number(line.taskCount || 0) > 0)
    .sort((a, b) => {
      const effortDelta = Number(b.effortPoints || 0) - Number(a.effortPoints || 0)
      if (effortDelta !== 0) return effortDelta
      return Number(b.taskCount || 0) - Number(a.taskCount || 0)
    })
    .slice(0, limit)
