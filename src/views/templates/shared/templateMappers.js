const getIdPatch = (isEdit, id) => (isEdit ? { id, template_id: id, proposal_id: id } : {})

const toBooleanFlag = (value) => value === true || value === 1 || value === '1'

export const fromApiTrainingTemplate = (row = {}) => {
  const agenda = Array.isArray(row.agenda) ? row.agenda : []
  const maxDay = agenda.length ? Math.max(...agenda.map((item) => Number(item?.day) || 1)) : null
  const inferredDuration =
    maxDay === 3 ? '3day' : maxDay === 2 ? '2day' : maxDay === 1 ? '1day' : ''

  return {
    trainingTitle: row.trainingTitle || row.training_title || row.serviceTitle || '',
    introduction: row.introduction || '',
    trainingCode: row.trainingCode || row.training_code || row.serviceCode || '',
    hrdNo: row.hrdNo || row.hrd_no || '',
    objectives: row.objectives || '',
    modules: row.modules || '',
    trainingRequirements: row.trainingRequirements || row.training_requirements || '',
    additionalTrainingRequirements:
      row.additionalTrainingRequirements ||
      row.additionalRequirements ||
      row.additional_requirements ||
      '',
    trainingMaterials: row.trainingMaterials || row.training_materials || '',
    lectureMedium: row.lectureMedium || row.lecture_medium || '',
    method_theory: toBooleanFlag(row.methodTheory ?? row.method_theory),
    method_theory_desc: row.methodTheoryDesc || row.method_theory_desc || '',
    method_practical: toBooleanFlag(row.methodPractical ?? row.method_practical),
    method_practical_desc: row.methodPracticalDesc || row.method_practical_desc || '',
    duration: row.duration ?? inferredDuration,
  }
}

export const fromApiTrainingAgenda = (agenda = []) =>
  (Array.isArray(agenda) ? agenda : []).map((item) => ({
    day: item.day,
    start: (item.start_time || item.start || '').slice(0, 5),
    end: (item.end_time || item.end || '').slice(0, 5),
    topic: item.topic || '',
  }))

export const toApiTrainingTemplate = ({
  templateDetails = {},
  agenda = [],
  remarks = '',
  isEdit = false,
  id = null,
}) => ({
  ...templateDetails,
  additionalRequirements: templateDetails.additionalTrainingRequirements || '',
  methodTheory: templateDetails.method_theory ? 1 : 0,
  methodTheoryDesc: templateDetails.method_theory_desc || '',
  methodPractical: templateDetails.method_practical ? 1 : 0,
  methodPracticalDesc: templateDetails.method_practical_desc || '',
  agenda,
  remarks,
  ...getIdPatch(isEdit, id),
})

export const fromApiIhTemplate = (row = {}) => ({
  serviceTitle: row.serviceTitle || row.service_title || row.ihTitle || row.ih_title || '',
  serviceCode: row.serviceCode || row.service_code || '',
  introduction: row.introduction || '',
  objectives: row.objectives || '',
  workScope: row.workScope || row.work_scope || '',
  schedule: row.schedule || '',
  reference: row.reference || '',
  otherFields: row.otherFields || row.other_fields || '',
})

export const toApiIhTemplate = ({
  templateDetails = {},
  remarks = '',
  isEdit = false,
  id = null,
}) => ({
  ...templateDetails,
  remarks,
  ...getIdPatch(isEdit, id),
})

export const fromApiManpowerTemplate = (row = {}) => ({
  serviceTitle: row.serviceTitle || row.service_title || '',
  serviceCode: row.serviceCode || row.service_code || '',
  introduction: row.introduction || '',
  serviceDeliverables: row.serviceDeliverables || row.service_deliverables || '',
  suppliedManpowerDeliverables:
    row.suppliedManpowerDeliverables || row.supplied_manpower_deliverables || '',
  customSection: row.customSection || row.custom_section || '',
})

export const toApiManpowerTemplate = ({
  templateDetails = {},
  remarks = '',
  isEdit = false,
  id = null,
}) => ({
  ...templateDetails,
  remarks,
  ...getIdPatch(isEdit, id),
})

export const fromApiSpecialTemplate = (row = {}) => {
  const hasAttachments = Array.isArray(row.attachments) && row.attachments.length > 0
  const proposalMode =
    row.proposalMode === 'upload' || row.proposalMode === 'write'
      ? row.proposalMode
      : row.proposal_mode === 'upload' || row.proposal_mode === 'write'
        ? row.proposal_mode
        : hasAttachments
          ? 'upload'
          : 'write'

  return {
    proposalMode,
    serviceTitle: row.serviceTitle || row.service_title || '',
    serviceCode: (row.serviceCode || row.service_code || '').toUpperCase(),
    serviceSummary:
      row.serviceSummary ||
      row.service_summary ||
      (proposalMode === 'upload' ? row.content || '' : ''),
    proposalContent:
      row.proposalContent ||
      row.proposal_content ||
      (proposalMode === 'write' ? row.content || '' : ''),
    defaultLineItems: Array.isArray(row.defaultLineItems)
      ? row.defaultLineItems
      : Array.isArray(row.default_line_items)
        ? row.default_line_items
        : [],
  }
}

export const appendSpecialTemplateFormData = ({
  formData,
  template = {},
  remarks = '',
  isEdit = false,
  id = null,
  removedAttachments = [],
  newAttachments = [],
}) => {
  const proposalMode = template.proposalMode || 'upload'
  const selectedContent =
    proposalMode === 'write' ? template.proposalContent || '' : template.serviceSummary || ''
  const serviceSummary = proposalMode === 'upload' ? template.serviceSummary || '' : ''
  const proposalContent = proposalMode === 'write' ? template.proposalContent || '' : ''

  formData.append('serviceTitle', template.serviceTitle || '')
  formData.append('serviceCode', template.serviceCode || '')
  formData.append('content', selectedContent)
  formData.append('proposalMode', proposalMode)
  formData.append('serviceSummary', serviceSummary)
  formData.append('proposalContent', proposalContent)
  formData.append('defaultLineItems', JSON.stringify(template.defaultLineItems || []))
  formData.append('remarks', remarks)

  if (isEdit) {
    formData.append('id', id)
    formData.append('template_id', id)
    formData.append('proposal_id', id)
    removedAttachments.forEach((attachmentId) =>
      formData.append('removeAttachmentIds[]', attachmentId),
    )
  }

  if (proposalMode === 'upload') {
    newAttachments.forEach(({ file, customName }) => {
      formData.append('attachments[]', file)
      formData.append('customNames[]', customName || file.name)
    })
  }

  return formData
}
