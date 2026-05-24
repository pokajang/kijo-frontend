import { getTemplateSections, createClauseResponses } from './templateContent'
import { buildPicPayload, getSelectedContacts } from '../../../crm/quotes/quoteContactUtils'

export const TEMPLATE_VERSION = 'osha-1994-v1'

export const initialAssessmentDetails = {
  companyName: '',
  siteLocation: '',
  clientCompanyId: null,
  clientBranchId: null,
  clientPicId: null,
  clientPicName: '',
  clientPicEmail: '',
  projectId: null,
  projectName: '',
  assessmentDate: '',
  assessorName: '',
  assessorEmail: '',
  scopeRemarks: '',
}

export const getStaffName = (staff = {}) =>
  staff.full_name || staff.name || staff.staff_name || staff.name_code || ''

export const getStaffEmail = (staff = {}) => staff.email || staff.staff_email || ''

export const getStaffId = (staff = {}) =>
  staff.staff_id || staff.id || staff.user_id || staff.name_code || getStaffName(staff)

export const createStaffOption = (staff = {}) => {
  const name = getStaffName(staff)
  const email = getStaffEmail(staff)
  const code = staff.name_code || staff.code || ''

  if (!name && !email) return null

  return {
    value: getStaffId(staff) || name || email,
    label: [name, code ? `(${code})` : '', email ? `- ${email}` : ''].filter(Boolean).join(' '),
    data: staff,
  }
}

export const getAssessorNames = (options = []) =>
  options.map((option) => getStaffName(option.data) || option.label).filter(Boolean)

export const getAssessorEmails = (options = []) =>
  options.map((option) => getStaffEmail(option.data)).filter(Boolean)

export const serializeAssessorOption = (option = {}) => ({
  value: option.value,
  label: option.label,
  data: {
    staff_id: option.data?.staff_id || option.data?.id || option.data?.user_id || null,
    full_name: option.data?.full_name || option.data?.name || option.data?.staff_name || '',
    name_code: option.data?.name_code || option.data?.code || '',
    email: option.data?.email || option.data?.staff_email || '',
  },
})

export const createInitialAssessmentDetails = (user) => ({
  ...initialAssessmentDetails,
  assessorName: getStaffName(user),
  assessorEmail: getStaffEmail(user),
})

export const getTemplateVersionLabel = (template) =>
  template?.version_number ? `v${template.version_number}` : TEMPLATE_VERSION

export const createAssessmentTemplateFromDetail = (template = {}) => ({
  id: template.id,
  name: template.name,
  slug: template.slug,
  description: template.description,
  assessment_tier: template.assessment_tier,
  report_title: template.report_title,
  disclaimer_text: template.disclaimer_text,
  is_default: template.is_default,
  version_id: template.active_version_id,
  version_number: template.version_number,
  content: template.active_content,
})

export const createAssessmentTemplateFromRecord = (record = {}) => ({
  id: record.template_id,
  name: record.template_name,
  slug: record.template_slug,
  description: record.template_description,
  assessment_tier: record.template_snapshot?.assessment_tier,
  report_title: record.template_snapshot?.report_title,
  disclaimer_text: record.template_snapshot?.disclaimer_text,
  is_default: record.template_is_default,
  version_id: record.template_version_id,
  version_number: record.published_version_number,
  content: record.template_snapshot,
})

const formatClientAddress = (client = {}) =>
  [
    client.address,
    client.zip && client.city ? `${client.zip} ${client.city}` : client.zip || client.city,
    client.state,
  ]
    .filter(Boolean)
    .join(', ')

export const getAssessmentDetailsFromClient = (client = {}) => {
  const { primaryPIC, pic_name: picName, pic_email: picEmail } = buildPicPayload(client)

  return {
    companyName: client.company_name || client.hq_company_name || '',
    siteLocation: formatClientAddress(client),
    clientCompanyId: client.company_id || null,
    clientBranchId: client.selected_branch?.branch_id || null,
    clientPicId: primaryPIC?.pic_id || null,
    clientPicName: picName === '-' ? '' : picName,
    clientPicEmail: picEmail === '-' ? '' : picEmail,
  }
}

const formatProjectAddress = (project = {}) =>
  project.client_full_address ||
  [
    project.client_address,
    project.client_zip && project.client_city
      ? `${project.client_zip} ${project.client_city}`
      : project.client_zip || project.client_city,
    project.client_state,
  ]
    .filter(Boolean)
    .join(', ')

export const getAssessmentDetailsFromProject = (project = {}) => {
  const primaryPic = Array.isArray(project.client_pics) ? project.client_pics[0] : null

  return {
    companyName: project.client_name || project.project_name || '',
    siteLocation: formatProjectAddress(project),
    clientCompanyId: project.client_id || null,
    clientBranchId: null,
    clientPicId: primaryPic?.pic_id || null,
    clientPicName: primaryPic?.full_name || '',
    clientPicEmail: primaryPic?.email || '',
    projectId: project.id || project.project_id || null,
    projectName: project.project_name || '',
  }
}

export const createSelectedClientFromRecord = (record = {}) => {
  if (!record.client_company_id && !record.company_name) return null

  const selectedPic =
    record.client_pic_name || record.client_pic_email
      ? {
          pic_id: record.client_pic_id || null,
          full_name: record.client_pic_name || '',
          email: record.client_pic_email || '',
          mobile_number: '',
          position: '',
        }
      : null

  const selectedBranch = record.client_branch_id
    ? {
        branch_id: record.client_branch_id,
        company_id: record.client_company_id || null,
        branch_name: '',
        address: record.site_location || '',
      }
    : null

  return {
    company_id: record.client_company_id || null,
    company_name: record.company_name || '',
    hq_company_name: record.company_name || '',
    address: record.site_location || '',
    city: '',
    state: '',
    zip: '',
    selected_branch: selectedBranch,
    selected_pic: selectedPic,
    selected_pics: selectedPic ? [selectedPic] : [],
    all_pics: selectedPic ? [selectedPic] : [],
  }
}

export const createAssessmentDetailsFromRecord = (record = {}) => ({
  companyName: record.company_name || '',
  siteLocation: record.site_location || '',
  clientCompanyId: record.client_company_id || null,
  clientBranchId: record.client_branch_id || null,
  clientPicId: record.client_pic_id || null,
  clientPicName: record.client_pic_name || '',
  clientPicEmail: record.client_pic_email || '',
  projectId: record.project_id || null,
  projectName: record.project_name || '',
  assessmentDate: record.assessment_date || '',
  assessorName: record.assessor_name || '',
  assessorEmail: record.assessor_email || '',
  scopeRemarks: record.nature_of_company || '',
})

const splitAssessorField = (value) =>
  String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)

const createSelectedAssessorsFromRecord = (record = {}) => {
  if (Array.isArray(record.selected_assessors) && record.selected_assessors.length > 0) {
    return record.selected_assessors
  }

  const names = splitAssessorField(record.assessor_name)
  const emails = splitAssessorField(record.assessor_email)
  const assessorCount = Math.max(names.length, emails.length)

  return Array.from({ length: assessorCount })
    .map((_, index) =>
      createStaffOption({
        staff_id: `record-assessor-${index + 1}-${emails[index] || names[index] || ''}`,
        full_name: names[index] || emails[index] || '',
        email: emails[index] || '',
      }),
    )
    .filter(Boolean)
}

export const createAssessmentStateFromRecord = (record = {}) => {
  const template = createAssessmentTemplateFromRecord(record)
  const sections = getTemplateSections(template.content)

  return {
    assessmentId: record.id,
    template,
    sections,
    assessmentDetails: createAssessmentDetailsFromRecord(record),
    selectedClient: createSelectedClientFromRecord(record),
    clauseResponses: createClauseResponses(record.clause_responses, sections),
    selectedAssessors: createSelectedAssessorsFromRecord(record),
    isSubmittedRecord: record.stage === 'submitted',
    isAssessmentSaved: true,
  }
}

export const buildAssessmentPayload = ({
  assessmentId,
  stage,
  template,
  assessmentDetails,
  selectedClient,
  selectedAssessors,
  clauseResponses,
}) => ({
  id: assessmentId,
  stage,
  templateId: template.id,
  templateVersionId: template.version_id,
  templateVersion: getTemplateVersionLabel(template),
  templateSnapshot: template.content,
  assessmentDetails: selectedClient
    ? {
        ...assessmentDetails,
        ...getAssessmentDetailsFromClient(selectedClient),
      }
    : assessmentDetails,
  selectedClient: selectedClient
    ? {
        company_id: selectedClient.company_id || null,
        selected_branch: selectedClient.selected_branch || null,
        selected_pic: getSelectedContacts(selectedClient)[0] || null,
        selected_pics: getSelectedContacts(selectedClient),
      }
    : null,
  selectedAssessors: selectedAssessors.map(serializeAssessorOption),
  clauseResponses,
})
