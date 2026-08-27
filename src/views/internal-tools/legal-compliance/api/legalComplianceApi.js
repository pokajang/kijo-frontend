import { apiFetch } from '../../../../api/apiClient'

export const API_BASE = import.meta.env.VITE_API_BASE || '/'

const readJson = async (response) => response.json().catch(() => ({}))

const requestJson = async (path, options = {}, fallbackMessage = 'Request failed.') => {
  const response = await apiFetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const payload = await readJson(response)

  if (!response.ok || payload?.status !== 'success') {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload
}

export const listLegalComplianceTemplates = ({ signal } = {}) =>
  requestJson(
    'legal-compliance-templates',
    { signal },
    'Could not load legal compliance templates.',
  )

export const getDefaultLegalComplianceTemplate = ({ signal } = {}) =>
  requestJson(
    'legal-compliance-templates/default',
    { signal },
    'Could not load legal compliance template.',
  )

export const getLegalComplianceTemplate = (templateId, { signal } = {}) =>
  requestJson(
    `legal-compliance-templates/${encodeURIComponent(templateId)}`,
    { signal },
    'Could not load template.',
  )

export const createLegalComplianceTemplate = (payload) =>
  requestJson(
    'legal-compliance-templates',
    { method: 'POST', body: JSON.stringify(payload) },
    'Could not create template.',
  )

export const updateLegalComplianceTemplateDraft = (templateId, payload) =>
  requestJson(
    `legal-compliance-templates/${encodeURIComponent(templateId)}/draft`,
    { method: 'PUT', body: JSON.stringify(payload) },
    'Could not save template draft.',
  )

export const publishLegalComplianceTemplate = (templateId, payload = {}) =>
  requestJson(
    `legal-compliance-templates/${encodeURIComponent(templateId)}/publish`,
    { method: 'POST', body: JSON.stringify(payload) },
    'Could not publish template.',
  )

export const deleteLegalComplianceTemplate = (templateId) =>
  requestJson(
    `legal-compliance-templates/${encodeURIComponent(templateId)}`,
    { method: 'DELETE' },
    'Could not delete template.',
  )

export const listLegalComplianceAssessments = ({ signal } = {}) =>
  requestJson(
    'legal-compliance-assessments',
    { signal },
    'Could not load legal compliance records.',
  )

export const getLegalComplianceAssessment = (assessmentId, { signal } = {}) =>
  requestJson(
    `legal-compliance-assessments/${encodeURIComponent(assessmentId)}`,
    { signal },
    'Could not load assessment record.',
  )

export const getLegalComplianceAssessmentPdfUrl = (assessmentId) =>
  `${API_BASE}legal-compliance-assessments/${encodeURIComponent(assessmentId)}/pdf`

export const getLegalComplianceAssessmentWordUrl = (assessmentId) =>
  `${API_BASE}legal-compliance-assessments/${encodeURIComponent(assessmentId)}/word`

export const saveLegalComplianceAssessment = (payload, { signal } = {}) =>
  requestJson(
    'legal-compliance-assessments',
    { method: 'POST', body: JSON.stringify(payload), signal },
    'Assessment could not be saved.',
  )

export const createLegalComplianceAssessmentRevision = (assessmentId) =>
  requestJson(
    `legal-compliance-assessments/${encodeURIComponent(assessmentId)}/revision`,
    { method: 'POST' },
    'Assessment revision could not be created.',
  )

export const deleteLegalComplianceAssessment = (assessmentId) =>
  requestJson(
    `legal-compliance-assessments/${encodeURIComponent(assessmentId)}`,
    { method: 'DELETE' },
    'Assessment record could not be deleted.',
  )

export const listStaff = ({ signal } = {}) =>
  requestJson('staff/list', { signal }, 'Could not load staff list.')
