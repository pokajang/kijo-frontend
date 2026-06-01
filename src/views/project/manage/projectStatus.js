export const PROJECT_STATUSES = Object.freeze({
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  TERMINATED: 'Terminated',
  CLOSED: 'Closed',
})

export const PROJECT_CLOSE_TYPES = Object.freeze({
  COMPLETED: PROJECT_STATUSES.COMPLETED,
  TERMINATED: PROJECT_STATUSES.TERMINATED,
})

const closedStatusKeys = new Set(['completed', 'terminated', 'closed'])
const excludedValueStatusKeys = new Set(['terminated'])

const getStatusValue = (statusOrProject) => {
  if (statusOrProject && typeof statusOrProject === 'object' && !Array.isArray(statusOrProject)) {
    return statusOrProject.status
  }

  return statusOrProject
}

export const normalizeProjectStatus = (statusOrProject = '') =>
  String(getStatusValue(statusOrProject) || '')
    .trim()
    .toLowerCase()

export const isClosedProject = (projectOrStatus = '') =>
  closedStatusKeys.has(normalizeProjectStatus(projectOrStatus))

export const getProjectStatusTone = (statusOrProject = '') => {
  switch (normalizeProjectStatus(statusOrProject)) {
    case 'completed':
      return 'success'
    case 'terminated':
    case 'closed':
      return 'danger'
    case 'active':
    default:
      return 'info'
  }
}

export const isProjectActive = (project = {}) =>
  normalizeProjectStatus(project) === 'active' && !project?.closed

export const shouldIncludeProjectValue = (project = {}) =>
  !excludedValueStatusKeys.has(normalizeProjectStatus(project))
