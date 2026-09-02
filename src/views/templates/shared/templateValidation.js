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

const isPdfAttachment = (attachment = {}) => {
  const fileName = String(attachment.fileName || attachment.name || attachment.file?.name || '')
  const mimeType = String(attachment.mimeType || attachment.file?.type || '').toLowerCase()
  return attachment.isPdf === true || mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)
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
  addRequiredRichText(errors, remarks, 'remarks', 'Internal change note')

  addMaxLength(errors, templateDetails.trainingTitle, 255, 'trainingTitle', 'Training title')
  addMaxLength(errors, templateDetails.trainingCode, 50, 'trainingCode', 'Training code')
  addMaxLength(errors, templateDetails.hrdNo, 20, 'hrdNo', 'HRD program number')
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
  addRequiredRichText(errors, remarks, 'remarks', 'Internal change note')

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
  addRequiredRichText(errors, remarks, 'remarks', 'Internal change note')

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

  addRequiredText(errors, template.categoryId, 'categoryId', 'Service category')
  addRequiredText(errors, template.serviceTitle, 'serviceTitle', 'Service title')
  addRequiredText(errors, template.serviceCode, 'serviceCode', 'Service code')
  addRequiredRichText(errors, remarks, 'remarks', 'Internal change note')

  if (!['upload', 'write'].includes(proposalMode)) {
    errors.push({ field: 'proposalMode', message: 'Proposal mode is invalid.' })
  }

  if (proposalMode === 'write') {
    addRequiredRichText(errors, template.proposalContent, 'proposalContent', 'Proposal content')
  }

  if (proposalMode === 'upload') {
    const hasAttachments =
      newAttachments.length > 0 || (isEdit && existingAttachments.some(isPdfAttachment))
    if (!hasAttachments) {
      errors.push({
        field: 'attachments',
        message: 'At least one PDF proposal attachment is required in upload mode.',
      })
    }
  }

  ;(template.defaultLineItems || []).forEach((item, index) => {
    const title = item?.title || item?.item_name || ''
    if (!hasText(title)) {
      errors.push({
        field: `defaultLineItems.${index}.title`,
        message: `Default line item ${index + 1} title is required.`,
      })
    }
    if (Number(item?.quantity || 0) <= 0) {
      errors.push({
        field: `defaultLineItems.${index}.quantity`,
        message: `Default line item ${index + 1} quantity must be greater than 0.`,
      })
    }
    if (Number(item?.unitPrice ?? item?.unit_price ?? 0) < 0) {
      errors.push({
        field: `defaultLineItems.${index}.unitPrice`,
        message: `Default line item ${index + 1} unit price cannot be negative.`,
      })
    }
  })

  return errors
}
