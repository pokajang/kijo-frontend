import { stripHtml } from './templateUtils'

export const hasText = (value) => String(value || '').trim().length > 0

export const hasRichText = (value) => hasText(stripHtml(value))

export const formatValidationErrors = (errors = []) =>
  errors
    .map((error) => error.message)
    .filter(Boolean)
    .join('\n')

export const getValidationErrorMap = (errors = []) =>
  errors.reduce((map, error) => {
    if (error?.field && error?.message && !map[error.field]) {
      map[error.field] = error.message
    }
    return map
  }, {})

const addRequiredText = (errors, value, field, label) => {
  if (!hasText(value)) {
    errors.push({ field, message: `${label} is required.` })
  }
}

const addRequiredRichText = (errors, value, field, label) => {
  if (!hasRichText(value)) {
    errors.push({ field, message: `${label} is required.` })
  }
}

const addMaxLength = (errors, value, maxLength, field, label) => {
  const text = String(value || '')
  if (text.length > maxLength) {
    errors.push({
      field,
      message: `${label} must be ${maxLength} characters or fewer.`,
    })
  }
}

const toMinutes = (value) => {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export const validateTrainingTemplate = ({ templateDetails = {}, agendaRows = [], remarks }) => {
  const errors = []
  let completeAgendaRows = 0

  addRequiredText(errors, templateDetails.trainingTitle, 'trainingTitle', 'Training title')
  addRequiredText(errors, templateDetails.trainingCode, 'trainingCode', 'Training code')
  addRequiredText(errors, templateDetails.duration, 'duration', 'Training duration')
  addRequiredRichText(errors, templateDetails.introduction, 'introduction', 'Introduction')
  addRequiredRichText(errors, templateDetails.objectives, 'objectives', 'Objectives')
  addRequiredRichText(errors, remarks, 'remarks', 'Remarks')

  addMaxLength(errors, templateDetails.trainingTitle, 255, 'trainingTitle', 'Training title')
  addMaxLength(errors, templateDetails.trainingCode, 100, 'trainingCode', 'Training code')
  addMaxLength(errors, templateDetails.hrdNo, 100, 'hrdNo', 'HRD program number')
  addMaxLength(errors, templateDetails.lectureMedium, 255, 'lectureMedium', 'Lecture medium')
  addMaxLength(errors, templateDetails.duration, 100, 'duration', 'Training duration')
  addMaxLength(errors, remarks, 1000, 'remarks', 'Remarks')

  agendaRows.forEach((row, index) => {
    const start = String(row?.start || '').trim()
    const end = String(row?.end || '').trim()
    const topic = stripHtml(row?.topic || '').trim()
    const hasAnyValue = start || end || topic

    if (!hasAnyValue) return

    const label = `Agenda Day ${row?.day || 1}, row ${index + 1}`
    if (!start || !end || !topic) {
      errors.push({
        field: `agenda.${index}`,
        message: `${label} must include start time, end time, and topic.`,
      })
      return
    }

    completeAgendaRows += 1
    const startMinutes = toMinutes(start)
    const endMinutes = toMinutes(end)
    if (startMinutes != null && endMinutes != null && startMinutes >= endMinutes) {
      errors.push({
        field: `agenda.${index}`,
        message: `${label} start time must be before end time.`,
      })
    }
    addMaxLength(errors, row?.topic, 500, `agenda.${index}`, `${label} topic`)
  })

  if (completeAgendaRows === 0) {
    errors.push({
      field: 'agenda',
      message: 'At least one complete agenda row is required.',
    })
  }

  return errors
}

export const validateIhTemplate = ({ templateDetails = {}, remarks }) => {
  const errors = []

  addRequiredText(errors, templateDetails.serviceTitle, 'serviceTitle', 'Service title')
  addRequiredText(errors, templateDetails.serviceCode, 'serviceCode', 'Service code')
  addRequiredRichText(errors, templateDetails.introduction, 'introduction', 'Introduction')
  addRequiredRichText(errors, remarks, 'remarks', 'Remarks')

  const contentFields = [
    templateDetails.introduction,
    templateDetails.objectives,
    templateDetails.workScope,
    templateDetails.schedule,
    templateDetails.reference,
    templateDetails.otherFields,
  ]
  if (!contentFields.some(hasRichText)) {
    errors.push({
      field: 'content',
      message: 'At least one IH proposal content section is required.',
    })
  }

  return errors
}

export const validateManpowerTemplate = ({ templateDetails = {}, remarks }) => {
  const errors = []

  addRequiredText(errors, templateDetails.serviceTitle, 'serviceTitle', 'Service title')
  addRequiredText(errors, templateDetails.serviceCode, 'serviceCode', 'Service code')
  addRequiredRichText(errors, templateDetails.introduction, 'introduction', 'Introduction')
  addRequiredRichText(
    errors,
    templateDetails.serviceDeliverables,
    'serviceDeliverables',
    'Service deliverables',
  )
  addRequiredRichText(errors, remarks, 'remarks', 'Remarks')

  if (
    ![
      templateDetails.introduction,
      templateDetails.serviceDeliverables,
      templateDetails.suppliedManpowerDeliverables,
      templateDetails.customSection,
    ].some(hasRichText)
  ) {
    errors.push({
      field: 'content',
      message: 'At least one manpower proposal content section is required.',
    })
  }

  return errors
}

export const validateSpecialTemplate = ({
  template = {},
  remarks,
  isEdit = false,
  newAttachments = [],
  existingAttachments = [],
}) => {
  const errors = []
  const proposalMode = template.proposalMode || 'upload'

  addRequiredText(errors, template.serviceTitle, 'serviceTitle', 'Service title')
  addRequiredText(errors, template.serviceCode, 'serviceCode', 'Service code')
  addRequiredRichText(errors, remarks, 'remarks', 'Remarks')

  if (!['upload', 'write'].includes(proposalMode)) {
    errors.push({ field: 'proposalMode', message: 'Proposal mode is invalid.' })
  }

  if (proposalMode === 'write') {
    addRequiredRichText(errors, template.proposalContent, 'proposalContent', 'Proposal content')
  }

  if (proposalMode === 'upload') {
    addRequiredRichText(errors, template.serviceSummary, 'serviceSummary', 'Service summary')
    const hasAttachments = newAttachments.length > 0 || (isEdit && existingAttachments.length > 0)
    if (!hasAttachments) {
      errors.push({
        field: 'attachments',
        message: 'At least one proposal attachment is required in upload mode.',
      })
    }
  }

  return errors
}
