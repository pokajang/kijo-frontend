import slugify from '../../../lib/slugify'

const getProjectRouteSlugs = (project = {}) => ({
  typeSlug: slugify(project?.project_type) || 'project',
  nameSlug: slugify(project?.project_name) || 'details',
})

export const getProjectManagePath = (project = {}) => {
  const { typeSlug, nameSlug } = getProjectRouteSlugs(project)
  return `/project/manage/${project?.id}/${typeSlug}/${nameSlug}`
}

export const getCommercialCreatePath = (documentType, projectId) =>
  `/commercial/${documentType}/create/${projectId}`

export const isProjectManagePathCanonical = (project = {}, params = {}) => {
  if (!project?.id) return false
  if (params?.id == null || String(params.id) !== String(project.id)) return false

  const { typeSlug, nameSlug } = getProjectRouteSlugs(project)
  return params?.type === typeSlug && params?.name === nameSlug
}
