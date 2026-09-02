export const emptyServiceCategory = '-'

const firstNonBlank = (...values) => {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return ''
}

export const getProjectWorkflowType = (project = {}) =>
  firstNonBlank(project.project_type, project.projectType)

export const getProjectServiceCategory = (project = {}) =>
  firstNonBlank(
    project.service_category,
    project.serviceCategory,
    getProjectWorkflowType(project),
  ) || emptyServiceCategory

export const getProjectServiceCategoryCode = (project = {}) =>
  firstNonBlank(project.service_category_code, project.serviceCategoryCode)

export const isQuoteBackedProject = (project = {}) =>
  Number(project.quote_id ?? project.quoteId ?? 0) > 0
