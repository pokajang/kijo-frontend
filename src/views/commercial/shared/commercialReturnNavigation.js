import { sanitizeInternalReturnTo } from '../../../utils/navigation/returnTo'

export const PROJECT_MANAGE_ORIGIN = 'project-manage'

const normalizeProjectId = (value) => {
  const text = String(value ?? '').trim()
  return text ? text : ''
}

export const getProjectReturnState = (projectId, state = {}) => {
  const normalizedProjectId = normalizeProjectId(projectId)
  if (!normalizedProjectId) return state

  return {
    ...state,
    from: PROJECT_MANAGE_ORIGIN,
    fromProjectId: normalizedProjectId,
  }
}

export const withProjectReturnParams = (href, projectId) => {
  const normalizedProjectId = normalizeProjectId(projectId)
  if (!href || !normalizedProjectId) return href

  try {
    const url = new URL(href, 'http://local.test')
    url.searchParams.set('from', 'project')
    url.searchParams.set('projectId', normalizedProjectId)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return href
  }
}

export const navigateToProjectDocument = (navigate, href, projectId) => {
  if (typeof navigate !== 'function' || !href) return

  navigate(withProjectReturnParams(href, projectId), {
    state: getProjectReturnState(projectId),
  })
}

export const getCommercialReturnContext = (location = {}, listPath = '/commercial') => {
  const searchParams = new URLSearchParams(location.search || '')
  const state = location.state || {}

  const stateProjectId =
    state.from === PROJECT_MANAGE_ORIGIN
      ? normalizeProjectId(state.fromProjectId ?? state.projectId)
      : ''
  const queryProjectId =
    searchParams.get('from') === 'project' ? normalizeProjectId(searchParams.get('projectId')) : ''
  const projectId = stateProjectId || queryProjectId
  const isProjectOrigin = Boolean(projectId)

  return {
    isProjectOrigin,
    projectId,
    backLabel: isProjectOrigin ? 'Back to Project' : 'Back',
    backPath: isProjectOrigin
      ? `/project/manage/${encodeURIComponent(projectId)}`
      : sanitizeInternalReturnTo(state.returnTo, listPath),
    listPath,
  }
}
